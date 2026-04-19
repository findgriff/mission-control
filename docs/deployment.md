# VPS Deployment

Mission Control is a Next.js service that expects to run on the same VPS as the OpenClaw runtime.

## Required System Packages

- Node.js and npm
- Python 3
- `zip`
- `git`
- A process manager such as `systemd` or PM2
- A reverse proxy such as Nginx or Caddy
- TLS certificates, usually through Let's Encrypt

## Application Setup

```bash
cd /opt/opspocket/mission-control
npm ci --omit=dev
cp .env.example .env.production
nano .env.production
npm run build
```

Mission Control does not include an app-level login. Keep the Node service bound to `127.0.0.1` and expose it only through your intended VPS access boundary, such as a private admin domain, VPN, SSH tunnel, firewall allowlist, or reverse proxy authentication.

The terminal page is enabled by default and runs unrestricted shell commands as the service user. Set `MISSION_CONTROL_TERMINAL_ENABLED=false` to disable it.

The bridge page runs Codex CLI or shell repair jobs from `MISSION_CONTROL_BRIDGE_CWD` and writes handoff files under `.agent/`. Codex CLI jobs require a working `codex` installation for the service user. Set `MISSION_CONTROL_CODEX_MODEL` to a model supported by that authenticated Codex account, for example `gpt-5.1-codex-mini`.

## Runtime Contract

The service account must be able to:

- Read OpenClaw SQLite and JSON state files under `OPENCLAW_HOME`.
- Execute the `openclaw` CLI from `OPENCLAW_BIN_DIR`.
- Read workspace projects under `MISSION_CONTROL_WORKSPACE_ROOT`.
- Run `git` and `zip`.

Do not run Mission Control as `root`. Use a dedicated user with the minimum file permissions required for OpenClaw operations.

## systemd Example

```ini
[Unit]
Description=OpsPocket Mission Control
After=network.target

[Service]
Type=simple
User=clawd
WorkingDirectory=/opt/opspocket/mission-control
EnvironmentFile=/opt/opspocket/mission-control/.env.production
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3000
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

## Nginx Example

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location /mission-control/ {
        proxy_pass http://127.0.0.1:3000/mission-control/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Post-Deploy Verification

```bash
curl -fsS https://example.com/mission-control/api/health
curl -I https://example.com/mission-control/tasks
```

Then log in through the browser and verify:

- Tasks page loads task state.
- New task creation succeeds and appears in OpenClaw state.
- Agents page loads session/config state.
- Agent commissioning succeeds.
- Projects page lists only expected workspaces.
- Project download cannot access paths outside `MISSION_CONTROL_WORKSPACE_ROOT`.
- Schedule and memory pages show expected runtime state or clear errors.

## Backup And Recovery

Mission Control itself is stateless apart from `.env.production`. Back up:

- OpenClaw runtime data under `OPENCLAW_HOME`.
- Workspace repositories under `MISSION_CONTROL_WORKSPACE_ROOT`.
- The deployment directory or Git tag used for the running release.
- The systemd unit and reverse proxy config.

Test restore on a separate VPS before selling this as a managed product.
