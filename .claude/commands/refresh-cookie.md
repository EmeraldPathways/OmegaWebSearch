# /project:update-actor

Push updated actor code to Apify.

## Steps

1. Run `npm run build` to compile the actor TypeScript
2. Run `apify push --force` to deploy to Apify
3. Confirm the new build is live in the Apify console
4. Test with a sample search to confirm results are returned

## Working directory
`c:\Users\dubli\Downloads\CLAUDE\OMEGA FINANCIAL\web search`

## Notes
- This only updates the Apify actor (`src/`), not the web app (`server/`, `client/`)
- To deploy the web app, use `/project:deploy`
