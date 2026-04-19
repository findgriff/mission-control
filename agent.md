# Agent Handover Notes

Use this file to keep a running handover for future agents working in this repo. Add short, factual notes as changes are made so the next agent can understand the current state without replaying the full conversation.

## Current Context

- Project: OpenClaw Mission Control v2.
- Working directory: `mission-control`.
- Local development repo used for these edits: `/Users/findgriff/Documents/openclaw-mission-control-v2/mission-control`.
- GitHub repo: `https://github.com/findgriff/mission-control`.
- VPS repo path in recent user testing: `/home/clawd/mission-control`.
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
- Updated bridge Codex runner to pass an explicit model. Default is `gpt-5.2` through `MISSION_CONTROL_CODEX_MODEL`, avoiding broken Codex CLI defaults such as unsupported Codex-specific models on ChatGPT-linked accounts.
- Bridge shell runner is currently the reliable VPS control path. Bridge Codex runner depends on the VPS `codex` CLI account accepting the selected model.
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
- Do not assume Codex-specific model names work on the VPS. The VPS Codex CLI rejected both `gpt-5.2-codex` and `gpt-5.1-codex-mini` with a ChatGPT-linked account.
- If Codex runner fails, use `/terminal` or `/bridge` with runner `Shell command` to pull/build/restart/debug the VPS repo.
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
- Bridge model-control validation passed locally: page renders `Codex Model`, `gpt-5.2`, `Unrestricted`, and `Full auto sandboxed`; `npm run lint` and `npm run build` passed after this change.
- VPS Codex CLI blocker observed by user:
  - `codex exec --full-auto ...` used default `gpt-5.2-codex` and failed with `The 'gpt-5.2-codex' model is not supported when using Codex with a ChatGPT account.`
  - `codex exec --dangerously-bypass-approvals-and-sandbox --model gpt-5.1-codex-mini ...` failed with `The 'gpt-5.1-codex-mini' model is not supported when using Codex with a ChatGPT account.`
  - Latest repo default is now `gpt-5.2`, but this still needs to be tested on the VPS Codex account.
- Known gap: no automated tests exist.

## Latest GitHub Commits

- `6c1d845 Use general GPT model for bridge default`
- `3aed26a Pass explicit Codex bridge model`
- `e656ef1 Add agent bridge runner`
- `4537d60 Enable terminal by default`

## VPS Handover Commands

Use Mission Control Terminal or Bridge Shell runner if direct SSH/terminal is unavailable:

```bash
cd /home/clawd/mission-control
git pull origin main
npm ci
rm -rf .next
npm run build
sudo systemctl restart openclaw-mission-control.service
curl -i http://127.0.0.1:3055/mission-control/api/health
```

Test the Codex model separately before relying on Bridge Codex runner:

```bash
cd /home/clawd/mission-control
codex exec --dangerously-bypass-approvals-and-sandbox --model gpt-5.2 "Say ok"
```

If `gpt-5.2` is rejected, identify a model supported by the VPS Codex account and set it in the Bridge page `Codex Model` field or in the service environment as `MISSION_CONTROL_CODEX_MODEL=<working-model>`.

## Handover Log

### 2026-04-18

- Added this handover file so future agents can understand what has happened and what changed.
- Audited repo for production readiness. Verdict: not ready for sale; closer to internal testing after hardening.

### 2026-04-19

- Added Mission Control bridge for running Codex CLI or shell repair jobs from the UI. Default runner is Codex CLI using an explicit model and unrestricted Codex CLI mode; shell runner executes the supplied command through the service user's shell.
- Updated bridge default model to `gpt-5.2` after the VPS rejected Codex-specific models on a ChatGPT-linked Codex account. Shell runner remains the recommended control path until a working Codex model is confirmed on the VPS.
- Audited full VPS deployment state. Findings:
  - The GitHub repo (`/home/clawd/mission-control`) is the live running instance, managed by PM2 (`pm2 list`) on port 3001, proxied by nginx on port 80 at `/mission-control/`.
  - A separate older codebase exists at `/home/clawd/clawd/openclaw-mission-control` and runs via systemd (`openclaw-mission-control.service`) on port 3055. This is a legacy version; nginx proxies `/mission-control/` to port 3001 (the GitHub repo), not 3055.
  - The Dokku app `openclaw-mission-control` exists (`dokku apps:list`) but is not deployed (`Deployed: false`).
  - All pages (tasks, agents, projects, calendar, memory, terminal, bridge) return 200 and show live OpenClaw data.
  - Task errors ("Permission prompt unavailable in non-interactive mode") come from the OpenClaw CLI requiring interactive TTY; this is an OpenClaw runtime limitation, not a mission-control code bug.
- Added `Procfile` (`web: node_modules/.bin/next start --port \${PORT:-3000}`) for Dokku deployments.
- Updated `package.json` start script to accept `PORT` env via `--port \${PORT:-3000}`.
- Added `engines.node` field (`>=20.0.0`) to `package.json`.

## Dokku Deployment (VPS 188.166.150.21)

The Dokku app `openclaw-mission-control` exists but is not currently active. The live app runs via PM2. To switch to Dokku deployment:

```bash
# On VPS as root — set required env vars on the Dokku app
dokku config:set openclaw-mission-control \
  NODE_ENV=production \
  OPENCLAW_USER_HOME=/home/clawd \
  OPENCLAW_HOME=/home/clawd/.openclaw \
  OPENCLAW_BIN_DIR=/home/clawd/.npm-global/bin \
  MISSION_CONTROL_WORKSPACE_ROOT=/home/clawd/clawd \
  MISSION_CONTROL_TERMINAL_ENABLED=true \
  MISSION_CONTROL_TERMINAL_CWD=/home/clawd/clawd \
  MISSION_CONTROL_BRIDGE_CWD=/home/clawd/clawd/openclaw-mission-control \
  MISSION_CONTROL_CODEX_MODEL=gpt-5.2

# Change Dokku deploy branch to main (it defaults to master)
dokku git:set openclaw-mission-control deploy-branch main

# Push from the GitHub repo on VPS
cd /home/clawd/mission-control
git pull origin main
git remote add dokku dokku@localhost:openclaw-mission-control 2>/dev/null || true
git push dokku main

# After Dokku deploys, update nginx to proxy to Dokku port instead of 3001
# Or stop PM2 mission-control and let Dokku's nginx take over
pm2 stop mission-control
```

Alternatively, just update the GitHub repo on VPS and restart PM2:

```bash
cd /home/clawd/mission-control
git pull origin main
npm ci --omit=dev
npm run build
pm2 restart mission-control
```
