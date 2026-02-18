# StackWatch

Production-ready public status page and private admin panel for VPS and service monitoring.

StackWatch is designed for people running VPS or dedicated servers who want:
- A clean public status page.
- Internal service checks (HTTP/TCP).
- Historical metrics for host health.
- Lightweight deployment with Docker Swarm.

## Why this project

Most monitoring dashboards are either too expensive, too complex, or hard to self-host.
StackWatch keeps a practical middle point:
- Easy to deploy.
- Own your data.
- Fast and minimal runtime footprint.

## Feature set

### Public status
- Global system health banner.
- Live VPS metrics: CPU, RAM, disk, load, network.
- Historical charts (CPU, disk, load, network throughput).
- Per-monitor status table with 24h uptime.
- Public monitor detail page: latency trend and incidents.

### Admin panel
- Password-protected login.
- CRUD for monitors.
- HTTP and TCP checks.
- Per-monitor interval and timeout settings.
- Multi-channel alert settings (Webhook, Discord, Telegram, SMTP email) and test alert endpoint.
- Template gallery with one-click monitor creation (infra, databases, gaming, devops, platform).

### Worker and incidents
- Background worker loop (`scripts/worker.mjs`).
- Automatic incident open/close with fail/recovery thresholds.
- Persistent metric snapshots in PostgreSQL.

## Architecture

### Components
- `app/`: Next.js routes (public + admin + API handlers)
- `components/`: UI components
- `lib/monitor-service.ts`: check execution and incident lifecycle
- `lib/system-stats.ts`: host metric collection
- `scripts/worker.mjs`: periodic trigger for internal checks
- `migrations/001_init.sql`: base schema

### Runtime flow
1. Worker calls `POST /api/internal/run-checks`.
2. Backend records host stats in `vps_stats`.
3. Backend runs enabled monitor checks and stores results.
4. Backend updates monitor streaks and incident state.
5. Public APIs read database state for dashboard rendering.

## Environment variables

Required:
- `DATABASE_URL`: PostgreSQL DSN.
- `AUTH_SECRET`: session signing secret.
- `ADMIN_PASSWORD`: admin password (plain or bcrypt hash).
- `WORKER_TOKEN`: shared secret between app and worker.
- `APP_URL`: canonical public URL.

Optional:
- `CHECK_FAIL_THRESHOLD` (default: `2`)
- `CHECK_RECOVERY_THRESHOLD` (default: `2`)
- `WORKER_INTERVAL_MS` (default: `30000`)
- `PUBLIC_RATE_LIMIT_PER_MIN` (default: `120`)
- `ADMIN_RATE_LIMIT_PER_MIN` (default: `60`)
- `PUBLIC_EXPOSE_TARGETS` (default: `false`, hides monitor targets on public APIs/pages)

## Local development

### 1) App only
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

### 2) Full Docker environment
```bash
docker compose up --build
```

## Deploy with Docker Swarm

1. Build and publish your image:
```bash
docker build -t ghcr.io/<user>/stackwatch:<tag> .
docker push ghcr.io/<user>/stackwatch:<tag>
```

2. Update `stack.yml` with:
- Image tag.
- Real secrets.
- Correct domain in `APP_URL`.
- Persistent Postgres volume path.

3. Deploy:
```bash
docker stack deploy -c stack.yml status
```

4. Check status:
```bash
docker service ls
docker service ps status_status_app
docker service logs -f status_status_app
docker service logs -f status_status_worker
```

## Reverse proxy example (Nginx)

```nginx
server {
  listen 80;
  server_name status.example.com;

  location / {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Then attach TLS (LetsEncrypt/Certbot or your preferred method).

## Cloudflare notes

If Cloudflare is enabled (orange cloud):
- DNS must point to the correct VPS IP.
- Origin app must answer on the proxied port.
- Typical `502 Bad Gateway` means origin is unreachable.

Quick check:
```bash
curl -i http://127.0.0.1:3002
```

## Data model (high level)

- `monitors`: monitor definitions and current streak/state.
- `check_results`: individual check outcomes.
- `incidents`: outage windows per monitor.
- `vps_stats`: periodic host snapshots.
- `settings`: alert/webhook settings.

## Security model

- Admin endpoints protected by cookie session.
- Internal check runner protected by `x-worker-token`.
- Basic in-memory rate limiting on public/admin APIs.
- Monitoring targets are admin-defined (no arbitrary public target checks).
- Public endpoints redact monitor targets by default (`PUBLIC_EXPOSE_TARGETS=false`).
- Security headers enabled (`X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, etc.).

### Protect origin IP behind Cloudflare

To make `status.<your-domain>` safer and avoid exposing your origin directly:
- Keep DNS proxied (orange cloud) in Cloudflare.
- On your VPS firewall, allow inbound `80/443` only from Cloudflare IP ranges.
- Block direct public access to your origin IP for web ports.
- Keep SSH on a separate hardened policy (key auth + non-default allowlist if possible).

## Observability and validation

To validate dashboard numbers against the host:
```bash
cat /proc/loadavg
free -m
df -h /
```

To inspect worker activity:
```bash
docker service logs -f status_status_worker
```

## Project quality checklist

- [x] Typed backend/frontend (TypeScript)
- [x] Reproducible container deployment
- [x] Stateful metrics with Postgres
- [x] Incident lifecycle logic
- [x] Public and admin separation
- [ ] Automated tests (recommended next step)
- [ ] Multi-node agent collection (future)

## Roadmap

- Prometheus export endpoint.
- Agent mode for remote host metrics.
- SSO/OAuth for admin.
- Better RBAC and audit logs.
- Dark/light theme switch.
- Template packs import/export and community templates.

## Contributing

See `CONTRIBUTING.md` for workflow and PR guidelines.

## License

This project is released under the MIT License. See `LICENSE`.

---

If you use StackWatch in production, keep backups for Postgres and rotate secrets regularly.
