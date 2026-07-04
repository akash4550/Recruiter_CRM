const bcrypt = require('bcryptjs');
const { query, pool, transaction } = require('../config/db');
const { logActivity } = require('../config/logger');

const BCRYPT_ROUNDS = 12;

const CLIENT_SORT_FIELDS = {
  company_name: 'c.company_name',
  contact_person: 'c.contact_person',
  created_at: 'c.created_at',
  status: 'c.status',
};

const POSITION_SORT_FIELDS = {
  job_title: 'p.job_title',
  technology: 'p.technology',
  location: 'p.location',
  status: 'p.status',
  openings: 'p.openings',
};

const TASK_SORT_FIELDS = {
  title: 't.title',
  due_date: 't.due_date',
  priority: 't.priority',
  status: 't.status',
};

const EMPLOYEE_SORT_FIELDS = {
  name: 'u.name',
  department: 'e.department',
  designation: 'e.designation',
  joining_date: 'e.joining_date',
  status: 'e.status',
};

const VALID_USER_ROLES = [
  'Super Admin',
  'Admin',
  'HR',
  'Recruiter',
  'Sales Executive',
  'Employee',
];

function createAppError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseSort(sortBy, sortOrder, allowedFields, defaultField) {
  const field = allowedFields[sortBy] ? allowedFields[sortBy] : allowedFields[defaultField];
  const order = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return { field, order };
}

// ---------------------------------------------------------------------------
// Client Management
// ---------------------------------------------------------------------------

async function getAllClients(req, res, next) {
  try {
    const {
      search = '',
      status,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const { field, order } = parseSort(sortBy, sortOrder, CLIENT_SORT_FIELDS, 'created_at');
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search.trim()) {
      conditions.push(
        `(c.company_name ILIKE $${paramIndex} OR c.contact_person ILIKE $${paramIndex})`
      );
      params.push(`%${search.trim()}%`);
      paramIndex += 1;
    }

    if (status && ['Active', 'Archived'].includes(status)) {
      conditions.push(`c.status = $${paramIndex}`);
      params.push(status);
      paramIndex += 1;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*)::INT AS total FROM clients c ${whereClause}`,
      params
    );

    const listParams = [...params, limitNum, offset];
    const result = await query(
      `SELECT c.id, c.company_name, c.contact_person, c.email, c.phone,
              c.industry, c.address, c.gst, c.notes, c.status, c.created_at
       FROM clients c
       ${whereClause}
       ORDER BY ${field} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      listParams
    );

    res.status(200).json({
      success: true,
      data: {
        clients: result.rows,
        pagination: {
          total: countResult.rows[0].total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(countResult.rows[0].total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getClientById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, company_name, contact_person, email, phone, industry,
              address, gst, notes, status, created_at
       FROM clients
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw createAppError('Client not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: { client: result.rows[0] },
    });
  } catch (err) {
    next(err);
  }
}

async function createClient(req, res, next) {
  try {
    const {
      company_name,
      contact_person,
      email,
      phone,
      industry,
      address,
      gst,
      notes,
      status = 'Active',
    } = req.body;

    const result = await query(
      `INSERT INTO clients (
         company_name, contact_person, email, phone, industry,
         address, gst, notes, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, company_name, contact_person, email, phone, industry,
                 address, gst, notes, status, created_at`,
      [
        company_name,
        contact_person || null,
        email || null,
        phone || null,
        industry || null,
        address || null,
        gst || null,
        notes || null,
        status,
      ]
    );

    const client = result.rows[0];

    await logActivity(
      req.user.id,
      'CLIENT_CREATE',
      `Created client "${client.company_name}" (ID: ${client.id}).`
    );

    res.status(201).json({
      success: true,
      message: 'Client created successfully.',
      data: { client },
    });
  } catch (err) {
    next(err);
  }
}

async function updateClient(req, res, next) {
  try {
    const { id } = req.params;
    const {
      company_name,
      contact_person,
      email,
      phone,
      industry,
      address,
      gst,
      notes,
      status,
    } = req.body;

    const existing = await query('SELECT id, company_name FROM clients WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      throw createAppError('Client not found.', 404);
    }

    const result = await query(
      `UPDATE clients
       SET company_name = COALESCE($1, company_name),
           contact_person = COALESCE($2, contact_person),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           industry = COALESCE($5, industry),
           address = COALESCE($6, address),
           gst = COALESCE($7, gst),
           notes = COALESCE($8, notes),
           status = COALESCE($9, status)
       WHERE id = $10
       RETURNING id, company_name, contact_person, email, phone, industry,
                 address, gst, notes, status, created_at`,
      [
        company_name,
        contact_person,
        email,
        phone,
        industry,
        address,
        gst,
        notes,
        status,
        id,
      ]
    );

    const client = result.rows[0];

    await logActivity(
      req.user.id,
      'CLIENT_UPDATE',
      `Updated client "${client.company_name}" (ID: ${client.id}).`
    );

    res.status(200).json({
      success: true,
      message: 'Client updated successfully.',
      data: { client },
    });
  } catch (err) {
    next(err);
  }
}

async function archiveClient(req, res, next) {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE clients
       SET status = CASE
         WHEN status = 'Active'::client_status THEN 'Archived'::client_status
         ELSE 'Active'::client_status
       END
       WHERE id = $1
       RETURNING id, company_name, status`,
      [id]
    );

    if (result.rows.length === 0) {
      throw createAppError('Client not found.', 404);
    }

    const client = result.rows[0];

    await logActivity(
      req.user.id,
      'CLIENT_ARCHIVE_TOGGLE',
      `Toggled archive status for client "${client.company_name}" (ID: ${client.id}) to "${client.status}".`
    );

    res.status(200).json({
      success: true,
      message: `Client status updated to ${client.status}.`,
      data: { client },
    });
  } catch (err) {
    next(err);
  }
}

async function deleteClient(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT id, company_name FROM clients WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      throw createAppError('Client not found.', 404);
    }

    const client = existing.rows[0];

    await query('DELETE FROM clients WHERE id = $1', [id]);

    await logActivity(
      req.user.id,
      'CLIENT_DELETE',
      `Deleted client "${client.company_name}" (ID: ${client.id}).`
    );

    res.status(200).json({
      success: true,
      message: 'Client deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Employee Management
// ---------------------------------------------------------------------------

async function getAllEmployees(req, res, next) {
  try {
    const {
      search = '',
      status,
      department,
      sortBy = 'name',
      sortOrder = 'asc',
      page = '1',
      limit = '20',
    } = req.query;

    const { field, order } = parseSort(sortBy, sortOrder, EMPLOYEE_SORT_FIELDS, 'name');
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search.trim()) {
      conditions.push(
        `(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR e.department ILIKE $${paramIndex})`
      );
      params.push(`%${search.trim()}%`);
      paramIndex += 1;
    }

    if (status && ['Active', 'Inactive'].includes(status)) {
      conditions.push(`e.status = $${paramIndex}`);
      params.push(status);
      paramIndex += 1;
    }

    if (department) {
      conditions.push(`e.department ILIKE $${paramIndex}`);
      params.push(`%${department}%`);
      paramIndex += 1;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*)::INT AS total
       FROM employees e
       JOIN users u ON u.id = e.user_id
       ${whereClause}`,
      params
    );

    const listParams = [...params, limitNum, offset];
    const result = await query(
      `SELECT e.id, e.user_id, u.name, u.email, u.role, u.status AS user_status,
              e.department, e.designation, e.joining_date, e.reporting_manager_id,
              e.status, rm_user.name AS reporting_manager_name
       FROM employees e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN employees rm ON rm.id = e.reporting_manager_id
       LEFT JOIN users rm_user ON rm_user.id = rm.user_id
       ${whereClause}
       ORDER BY ${field} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      listParams
    );

    res.status(200).json({
      success: true,
      data: {
        employees: result.rows,
        pagination: {
          total: countResult.rows[0].total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(countResult.rows[0].total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function addEmployee(req, res, next) {
  try {
    const {
      name, email, password, role = 'Employee', department,
      designation, joining_date, reporting_manager_id, status = 'Active',
    } = req.body;

    if (!VALID_USER_ROLES.includes(role)) {
      throw createAppError('Invalid role specified.', 400);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Use the reliable transaction helper from db.js
    const result = await transaction(async (client) => {
      const userResult = await client.query(
        `INSERT INTO users (name, email, password_hash, role, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, role, status, created_at`,
        [name, email, passwordHash, role, status]
      );
      const user = userResult.rows[0];

      const employeeResult = await client.query(
        `INSERT INTO employees (
           user_id, department, designation, joining_date, reporting_manager_id, status
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, user_id, department, designation, joining_date, reporting_manager_id, status`,
        [
          user.id, department || null, designation || null, joining_date || null,
          reporting_manager_id || null, status,
        ]
      );
      const employee = employeeResult.rows[0];

      // Pass the transaction client to the logger so it commits in the same boundary
      await logActivity(
        req.user.id,
        'EMPLOYEE_CREATE',
        `Created employee "${user.name}" (${user.email}) with role "${user.role}".`,
        client 
      );

      return { user, employee };
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully.',
      data: {
        employee: {
          ...result.employee,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          user_status: result.user.status,
          created_at: result.user.created_at,
        },
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      return next(createAppError('A user with this email already exists.', 409));
    }
    next(err);
  }
}

async function editEmployee(req, res, next) {
  const dbClient = await pool.connect();

  try {
    const { id } = req.params;
    const {
      name,
      email,
      department,
      designation,
      joining_date,
      reporting_manager_id,
    } = req.body;

    const existing = await query(
      `SELECT e.id, e.user_id, u.name, u.email
       FROM employees e
       JOIN users u ON u.id = e.user_id
       WHERE e.id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      throw createAppError('Employee not found.', 404);
    }

    const employeeRecord = existing.rows[0];

    if (reporting_manager_id && Number(reporting_manager_id) === Number(id)) {
      throw createAppError('An employee cannot report to themselves.', 400);
    }

    await dbClient.query('BEGIN');

    if (name || email) {
      await dbClient.query(
        `UPDATE users
         SET name = COALESCE($1, name),
             email = COALESCE($2, email)
         WHERE id = $3`,
        [name, email, employeeRecord.user_id]
      );
    }

    const employeeResult = await dbClient.query(
      `UPDATE employees
       SET department = COALESCE($1, department),
           designation = COALESCE($2, designation),
           joining_date = COALESCE($3, joining_date),
           reporting_manager_id = COALESCE($4, reporting_manager_id)
       WHERE id = $5
       RETURNING id, user_id, department, designation, joining_date,
                 reporting_manager_id, status`,
      [department, designation, joining_date, reporting_manager_id, id]
    );

    const userResult = await dbClient.query(
      `SELECT id, name, email, role, status, created_at
       FROM users WHERE id = $1`,
      [employeeRecord.user_id]
    );

    const user = userResult.rows[0];
    const employee = employeeResult.rows[0];

    await logActivity(
      req.user.id,
      'EMPLOYEE_UPDATE',
      `Updated employee "${user.name}" (Employee ID: ${employee.id}).`,
      dbClient
    );

    await dbClient.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully.',
      data: {
        employee: {
          ...employee,
          name: user.name,
          email: user.email,
          role: user.role,
          user_status: user.status,
          created_at: user.created_at,
        },
      },
    });
  } catch (err) {
    await dbClient.query('ROLLBACK');

    if (err.code === '23505') {
      next(createAppError('A user with this email already exists.', 409));
      return;
    }

    next(err);
  } finally {
    dbClient.release();
  }
}

async function updateEmployeeStatusAndRole(req, res, next) {
  const dbClient = await pool.connect();

  try {
    const { id } = req.params;
    const { status, role, user_status } = req.body;

    const existing = await query(
      `SELECT e.id, e.user_id, u.name, u.email, u.role, u.status AS user_status, e.status
       FROM employees e
       JOIN users u ON u.id = e.user_id
       WHERE e.id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      throw createAppError('Employee not found.', 404);
    }

    const employeeRecord = existing.rows[0];

    if (role && !VALID_USER_ROLES.includes(role)) {
      throw createAppError('Invalid role specified.', 400);
    }

    if (status && !['Active', 'Inactive'].includes(status)) {
      throw createAppError('Invalid employee status specified.', 400);
    }

    if (user_status && !['Active', 'Inactive'].includes(user_status)) {
      throw createAppError('Invalid user status specified.', 400);
    }

    await dbClient.query('BEGIN');

    if (role || user_status) {
      await dbClient.query(
        `UPDATE users
         SET role = COALESCE($1, role),
             status = COALESCE($2, status)
         WHERE id = $3`,
        [role || null, user_status || null, employeeRecord.user_id]
      );
    }

    let employee = employeeRecord;

    if (status) {
      const employeeResult = await dbClient.query(
        `UPDATE employees
         SET status = $1
         WHERE id = $2
         RETURNING id, user_id, department, designation, joining_date,
                   reporting_manager_id, status`,
        [status, id]
      );
      employee = employeeResult.rows[0];
    }

    const userResult = await dbClient.query(
      `SELECT id, name, email, role, status, created_at
       FROM users WHERE id = $1`,
      [employeeRecord.user_id]
    );

    const user = userResult.rows[0];

    await logActivity(
      req.user.id,
      'EMPLOYEE_STATUS_ROLE_UPDATE',
      `Updated status/role for employee "${user.name}" — employee status: "${employee.status}", user status: "${user.status}", role: "${user.role}".`,
      dbClient
    );

    await dbClient.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Employee status and role updated successfully.',
      data: {
        employee: {
          ...employee,
          name: user.name,
          email: user.email,
          role: user.role,
          user_status: user.status,
          created_at: user.created_at,
        },
      },
    });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    next(err);
  } finally {
    dbClient.release();
  }
}

async function deleteEmployee(req, res, next) {
  try {
    const { id } = req.params;

    const deleted = await transaction(async (client) => {
      const existingResult = await client.query(
        `SELECT e.id, e.user_id, u.name, u.email
         FROM employees e
         JOIN users u ON u.id = e.user_id
         WHERE e.id = $1`,
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createAppError('Employee not found.', 404);
      }

      const employee = existingResult.rows[0];

      await client.query('DELETE FROM users WHERE id = $1', [employee.user_id]);

      await logActivity(
        req.user.id,
        'EMPLOYEE_DELETE',
        `Deleted employee "${employee.name}" (${employee.email}).`,
        client
      );

      return employee;
    });

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully.',
      data: { employee: deleted },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Recruiter Management
// ---------------------------------------------------------------------------

async function getAllRecruiters(req, res, next) {
  try {
    const { search = '', status, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [`u.role = 'Recruiter'`];
    const params = [];
    let paramIndex = 1;

    if (search.trim()) {
      conditions.push(
        `(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR EXISTS (
          SELECT 1 FROM unnest(COALESCE(r.assigned_fields, ARRAY[]::TEXT[])) AS field
          WHERE field ILIKE $${paramIndex}
        ))`
      );
      params.push(`%${search.trim()}%`);
      paramIndex += 1;
    }

    if (status && ['Active', 'Inactive'].includes(status)) {
      conditions.push(`u.status = $${paramIndex}`);
      params.push(status);
      paramIndex += 1;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await query(
      `SELECT COUNT(*)::INT AS total
       FROM recruiters r
       JOIN users u ON u.id = r.user_id
       ${whereClause}`,
      params
    );

    const result = await query(
      `SELECT r.id, r.user_id, u.name, u.email, u.role, u.status AS user_status,
              r.assigned_fields, r.last_active,
              COUNT(p.id)::INT AS total_positions,
              COUNT(CASE WHEN p.status = 'Open' THEN 1 END)::INT AS open_positions
       FROM recruiters r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN positions p ON p.recruiter_id = r.id
       ${whereClause}
       GROUP BY r.id, r.user_id, u.name, u.email, u.role, u.status,
                r.assigned_fields, r.last_active
       ORDER BY u.name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.status(200).json({
      success: true,
      data: {
        recruiters: result.rows,
        pagination: {
          total: countResult.rows[0].total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(countResult.rows[0].total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getRecruiterById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT r.id, r.user_id, u.name, u.email, u.role, u.status AS user_status,
              r.assigned_fields, r.last_active,
              COUNT(p.id)::INT AS total_positions,
              COUNT(CASE WHEN p.status = 'Open' THEN 1 END)::INT AS open_positions
       FROM recruiters r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN positions p ON p.recruiter_id = r.id
       WHERE r.id = $1
       GROUP BY r.id, r.user_id, u.name, u.email, u.role, u.status,
                r.assigned_fields, r.last_active`,
      [id]
    );

    if (result.rows.length === 0) {
      throw createAppError('Recruiter not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: { recruiter: result.rows[0] },
    });
  } catch (err) {
    next(err);
  }
}

async function createRecruiter(req, res, next) {
  try {
    const {
      name,
      email,
      password,
      assigned_fields = [],
      status = 'Active',
    } = req.body;

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const recruiter = await transaction(async (client) => {
      const userResult = await client.query(
        `INSERT INTO users (name, email, password_hash, role, status)
         VALUES ($1, $2, $3, 'Recruiter', $4)
         RETURNING id, name, email, role, status, created_at`,
        [name, email, passwordHash, status]
      );

      const user = userResult.rows[0];
      const recruiterResult = await client.query(
        `INSERT INTO recruiters (user_id, assigned_fields, last_active)
         VALUES ($1, $2, NULL)
         RETURNING id, user_id, assigned_fields, last_active`,
        [user.id, assigned_fields]
      );

      await logActivity(
        req.user.id,
        'RECRUITER_CREATE',
        `Created recruiter "${user.name}" (${user.email}).`,
        client
      );

      return {
        ...recruiterResult.rows[0],
        name: user.name,
        email: user.email,
        role: user.role,
        user_status: user.status,
        created_at: user.created_at,
        total_positions: 0,
        open_positions: 0,
      };
    });

    res.status(201).json({
      success: true,
      message: 'Recruiter created successfully.',
      data: { recruiter },
    });
  } catch (err) {
    if (err.code === '23505') {
      return next(createAppError('A user with this email already exists.', 409));
    }
    next(err);
  }
}

async function updateRecruiter(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, assigned_fields, status } = req.body;

    const recruiter = await transaction(async (client) => {
      const existingResult = await client.query(
        `SELECT r.id, r.user_id, u.name, u.email
         FROM recruiters r
         JOIN users u ON u.id = r.user_id
         WHERE r.id = $1
         FOR UPDATE`,
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createAppError('Recruiter not found.', 404);
      }

      const existing = existingResult.rows[0];

      const userResult = await client.query(
        `UPDATE users
         SET name = COALESCE($1, name),
             email = COALESCE($2, email),
             status = COALESCE($3, status)
         WHERE id = $4
         RETURNING id, name, email, role, status, created_at`,
        [name, email, status, existing.user_id]
      );

      const recruiterResult = await client.query(
        `UPDATE recruiters
         SET assigned_fields = COALESCE($1, assigned_fields)
         WHERE id = $2
         RETURNING id, user_id, assigned_fields, last_active`,
        [Array.isArray(assigned_fields) ? assigned_fields : null, id]
      );

      await logActivity(
        req.user.id,
        'RECRUITER_UPDATE',
        `Updated recruiter "${userResult.rows[0].name}" (Recruiter ID: ${id}).`,
        client
      );

      return {
        ...recruiterResult.rows[0],
        name: userResult.rows[0].name,
        email: userResult.rows[0].email,
        role: userResult.rows[0].role,
        user_status: userResult.rows[0].status,
        created_at: userResult.rows[0].created_at,
      };
    });

    res.status(200).json({
      success: true,
      message: 'Recruiter updated successfully.',
      data: { recruiter },
    });
  } catch (err) {
    if (err.code === '23505') {
      return next(createAppError('A user with this email already exists.', 409));
    }
    next(err);
  }
}

async function deleteRecruiter(req, res, next) {
  try {
    const { id } = req.params;

    const deleted = await transaction(async (client) => {
      const existingResult = await client.query(
        `SELECT r.id, r.user_id, u.name, u.email
         FROM recruiters r
         JOIN users u ON u.id = r.user_id
         WHERE r.id = $1`,
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createAppError('Recruiter not found.', 404);
      }

      const recruiter = existingResult.rows[0];

      await client.query('DELETE FROM users WHERE id = $1', [recruiter.user_id]);

      await logActivity(
        req.user.id,
        'RECRUITER_DELETE',
        `Deleted recruiter "${recruiter.name}" (${recruiter.email}).`,
        client
      );

      return recruiter;
    });

    res.status(200).json({
      success: true,
      message: 'Recruiter deleted successfully.',
      data: { recruiter: deleted },
    });
  } catch (err) {
    next(err);
  }
}

async function getRecruiterPerformance(req, res, next) {
  try {
    let recruiterId = req.params.id;

    // 1. Resolve self-lookup if no ID provided
    if (!recruiterId) {
      const selfLookup = await query(
        'SELECT id FROM recruiters WHERE user_id = $1',
        [req.user.id]
      );

      if (selfLookup.rows.length === 0) {
        throw createAppError('Recruiter profile not found for the current user.', 404);
      }

      recruiterId = selfLookup.rows[0].id;
    }

    // 2. Single DB trip: Validates existence AND fetches metrics simultaneously.
    // Retaining scalar subqueries here cleanly avoids a Cartesian fan-out trap 
    // between the positions and activity_logs tables.
    const performanceResult = await query(
      `SELECT
         r.id AS recruiter_id,
         r.user_id,
         u.name,
         u.email,
         r.assigned_fields,
         COUNT(DISTINCT p.client_id)::INT AS assigned_clients,
         COUNT(DISTINCT p.id)::INT AS total_positions,
         COUNT(DISTINCT CASE WHEN p.status = 'Open' THEN p.id END)::INT AS open_positions,
         (
           SELECT COUNT(*)::INT
           FROM activity_logs al
           WHERE al.user_id = r.user_id
             AND al.action_type = 'PROFILE_SUBMITTED'
         ) AS profiles_submitted,
         (
           SELECT COUNT(*)::INT
           FROM activity_logs al
           WHERE al.user_id = r.user_id
             AND al.action_type = 'INTERVIEW_SCHEDULED'
         ) AS interviews_scheduled,
         (
           SELECT COUNT(*)::INT
           FROM activity_logs al
           WHERE al.user_id = r.user_id
             AND al.action_type = 'PLACEMENT'
         ) AS placements
       FROM recruiters r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN positions p ON p.recruiter_id = r.id
       WHERE r.id = $1
       GROUP BY r.id, r.user_id, u.name, u.email, r.assigned_fields`,
      [recruiterId]
    );

    if (performanceResult.rows.length === 0) {
      throw createAppError('Recruiter not found.', 404);
    }

    const performanceData = performanceResult.rows[0];

    // 3. RBAC validation
    if (
      req.user.role === 'Recruiter' &&
      performanceData.user_id !== req.user.id
    ) {
      throw createAppError('You can only view your own performance metrics.', 403);
    }

    // 4. Non-blocking telemetry (Fire and Forget)
    // Does not force the client to wait for these writes to finish
    Promise.all([
      query(`UPDATE recruiters SET last_active = NOW() WHERE id = $1`, [recruiterId]),
      logActivity(
        req.user.id,
        'RECRUITER_PERFORMANCE_VIEW',
        `Viewed performance metrics for recruiter "${performanceData.name}" (ID: ${recruiterId}).`
      )
    ]).catch(err => {
      // Log telemetry failures internally without crashing the main application flow
      console.error('Telemetry update failed in getRecruiterPerformance:', err.message);
    });

    res.status(200).json({
      success: true,
      data: {
        performance: {
          ...performanceData,
          last_active: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Open Position Management
// ---------------------------------------------------------------------------

async function getAllPositions(req, res, next) {
  try {
    const {
      technology,
      location,
      status,
      client_id,
      recruiter_id,
      search = '',
      sortBy = 'job_title',
      sortOrder = 'asc',
      page = '1',
      limit = '20',
    } = req.query;

    const { field, order } = parseSort(sortBy, sortOrder, POSITION_SORT_FIELDS, 'job_title');
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (technology) {
      conditions.push(`p.technology ILIKE $${paramIndex}`);
      params.push(`%${technology}%`);
      paramIndex += 1;
    }

    if (location) {
      conditions.push(`p.location ILIKE $${paramIndex}`);
      params.push(`%${location}%`);
      paramIndex += 1;
    }

    if (status && ['Open', 'Closed', 'Paused'].includes(status)) {
      conditions.push(`p.status = $${paramIndex}`);
      params.push(status);
      paramIndex += 1;
    }

    if (client_id) {
      conditions.push(`p.client_id = $${paramIndex}`);
      params.push(client_id);
      paramIndex += 1;
    }

    if (recruiter_id) {
      conditions.push(`p.recruiter_id = $${paramIndex}`);
      params.push(recruiter_id);
      paramIndex += 1;
    }

    if (search.trim()) {
      conditions.push(
        `(p.job_title ILIKE $${paramIndex} OR p.technology ILIKE $${paramIndex})`
      );
      params.push(`%${search.trim()}%`);
      paramIndex += 1;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*)::INT AS total
       FROM positions p
       ${whereClause}`,
      params
    );

    const listParams = [...params, limitNum, offset];
    const result = await query(
      `SELECT p.id, p.client_id, c.company_name AS client_name,
              p.recruiter_id, ru.name AS recruiter_name,
              p.job_title, p.technology, p.experience, p.location,
              p.salary_min, p.salary_max, p.currency, p.employment_type,
              p.openings, p.status
       FROM positions p
       JOIN clients c ON c.id = p.client_id
       LEFT JOIN recruiters r ON r.id = p.recruiter_id
       LEFT JOIN users ru ON ru.id = r.user_id
       ${whereClause}
       ORDER BY ${field} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      listParams
    );

    res.status(200).json({
      success: true,
      data: {
        positions: result.rows,
        pagination: {
          total: countResult.rows[0].total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(countResult.rows[0].total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getPositionById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.id, p.client_id, c.company_name AS client_name,
              p.recruiter_id, ru.name AS recruiter_name,
              p.job_title, p.technology, p.experience, p.location,
              p.salary_min, p.salary_max, p.currency, p.employment_type,
              p.openings, p.status
       FROM positions p
       JOIN clients c ON c.id = p.client_id
       LEFT JOIN recruiters r ON r.id = p.recruiter_id
       LEFT JOIN users ru ON ru.id = r.user_id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw createAppError('Position not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: { position: result.rows[0] },
    });
  } catch (err) {
    next(err);
  }
}

async function createPosition(req, res, next) {
  try {
    const {
      client_id,
      recruiter_id,
      job_title,
      technology,
      experience,
      location,
      salary_min = 0,
      salary_max = 0,
      currency = 'INR',
      employment_type,
      openings = 1,
      status = 'Open',
    } = req.body;

    const clientCheck = await query('SELECT id, company_name FROM clients WHERE id = $1', [
      client_id,
    ]);

    if (clientCheck.rows.length === 0) {
      throw createAppError('Client not found.', 404);
    }

    if (recruiter_id) {
      const recruiterCheck = await query('SELECT id FROM recruiters WHERE id = $1', [
        recruiter_id,
      ]);

      if (recruiterCheck.rows.length === 0) {
        throw createAppError('Recruiter not found.', 404);
      }
    }

    const result = await query(
      `INSERT INTO positions (
         client_id, recruiter_id, job_title, technology, experience,
         location, salary_min, salary_max, currency, employment_type,
         openings, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, client_id, recruiter_id, job_title, technology, experience,
                 location, salary_min, salary_max, currency, employment_type,
                 openings, status`,
      [
        client_id,
        recruiter_id || null,
        job_title,
        technology || null,
        experience || null,
        location || null,
        salary_min,
        salary_max,
        currency,
        employment_type || null,
        openings,
        status,
      ]
    );

    const position = result.rows[0];
    const client = clientCheck.rows[0];

    await logActivity(
      req.user.id,
      'POSITION_CREATE',
      `Created position "${position.job_title}" for client "${client.company_name}" (Position ID: ${position.id}).`
    );

    res.status(201).json({
      success: true,
      message: 'Position created successfully.',
      data: { position },
    });
  } catch (err) {
    next(err);
  }
}

async function updatePosition(req, res, next) {
  try {
    const { id } = req.params;
    const {
      client_id,
      recruiter_id,
      job_title,
      technology,
      experience,
      location,
      salary_min,
      salary_max,
      currency,
      employment_type,
      openings,
      status,
    } = req.body;

    const existing = await query(
      'SELECT id, job_title FROM positions WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      throw createAppError('Position not found.', 404);
    }

    if (client_id) {
      const clientCheck = await query('SELECT id FROM clients WHERE id = $1', [client_id]);
      if (clientCheck.rows.length === 0) {
        throw createAppError('Client not found.', 404);
      }
    }

    if (recruiter_id) {
      const recruiterCheck = await query('SELECT id FROM recruiters WHERE id = $1', [
        recruiter_id,
      ]);
      if (recruiterCheck.rows.length === 0) {
        throw createAppError('Recruiter not found.', 404);
      }
    }

    const result = await query(
      `UPDATE positions
       SET client_id = COALESCE($1, client_id),
           recruiter_id = COALESCE($2, recruiter_id),
           job_title = COALESCE($3, job_title),
           technology = COALESCE($4, technology),
           experience = COALESCE($5, experience),
           location = COALESCE($6, location),
           salary_min = COALESCE($7, salary_min),
           salary_max = COALESCE($8, salary_max),
           currency = COALESCE($9, currency),
           employment_type = COALESCE($10, employment_type),
           openings = COALESCE($11, openings),
           status = COALESCE($12, status)
       WHERE id = $13
       RETURNING id, client_id, recruiter_id, job_title, technology, experience,
                 location, salary_min, salary_max, currency, employment_type,
                 openings, status`,
      [
        client_id,
        recruiter_id,
        job_title,
        technology,
        experience,
        location,
        salary_min,
        salary_max,
        currency,
        employment_type,
        openings,
        status,
        id,
      ]
    );

    const position = result.rows[0];

    await logActivity(
      req.user.id,
      'POSITION_UPDATE',
      `Updated position "${position.job_title}" (ID: ${position.id}).`
    );

    res.status(200).json({
      success: true,
      message: 'Position updated successfully.',
      data: { position },
    });
  } catch (err) {
    next(err);
  }
}

async function deletePosition(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT id, job_title FROM positions WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      throw createAppError('Position not found.', 404);
    }

    const position = existing.rows[0];

    await query('DELETE FROM positions WHERE id = $1', [id]);

    await logActivity(
      req.user.id,
      'POSITION_DELETE',
      `Deleted position "${position.job_title}" (ID: ${position.id}).`
    );

    res.status(200).json({
      success: true,
      message: 'Position deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Task & Follow-up Management
// ---------------------------------------------------------------------------

async function getAllTasks(req, res, next) {
  try {
    const {
      status,
      priority,
      assigned_to_user_id,
      client_id,
      search = '',
      sortBy = 'due_date',
      sortOrder = 'asc',
      page = '1',
      limit = '20',
    } = req.query;

    const { field, order } = parseSort(sortBy, sortOrder, TASK_SORT_FIELDS, 'due_date');
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (status && ['Pending', 'Completed'].includes(status)) {
      conditions.push(`t.status = $${paramIndex}`);
      params.push(status);
      paramIndex += 1;
    }

    if (priority && ['Low', 'Medium', 'High'].includes(priority)) {
      conditions.push(`t.priority = $${paramIndex}`);
      params.push(priority);
      paramIndex += 1;
    }

    if (assigned_to_user_id) {
      conditions.push(`t.assigned_to_user_id = $${paramIndex}`);
      params.push(assigned_to_user_id);
      paramIndex += 1;
    }

    if (client_id) {
      conditions.push(`t.client_id = $${paramIndex}`);
      params.push(client_id);
      paramIndex += 1;
    }

    if (search.trim()) {
      conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      params.push(`%${search.trim()}%`);
      paramIndex += 1;
    }

    if (!['Super Admin', 'Admin', 'HR'].includes(req.user.role)) {
      conditions.push(`t.assigned_to_user_id = $${paramIndex}`);
      params.push(req.user.id);
      paramIndex += 1;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*)::INT AS total FROM tasks t ${whereClause}`,
      params
    );

    const listParams = [...params, limitNum, offset];
    const result = await query(
      `SELECT t.id, t.assigned_to_user_id, au.name AS assigned_to_name,
              t.client_id, c.company_name AS client_name,
              t.title, t.description, t.due_date, t.priority, t.status
       FROM tasks t
       JOIN users au ON au.id = t.assigned_to_user_id
       LEFT JOIN clients c ON c.id = t.client_id
       ${whereClause}
       ORDER BY ${field} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      listParams
    );

    res.status(200).json({
      success: true,
      data: {
        tasks: result.rows,
        pagination: {
          total: countResult.rows[0].total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(countResult.rows[0].total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getTasksDueToday(req, res, next) {
  try {
    const conditions = [`t.status = 'Pending'`, `t.due_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE`];
    const params = [];
    let paramIndex = 1;

    if (!['Super Admin', 'Admin', 'HR'].includes(req.user.role)) {
      conditions.push(`t.assigned_to_user_id = $${paramIndex}`);
      params.push(req.user.id);
      paramIndex += 1;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT t.id, t.assigned_to_user_id, au.name AS assigned_to_name,
              t.client_id, c.company_name AS client_name,
              t.title, t.description, t.due_date, t.priority, t.status
       FROM tasks t
       JOIN users au ON au.id = t.assigned_to_user_id
       LEFT JOIN clients c ON c.id = t.client_id
       ${whereClause}
       ORDER BY t.priority DESC, t.due_date ASC`,
      params
    );

    res.status(200).json({
      success: true,
      data: {
        tasks: result.rows,
        count: result.rows.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getTaskById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT t.id, t.assigned_to_user_id, au.name AS assigned_to_name,
              t.client_id, c.company_name AS client_name,
              t.title, t.description, t.due_date, t.priority, t.status
       FROM tasks t
       JOIN users au ON au.id = t.assigned_to_user_id
       LEFT JOIN clients c ON c.id = t.client_id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw createAppError('Task not found.', 404);
    }

    const task = result.rows[0];

    if (
      !['Super Admin', 'Admin', 'HR'].includes(req.user.role) &&
      task.assigned_to_user_id !== req.user.id
    ) {
      throw createAppError('You do not have permission to view this task.', 403);
    }

    res.status(200).json({
      success: true,
      data: { task },
    });
  } catch (err) {
    next(err);
  }
}

async function createTask(req, res, next) {
  try {
    const {
      assigned_to_user_id,
      client_id,
      title,
      description,
      due_date,
      priority = 'Medium',
      status = 'Pending',
    } = req.body;

    const assigneeCheck = await query(
      'SELECT id, name FROM users WHERE id = $1',
      [assigned_to_user_id]
    );

    if (assigneeCheck.rows.length === 0) {
      throw createAppError('Assigned user not found.', 404);
    }

    if (client_id) {
      const clientCheck = await query('SELECT id FROM clients WHERE id = $1', [client_id]);
      if (clientCheck.rows.length === 0) {
        throw createAppError('Client not found.', 404);
      }
    }

    const result = await query(
      `INSERT INTO tasks (
         assigned_to_user_id, client_id, title, description,
         due_date, priority, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, assigned_to_user_id, client_id, title, description,
                 due_date, priority, status`,
      [
        assigned_to_user_id,
        client_id || null,
        title,
        description || null,
        due_date || null,
        priority,
        status,
      ]
    );

    const task = result.rows[0];
    const assignee = assigneeCheck.rows[0];

    await logActivity(
      req.user.id,
      'TASK_CREATE',
      `Created task "${task.title}" assigned to "${assignee.name}" (Task ID: ${task.id}).`
    );

    res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data: { task },
    });
  } catch (err) {
    next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const {
      assigned_to_user_id,
      client_id,
      title,
      description,
      due_date,
      priority,
      status,
    } = req.body;

    const existing = await query(
      'SELECT id, title, assigned_to_user_id FROM tasks WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      throw createAppError('Task not found.', 404);
    }

    const taskRecord = existing.rows[0];

    if (
      !['Super Admin', 'Admin', 'HR'].includes(req.user.role) &&
      taskRecord.assigned_to_user_id !== req.user.id
    ) {
      throw createAppError('You do not have permission to update this task.', 403);
    }

    if (assigned_to_user_id) {
      const assigneeCheck = await query('SELECT id FROM users WHERE id = $1', [
        assigned_to_user_id,
      ]);
      if (assigneeCheck.rows.length === 0) {
        throw createAppError('Assigned user not found.', 404);
      }
    }

    if (client_id) {
      const clientCheck = await query('SELECT id FROM clients WHERE id = $1', [client_id]);
      if (clientCheck.rows.length === 0) {
        throw createAppError('Client not found.', 404);
      }
    }

    const result = await query(
      `UPDATE tasks
       SET assigned_to_user_id = COALESCE($1, assigned_to_user_id),
           client_id = COALESCE($2, client_id),
           title = COALESCE($3, title),
           description = COALESCE($4, description),
           due_date = COALESCE($5, due_date),
           priority = COALESCE($6, priority),
           status = COALESCE($7, status)
       WHERE id = $8
       RETURNING id, assigned_to_user_id, client_id, title, description,
                 due_date, priority, status`,
      [
        assigned_to_user_id,
        client_id,
        title,
        description,
        due_date,
        priority,
        status,
        id,
      ]
    );

    const task = result.rows[0];

    await logActivity(
      req.user.id,
      'TASK_UPDATE',
      `Updated task "${task.title}" (ID: ${task.id}).`
    );

    res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      data: { task },
    });
  } catch (err) {
    next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT id, title, assigned_to_user_id FROM tasks WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      throw createAppError('Task not found.', 404);
    }

    const task = existing.rows[0];

    if (
      !['Super Admin', 'Admin', 'HR'].includes(req.user.role) &&
      task.assigned_to_user_id !== req.user.id
    ) {
      throw createAppError('You do not have permission to delete this task.', 403);
    }

    await query('DELETE FROM tasks WHERE id = $1', [id]);

    await logActivity(
      req.user.id,
      'TASK_DELETE',
      `Deleted task "${task.title}" (ID: ${task.id}).`
    );

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Analytics & Activity Feed
// ---------------------------------------------------------------------------

async function getAnalyticsSummary(req, res, next) {
  try {
    const [clientsResult, positionsResult, tasksResult] = await Promise.all([
      query('SELECT COUNT(*)::INT AS total FROM clients WHERE status = $1', ['Active']),
      query('SELECT COUNT(*)::INT AS total FROM positions WHERE status = $1', ['Open']),
      query(`SELECT COUNT(*)::INT AS total FROM tasks 
             WHERE status = $1 AND due_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE`, 
            ['Pending'])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalClients: clientsResult.rows[0].total,
        openPositions: positionsResult.rows[0].total,
        tasksDueToday: tasksResult.rows[0].total
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getRecentActivities(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 50);
    
    const result = await query(
      `SELECT al.id::TEXT, al.user_id, u.name AS user_name, al.action_type, al.description, al.timestamp
       FROM activity_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.timestamp DESC
       LIMIT $1`,
      [limit]
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  archiveClient,
  deleteClient,
  getAllEmployees,
  addEmployee,
  editEmployee,
  updateEmployeeStatusAndRole,
  deleteEmployee,
  getAllRecruiters,
  getRecruiterById,
  createRecruiter,
  updateRecruiter,
  deleteRecruiter,
  getRecruiterPerformance,
  getAllPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition,
  getAllTasks,
  getTasksDueToday,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getAnalyticsSummary,
  getRecentActivities,
};
