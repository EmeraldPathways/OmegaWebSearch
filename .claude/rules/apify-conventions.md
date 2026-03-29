# Apify Actor Conventions

## Actor: `YOUR_USERNAME/google-search-scraper`

### Always use these actor input settings
```json
{
  "maxPagesPerQuery": 1,
  "proxyConfiguration": { "useApifyProxy": true, "apifyProxyGroups": ["BUYPROXIES94952"] }
}
```

### Critical rules
- **Always use `BUYPROXIES94952` proxy group** — `RESIDENTIAL` has 0 credits, `BUYPROXIES94952` has 27 USA proxies available
- **Always `maxPagesPerQuery: 1`** — pagination is handled by the web app, not the actor
- **Never pass a plain query string for pagination** — pass a pre-built Google URL with `start=N*10` so the actor uses it directly

### Pagination
To load page N (0-indexed), build the full Google URL with `start=N*10` (see `buildGoogleUrl()` in `server/services/apify-client.ts`) and pass it as the `queries` field of the actor input. The actor recognises full URLs and uses them directly on page 0.

### All actor calls go through `runActorSearch()` in `server/services/apify-client.ts`

### Actor output shape (defined in src/types.ts as SearchResultRecord)
- `record.organicResults` — array of up to 10 results per page
- `record.featuredSnippet` — present on some queries, render at top
- `record.hasNextPage` — controls whether Next button appears
- `record.peopleAlsoAsk`, `record.relatedQueries`

### Deploying actor changes
```bash
cd "c:\Users\dubli\Downloads\CLAUDE\OMEGA FINANCIAL\web search"
npm run build
apify push --force
```

### Timeouts and concurrency
- `APIFY_RUN_TIMEOUT_SECS=120` default — increase if actor times out on complex queries
- `MAX_CONCURRENT_APIFY_RUNS=3` — lower if 503s appear under load
