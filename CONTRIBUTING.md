# Contributing to StackWatch

Thanks for contributing.

## Development setup

1. Install dependencies:
```bash
npm install
```

2. Run local app:
```bash
npm run dev
```

3. Run quality checks:
```bash
npm run lint
npm run build
```

## Pull request guidelines

1. Fork and create a branch from `main`.
2. Keep PRs focused on one concern.
3. Add or update docs when behavior changes.
4. Include validation steps in the PR description.
5. Ensure lint/build pass before requesting review.

## Commit style

Prefer conventional-style messages:
- `feat: ...`
- `fix: ...`
- `docs: ...`
- `chore: ...`

## Reporting issues

Open an issue with:
- Current behavior
- Expected behavior
- Steps to reproduce
- Environment details (OS, Node version, Docker version)
