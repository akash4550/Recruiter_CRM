const express = require('express');
const {
  body,
  param,
  query,
  validationResult,
} = require('express-validator');
const { authenticateToken, checkRole } = require('../middleware/auth');
const {
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
} = require('../controllers/crmController');

const router = express.Router();

const ADMIN_ROLES = ['Super Admin', 'Admin'];
const CLIENT_WRITE_ROLES = ['Super Admin', 'Admin', 'Sales Executive', 'HR'];
const POSITION_WRITE_ROLES = ['Super Admin', 'Admin', 'HR', 'Recruiter'];
const PERFORMANCE_ROLES = ['Super Admin', 'Admin', 'HR', 'Recruiter'];

const VALID_CLIENT_STATUSES = ['Active', 'Archived'];
const VALID_EMPLOYEE_STATUSES = ['Active', 'Inactive'];
const VALID_USER_STATUSES = ['Active', 'Inactive'];
const VALID_USER_ROLES = [
  'Super Admin',
  'Admin',
  'HR',
  'Recruiter',
  'Sales Executive',
  'Employee',
];
const VALID_POSITION_STATUSES = ['Open', 'Closed', 'Paused'];
const VALID_TASK_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_TASK_STATUSES = ['Pending', 'Completed'];

function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }

  next();
}

const idParam = [
  param('id').isInt({ min: 1 }).withMessage('A valid numeric ID is required.'),
  validateRequest,
];

const optionalEmail = (field) =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .isEmail()
    .withMessage(`${field} must be a valid email address.`)
    .normalizeEmail();

const optionalGst = body('gst')
  .optional({ values: 'null' })
  .trim()
  .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
  .withMessage('GST must be a valid 15-character GSTIN format.');

const clientQueryValidation = [
  query('status')
    .optional()
    .isIn(VALID_CLIENT_STATUSES)
    .withMessage(`Status must be one of: ${VALID_CLIENT_STATUSES.join(', ')}.`),
  query('sortBy')
    .optional()
    .isIn(['company_name', 'contact_person', 'created_at', 'status'])
    .withMessage('Invalid sort field.'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc', 'ASC', 'DESC'])
    .withMessage('sortOrder must be asc or desc.'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100.'),
  validateRequest,
];

const createClientValidation = [
  body('company_name')
    .trim()
    .notEmpty()
    .withMessage('Company name is required.')
    .isLength({ max: 255 })
    .withMessage('Company name must not exceed 255 characters.'),
  body('contact_person')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Contact person must not exceed 255 characters.'),
  optionalEmail('email'),
  body('phone')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Phone must not exceed 50 characters.'),
  body('industry')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Industry must not exceed 100 characters.'),
  body('address').optional({ values: 'null' }).trim(),
  optionalGst,
  body('notes').optional({ values: 'null' }).trim(),
  body('status')
    .optional()
    .isIn(VALID_CLIENT_STATUSES)
    .withMessage(`Status must be one of: ${VALID_CLIENT_STATUSES.join(', ')}.`),
  validateRequest,
];

const updateClientValidation = [
  ...idParam.slice(0, -1),
  body('company_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Company name cannot be empty.')
    .isLength({ max: 255 })
    .withMessage('Company name must not exceed 255 characters.'),
  optionalEmail('email'),
  optionalGst,
  body('status')
    .optional()
    .isIn(VALID_CLIENT_STATUSES)
    .withMessage(`Status must be one of: ${VALID_CLIENT_STATUSES.join(', ')}.`),
  validateRequest,
];

const employeeQueryValidation = [
  query('status')
    .optional()
    .isIn(VALID_EMPLOYEE_STATUSES)
    .withMessage(`Status must be one of: ${VALID_EMPLOYEE_STATUSES.join(', ')}.`),
  query('sortBy')
    .optional()
    .isIn(['name', 'department', 'designation', 'joining_date', 'status'])
    .withMessage('Invalid sort field.'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc', 'ASC', 'DESC'])
    .withMessage('sortOrder must be asc or desc.'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100.'),
  validateRequest,
];

const addEmployeeValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required.')
    .isLength({ max: 255 })
    .withMessage('Name must not exceed 255 characters.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number.'
    ),
  body('role')
    .optional()
    .isIn(VALID_USER_ROLES)
    .withMessage(`Role must be one of: ${VALID_USER_ROLES.join(', ')}.`),
  body('department').optional({ values: 'null' }).trim().isLength({ max: 100 }),
  body('designation').optional({ values: 'null' }).trim().isLength({ max: 100 }),
  body('joining_date')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('joining_date must be a valid date (YYYY-MM-DD).'),
  body('reporting_manager_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('reporting_manager_id must be a positive integer.'),
  body('status')
    .optional()
    .isIn(VALID_EMPLOYEE_STATUSES)
    .withMessage(`Status must be one of: ${VALID_EMPLOYEE_STATUSES.join(', ')}.`),
  validateRequest,
];

const editEmployeeValidation = [
  ...idParam.slice(0, -1),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('email').optional().trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('joining_date').optional({ values: 'null' }).isISO8601().withMessage('Invalid joining_date.'),
  body('reporting_manager_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('reporting_manager_id must be a positive integer.'),
  validateRequest,
];

const employeeStatusRoleValidation = [
  ...idParam.slice(0, -1),
  body('status')
    .optional()
    .isIn(VALID_EMPLOYEE_STATUSES)
    .withMessage(`Employee status must be one of: ${VALID_EMPLOYEE_STATUSES.join(', ')}.`),
  body('user_status')
    .optional()
    .isIn(VALID_USER_STATUSES)
    .withMessage(`User status must be one of: ${VALID_USER_STATUSES.join(', ')}.`),
  body('role')
    .optional()
    .isIn(VALID_USER_ROLES)
    .withMessage(`Role must be one of: ${VALID_USER_ROLES.join(', ')}.`),
  body().custom((value) => {
    if (!value.status && !value.user_status && !value.role) {
      throw new Error('At least one of status, user_status, or role must be provided.');
    }
    return true;
  }),
  validateRequest,
];

const recruiterQueryValidation = [
  query('status')
    .optional()
    .isIn(VALID_USER_STATUSES)
    .withMessage(`Status must be one of: ${VALID_USER_STATUSES.join(', ')}.`),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100.'),
  validateRequest,
];

const createRecruiterValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required.')
    .isLength({ max: 255 })
    .withMessage('Name must not exceed 255 characters.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number.'),
  body('assigned_fields')
    .optional()
    .isArray()
    .withMessage('assigned_fields must be an array of strings.'),
  body('assigned_fields.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each assigned field must be 1-100 characters.'),
  body('status')
    .optional()
    .isIn(VALID_USER_STATUSES)
    .withMessage(`Status must be one of: ${VALID_USER_STATUSES.join(', ')}.`),
  validateRequest,
];

const updateRecruiterValidation = [
  ...idParam.slice(0, -1),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('assigned_fields')
    .optional()
    .isArray()
    .withMessage('assigned_fields must be an array of strings.'),
  body('assigned_fields.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each assigned field must be 1-100 characters.'),
  body('status')
    .optional()
    .isIn(VALID_USER_STATUSES)
    .withMessage(`Status must be one of: ${VALID_USER_STATUSES.join(', ')}.`),
  validateRequest,
];

const positionQueryValidation = [
  query('status')
    .optional()
    .isIn(VALID_POSITION_STATUSES)
    .withMessage(`Status must be one of: ${VALID_POSITION_STATUSES.join(', ')}.`),
  query('client_id').optional().isInt({ min: 1 }).withMessage('client_id must be a positive integer.'),
  query('recruiter_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('recruiter_id must be a positive integer.'),
  query('sortBy')
    .optional()
    .isIn(['job_title', 'technology', 'location', 'status', 'openings'])
    .withMessage('Invalid sort field.'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc', 'ASC', 'DESC'])
    .withMessage('sortOrder must be asc or desc.'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100.'),
  validateRequest,
];

const createPositionValidation = [
  body('client_id')
    .isInt({ min: 1 })
    .withMessage('client_id is required and must be a positive integer.'),
  body('recruiter_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('recruiter_id must be a positive integer.'),
  body('job_title')
    .trim()
    .notEmpty()
    .withMessage('Job title is required.')
    .isLength({ max: 255 })
    .withMessage('Job title must not exceed 255 characters.'),
  body('technology').optional({ values: 'null' }).trim().isLength({ max: 255 }),
  body('experience').optional({ values: 'null' }).trim().isLength({ max: 100 }),
  body('location').optional({ values: 'null' }).trim().isLength({ max: 255 }),
  body('salary_min')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('salary_min must be a non-negative number.'),
  body('salary_max')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('salary_max must be a non-negative number.'),
  body('currency').optional().trim().isLength({ min: 2, max: 10 }),
  body('employment_type').optional({ values: 'null' }).trim().isLength({ max: 50 }),
  body('openings')
    .optional()
    .isInt({ min: 1 })
    .withMessage('openings must be a positive integer.'),
  body('status')
    .optional()
    .isIn(VALID_POSITION_STATUSES)
    .withMessage(`Status must be one of: ${VALID_POSITION_STATUSES.join(', ')}.`),
  validateRequest,
];

const updatePositionValidation = [
  ...idParam.slice(0, -1),
  body('client_id').optional().isInt({ min: 1 }).withMessage('client_id must be a positive integer.'),
  body('recruiter_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('recruiter_id must be a positive integer.'),
  body('job_title').optional().trim().notEmpty().withMessage('Job title cannot be empty.'),
  body('salary_min')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('salary_min must be a non-negative number.'),
  body('salary_max')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('salary_max must be a non-negative number.'),
  body('currency').optional().trim().isLength({ min: 2, max: 10 }),
  body('openings').optional().isInt({ min: 1 }).withMessage('openings must be a positive integer.'),
  body('status')
    .optional()
    .isIn(VALID_POSITION_STATUSES)
    .withMessage(`Status must be one of: ${VALID_POSITION_STATUSES.join(', ')}.`),
  validateRequest,
];

const taskQueryValidation = [
  query('status')
    .optional()
    .isIn(VALID_TASK_STATUSES)
    .withMessage(`Status must be one of: ${VALID_TASK_STATUSES.join(', ')}.`),
  query('priority')
    .optional()
    .isIn(VALID_TASK_PRIORITIES)
    .withMessage(`Priority must be one of: ${VALID_TASK_PRIORITIES.join(', ')}.`),
  query('assigned_to_user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('assigned_to_user_id must be a positive integer.'),
  query('client_id').optional().isInt({ min: 1 }).withMessage('client_id must be a positive integer.'),
  query('sortBy')
    .optional()
    .isIn(['title', 'due_date', 'priority', 'status'])
    .withMessage('Invalid sort field.'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc', 'ASC', 'DESC'])
    .withMessage('sortOrder must be asc or desc.'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100.'),
  validateRequest,
];

const createTaskValidation = [
  body('assigned_to_user_id')
    .isInt({ min: 1 })
    .withMessage('assigned_to_user_id is required and must be a positive integer.'),
  body('client_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('client_id must be a positive integer.'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required.')
    .isLength({ max: 255 })
    .withMessage('Title must not exceed 255 characters.'),
  body('description').optional({ values: 'null' }).trim(),
  body('due_date')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('due_date must be a valid date (YYYY-MM-DD).'),
  body('priority')
    .optional()
    .isIn(VALID_TASK_PRIORITIES)
    .withMessage(`Priority must be one of: ${VALID_TASK_PRIORITIES.join(', ')}.`),
  body('status')
    .optional()
    .isIn(VALID_TASK_STATUSES)
    .withMessage(`Status must be one of: ${VALID_TASK_STATUSES.join(', ')}.`),
  validateRequest,
];

const updateTaskValidation = [
  ...idParam.slice(0, -1),
  body('assigned_to_user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('assigned_to_user_id must be a positive integer.'),
  body('client_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('client_id must be a positive integer.'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty.'),
  body('due_date').optional({ values: 'null' }).isISO8601().withMessage('Invalid due_date.'),
  body('priority')
    .optional()
    .isIn(VALID_TASK_PRIORITIES)
    .withMessage(`Priority must be one of: ${VALID_TASK_PRIORITIES.join(', ')}.`),
  body('status')
    .optional()
    .isIn(VALID_TASK_STATUSES)
    .withMessage(`Status must be one of: ${VALID_TASK_STATUSES.join(', ')}.`),
  validateRequest,
];

function applyTaskAssignmentPolicy(req, _res, next) {
  const canAssignToOthers = ['Admin', 'HR'].includes(req.user.role);

  if (!canAssignToOthers) {
    req.body.assigned_to_user_id = req.user.id;
  }

  next();
}

router.use(authenticateToken);

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

router.get('/clients', clientQueryValidation, getAllClients);
router.get('/clients/:id', idParam, getClientById);
router.post(
  '/clients',
  checkRole(CLIENT_WRITE_ROLES),
  createClientValidation,
  createClient
);
router.put(
  '/clients/:id',
  checkRole(CLIENT_WRITE_ROLES),
  updateClientValidation,
  updateClient
);
router.patch(
  '/clients/:id/archive',
  checkRole(CLIENT_WRITE_ROLES),
  idParam,
  archiveClient
);
router.delete(
  '/clients/:id',
  checkRole(ADMIN_ROLES),
  idParam,
  deleteClient
);

// ---------------------------------------------------------------------------
// Employees (Admin / Super Admin only)
// ---------------------------------------------------------------------------

router.get(
  '/employees',
  checkRole(ADMIN_ROLES),
  employeeQueryValidation,
  getAllEmployees
);
router.post(
  '/employees',
  checkRole(ADMIN_ROLES),
  addEmployeeValidation,
  addEmployee
);
router.put(
  '/employees/:id',
  checkRole(ADMIN_ROLES),
  editEmployeeValidation,
  editEmployee
);
router.patch(
  '/employees/:id/status-role',
  checkRole(ADMIN_ROLES),
  employeeStatusRoleValidation,
  updateEmployeeStatusAndRole
);
router.delete(
  '/employees/:id',
  checkRole(ADMIN_ROLES),
  idParam,
  deleteEmployee
);

// ---------------------------------------------------------------------------
// Recruiters
// ---------------------------------------------------------------------------

router.get(
  '/recruiters',
  checkRole(ADMIN_ROLES),
  recruiterQueryValidation,
  getAllRecruiters
);
router.get(
  '/recruiters/performance',
  checkRole(PERFORMANCE_ROLES),
  getRecruiterPerformance
);
router.get(
  '/recruiters/:id/performance',
  checkRole(PERFORMANCE_ROLES),
  idParam,
  getRecruiterPerformance
);
router.get(
  '/recruiters/:id',
  checkRole(ADMIN_ROLES),
  idParam,
  getRecruiterById
);
router.post(
  '/recruiters',
  checkRole(ADMIN_ROLES),
  createRecruiterValidation,
  createRecruiter
);
router.put(
  '/recruiters/:id',
  checkRole(ADMIN_ROLES),
  updateRecruiterValidation,
  updateRecruiter
);
router.delete(
  '/recruiters/:id',
  checkRole(ADMIN_ROLES),
  idParam,
  deleteRecruiter
);

// ---------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------

router.get('/positions', positionQueryValidation, getAllPositions);
router.get('/positions/:id', idParam, getPositionById);
router.post(
  '/positions',
  checkRole(POSITION_WRITE_ROLES),
  createPositionValidation,
  createPosition
);
router.put(
  '/positions/:id',
  checkRole(POSITION_WRITE_ROLES),
  updatePositionValidation,
  updatePosition
);
router.delete(
  '/positions/:id',
  checkRole([...ADMIN_ROLES, 'HR']),
  idParam,
  deletePosition
);

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

router.get('/tasks/due-today', getTasksDueToday);
router.get('/tasks', taskQueryValidation, getAllTasks);
router.get('/tasks/:id', idParam, getTaskById);
router.post('/tasks', applyTaskAssignmentPolicy, createTaskValidation, createTask);
router.put('/tasks/:id', updateTaskValidation, updateTask);
router.delete('/tasks/:id', idParam, deleteTask);

// ---------------------------------------------------------------------------
// Analytics & Activity Feed
// ---------------------------------------------------------------------------

router.get('/analytics/summary', getAnalyticsSummary);
router.get('/activities', getRecentActivities);
router.get('/activities/recent', getRecentActivities);

module.exports = router;
