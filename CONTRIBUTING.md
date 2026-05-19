# Contributing

## Setup

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
make setup
```

## Run Locally

```bash
make backend
make frontend
```

The backend runs on `http://127.0.0.1:8010` and the frontend runs on `http://127.0.0.1:3010`.

## Checks

Run these before opening a pull request:

```bash
make test-backend
make lint-frontend
make typecheck-frontend
cd frontend && npm run build
```

## Pull Requests

- Keep backend, frontend, and documentation changes scoped to the same behavior change.
- Do not commit local data under `backend/data/` except `.gitkeep`.
- Do not commit `.env` files or workspace-specific paths.
- Include screenshots for visible UI changes.

