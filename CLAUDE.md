# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This is an early-stage skeleton. The `backend/` is a minimal FastAPI app with a single root
endpoint and no routes, models, or business logic implemented yet — `app/models`, `app/routers`,
`app/schemas`, `app/services`, and `app/core` exist as empty packages awaiting implementation.
There is no test suite, linter config, or migration tooling (e.g. Alembic) set up yet. `frontend/`
is an empty directory — no framework has been chosen or scaffolded.

Because there's no established pattern to follow yet, when adding the first router/model/schema,
follow the layered structure implied by the existing package names (see Architecture below) rather
than improvising a different layout.

## Commands

Backend (run from `backend/`, using the existing `.venv`):

```
# activate the virtualenv (PowerShell)
.venv\Scripts\Activate.ps1

# install dependencies
pip install -r requirements.txt

# run the dev server with auto-reload
uvicorn app.main:app --reload
```

There are no test, lint, or format commands configured yet. If you add tooling (pytest, ruff,
etc.), record the commands here.

## Architecture

- **`backend/app/main.py`** — FastAPI app entrypoint; routers should be included here via
  `app.include_router(...)` as they're added.
- **`backend/app/db/database.py`** — SQLAlchemy engine/session setup. Reads `DATABASE_URL` from
  the environment (via `.env`, loaded with `python-dotenv`) and raises at import time if it's
  unset. Exposes `get_db()` as a FastAPI dependency yielding a `Session`.
- **`backend/app/db/base.py`** — Declarative `Base` class; all ORM models should inherit from it.
- **`backend/app/models/`** — intended for SQLAlchemy ORM models (empty so far).
- **`backend/app/schemas/`** — intended for Pydantic request/response schemas (empty so far).
- **`backend/app/routers/`** — intended for FastAPI `APIRouter` modules, one per resource (empty
  so far).
- **`backend/app/services/`** — intended for business logic decoupled from routing/DB layers
  (empty so far).
- **`backend/app/core/`** — intended for cross-cutting config/settings (empty so far).

Dependencies (`backend/requirements.txt`): FastAPI + Uvicorn for the web layer, SQLAlchemy +
psycopg2-binary for Postgres access, Pydantic for validation, python-dotenv for config loading.

The database is Postgres, connected via `psycopg2`. Connection string lives in `backend/.env` as
`DATABASE_URL` (gitignored) — never commit real credentials there.

## Development Guidelines

### General

- Explain your reasoning before implementing significant changes.
- Keep solutions simple unless additional complexity is justified.
- Follow clean architecture principles.
- Avoid overengineering.

### FastAPI

- Use APIRouter for every resource.
- Keep routers thin.
- Put business logic inside services.
- Use dependency injection where appropriate.

### SQLAlchemy

- Use SQLAlchemy 2.0 syntax.
- Use typed ORM models (`Mapped`, `mapped_column`).
- Define relationships with `relationship()` and `back_populates`.
- Never duplicate database logic.

### Pydantic

- Create separate schemas for:
  - Create
  - Update
  - Response

Never use one schema for everything.

### API Design

- Follow REST conventions.
- Use proper HTTP status codes.
- Validate all request data.
- Return consistent response models.

### Code Style

- Use Python type hints everywhere.
- Write readable code.
- Prefer descriptive variable names.
- Add docstrings only when they provide real value.

### Teaching Mode

This project is also for learning.

Whenever implementing a feature:
1. Explain why the chosen approach is recommended.
2. Mention any important alternatives.
3. Point out common beginner mistakes.
4. Keep explanations concise.

## Before making changes

Before generating code:

- Check the existing project structure.
- Reuse existing code whenever possible.
- Do not introduce new libraries unless necessary.
- If a requested change affects architecture, explain the trade-offs first.