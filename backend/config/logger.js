const { pool, query } = require('./db');

/**
 * Inserts an audit trail record into activity_logs.
 * Pass an optional pg client when logging inside a transaction.
 */
async function logActivity(userId, actionType, description, client = null) {
  const executor = client || { query: (...args) => query(...args) };

  await executor.query(
    `INSERT INTO activity_logs (user_id, action_type, description)
     VALUES ($1, $2, $3)`,
    [userId, actionType, description]
  );
}

module.exports = {
  logActivity,
  pool,
};
