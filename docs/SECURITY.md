# SECURITY MODEL

Threat model: untrusted model-generated arguments, accidentally sensitive repository files, output resource exhaustion, unsafe package scripts and symlink traversal. No remote listener, no network authentication and no sandbox are provided.

Controls: `WORKSPACE_ROOT` mandatory, `realpath` + relative-path validation, secret-name deny rules, no recursive symlink traversal, `O_NOFOLLOW` on final opened files, `fstat` file identity check, 64 KiB file cap, bounded Git output/timeouts, `execFile` without shell, input schemas, error signaling, no server stdout logs, disabled-by-default check runner.

Residual risks: race between path resolution and open for intermediate components; sensitive content in normally named files; malicious repository `git` config or hooks/filters; npm scripts with side effects; long-lived subprocesses; output truncation; root path disclosure. Avoid adversarial repos, use dedicated nonprivileged account/container, read-only mount if possible, and keep execution disabled. npm scripts are executable code and have no inherent sandbox. Audit dependencies and pin via lockfile before production rollout.

Before multi-tenant or untrusted deployment: implement openat2-like kernel-enforced resolution and sandbox mounts, strict executable allowlists, per-repo permissions, process groups + cancellation, DLP, audit logging, quotas and independent security testing.
