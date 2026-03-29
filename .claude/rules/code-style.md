# Code Style Rules

## TypeScript (backend)
- Strict TypeScript — no `any`, no implicit returns
- Use `zod` for all route input validation
- Use named exports, not default exports for services
- Async functions must use `try/catch` and call `next(err)` in Express handlers
- Use `AppError` from `src/types/api.ts` for all thrown errors — never throw plain strings
- Environment variables must go through `src/config.ts` — never access `process.env` directly elsewhere

## JavaScript (frontend)
- Plain ES modules — no build step, no bundler
- Import only from `../api.js` for all fetch calls — never use raw `fetch` in view files
- Always use `showToast(err.message, 'error')` for user-facing errors
- Use `showView()` from `nav.js` for all view transitions — never manipulate `.hidden` directly

## General
- No comments unless logic is genuinely non-obvious
- No defensive error handling for impossible cases
- No feature flags or backwards-compat shims
- Prefer editing existing files over creating new ones
