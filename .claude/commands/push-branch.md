# /project:push-branch

Commit all current changes and push to a new GitHub branch.

## Steps

1. Ask the user for a branch name if not provided
2. Run `git status` to review what will be committed
3. Ensure `.gitignore` excludes: `node_modules/`, `dist/`, `.env`
4. Stage all appropriate files: `git add .`
5. Commit with a descriptive message summarising the changes
6. Push to `origin/<branch-name>` with `-u` flag
7. Report the GitHub branch URL to the user

## Notes
- Never commit `.env` or any file containing secrets
- Always write a meaningful commit message (not just "update")
- Update the repo URL below once the GitHub repo is created
