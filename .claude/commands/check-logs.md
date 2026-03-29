# /project:check-logs

Fetch and display recent Cloud Run logs for debugging.

## Steps

1. Run:
   ```
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=google-search-app" \
     --project=YOUR_PROJECT_ID \
     --limit=50 \
     --format=json | jq '.[] | {time: .timestamp, msg: (.textPayload // .jsonPayload)}'
   ```
2. Filter for errors or warnings
3. Summarise what you find — highlight any actor failures, proxy errors, or 5xx responses

## Common issues to look for
- Apify actor timeout → increase `APIFY_RUN_TIMEOUT_SECS`
- `MAX_CONCURRENT_APIFY_RUNS` hit → 503 errors under load
- CAPTCHA error from actor → verify RESIDENTIAL proxy is configured
- Empty dataset from Apify → check actor run status in Apify console
- `organicResults` empty → Google may have changed SERP HTML, check `src/parser.ts` selectors
