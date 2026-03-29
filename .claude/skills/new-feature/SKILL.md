---
name: new-feature
description: Auto-invoked when the user asks to add a new feature, endpoint, or view. Guides through the full stack implementation pattern for this project.
---

# New Feature Skill

Follow this pattern for all new features in this project.

## Backend (new API endpoint)
1. Create/edit route file in `server/routes/`
2. Create/edit service in `server/services/` — all Apify calls go through `runActorSearch()`
3. Register in `server/routes/index.ts`
4. Validate all inputs with `zod`
5. Use `AppError` for all error cases
6. Run `npm run build:server` to confirm no TS errors

## Frontend (new view)
1. Add view section to `client/index.html`
2. Add fetch function to `client/js/api.js`
3. Create view file `client/js/views/<name>.js`
4. Import and wire up in `client/index.html` as a `<script type="module">`
5. Use `showView()` from `nav.js` for navigation
6. Always show loading state before fetch, error state on failure

## Apify data
- Always use RESIDENTIAL proxy
- Pass a pre-built Google URL for pagination via `buildGoogleUrl()` in `server/services/apify-client.ts`
- All actor calls go through `runActorSearch()` — never call Apify directly from routes

## After implementation
- Test locally at `http://localhost:3000`
- Run `npm run build:server`
- Deploy with the deploy skill or `/project:deploy`
