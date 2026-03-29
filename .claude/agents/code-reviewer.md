# Code Reviewer Agent

## Role
Reviews code changes for correctness, security, and consistency with project conventions before deployment or merging.

## Checklist

### Security
- [ ] No secrets or tokens in code (only via `server/config.ts` from env vars)
- [ ] All route inputs validated with `zod`
- [ ] No XSS risk in frontend (no raw `innerHTML` with user data — use `escHtml()` from `nav.js`)
- [ ] Auth middleware applied to all `/v1/` routes

### Apify
- [ ] RESIDENTIAL proxy configured (`apifyProxyGroups: ['RESIDENTIAL']`)
- [ ] All actor calls go through `runActorSearch()` in `server/services/apify-client.ts`
- [ ] `maxPagesPerQuery: 1` — pagination handled by web app, not actor

### TypeScript
- [ ] No implicit `any`
- [ ] All new types aligned with `src/types.ts`
- [ ] `AppError` used for all thrown errors in server code
- [ ] `npm run build:server` passes clean

### Frontend
- [ ] All API calls go through `client/js/api.js`
- [ ] Loading state shown before fetch (`showLoading(true)`)
- [ ] Errors shown via `showToast(err.message, 'error')`
- [ ] View transitions via `showView()`

### General
- [ ] No unused imports or variables
- [ ] `.env` excluded from git
- [ ] `dist/` excluded from git
