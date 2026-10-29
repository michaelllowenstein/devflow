# DEVELOPMENT

`src/security.ts` defines path and file-read boundaries; `src/operations.ts` holds bounded operations; `src/server.ts` registers Zod-validated MCP tools; `src/client.ts` performs actual MCP discovery and calls. `tests/` covers security and stdio integration.

Commands: `npm run typecheck`, `npm run build`, `npm test`. Add a test alongside each new tool. Never execute model-supplied shell text; use fixed executable/argument allowlists. New integrations should have explicit scope, timeouts, rate/output limits and verification metadata.

Next milestone candidates: stronger filesystem isolation with container namespace, protected-file allowlist, multi-repository profiles, structured tool error codes, tracing, prompts/resources, and test runner policy configuration.
