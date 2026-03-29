# API Conventions

## Route structure
All routes under `/v1/` require `Authorization: Bearer <API_SECRET_KEY>`.

```
GET  /v1/search    — run a Google search
GET  /health       — health check (no auth, returns { status: 'ok' })
GET  /config       — returns { apiKey } for browser auth (no auth required)
```

## Query parameters for GET /v1/search
- `q` (required) — search query string
- `page` (optional, default 0) — 0-based page index; each page = 10 organic results
- `countryCode` (optional, default 'us') — ISO 3166-1 alpha-2 country code
- `languageCode` (optional, default 'en') — interface language (hl param)

## Response envelope
All responses follow:
```json
{ "data": <SearchResultRecord> }
```
Errors follow:
```json
{ "error": { "code": "ERROR_CODE", "message": "Human readable message" } }
```

## SearchResultRecord shape (from src/types.ts)
- `organicResults[]` — up to 10 results per page
- `featuredSnippet?` — show at top if present
- `hasNextPage` — controls Next button visibility
- `peopleAlsoAsk[]`, `relatedQueries[]`, `paidResults[]`
- `resultsCountText?`, `pageNumber`, `scrapedAt`

## Adding a new route
1. Create handler in `server/routes/`
2. Register in `server/routes/index.ts`
3. Add frontend fetch function to `client/js/api.js`
4. Never access the API directly from view files — always go through `api.js`

## Input validation
All route inputs validated with `zod` at the handler level.
