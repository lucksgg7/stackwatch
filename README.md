# VPS Monitor Public (vps-monitor)

Dashboard público + panel admin para monitorizar servicios y estado del VPS.

## Stack
- Next.js (App Router) + TypeScript
- API Route Handlers (backend en Next)
- PostgreSQL
- Docker + Docker Swarm
- Tailwind + Recharts

## Features MVP
- Página pública `/` con estado general, lista de monitores y gráficas de VPS.
- Página pública `/status/<slug>` con historial de latencia e incidentes.
- Panel privado `/admin` con:
  - Login por password y cookie de sesión
  - CRUD de monitores HTTP/TCP
  - Configuración de webhook
  - Botón "test alert"
- Worker que ejecuta checks periódicos y guarda resultados.
- Incidentes automáticos:
  - abre con N fallos consecutivos (`CHECK_FAIL_THRESHOLD`)
  - cierra con M éxitos consecutivos (`CHECK_RECOVERY_THRESHOLD`)

## Variables de entorno
- `DATABASE_URL` (obligatoria)
- `APP_URL` (URL pública)
- `AUTH_SECRET` (secreto de sesión)
- `ADMIN_PASSWORD` (password admin; puede ser hash bcrypt `$2...`)
- `WORKER_TOKEN` (secreto interno entre worker y app)
- `CHECK_FAIL_THRESHOLD` (default `2`)
- `CHECK_RECOVERY_THRESHOLD` (default `2`)
- `PUBLIC_RATE_LIMIT_PER_MIN` (default `120`)
- `ADMIN_RATE_LIMIT_PER_MIN` (default `60`)
- `WORKER_INTERVAL_MS` (worker loop, default `30000`)

## Desarrollo local
```bash
npm install
npm run dev
```

### Docker local
```bash
docker compose up --build
```

App en `http://localhost:3000`

## Despliegue en VPS (Swarm)
1. Edita secretos y dominio en `stack.yml`.
2. Publica imagen en GHCR (`ghcr.io/lucksgg7/vps-monitor:<tag>`).
3. Despliega:

```bash
docker stack deploy -c stack.yml vpsmonitor
```

4. Verifica:

```bash
docker service ls
docker service logs -f vpsmonitor_vps_monitor_app
docker service logs -f vpsmonitor_vps_monitor_worker
```

## Nginx reverse proxy (subdominio)
Ejemplo para `status.mi-dominio`:

```nginx
server {
  listen 80;
  server_name status.mi-dominio;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Luego añade TLS con certbot si procede.

## Notas de seguridad
- Endpoints admin protegidos con cookie httpOnly.
- Endpoints públicos con rate limit básico en memoria.
- El worker usa token (`WORKER_TOKEN`) para invocar checks internos.
- Checks solo sobre targets definidos en DB por admin (sin entrada libre pública).

## Migraciones
SQL base en `migrations/001_init.sql`.
Además, el backend auto-crea tablas si no existen al iniciar consultas.

