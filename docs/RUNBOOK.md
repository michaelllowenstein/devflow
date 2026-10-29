# Linux end-to-end installation and verification runbook

## 0. Prerequisites

Ubuntu/Debian Linux example (requires existing package access):

```bash
sudo apt-get update
sudo apt-get install -y git ca-certificates curl
node --version # v22.x or newer required
npm --version
```

Install Node.js 22+ via your approved system/package manager if missing; verify the installed binary before proceeding. No global npm modules required.

## 1. Extract and install

```bash
unzip devflow-mcp.zip
cd devflow-mcp
npm install
npm run build
```

Expected: TypeScript compilation exits 0 and `dist/server.js` and `dist/client.js` exist. `npm install` creates `package-lock.json`; commit it for reproducible builds, then use `npm ci` in CI and future clean environments.

## 2. Prepare an isolated fixture

```bash
mkdir -p /tmp/devflow-fixture
cd /tmp/devflow-fixture
git init
printf 'hello devflow\n' > README.md
export WORKSPACE_ROOT="$(pwd)"
cd /path/to/devflow-mcp
```

Replace `/path/to/devflow-mcp` with the actual extracted directory.

## 3. CLI protocol smoke tests

```bash
node dist/client.js tools
node dist/client.js call git_status '{}'
node dist/client.js call repo_read '{"file":"README.md"}'
node dist/client.js call repo_search '{"query":"hello"}'
node dist/client.js review
```

Expected: `tools` lists nine tools; `git_status` includes `README.md` as untracked; `repo_read` contains `hello devflow`; `repo_search` includes file `README.md` and line `1`. `review` produces four JSON lines; Git diff will be empty for an untracked file.

## 4. Test suite

```bash
cd /path/to/devflow-mcp
npm run typecheck
npm test
```

Expected: TypeScript exits 0, Node test runner reports all tests passed and failures 0. On a networked machine also run `npm audit --omit=dev` (review warnings and fix if needed).

## 5. Safe usage with a real repo

```bash
export WORKSPACE_ROOT="$(git -C /path/to/repo rev-parse --show-toplevel)"
node dist/client.js call checks_list '{}'
```

`checks_run` is deliberately disabled unless `DEVFLOW_ALLOW_CHECKS=1`. Review repository package scripts first and run only in a sandbox/low-privilege environment. To opt in:

```bash
DEVFLOW_ALLOW_CHECKS=1 node dist/client.js call checks_run '{"name":"test"}'
```

## 6. Forensics and reproducibility

```bash
sha256sum ../devflow-mcp.zip
find src tests docs -type f -print | sort
npm ls --depth=0
```

Store the generated lockfile and hashes alongside your build evidence. Do not put real secrets in source repositories or command history.

## 7. Troubleshooting

- `Cannot find package`: run `npm install` in the extracted directory and confirm network/registry access.
- `WORKSPACE_ROOT is required`: export the absolute repository root before invoking client.
- `Configured workspace must be Git repository root`: use `git rev-parse --show-toplevel`.
- `Checks disabled`: review scripts and explicitly opt in only in a trusted isolated environment.
- Tool calls hang: inspect stderr, project permissions and process lifetime; stdout must only contain MCP messages.
