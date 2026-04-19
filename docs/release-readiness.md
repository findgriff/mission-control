# Release Readiness

## Current Verdict

Not ready for sale.

The repository is now closer to an internally deployable operator dashboard, but it remains a thin Next.js UI over a local OpenClaw runtime. It should not be presented as a complete infrastructure product until the blockers below are resolved and validated on a production-like VPS.

## Sale Blockers

- No role-based authorization or user management.
- No app-level login; access must be restricted by VPS networking, VPN, SSH tunnel, firewall, reverse proxy auth, or equivalent deployment boundary.
- Terminal feature is an unrestricted command runner and must be disabled with `MISSION_CONTROL_TERMINAL_ENABLED=false` for any untrusted deployment.
- Bridge feature is an unrestricted repair runner that can launch `codex exec --full-auto` or raw shell commands as the service user; it is only suitable behind a trusted VPS access boundary.
- No audit log for task creation, agent commissioning, project download, or failed access attempts.
- No integration tests or end-to-end tests against a seeded OpenClaw runtime.
- No service action safety model, approval flow, or command allowlist beyond current fixed CLI invocations.
- No customer-grade installer or upgrade process.
- No documented OpenClaw runtime bootstrap.
- No monitoring integration beyond a basic health endpoint.
- No backup and restore automation.
- No remote GUI/support backend despite product-scope expectations.
- No release notes, license, screenshots, or support policy.

## Features That Should Not Be Marketed Yet

- Server management.
- Bot/AI worker orchestration beyond basic agent commissioning.
- Deployments.
- Service actions and process management.
- GUI or remote access support.
- Centralized multi-server mission control.
- Enterprise security.

These may be future roadmap items, but they are not implemented in this repository.
