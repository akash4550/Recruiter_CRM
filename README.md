# Mayzax CRM

Mayzax CRM is a production-focused customer-relationship and recruitment management application.
The backend is a Node.js + Express API with PostgreSQL; the frontend is a Vite + React SPA.

This README documents how to run, test, and deploy the exact code included in this submission.

## Quick Summary

- Backend: Node.js (CommonJS), Express, PostgreSQL (`pg` client).
- Frontend: React, Vite, React Router, Axios, Tailwind CSS.
- Auth: JWT tokens issued by the API; password hashes use bcrypt.

## Requirements

- Node.js (16+ recommended)
- PostgreSQL (12+)

## Environment (important variables)

Backend (example):

```
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=mayzax_crm
DB_USER=postgres
DB_PASSWORD=yourpassword

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h
RESET_TOKEN_EXPIRES_IN=1h
```

Frontend (example `frontend/.env`):

```
VITE_API_BASE_URL=http://localhost:5000/api
```

## Install and run (local)

1. Install backend deps and start API:

```bash
cd backend
npm install
npm start
```

2. Install frontend deps and start dev server:

```bash
cd frontend
npm install
npm run dev
```

3. Initialize database schema (Postgres must be running):

```bash
psql -U postgres -c "CREATE DATABASE mayzax_crm;"
psql -U postgres -d mayzax_crm -f backend/schema.sql
```

Health check: `GET /api/health` (e.g. `http://localhost:5000/api/health`).

## Tech Stack and Key Dependencies

- Backend (from `backend/package.json`): `express`, `pg`, `jsonwebtoken`, `bcryptjs`, `express-validator`, `helmet`, `cors`, `express-rate-limit`, `dotenv`.
- Frontend (from `frontend/package.json`): `react`, `react-dom`, `react-router-dom`, `axios`, `tailwindcss`, `vite`.

These lists reflect the packages actually used by the current codebase.

## Features (implemented)

- Authentication
  - Email/password login (`POST /api/auth/login`).
  - JWT-protected routes; token verification and role-aware middleware.
  - Password hashing using bcrypt; forgot-password flow issues a reset token (not emailed in this build).
  - Frontend verifies session by requesting `/api/auth/profile` on app startup.

- Clients
  - List, create, update, archive toggle, and delete clients.
  - Search and filter in list endpoints; CSV export available in the frontend `DataTable` component.

- Employees
  - Admin-only endpoints for listing, creating, updating, and removing employees.
  - Employee records are linked to `users` and include department/designation/reporting manager.

- Recruiters
  - Admin-only CRUD for recruiter profiles and assigned fields.
  - Recruiter performance endpoint exists (`GET /api/crm/recruiters/performance`).

- Positions
  - Create, list, view, update, and delete job positions linked to clients and recruiters.

- Tasks / Follow-ups
  - Create, list, update, delete tasks; RBAC enforces visibility and assignment rules.
  - `GET /api/crm/tasks/due-today` and analytics summary endpoint (`/api/crm/analytics/summary`).

- Activity feed
  - Recent activity entries available via `/api/crm/activities` and `/api/crm/activities/recent`.

If you require a feature to be explicitly disabled or removed from the UI, tell me which one and I will mark it "Not implemented in this version." Currently the listed items above are implemented in the codebase.

## API reference (selected endpoints)

- `POST /api/auth/login` — login, returns JWT and user.
- `GET /api/auth/profile` — returns authenticated user's profile.
- `GET /api/health` — service and DB health.
- `GET /api/crm/clients` — list clients (search, filter, pagination supported).
- `POST /api/crm/clients` — create client (role-protected).
- `GET /api/crm/positions` — list positions.
- `POST /api/crm/tasks` — create task.
- `GET /api/crm/analytics/summary` — dashboard metrics.

For a full list, consult `backend/routes/authRoutes.js` and `backend/routes/crmRoutes.js`.

## Test credentials (seeded)

The database schema (`backend/schema.sql`) includes a seeded Super Admin account useful for review and testing:

- Email: `admin@mayzax.com`
- Password: `Admin@123`

Use these credentials after you load `backend/schema.sql` into a fresh Postgres instance.

## Production deployment (Render)

This project is deployed as a split service on Render:

- Backend: Render Web Service (Node). Start command: `node server.js`. Set the environment variables listed above in Render's dashboard. Ensure `PORT` is set by Render; the app reads `process.env.PORT`.
- Frontend: Render Static Site. Build with `npm run build` inside `frontend` and publish the `frontend/dist` directory.

Environment notes for Render:

- Backend requires `DATABASE_URL` or the individual DB variables used in `backend/config/db.js`.
- Supply `JWT_SECRET` and other secrets via Render's environment settings — do not commit secrets to source control.

## Contributing / Notes for examiners

- The API uses consistent response envelopes: `{ success: boolean, data?: any, message?: string }`.
- The database schema uses integer `SERIAL`/`BIGSERIAL` primary keys. If you need UUID primary keys, migrate the schema before production use.

---

If you'd like, I can:

- Run a quick script to extract and list all endpoints automatically.
- Add a short `DEPLOYMENT.md` with Render step-by-step keys and expected environment variables.

Updated to match the code currently in this repository.
