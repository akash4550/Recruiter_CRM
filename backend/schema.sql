CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS positions CASCADE;
DROP TABLE IF EXISTS recruiters CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS position_status CASCADE;
DROP TYPE IF EXISTS employee_status CASCADE;
DROP TYPE IF EXISTS client_status CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

CREATE TYPE user_role AS ENUM (
  'Super Admin',
  'Admin',
  'HR',
  'Recruiter',
  'Sales Executive',
  'Employee'
);

CREATE TYPE user_status AS ENUM ('Active', 'Inactive');
CREATE TYPE client_status AS ENUM ('Active', 'Archived');
CREATE TYPE employee_status AS ENUM ('Active', 'Inactive');
CREATE TYPE position_status AS ENUM ('Open', 'Closed', 'Paused');
CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE task_status AS ENUM ('Pending', 'Completed');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  status user_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE UNIQUE INDEX idx_users_email_lower
ON users (LOWER(email));

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  industry VARCHAR(100),
  address TEXT,
  gst VARCHAR(50),
  notes TEXT,
  status client_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT clients_company_name_not_empty
    CHECK (TRIM(company_name) <> ''),

  CONSTRAINT clients_email_format
    CHECK (
      email IS NULL OR
      email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_company_name ON clients(company_name);
CREATE INDEX idx_clients_created_at ON clients(created_at);

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  department VARCHAR(100),
  designation VARCHAR(100),
  joining_date DATE,
  reporting_manager_id INTEGER,
  status employee_status NOT NULL DEFAULT 'Active',

  CONSTRAINT employees_user_fk
    FOREIGN KEY(user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT employees_manager_fk
    FOREIGN KEY(reporting_manager_id)
    REFERENCES employees(id)
    ON DELETE SET NULL,

  CONSTRAINT employees_no_self_reporting
    CHECK (
      reporting_manager_id IS NULL
      OR reporting_manager_id <> id
    )
);

CREATE INDEX idx_employees_user_id
ON employees(user_id);

CREATE INDEX idx_employees_reporting_manager
ON employees(reporting_manager_id);

CREATE INDEX idx_employees_department
ON employees(department);

CREATE INDEX idx_employees_status
ON employees(status);

CREATE TABLE recruiters (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  assigned_fields TEXT[],
  last_active TIMESTAMPTZ,

  CONSTRAINT recruiters_user_fk
    FOREIGN KEY(user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  recruiter_id INTEGER,
  job_title VARCHAR(255) NOT NULL,
  technology VARCHAR(255),
  experience VARCHAR(100),
  location VARCHAR(255),
  salary_min NUMERIC(12,2) DEFAULT 0,
  salary_max NUMERIC(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  employment_type VARCHAR(50),
  openings INTEGER DEFAULT 1,
  status position_status DEFAULT 'Open',

  CONSTRAINT positions_client_fk
    FOREIGN KEY(client_id)
    REFERENCES clients(id)
    ON DELETE CASCADE,

  CONSTRAINT positions_recruiter_fk
    FOREIGN KEY(recruiter_id)
    REFERENCES recruiters(id)
    ON DELETE SET NULL,

  CONSTRAINT positions_salary_check
    CHECK (salary_max >= salary_min),

  CONSTRAINT positions_openings_check
    CHECK (openings > 0)
);

CREATE TABLE tasks (
  id BIGSERIAL PRIMARY KEY,
  assigned_to_user_id INTEGER NOT NULL,
  client_id INTEGER,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  priority task_priority DEFAULT 'Medium',
  status task_status DEFAULT 'Pending',

  CONSTRAINT tasks_user_fk
    FOREIGN KEY(assigned_to_user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT tasks_client_fk
    FOREIGN KEY(client_id)
    REFERENCES clients(id)
    ON DELETE SET NULL
);

CREATE TABLE activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER,
  action_type VARCHAR(100) NOT NULL,
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT activity_logs_user_fk
    FOREIGN KEY(user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
);

COMMIT;

INSERT INTO users
(name,email,password_hash,role,status)
VALUES
(
'Akshay Lakwal',
'admin@mayzax.com',
crypt('Admin@123', gen_salt('bf')),
'Super Admin',
'Active'
);