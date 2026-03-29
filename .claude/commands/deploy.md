# /project:deploy

Deploy the Google Search web app to Google Cloud Run.

## Steps

1. Run `npm run build:server` — compile TypeScript, fail fast on errors
2. Run `gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/google-search-app --project=YOUR_PROJECT_ID`
3. Run `gcloud run deploy google-search-app --image gcr.io/YOUR_PROJECT_ID/google-search-app --project=YOUR_PROJECT_ID --region=us-central1 --platform=managed --allow-unauthenticated --set-secrets=API_SECRET_KEY=API_SECRET_KEY:latest,APIFY_TOKEN=APIFY_TOKEN:latest --set-env-vars=APIFY_ACTOR_ID=YOUR_USERNAME/google-search-scraper,APIFY_RUN_TIMEOUT_SECS=120`
4. Confirm the service URL is live with a health check: `curl <url>/health`
5. Report the deployed URL to the user

## Working directory
`c:\Users\dubli\Downloads\CLAUDE\OMEGA FINANCIAL\web search`

## Notes
- Replace `YOUR_PROJECT_ID` and `YOUR_USERNAME` with actual values
- Never skip the build step — deploy only compiled, passing code
- If build fails, stop and report the TypeScript errors
- The service URL pattern: `https://google-search-app-*.us-central1.run.app`
