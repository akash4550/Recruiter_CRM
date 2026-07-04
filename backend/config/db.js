const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: process.env.DB_POOL_MAX || 20,
  idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT_MS || 30000,
  connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT_MS || 5000,
  ssl: {
    rejectUnauthorized: false // Required for Neon and many cloud DBs
  }
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

/**
 * Runs a lightweight query to verify the pool can reach the database.
 * Returns boolean safely without crashing the thread on failure.
 */
async function verifyConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1 AS ok');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database connection verification failed:', err.message);
    return false;
  }
}

/**
 * PRODUCTION HELPER: Executes a callback within a managed database transaction.
 * Automatically handles BEGIN, COMMIT, ROLLBACK, and client release.
 * 
 * Usage:
 * await transaction(async (client) => {
 *   const res = await client.query('SELECT ... FOR UPDATE');
 *   await client.query('UPDATE ...');
 * });
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Pass the dedicated client to the callback to ensure queries share the connection
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  // Standard single-query execution (autocommits)
  query: (text, params) => pool.query(text, params),
  verifyConnection,
  transaction,
};