# Security Policy

## Supported versions

The `main` branch is actively maintained.

## Reporting a vulnerability

Please do not open a public issue for sensitive vulnerabilities.

Report security issues privately to the repository owner with:
- A clear summary
- Reproduction steps
- Potential impact
- Suggested mitigation (if available)

You should receive an acknowledgement within 72 hours.

## Security hardening notes

- Rotate `AUTH_SECRET`, `WORKER_TOKEN`, and admin credentials regularly.
- Keep `PUBLIC_EXPOSE_TARGETS=false` in production.
- Restrict origin access behind Cloudflare + firewall rules.
- Use HTTPS-only deployment.
