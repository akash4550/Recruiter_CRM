# Mayzax CRM

Mayzax CRM is a MERN-style customer relationship and recruitment management application for managing clients, employees, recruiters, open positions, and follow-up tasks. The backend uses Node.js, Express, PostgreSQL, JWT authentication, and role-based access control. The frontend uses React, Vite, Axios, and Tailwind CSS.

## Project Overview

The system provides a secured CRM dashboard for Mayzax users. Authenticated users can access role-specific modules for client management, employee administration, recruiter management, job position tracking, dashboard metrics, and task follow-up tracking.

Core goals:

- Secure login using JWT.
- Role-aware access for Admin, HR, Recruiter, Sales Executive, and Employee users.
- PostgreSQL-backed CRUD operations.
- Consistent API response envelopes.
- Dashboard metrics and follow-up visibility.
- Production-oriented middleware for CORS, Helmet, rate limiting, validation, and centralized error handling.

## Roles and Permissions

| Role | Typical Access |
| --- | --- |
| Super Admin | Full system access, user provisioning, and global configuration changes. |
| Admin | Full access to CRM operations, employee and recruiter management, and dashboard oversight. |
| HR | Employee lifecycle tasks, position oversight, recruiter coordination, and task visibility. |
| Recruiter | Manage recruiting-related positions and view recruiter-specific performance data. |
| Sales Executive | Manage client records and follow-up tasks relevant to their accounts. |
| Employee | View personal dashboard information and task assignments. |

## Tech Stack

- Frontend: React, Vite, React Router, Axios, Tailwind CSS
- Backend: Node.js, Express, CommonJS modules
- Database: PostgreSQL with `pg` connection pool
- Authentication: JWT, bcrypt password hashing
- Validation: express-validator
- Security middleware: Helmet, CORS, express-rate-limit

## Setup Instructions

### 1. Clone or Open the Project

Open the project root:

```bash
cd "Mayzax CRM 1"
```

### 2. Configure Environment Variables

Create the backend environment file from the provided example:

```bash
copy .env.example backend\.env
```

If you want to use the shared root example directly, keep the same keys in a root `.env` file as well. The backend code reads these values from the environment at runtime.

Required variables:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=mayzax_crm
DB_USER=postgres
DB_PASSWORD=your_actual_password
DB_POOL_MAX=20
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=5000

JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=24h
RESET_TOKEN_EXPIRES_IN=1h
```

For the frontend, create or update `frontend/.env` if needed:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Install Dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd ../frontend
npm install
```

### 4. Initialize the Database

Make sure PostgreSQL is running, then create the database and load the schema:

```bash
psql -U postgres -c "CREATE DATABASE mayzax_crm;"
psql -U postgres -d mayzax_crm -f backend/schema.sql
```

If your local PostgreSQL uses a different user or password, adjust the command accordingly.

### 5. Start the Backend

```bash
cd backend
npm start
```

Backend default URL:

```text
http://localhost:5000/api
```

Health check:

```text
http://localhost:5000/api/health
```

### 6. Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend default URL:

```text
http://localhost:5173
```

## Available Features

- Authentication
  - Login with email and password.
  - JWT-based protected routes.
  - Password hashing with bcrypt.
  - Profile verification on app startup.

- Dashboard
  - Active client count.
  - Open position count.
  - Follow-ups due today.
  - Recent task visibility.

- Client Management
  - List, create, update, archive, and delete clients.
  - Search, filter, and CSV export through DataTable.

- Employee Management
  - Admin-only employee listing and account management.
  - Employee creation with linked user account.
  - Role and status updates.

- Recruiter Management
  - Admin-only recruiter CRUD.
  - Recruiter field assignment.
  - Recruiter performance endpoint.

- Job Position Tracking
  - Create and view job positions.
  - Link positions to clients and recruiters.
  - Track status, openings, technology, location, and salary range.

- Task and Follow-up Management
  - Create, view, update, and delete follow-up tasks.
  - Tasks can be linked to clients.
  - Non-Admin/HR task creation defaults assignment to the current user.
  - Users only see their own tasks unless they have elevated roles.

## API Reference

### Authentication

- `POST /api/auth/login` — Authenticate a user and return a JWT.
- `POST /api/auth/forgot-password` — Request a password reset flow.
- `POST /api/auth/change-password` — Change the current user's password.
- `GET /api/auth/profile` — Retrieve the authenticated user's profile.

### Health

- `GET /api/health` — Verify the API and database connectivity.

### CRM Resources

- `GET /api/crm/clients` — List clients.
- `POST /api/crm/clients` — Create a client.
- `PUT /api/crm/clients/:id` — Update a client.
- `PATCH /api/crm/clients/:id/archive` — Archive a client.
- `GET /api/crm/employees` — List employees.
- `POST /api/crm/employees` — Create an employee account.
- `PUT /api/crm/employees/:id` — Update an employee.
- `DELETE /api/crm/employees/:id` — Remove an employee.
- `GET /api/crm/recruiters` — List recruiters.
- `POST /api/crm/recruiters` — Create a recruiter.
- `PUT /api/crm/recruiters/:id` — Update a recruiter.
- `DELETE /api/crm/recruiters/:id` — Remove a recruiter.
- `GET /api/crm/positions` — List positions.
- `POST /api/crm/positions` — Create a position.
- `PUT /api/crm/positions/:id` — Update a position.
- `DELETE /api/crm/positions/:id` — Remove a position.
- `GET /api/crm/tasks` — List tasks.
- `POST /api/crm/tasks` — Create a task.
- `PUT /api/crm/tasks/:id` — Update a task.
- `DELETE /api/crm/tasks/:id` — Remove a task.
- `GET /api/crm/analytics/summary` — Retrieve dashboard metrics.
- `GET /api/crm/activities/recent` — Retrieve recent activity entries.

## API Response Convention

Successful responses use:

```json
{
  "success": true,
  "data": {}
}
```

Error responses use:

```json
{
  "success": false,
  "message": "Readable error message"
}
```

## Assessment Notes

- The active backend route files are `authRoutes.js` and `crmRoutes.js`.
- Stale employee and position route files have been removed to avoid CommonJS/ESM mismatch and schema drift.
- The database schema currently uses integer `SERIAL`/`BIGSERIAL` primary keys with foreign key constraints.
- If strict UUID primary keys are required by the assessment, the schema must be migrated from integer IDs to UUIDs before final deployment.
