# Omega Web Search — Project Summary

## Overview

Omega Web Search is a two-part system: an **Apify actor** that scrapes Google Search Engine Results Pages (SERPs) without a browser, and a **web application** that provides a clean search interface on top of it. Users type a query into the web app, the backend calls the Apify actor, the actor fetches and parses real Google results, and the structured data is returned and rendered in the browser.

The system is built in TypeScript, hosted on Google Cloud Run, and uses Apify's `GOOGLE_SERP` proxy infrastructure to reliably bypass Google's bot detection.

---

## Part 1: The Apify Actor (`src/`)

**Actor ID:** `emeraldpathways/google-search-scraper`
**Platform:** [console.apify.com/actors/PWHF0QvezgE6kAnHY](https://console.apify.com/actors/PWHF0QvezgE6kAnHY)

### What it does

The actor accepts one or more search queries, fetches the Google SERP for each query using a proxy, parses the HTML with [Cheerio](https://cheerio.js.org/), and saves the structured results to an Apify dataset. It is entirely HTTP-based — no browser, no Playwright, no Puppeteer — which makes it fast, cheap to run, and easy to deploy.

### How it works — step by step

#### 1. Input
The actor reads its input from the Apify platform. The required field is `queries`: a newline-separated list of search terms or full Google Search URLs. If a full URL is provided (e.g. `https://www.google.com/search?q=...`), it is used directly on the first page, allowing the caller to pre-build a URL with exact pagination offsets.

All other input fields are optional:

| Field | Default | Description |
|---|---|---|
| `maxPagesPerQuery` | 1 | Pages to scrape per query (up to 50). Each page = up to 10 organic results. |
| `countryCode` | `us` | Google domain to use (e.g. `de` → google.de, `gb` → google.co.uk). 60+ countries supported. |
| `languageCode` | `en` | Interface language (`hl` URL parameter). |
| `searchLanguage` | _(none)_ | Restrict results to a specific language (`lr` parameter). |
| `mobileResults` | false | Use a mobile User-Agent and get mobile SERP layout. |
| `forceExactMatch` | false | Wrap query in quotes for exact-phrase search. |
| `site` | _(none)_ | Restrict results to a domain (e.g. `reddit.com`). |
| `quickDateRange` | _(none)_ | Date filter: `d7` (7 days), `m3` (3 months), `y1` (1 year), etc. |
| `saveHtml` | false | Include raw HTML in dataset output (useful for debugging). |
| `proxyConfiguration` | RESIDENTIAL | Apify proxy settings. A proxy is mandatory — Google blocks bare IPs. |
| `maxConcurrency` | 3 | Parallel queries in flight simultaneously. |

#### 2. URL construction (`src/url-builder.ts`)
For each query the actor builds a Google Search URL with carefully chosen parameters:
- `q` — the query, with `site:` operator and quote-wrapping applied if requested
- `num=10` — always request 10 results per page
- `hl` — interface language
- `gl` — country localisation
- `safe=off` — disable SafeSearch
- `pws=0` — disable personalised results
- `nfpr=1` — disable spelling corrections
- `start` — pagination offset (`page * 10`)
- `lr` — language restriction (if set)
- `tbs=qdr:X` — date range filter (if set)

The URL uses `http://` (not `https://`) so Apify's internal proxy can forward it as a plain request without requiring CONNECT tunneling, which `node:http` doesn't support in this proxy setup.

#### 3. Fetching (`src/http-client.ts`)
The actor uses Node's built-in `node:http` module (not `undici` or `axios`) to make requests through the Apify proxy. This was a deliberate choice: `undici`'s `ProxyAgent` cannot connect to Apify's internal proxy servers (`10.0.x.x:8011`), while `node:http` handles it correctly by sending the absolute URL as the request target in HTTP/1.1 proxy format.

Every request includes a realistic Chrome browser header set:
- `User-Agent` — Chrome 136 on Windows (desktop) or Pixel 8 Android (mobile)
- `sec-ch-ua`, `sec-ch-ua-mobile`, `sec-ch-ua-platform` — Client Hints headers
- `sec-fetch-*` — navigation fetch metadata
- `Cookie` — includes `SOCS=CAI` to bypass Google's EU consent gate

Retry logic:
- Up to **4 attempts** per page (3 retries)
- 429/503 responses: exponential backoff starting at 15 seconds
- Other failures: linear backoff (2s, 4s, 6s)

Detection handling:
- **CAPTCHA / rate-limit pages** — detected by checking for `detected unusual traffic`, `recaptcha`, `/sorry/index`, or `httpservice/retry/enablejs`. Throws a clear error.
- **Consent gate** — detected by `Before you continue to Google`. Retries with consent cookie.
- **Note:** Real SERPs also reference `consent.google.com` in their JavaScript — the detector is careful to only trigger on the actual consent gate page, not on live results.

#### 4. Pagination
The actor fetches pages 0 through `maxPagesPerQuery - 1` for each query. A sticky proxy session ID (derived from the query string) is used across all pages for the same query, ensuring the same IP is used throughout — this reduces the risk of Google triggering bot detection mid-session. A random 1.5–4 second delay is inserted between page fetches. If a page fetch fails or `hasNextPage` is false, pagination for that query stops.

#### 5. Parsing (`src/parser.ts`)
Each fetched HTML page is parsed with Cheerio. The parser extracts six types of data:

**Organic results** — the main search results. The parser tries multiple CSS selector strategies in order (because Google frequently changes its HTML structure), skipping ad containers. For each result it extracts:
- `position` — 1-based rank
- `title` — from the `<h3>` element
- `url` — cleaned from Google's `/url?q=` redirect wrapper
- `displayedUrl` — the green URL shown under the title (`<cite>`)
- `description` — the snippet text, tried via `[data-sncf]`, `.VwiC3b`, `.st`, and a longest-span fallback
- `emphasizedKeywords` — words bolded by Google in the snippet (from `<em>` tags)
- `siteLinks` — sub-links shown under some results (from `table a`, `.usJj9c a`)

**Featured snippet** — the highlighted answer box at the top of some queries. Detected via `[data-attrid="wa:/description"]`, `.xpdopen`, `.kp-blk`. Includes title, URL, description text, and type classification: `paragraph`, `list`, `table`, or `video`.

**Paid results (ads)** — ads from `#tads` and `[data-text-ad]`. Same structure as organic results but tagged separately.

**People Also Ask** — accordion questions from `div.related-question-pair`, `.dnXCYb`, `.CSkcDe`. Returns an array of question strings.

**Related queries** — "Related searches" chips from `#botstuff a`, `#brs a`, `.k8XOCe a`. Returns an array of strings.

**Results count** — the "About X results" text from `div#result-stats`, with the timing note stripped.

**Has next page** — checks for `a#pnnext`, `a[aria-label="Next"]`, or `td.b:last-child > a`.

#### 6. Output
Each page's results are pushed to an Apify dataset as a `SearchResultRecord`:

```typescript
{
  searchQuery: { term: string; url: string };
  pageNumber: number;
  organicResults: OrganicResult[];        // up to 10 per page
  featuredSnippet?: FeaturedSnippet;      // present on some queries
  peopleAlsoAsk: PeopleAlsoAskItem[];
  relatedQueries: string[];
  paidResults: PaidResult[];
  resultsCountText?: string;
  hasNextPage: boolean;
  scrapedAt: string;                      // ISO timestamp
  html?: string;                          // only if saveHtml: true
  error?: string;                         // set if fetch failed
}
```

### Deploying the actor

```bash
npm run build          # compile TypeScript → dist/
apify push --force     # build Docker image on Apify and deploy
```

The actor uses `Dockerfile.actor` (not the root `Dockerfile`, which is for the web app). The Dockerfile base image is `apify/actor-node:20`.

---

## Part 2: The Web Application (`server/` + `client/`)

### What it does

The web app is a Google-style search interface. A user types a search query (with optional country and language filters), clicks Search, and gets back 10 results rendered as result cards. They can page through results (Next/Previous), click related searches, and see featured snippets and People Also Ask sections.

The frontend is plain HTML/CSS/ES modules with no build step. The backend is an Express + TypeScript server that acts as a thin API layer, calling the deployed Apify actor for each search request.

### Architecture

```
Browser (client/)
    │  GET /v1/search?q=...&page=0
    ▼
Express server (server/)
    │  POST https://api.apify.com/v2/acts/.../run-sync-get-dataset-items
    ▼
Apify Actor (src/)
    │  GET http://www.google.com/search?... (via GOOGLE_SERP proxy)
    ▼
Google Search HTML → parsed → SearchResultRecord
    │
    └── returned through Apify API → Express → browser
```

### Backend (`server/`)

**`server/config.ts`** — All environment variable access is centralised here. The app will fail fast at startup if required variables are missing.

| Variable | Source | Description |
|---|---|---|
| `API_SECRET_KEY` | GCP Secret Manager | Bearer token required on all `/v1/` routes |
| `APIFY_TOKEN` | GCP Secret Manager | Apify API token for running the actor |
| `APIFY_ACTOR_ID` | Cloud Run env var | Actor to call (e.g. `emeraldpathways/google-search-scraper`) |
| `APIFY_RUN_TIMEOUT_SECS` | Cloud Run env var | Max seconds to wait for actor run (default 300) |
| `PORT` | Cloud Run (auto) | Express listen port |

**`server/services/apify-client.ts`** — The only file that communicates with Apify. The `runActorSearch()` function:
1. Builds a Google Search URL with the correct `start` offset for the requested page number (page 0 → no offset, page 1 → `start=10`, page 2 → `start=20`, etc.)
2. Calls the Apify `run-sync-get-dataset-items` endpoint — this starts the actor and waits for it to finish, returning the dataset in the same response
3. Returns the first item from the dataset array as a `SearchResultRecord`
4. Uses the `GOOGLE_SERP` proxy group, which is purpose-built for Google scraping and billed at $2.50 per 1,000 searches

**`server/routes/search.ts`** — Handles `GET /v1/search`. Validates query parameters with Zod:
- `q` — required, the search query
- `page` — optional integer ≥ 0, defaults to 0
- `countryCode` — optional, defaults to `us`
- `languageCode` — optional, defaults to `en`

**`server/routes/index.ts`** — Mounts auth middleware (checks `Authorization: Bearer <API_SECRET_KEY>` on all `/v1/` routes) and registers the search route. Also exposes `GET /health` (no auth) for Cloud Run health checks.

**`server/index.ts`** — Assembles the Express app: serves `client/` as static files, exposes `GET /config` (returns the API key so the browser can authenticate), mounts routes, and starts listening.

**Response format:**

Success:
```json
{ "data": { "organicResults": [...], "hasNextPage": true, ... } }
```

Error:
```json
{ "error": { "code": "INVALID_PARAMS", "message": "Query is required" } }
```

### Frontend (`client/`)

The frontend is a single HTML page (`client/index.html`) with two views that toggle visibility. No framework, no bundler — pure ES modules loaded directly by the browser.

**`client/js/api.js`** — All fetch calls go through here. On first call it fetches `GET /config` to retrieve the API key, then caches it. The `search()` function constructs the query string and sends `GET /v1/search` with the `Authorization: Bearer` header.

**`client/js/nav.js`** — Shared utilities: `showView(id)` to switch between search and results views, `showLoading(bool)` to toggle the loading overlay, `showToast(msg, type)` for error/info notifications, and `escHtml(str)` to prevent XSS when rendering user-sourced content.

**`client/js/views/search.js`** — Wires the search form. On submit it reads the query, country, and language inputs, calls `api.search()`, then hands the result to `renderResults()` and switches to the results view. The current query is exported as `currentQuery` so pagination buttons can reuse it.

**`client/js/views/results.js`** — Renders the full SERP:

- **Featured snippet** — highlighted box at the top, shown when `data.featuredSnippet` is present. Displays title, URL, and description.
- **Results count** — grey subtitle (e.g. "About 1,200,000,000 results")
- **Organic result cards** — for each result: green displayed URL, blue title link (opens in new tab), grey snippet text. Emphasised keywords are bolded. Site links appear as small bordered chips below the snippet.
- **Pagination** — Previous and Next buttons. Previous is disabled on page 0. Next is disabled when `hasNextPage` is false. Clicking either calls `api.search()` with `page ± 1` and re-renders.
- **People Also Ask** — collapsible section of question strings below the results.
- **Related searches** — row of clickable chips. Clicking one runs a new search for that term from page 0.

All strings rendered into the DOM are passed through `escHtml()` to prevent XSS injection.

### Deployment

The web app is deployed to **Google Cloud Run** via Docker.

**`Dockerfile`** (web app — multi-stage):
1. Stage 1 (`builder`): installs all dependencies, compiles `server/` TypeScript → `dist/server/`
2. Stage 2 (`runner`): installs only production dependencies, copies `dist/server/` and the `client/` directory. The actor source (`src/`) is excluded — it runs on Apify, not here.

```bash
# Build and deploy
npm run build:server
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/google-search-app
gcloud run deploy google-search-app \
  --image gcr.io/YOUR_PROJECT_ID/google-search-app \
  --region=us-central1 --platform=managed --allow-unauthenticated \
  --set-secrets=API_SECRET_KEY=API_SECRET_KEY:latest,APIFY_TOKEN=APIFY_TOKEN:latest \
  --set-env-vars=APIFY_ACTOR_ID=emeraldpathways/google-search-scraper,APIFY_RUN_TIMEOUT_SECS=300
```

Secrets (`API_SECRET_KEY`, `APIFY_TOKEN`) are stored in GCP Secret Manager and injected at runtime — never in the Docker image or source code.

**`Dockerfile.actor`** (Apify actor — separate):
Builds only the actor (`src/`) on top of `apify/actor-node:20`. Pushed via `apify push --force`.

---

## Repository Structure

```
OmegaWebSearch/
├── src/                        # Apify actor (deploys to Apify)
│   ├── main.ts                 # Entry point: input, concurrency, pagination loop
│   ├── types.ts                # TypeScript interfaces (ActorInput, SearchResultRecord, etc.)
│   ├── url-builder.ts          # Constructs Google Search URLs
│   ├── http-client.ts          # HTTP fetching via node:http with proxy + retry logic
│   └── parser.ts               # Cheerio HTML parser (organic, featured, ads, PAA, related)
│
├── server/                     # Express backend (deploys to Cloud Run)
│   ├── index.ts                # App assembly, static serving, /config endpoint
│   ├── config.ts               # Typed environment variable wrapper
│   ├── types.ts                # Zod schema, AppError, ApiResponse types
│   ├── routes/
│   │   ├── index.ts            # Auth middleware, /health, route registration
│   │   └── search.ts           # GET /v1/search handler
│   └── services/
│       └── apify-client.ts     # runActorSearch() — Apify HTTP API integration
│
├── client/                     # Frontend (static files served by Express)
│   ├── index.html              # Single-page app shell
│   ├── css/styles.css          # Google-style result cards, responsive layout
│   └── js/
│       ├── api.js              # All fetch calls, API key management
│       ├── nav.js              # showView(), showLoading(), showToast(), escHtml()
│       └── views/
│           ├── search.js       # Search form wiring
│           └── results.js      # Result cards, pagination, PAA, related queries
│
├── .actor/
│   ├── actor.json              # Apify actor metadata, build config
│   └── INPUT_SCHEMA.json       # Input form schema for Apify platform UI
│
├── Dockerfile                  # Cloud Run web app (multi-stage, excludes src/)
├── Dockerfile.actor            # Apify actor build
├── .env.example                # Required environment variables reference
├── tsconfig.json               # Actor TypeScript config
├── tsconfig.server.json        # Server TypeScript config
└── package.json                # Dependencies + scripts for both actor and server
```

---

## Key Technical Decisions

**Why `node:http` instead of `undici` for the actor?**
`undici`'s `ProxyAgent` cannot connect to Apify's internal proxy servers (which run on `10.0.x.x:8011`). Node's built-in `http.request()` handles them correctly by sending the absolute URL as the request target — standard HTTP/1.1 proxy format. No extra dependency needed.

**Why `http://` URLs instead of `https://` for Google requests?**
When routing through an HTTP proxy, HTTPS requires a CONNECT tunnel (the proxy becomes a TCP pipe). Apify's internal proxies don't support CONNECT tunneling from `node:http`. Using `http://` allows the proxy to forward the request directly as a plain HTTP request — the proxy itself makes the secure connection to Google on the backend.

**Why the `GOOGLE_SERP` proxy group?**
This group is purpose-built for Google scraping. At $2.50 per 1,000 searches with a $500 credit balance, it provides ~200,000 searches. Datacenter IPs (including the account's `BUYPROXIES94952` group) are consistently blocked by Google. Residential proxies work but cost $8.00/GB and are slower.

**Why inline the URL builder in the server instead of importing from `src/`?**
`tsconfig.server.json` sets `rootDir: ./server`. Importing across `rootDir` boundaries causes TypeScript compilation errors. Since `url-builder.ts` has zero external dependencies and is ~50 lines, it was inlined into `server/services/apify-client.ts` — simpler than restructuring the TypeScript project.

**Why `GET /config` to expose the API key?**
The frontend needs the `API_SECRET_KEY` to authenticate against `/v1/search`. Since this key will be visible in browser dev tools regardless, embedding it via a config endpoint (rather than hardcoding it in the HTML) keeps the client code clean and makes it easy to rotate without a deployment. The key's purpose is to limit unintentional third-party abuse of the endpoint, not to provide cryptographic security.

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Create .env
cp .env.example .env
# Fill in API_SECRET_KEY, APIFY_TOKEN, APIFY_ACTOR_ID

# 3. Start the server (compiles TypeScript on-the-fly via ts-node)
npm run dev:server

# 4. Open http://localhost:3000
```

To run the actor locally (without Apify infrastructure):
```bash
npm run dev    # runs src/main.ts via ts-node — requires APIFY_TOKEN env var and input.json
```
