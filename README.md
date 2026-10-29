# DevFlow MCP — production-oriented starter MVP

A local-first, **workspace-scoped** Model Context Protocol v2 server and a real TypeScript CLI client over **stdio**. Node.js 22+ and Git are required. No LLM provider, API key or remote HTTP service is needed.

## Quick start

```bash
npm install
npm run build
export WORKSPACE_ROOT="$(git rev-parse --show-toplevel)"
node dist/client.js tools
node dist/client.js call git_status '{}'
node dist/client.js review
npm test
```

If you are not already in a Git repository, set `WORKSPACE_ROOT` to a real repository you own. **Server stdout is reserved for MCP JSON-RPC**.

## Tools

- `workspace_info` — configured root and runtime
- `git_status` — branch and short working-tree status
- `git_diff` — staged/unstaged bounded patch
- `repo_list` — bounded file listing, excludes common secret paths
- `repo_read` — bounded text reads with symlink and path restrictions
- `repo_search` — literal bounded search, per-line source evidence
- `workspace_manifest` — package metadata and file list
- `checks_list` — discover test/lint/typecheck/build scripts
- `checks_run` — **disabled by default**; explicitly allow reviewed npm scripts with `DEVFLOW_ALLOW_CHECKS=1`

## Client command contract

```bash
node dist/client.js tools
node dist/client.js call repo_read '{"file":"README.md"}'
node dist/client.js call repo_search '{"query":"TODO","limit":10}'
node dist/client.js call git_diff '{"staged":true}'
node dist/client.js review
```

Output is JSON. Tool errors return MCP `isError`; the CLI returns nonzero. The `review` command collects source evidence and does not call an LLM.

## Security overview

The server requires an explicit resolved workspace root, blocks parent traversal and selected secret paths, restricts file reads to small regular files and rejects symlink escapes. Git calls use `execFile` without a shell, with fixed arguments, timeouts and output limits. Script execution is a distinct opt-in tool; **npm scripts are executable code, not a sandbox**. Run only on trusted repos in a restricted account/container. Path filtering is defense-in-depth, not a guarantee against all races or secrets in ordinary source files. See [SECURITY](docs/SECURITY.md).

## Docs

- [Quickstart](docs/QUICKSTART.md)
- [Linux install & reproduction runbook](docs/RUNBOOK.md)
- [Development](docs/DEVELOPMENT.md)
- [Testing](docs/TESTING.md)
- [Security](docs/SECURITY.md)
- [Architecture](docs/ARCHITECTURE.md)
