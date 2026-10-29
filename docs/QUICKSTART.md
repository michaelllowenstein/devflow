# QUICKSTART

Requirements: Linux, Node.js >=22, npm, Git. Extract the archive and run:

```bash
cd devflow-mcp
npm install
npm run build
export WORKSPACE_ROOT="$(pwd)"
git init # only if this folder is not already a git repository
node dist/client.js tools
node dist/client.js call repo_read '{"file":"README.md"}'
```

To inspect an actual project, replace `WORKSPACE_ROOT` with its absolute Git repository root. Use `npm ci` after `package-lock.json` has been generated and committed. The archive intentionally does not claim a generated lockfile when dependency installation is unavailable.
