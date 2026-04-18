# OpsPocket Mission Control

Server-side Mission Control dashboard for an OpenClaw/OpsPocket VPS. The current application is a Next.js service mounted at `/mission-control` that reads local OpenClaw runtime state and exposes operator views for tasks, agents, projects, schedule, and memory.

## Current Feature Surface

- Tasks: reads recent task runs from the OpenClaw task SQLite database and can create a task through the `openclaw` CLI.
- Agents: reads configured agents and session state and can commission an agent through the `openclaw` CLI.
- Projects: lists local workspace projects and can stream a zipped project directory for download.
- Schedule: reads OpenClaw cron job state.
- Memory: reads indexed memory chunks from the OpenClaw memory SQLite database.
- Health: exposes `GET /mission-control/api/health` for uptime checks.
- Access control: no app-level login. Restrict access at the VPS, firewall, VPN, SSH tunnel, or reverse proxy layer.

## What This Repo Is Not Yet

This repository is not a complete standalone platform backend. It does not currently include a database schema, job queue, service supervisor, remote desktop/GUI backend, audit log, customer tenant model, role-based authorization, billing, or a complete deployment package. It depends on an existing OpenClaw runtime and CLI on the target VPS.

## Requirements

- Node.js 24 or newer, or the Node version supported by the pinned Next.js release.
- npm.
- Python 3 with SQLite support.
- `zip`.
- `git`.
- `openclaw` CLI installed on the VPS user account used by Mission Control.
- OpenClaw runtime files under `OPENCLAW_HOME`.

## Configuration

Copy `.env.example` to `.env.production` on the VPS and set real values:

```bash
cp .env.example .env.production
```

Production variables:

- `OPENCLAW_USER_HOME`
- `OPENCLAW_HOME`
- `OPENCLAW_BIN_DIR`
- `MISSION_CONTROL_WORKSPACE_ROOT`

Optional runtime file overrides are documented in `.env.example`.

## Development

```bash
npm ci
npm run lint
npm run build
npm run dev
```

The app is served under `/mission-control`, so local pages are at `http://localhost:3000/mission-control/tasks`.

There is no built-in login screen. For production, bind the Node process to `127.0.0.1` and expose it only through the intended VPS access boundary.

## Production Deployment

See `docs/deployment.md` for the VPS deployment checklist and reverse proxy notes.

## Release Status

Current status: internal hardening only. This repo should not be sold as a finished infrastructure product until the release blockers in `docs/release-readiness.md` are resolved.
