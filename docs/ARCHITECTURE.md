# ARCHITECTURE

CLI (stdio client transport) → spawned Node MCP server (stdio) → Zod tool registry → bounded workspace operations → Git/filesystem/optional test runner. Transport is JSON-RPC over stdio, not ad hoc JSON. No LLM provider is embedded; any compatible MCP host can consume the server using the same environment variable and executable.

Example host launch config (illustrative; adapt to host schema):

```json
{"command":"node","args":["/absolute/path/devflow-mcp/dist/server.js"],"env":{"WORKSPACE_ROOT":"/absolute/path/repository"}}
```

Data boundary: errors use MCP `isError`, tool outputs are structured JSON encoded as MCP text content; tool calls are individually scoped and bounded. `review` is a deterministic CLI workflow, not an AI verdict.
