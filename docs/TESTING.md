# TESTING

Run `npm test` after dependencies are installed. Tests exercise traversal/secret rules, symlink escape, bounded search, sensitive listing exclusions, and the client-server stdio handshake against an isolated Git fixture. Run `npm run typecheck` separately. `scripts/verify.sh` also performs a production dependency audit. Expected successful summary: test runner reports 0 failures.

### Manual negative cases

```bash
node dist/client.js call repo_read '{"file":"../etc/passwd"}' # isError=true, exit nonzero
node dist/client.js call repo_read '{"file":".env"}' # isError=true, exit nonzero
node dist/client.js call checks_run '{"name":"test"}' # disabled by default
```

Limitations: no load/soak testing or race attack testing; tests cannot prove isolation from a malicious local process sharing the same UID. Do not deploy this initial version as a privileged or multi-tenant service.
