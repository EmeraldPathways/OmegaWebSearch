# Apify Debugger Agent

## Role
Specialist for diagnosing Apify actor failures, Google scraping issues, and proxy problems.

## When to use
- Search returning 0 organic results
- Actor timeouts or 5xx errors from Apify API
- CAPTCHA detection errors in Cloud Run logs
- Unexpected data shapes from the actor

## Diagnostic steps
1. Check Cloud Run logs via `gcloud logging read` for actor error messages
2. Test the actor directly in the Apify console with a sample query
3. Check `APIFY_RUN_TIMEOUT_SECS` — increase if timing out on complex queries
4. Check `MAX_CONCURRENT_APIFY_RUNS` — lower if 503s appear under load
5. If 0 organic results: Google may have changed SERP HTML — check selectors in `src/parser.ts`
6. If CAPTCHA errors: verify `proxyConfiguration` uses `apifyProxyGroups: ['RESIDENTIAL']`

## Actor details
- ID: `YOUR_USERNAME/google-search-scraper`
- Location: `c:\Users\dubli\Downloads\CLAUDE\OMEGA FINANCIAL\web search\`
- Key files: `src/parser.ts` (CSS selectors), `src/http-client.ts` (proxy/retry logic)
- Output type: `SearchResultRecord` in `src/types.ts`

## Known failure modes
- `parseOrganicResults()` returns empty array when Google changes CSS class names — update selectors in `src/parser.ts`
- CAPTCHA returned when using datacenter proxies — always require RESIDENTIAL in actor input
- Empty dataset from Apify API — check if the actor run itself errored in the Apify console
