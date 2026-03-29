---
name: deploy
description: Auto-invoked when the user says "deploy", "push to cloud", or "ship it". Builds and deploys the app to Google Cloud Run.
---

# Deploy Skill

Run these steps in order. Stop and report if any step fails.

1. **Build** — `npm run build:server` in the project root. Fix any TypeScript errors before proceeding.
2. **Submit image** — `gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/google-search-app --project=YOUR_PROJECT_ID`
3. **Deploy** — `gcloud run deploy google-search-app --image gcr.io/YOUR_PROJECT_ID/google-search-app --project=YOUR_PROJECT_ID --region=us-central1 --platform=managed --allow-unauthenticated --set-secrets=API_SECRET_KEY=API_SECRET_KEY:latest,APIFY_TOKEN=APIFY_TOKEN:latest --set-env-vars=APIFY_ACTOR_ID=YOUR_USERNAME/google-search-scraper,APIFY_RUN_TIMEOUT_SECS=120`
4. **Verify** — curl `<service-url>/health` and confirm `{ "status": "ok" }`
5. **Report** — tell the user the live URL

## Working directory
`c:\Users\dubli\Downloads\CLAUDE\OMEGA FINANCIAL\web search`

## Notes
- Replace `YOUR_PROJECT_ID` and `YOUR_USERNAME` with actual values once the GCP project is set up
- Secrets (`API_SECRET_KEY`, `APIFY_TOKEN`) must be stored in GCP Secret Manager before first deploy
- Never skip the build step — deploy only compiled, passing code
