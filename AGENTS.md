# AGENTS.md

## Project Overview

This repository contains an AI-powered Job Assistant web application.

The application helps users:

- manage job applications
- track application statuses
- manage multiple resumes
- analyze resumes against job descriptions using AI
- receive AI-powered resume improvement suggestions
- eventually generate tailored cover letters
- eventually generate interview preparation material

The project is also a learning and portfolio project.

When implementing significant features, explain important architectural decisions and new concepts concisely before or while implementing them.

---

## Current Project State

The backend is an active FastAPI application connected to PostgreSQL.

Already implemented:

- FastAPI project structure
- PostgreSQL connection
- SQLAlchemy 2.0 ORM models
- Pydantic v2 schemas
- Service layer
- Dependency injection for database sessions
- User registration
- User login
- Secure password hashing
- JWT authentication
- `get_current_user` authentication dependency
- Protected routes
- Job Application CRUD
- Job Application ownership enforcement
- Resume upload and management
- Resume ownership enforcement
- PDF resume text extraction
- Resume to Job Description AI analysis

Job applications and resumes are always scoped to the authenticated user.

Cross-user access to protected resources should return `404 Not Found` rather than exposing whether another user's resource exists.

The frontend has a React foundation built with Vite and JavaScript. It includes registration and login flows, centralized authentication state, authenticated Axios requests, protected routes, logout, a user-scoped Dashboard, Job Application CRUD UI, Resume Management UI, and Resume-to-Job AI Analysis UI with history. Other feature UI is not implemented yet.

The first AI analysis feature is implemented using OpenAI Structured Outputs.

Upcoming major features include:

1. Dashboard enhancements
2. AI resume improvement suggestions
3. Cover letter generation
4. Interview preparation
5. React frontend feature development
6. Dockerization
7. Deployment

Before implementing any feature, inspect the existing repository because the source code is the ultimate source of truth and this document may not always reflect the latest implementation details.

---

## Commands

Backend commands should be run from `backend/`.

Activate the existing virtual environment on PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Install development and test dependencies:

```powershell
pip install -r requirements-dev.txt
```

Run the development server:

```powershell
uvicorn app.main:app --reload
```

Check the current database migration revision:

```powershell
alembic current
```

Apply all pending database migrations:

```powershell
alembic upgrade head
```

Roll back the most recent migration:

```powershell
alembic downgrade -1
```

Create a migration after changing SQLAlchemy models:

```powershell
alembic revision --autogenerate -m "describe the schema change"
```

AI resume analysis requires:

```text
OPENAI_API_KEY=<your API key>
OPENAI_MODEL=gpt-5-mini  # optional; defaults to gpt-5-mini
```

Run the automated test suite:

```powershell
pytest
```

Frontend commands should be run from `frontend/`.

Install frontend dependencies:

```powershell
npm install
```

Run the frontend development server:

```powershell
npm run dev
```

Run the frontend test suite:

```powershell
npm test
```

When adding a new dependency, update `requirements.txt`.

If testing, linting, formatting, migration tooling, or other development tools are introduced later, document the relevant commands here.

---

## Architecture

The backend follows a layered architecture:

```text
HTTP Request
    ↓
Router
    ↓
Pydantic Schema
    ↓
Service Layer
    ↓
SQLAlchemy ORM
    ↓
PostgreSQL
```

Responses travel back through the same layers.

Maintain this architecture unless there is a strong and clearly justified reason to change it.

---

## Routers

Location:

`backend/app/routers/`

Responsibilities:

- define HTTP endpoints
- receive HTTP requests
- use Pydantic schemas for request validation
- use FastAPI dependencies
- authenticate users where necessary
- call services
- translate service results into appropriate HTTP responses
- define response models
- define appropriate HTTP status codes

Routers must remain thin.

Routers should NOT contain:

- SQLAlchemy queries
- significant business logic
- direct filesystem logic
- AI provider SDK logic
- duplicated authentication logic

Use `APIRouter` for every resource.

Register new routers in `app/main.py`.

---

## Services

Location:

`backend/app/services/`

Services contain business logic and database operations.

Responsibilities include:

- querying data
- creating entities
- updating entities
- deleting entities
- enforcing resource ownership
- coordinating operations between application components
- performing domain-specific business rules

Services should receive a SQLAlchemy `Session` rather than creating their own database sessions.

Services should not depend on HTTP concepts unless there is a strong architectural reason.

Avoid using `HTTPException` inside services when the router can translate a service result such as `None` into the appropriate HTTP response.

Typical service return values include:

- ORM objects
- lists of ORM objects
- `None`
- booleans
- structured application-level results where appropriate

Do not return HTTP responses from services.

---

## SQLAlchemy Models

Location:

`backend/app/models/`

Models represent PostgreSQL tables.

Rules:

- use SQLAlchemy 2.0 syntax
- use `Mapped`
- use `mapped_column`
- use proper Python type hints
- use typed relationships
- use `relationship()`
- use `back_populates`
- define foreign keys explicitly
- avoid business logic inside ORM models

Models describe database persistence.

They should not be used as replacements for Pydantic request/response schemas.

Do not change the database schema casually.

If a feature requires a database schema change, explain why before implementing it.

---

## Pydantic Schemas

Location:

`backend/app/schemas/`

Pydantic schemas define the API contract.

Create separate schemas where appropriate for:

- Create
- Update
- Response
- Login/authentication
- Feature-specific requests
- Feature-specific responses

Never use one schema for everything.

Pydantic schemas should control which data enters and leaves the API.

Never expose sensitive internal fields such as:

- `password_hash`
- secrets
- JWT secrets
- internal authentication information

Use Pydantic v2 syntax.

Validate request data before it reaches the service/database layer whenever possible.

Invalid client input should preferably fail with a validation response such as `422` rather than causing a database error or internal server error.

---

## Database

Database:

PostgreSQL

Database access:

SQLAlchemy 2.0 using psycopg2.

Configuration is loaded from:

`backend/.env`

through the `DATABASE_URL` environment variable.

Never commit:

- `.env`
- database credentials
- API keys
- JWT secrets
- passwords
- other secrets

Database session dependency is defined in:

`backend/app/db/database.py`

Reuse the existing `get_db()` dependency.

Do not create separate engines or session factories without a justified reason.

---

## Dependency Injection

Use FastAPI dependency injection where appropriate.

Database sessions should be provided through the existing:

```python
Depends(get_db)
```

Authentication should use the existing authentication dependency rather than manually decoding JWT tokens inside every router.

Dependencies should be reused rather than duplicated.

---

## Authentication and Security

Authentication is JWT-based.

Passwords must always be securely hashed.

Never:

- store plain-text passwords
- return password hashes through the API
- log passwords
- put secrets directly in source code
- manually trust a client-provided user identity

Protected routes should use the existing authentication dependency rather than implementing token validation independently.

Use the authenticated user as the source of identity.

For user-owned resources:

DO NOT accept `user_id` from the client when ownership can be derived from the authenticated user.

Prefer:

```python
current_user.id
```

over trusting a client-provided user ID.

---

## Resource Ownership

User-owned resources must always be scoped to the authenticated user.

For example, retrieving a job application should conceptually behave like:

```sql
WHERE id = :resource_id
AND user_id = :current_user_id
```

The same principle applies to:

- Job Applications
- Resumes
- AI Analyses
- generated cover letters if persisted
- interview preparation data if persisted
- future user-owned resources

Do not retrieve another user's resource and expose information about it before checking ownership.

Cross-user access should generally behave as if the resource does not exist.

Prefer `404 Not Found` over `403 Forbidden` for cross-user access when returning `403` would reveal that another user's private resource exists.

---

## Job Applications

Job Applications are the central entity of the application.

Existing functionality includes:

- create
- list
- retrieve
- update
- delete

All operations are scoped to the authenticated user.

Supported statuses must remain consistent with the database constraint:

- `Saved`
- `Applied`
- `Interview`
- `Rejected`
- `Accepted`

Use Pydantic validation so invalid statuses return `422` rather than causing database errors.

Future features such as:

- AI resume matching
- cover letter generation
- interview preparation
- dashboard statistics

will build on Job Applications.

A Job Application may eventually act as the main context connecting:

```text
User
  ↓
Job Application
  ├── Resume
  ├── AI Analysis
  ├── Cover Letter
  └── Interview Preparation
```

Do not overengineer these relationships before they are needed.

---

## Resumes

Users may manage multiple resumes.

Resume files are stored outside PostgreSQL while resume metadata/path information is stored in the database.

Resume ownership must always be enforced.

Users should only be able to:

- upload their own resumes
- list their own resumes
- retrieve their own resumes
- delete their own resumes

The Resume module should remain compatible with future:

- PDF text extraction
- AI analysis
- resume selection
- resume versioning
- resume comparison

Do not tightly couple resume storage to a specific AI provider.

Do not store raw PDF binary content directly in PostgreSQL unless the architecture is intentionally changed in the future.

---

## Dashboard

The Dashboard will act as the primary overview after login.

It should eventually summarize information such as:

- total job applications
- Saved applications
- Applied applications
- Interview applications
- Rejected applications
- Accepted applications
- recent applications
- resume count
- recent AI analyses

Dashboard aggregation logic should belong in a dedicated service rather than being implemented directly inside the router.

Do not calculate dashboard statistics on the frontend when the backend can provide them efficiently.

---

## AI Architecture

AI functionality is the next major phase of the application.

Do not scatter AI provider calls throughout routers, services, or unrelated modules.

Prefer a dedicated AI structure such as:

```text
backend/app/
├── ai/
│   ├── __init__.py
│   ├── client.py
│   ├── prompts.py
│   └── analyzer.py
```

The exact structure may evolve based on implementation needs.

Do not create unnecessary abstractions before they are needed.

---

## AI Client

A module such as:

`app/ai/client.py`

should be responsible for communication with the external LLM provider.

Provider-specific SDK code should remain isolated when practical.

Avoid directly calling OpenAI, Anthropic, or another AI SDK from routers.

Application business logic should not depend heavily on provider-specific implementation details.

This makes it easier to:

- change models
- change providers
- test AI-related functionality
- handle provider failures
- introduce fallback providers later if needed

Do not overengineer provider abstraction before there is a real need.

---

## AI Prompts

Reusable prompts should live in a dedicated location such as:

`app/ai/prompts.py`

Do not place large prompts directly inside:

- routers
- database models
- unrelated services

Prompts should be:

- clear
- reusable
- versionable
- easy to modify
- designed for structured responses where appropriate

---

## AI Analyzer

A module such as:

`app/ai/analyzer.py`

should coordinate AI-specific analysis.

It may be responsible for:

- preparing input for the AI client
- combining resume text and job descriptions
- selecting the correct prompt
- calling the AI client
- validating AI output
- converting provider output into application-level structured data

It should not be responsible for HTTP routing.

---

## First AI Feature

The first major AI feature should be:

Resume ↔ Job Description Analysis

Conceptual flow:

```text
Authenticated User
        ↓
Job Application
        +
Selected Resume
        ↓
Ownership Validation
        ↓
Extract Resume Text
        ↓
Job Description
        ↓
AI Analyzer
        ↓
AI Client
        ↓
LLM
        ↓
Structured Result
        ↓
Validation
        ↓
AIAnalysis record
        ↓
API Response
```

The expected analysis may eventually include:

- match score
- summary
- strengths
- weaknesses
- missing skills
- missing keywords
- recommendations
- resume improvement suggestions

Prefer structured AI output over unstructured free-form text where practical.

AI-generated output should be validated before being persisted.

Do not blindly trust AI-generated JSON or other structured output.

---

## AI Provider Independence

Avoid unnecessarily coupling business logic to a single AI provider.

Application code should ideally depend on an internal AI abstraction rather than directly calling a provider SDK from many locations.

For example:

```text
Application
    ↓
AI Analyzer
    ↓
AI Client
    ↓
Provider SDK
```

rather than:

```text
Router
    ↓
Provider SDK
```

This should make it possible to replace or add providers later without rewriting the entire application.

However, avoid creating a complex provider abstraction before it is actually needed.

Keep the first implementation simple.

---

## PDF Processing

Resume PDF extraction should be separate from AI provider logic.

Conceptually:

```text
PDF
 ↓
PDF extraction service
 ↓
Plain text
 ↓
AI analyzer
 ↓
AI client
```

The AI client should generally receive text rather than being responsible for reading files from disk.

A dedicated PDF/document extraction service may be introduced.

Responsibilities may include:

- opening the uploaded PDF
- extracting text
- validating that meaningful text was extracted
- handling corrupted PDFs
- handling extraction failures

Do not mix PDF parsing logic directly into AI prompts or routers.

---

## AI Analysis Persistence

AI analysis results should be associated with the authenticated user's resources.

When an AI analysis is performed, ownership of both:

- Job Application
- Resume

must be verified.

Never allow a user to analyze another user's resume or job application by supplying another resource ID.

Persisted AI analysis should be associated with the relevant application/resources using existing database relationships where appropriate.

If the existing `AIAnalysis` model needs to change to support the final AI response structure, inspect the current model first and explain any database schema changes before implementing them.

---

## Future AI Features

Future features may include:

### Resume Improvement

AI identifies:

- weak bullet points
- missing keywords
- missing skills
- unclear descriptions
- opportunities to quantify achievements

### Cover Letter Generation

Generate a tailored cover letter based on:

- selected resume
- job application
- company
- position
- job description

### Interview Preparation

Generate:

- likely interview questions
- technical questions
- behavioral questions
- suggested preparation topics
- questions based on gaps between the resume and job description

These features should reuse the existing AI layer rather than creating separate provider integrations.

---

## API Design

Follow REST conventions.

Use appropriate HTTP status codes, including where applicable:

- `200 OK`
- `201 Created`
- `204 No Content`
- `400 Bad Request`
- `401 Unauthorized`
- `404 Not Found`
- `409 Conflict`
- `422 Unprocessable Entity`
- `500 Internal Server Error`

Do not return `500` for predictable client validation errors.

Use consistent response models.

Validate client input.

Do not expose:

- stack traces
- secrets
- database implementation details
- provider secrets
- sensitive internal information

through API error messages.

---

## Error Handling

Handle expected failures explicitly.

Examples include:

- duplicate email
- invalid login
- invalid JWT
- expired JWT
- missing resource
- cross-user resource access
- invalid application status
- unsupported resume format
- corrupted PDF
- PDF with no extractable text
- AI provider failure
- invalid AI output

Do not hide unexpected errors silently.

Do not expose sensitive implementation details to the client.

---

## Development Guidelines

### General

- Inspect existing code before modifying it.
- Reuse existing abstractions.
- Keep implementations simple.
- Avoid unnecessary dependencies.
- Avoid overengineering.
- Prefer incremental changes.
- Do not rewrite working modules without a clear reason.
- Preserve existing architecture and naming conventions.
- Explain significant architectural changes before making them.
- Do not implement unrelated features while completing a focused task.

Source code is the ultimate source of truth.

If this document conflicts with the actual current implementation, inspect the implementation and explain the discrepancy before making significant changes.

---

## Code Style

- Use Python type hints.
- Prefer descriptive names.
- Keep functions focused.
- Avoid unnecessary comments.
- Add docstrings only when they provide real value.
- Follow the style already established in the repository.
- Prefer readable code over clever code.
- Avoid premature abstractions.
- Avoid duplicated logic.

---

## Dependencies

Before introducing a new library:

1. Check whether the project already has a dependency that solves the problem.
2. Explain why the new dependency is needed.
3. Prefer maintained and widely used libraries.
4. Update `requirements.txt`.

Do not introduce large dependencies for trivial functionality.

---

## Testing Changes

After implementing backend functionality:

- verify imports
- verify that the application starts
- test the happy path
- test validation failures
- test unauthenticated access for protected endpoints
- test invalid JWT behavior where relevant
- test cross-user ownership where relevant
- test database persistence where relevant

For user-owned resources, testing with at least two different users is strongly recommended.

For example:

```text
User A creates resource
        ↓
User A can access it
        ↓
User B tries to access it
        ↓
404
```

Do not claim something works unless it has actually been tested.

If testing could not be performed, state that clearly.

---

## Git

Do not commit:

- `.env`
- `.venv/`
- `__pycache__/`
- secrets
- generated temporary files
- user-uploaded resume files unless intentionally required

Do not create Git commits unless explicitly asked.

Keep changes logically scoped so they can be committed independently.

When implementing a significant feature, avoid mixing unrelated refactors into the same change.

---

## Frontend

The frontend foundation uses:

- Vite
- React
- JavaScript
- React Router
- Axios
- Tailwind CSS
- shadcn/ui

Frontend component tests use Vitest with React Testing Library, jest-dom matchers, and a jsdom environment. API calls are mocked in frontend tests.

Frontend styling uses Tailwind CSS v4 through the official Vite plugin and locally generated shadcn/ui JavaScript components. Authenticated routes share a responsive `AppLayout` with a sidebar on desktop and compact horizontal navigation on smaller screens. Domain components remain custom and compose the shared UI primitives in `frontend/src/components/ui/`.

Frontend source code is organized by responsibility:

```text
frontend/src/
├── api/          # Shared API client configuration
├── auth/         # Authentication context, hook, and route guard
├── components/   # Small reusable UI components
├── pages/        # Route-level page components
├── App.jsx       # Route definitions
└── main.jsx      # Application entry point
```

The registration page posts the backend's required user fields to `/users/register` and redirects successful registrations to `/login`. Registration does not automatically authenticate the user. Login and registration link to each other and share a public-route guard that redirects already-authenticated users to `/dashboard`.

The login page posts JSON credentials to `/users/login`, passes the returned JWT to `AuthContext`, and redirects to `/dashboard`. The context persists the token under the `access_token` local-storage key. The shared Axios client adds the bearer token to requests, and a response interceptor clears invalid authentication after a `401` response. Dashboard, Applications, and Resumes routes use a shared protected-route guard.

The Dashboard fetches the authenticated user's aggregate data from `GET /dashboard` and renders application statistics and recent applications. The Applications page supports listing, creating, editing, and deleting the authenticated user's Job Applications through the existing ownership-scoped API. It also supports selecting an application and resume, triggering the existing structured AI analysis, and viewing analysis history without rerunning the model. The Resumes page supports authenticated PDF upload, listing, and deletion. Dashboard, Applications, and Resumes share a minimal authenticated navigation component.

Local storage is acceptable for this MVP, but its tokens are accessible to JavaScript and therefore exposed if an XSS vulnerability exists. Some production applications instead use secure HttpOnly cookies as part of a broader CSRF-aware authentication design.

The FastAPI application explicitly allows the local Vite development origin, `http://localhost:5173`, through CORS middleware.

The backend API should remain frontend-independent.

Do not introduce frontend-specific behavior into backend business logic.

The future frontend will likely include:

- Login
- Registration
- Dashboard
- Job Application management
- Resume management
- Cover letter generation
- Interview preparation

Backend response models should remain clean and predictable so the React frontend can consume them easily.

---

## Deployment

Deployment has not been implemented yet.

Future deployment work may include:

- Docker
- production environment variables
- PostgreSQL production database
- production CORS configuration
- secure secret management
- production ASGI server configuration
- persistent resume file storage or object storage
- HTTPS
- AI provider configuration

Do not optimize prematurely for deployment at the expense of development simplicity.

However, avoid design decisions that would make deployment unnecessarily difficult later.

---

## Teaching Mode

This project is being built both as:

1. a portfolio application
2. a way to learn FastAPI, backend development, and AI engineering

When implementing a significant new concept:

1. Briefly explain what it is.
2. Explain why it belongs in the chosen layer.
3. Mention important alternatives when relevant.
4. Point out common beginner mistakes.
5. Then implement it.

Keep explanations concise and practical.

Do not turn every small code change into a tutorial.

The goal is to understand the architecture while still making steady development progress.

---

## Before Making Changes

Before modifying code:

1. Read this `AGENTS.md`.
2. Inspect the relevant existing files.
3. Understand the current implementation.
4. Reuse existing services, schemas, dependencies, and utilities.
5. Check whether the requested feature already partially exists.
6. Check current models and database relationships before assuming their structure.
7. Do not assume this document is more current than the source code.

If the requested change would significantly alter:

- architecture
- database design
- authentication
- security
- ownership rules
- public API contracts

explain the trade-off before proceeding.

For normal implementation work, proceed without unnecessary confirmation.

---

## Core Principles

When uncertain, prioritize these principles:

1. Security
2. Correct resource ownership
3. Clear separation of concerns
4. Simple architecture
5. Strong input/output validation
6. Maintainability
7. AI provider isolation
8. Testability
9. Learning value
10. Avoiding unnecessary complexity

The application should evolve incrementally rather than being overengineered upfront.
