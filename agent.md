# Agent Handover Notes

Use this file to keep a running handover for future agents working in this repo. Add short, factual notes as changes are made so the next agent can understand the current state without replaying the full conversation.

## Current Context

- Project: OpenClaw Mission Control v2.
- Working directory: `mission-control`.
- This file was added as a shared handover log for agent-to-agent continuity.
- Current repo is a small Next.js 16 app mounted at `/mission-control`, not a complete standalone backend platform.
- Implemented feature surface is dashboard/operator UI for OpenClaw runtime state: tasks, agents, projects, schedule, memory, project zip download, task creation, and agent commissioning.

## Changes Made

- Created `agent.md` to track handover notes, decisions, pending work, and verification status.
- Removed app-level Basic Auth from `src/proxy.ts`; access control is expected to be handled by VPS networking, VPN, SSH tunnel, firewall, or reverse proxy controls.
- Added public health endpoint at `/mission-control/api/health`.
- Added OpsPoket official logo asset at `public/opspoket-official-logo.png` and wired it into the desktop sidebar and mobile header.
- Added `/terminal` with an unrestricted shell command runner backed by `/api/terminal`; it is enabled by default and can be disabled with `MISSION_CONTROL_TERMINAL_ENABLED=false`.
- Added `/bridge` with a Codex CLI and shell runner backed by `/api/bridge`; it writes `.agent/inbox/current-task.md`, `.agent/runs/*.log`, and `.agent/runs/*.json` in the configured bridge working directory.
- Updated bridge Codex runner to pass an explicit model. Default is `gpt-5.1-codex-mini` through `MISSION_CONTROL_CODEX_MODEL`, avoiding broken Codex CLI defaults such as unsupported `gpt-5.2-codex`.
- Replaced hard-coded OpenClaw runtime paths with environment-configurable paths in `src/lib/data.ts` and `src/actions/index.ts`.
- Fixed agent commissioning command to call only `openclaw agents new <name> <role>` and removed unsupported agent creation flags from the UI path.
- Fixed task creation command to call only `openclaw tasks create <task>` and removed unsupported task creation flags from the UI path.
- Hardened project zip download path checks and excluded common secret/build/runtime files.
- Fixed ESLint flat config and Next Turbopack root config.
- Fixed React lint errors caused by closing modals from render instead of effects.
- Added `.env.example`, `README.md`, `docs/deployment.md`, and `docs/release-readiness.md`.

## Decisions And Assumptions

- Keep notes concise and chronological.
- Prefer linking to files, PRs, issues, or commands when they clarify the work.
- Do not remove previous notes unless they are clearly obsolete and the replacement explains why.
- Treat this repo as internally deployable only until the OpenClaw runtime contract, tests, audit logging, stronger auth, and production installer are complete.
- Do not market server management, deployments, service/process control, GUI/remote access, multi-server control, or enterprise security from this repo yet; those features are not implemented here.

## Pending Work

- Add integration tests with seeded OpenClaw SQLite/JSON fixtures.
- Add audit logging for task creation, agent commissioning, project downloads, and auth failures.
- Keep the service bound to localhost or behind a hardened VPS access boundary before exposing it beyond trusted operators.
- Terminal executes commands as the Mission Control service user when enabled. Do not enable it on an untrusted network.
- Bridge executes Codex CLI or shell jobs as the Mission Control service user. Codex jobs require the `codex` CLI to be installed and authenticated for that user.
- Add a real installer/upgrade path, systemd unit, reverse proxy template, backup/restore procedure, release notes, and license.
- Validate on the actual VPS where `/home/clawd/.openclaw` and the `openclaw` CLI exist.

## Verification Notes

- `npm ci` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Logo smoke check passed: optimized Next image route for the OpsPoket logo returns `200 image/png`.
- Agent commissioning command fix validated with `npm run lint` and `npm run build`; live VPS CLI still needs final confirmation because `openclaw` is not installed locally.
- Task creation command fix validated with `npm run lint` and `npm run build`; live VPS CLI still needs final confirmation because `openclaw` is not installed locally.
- Local production smoke test passed for:
  - `GET /mission-control/api/health` returns 200.
  - `GET /mission-control/tasks` returns 200 without app-level login, with sanitized missing-runtime error because local machine does not have the target OpenClaw SQLite database.
- Bridge local validation passed: `POST /mission-control/api/bridge` with shell command `pwd && echo bridge-ok` returned 200 and wrote `.agent/inbox/current-task.md`, `.agent/runs/*.log`, and `.agent/runs/*.json`; `GET /mission-control/bridge` rendered bridge UI text.
- Known gap: no automated tests exist.

## Handover Log

### 2026-04-18

- Added this handover file so future agents can understand what has happened and what changed.
- Audited repo for production readiness. Verdict: not ready for sale; closer to internal testing after hardening.

### 2026-04-19

- Added Mission Control bridge for running Codex CLI or shell repair jobs from the UI. Default runner is Codex CLI using an explicit model and unrestricted Codex CLI mode; shell runner executes the supplied command through the service user's shell.
