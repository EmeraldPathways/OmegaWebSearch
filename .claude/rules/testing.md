# Testing Rules

## Test structure
```
tests/
  unit/         — pure logic, no HTTP, no Apify calls (mock at service boundary)
  integration/  — full HTTP via supertest, hits real Express routes
```

## Run commands
```bash
npm test              # unit tests only
npm run test:int      # integration tests only
npm run test:all      # everything
```

## Unit test rules
- Mock `runActor` from `apify-client.ts` — never make real Apify calls in tests
- Test service functions directly with fixture data
- Fixture data lives alongside test files as `.json` or inline objects

## Integration test rules
- Use `supertest` against the Express app
- Always include `Authorization: Bearer dev-secret-key` header
- Mock `runActor` at the module level — do not hit real Apify or Instagram
- Test happy path + key error cases (invalid username, missing auth, 404)

## Before deploying
Always run `npm run build` (TypeScript compile) — this catches type errors that tests may miss.
Running tests is optional before deploy but required before merging to main.
