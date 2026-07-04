/**
 * Global Express error-handling middleware.
 * Must be registered last in the middleware stack.
 */
function errorHandler(err, req, res, _next) {
  const timestamp = new Date().toISOString();

  // 1. Unify Express (err.status) and Custom (err.statusCode) formats
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';

  // 2. Map known PostgreSQL errors to proper HTTP semantic codes
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        statusCode = 409;
        message = 'A record with this information already exists.';
        break;
      case '23503': // foreign_key_violation
        statusCode = 400;
        message = 'Referenced record does not exist or is still in use.';
        break;
      case '22P02': // invalid_text_representation (e.g., passing string to UUID/integer)
        statusCode = 400;
        message = 'Invalid data format provided to the database.';
        break;
    }
  }

  // 3. Log securely (keep sensitive DB internals out of the client response)
  console.error(`[${timestamp}] Error on ${req.method} ${req.originalUrl}:`, {
    message: err.message,
    pgCode: err.code,
    stack: err.stack,
    statusCode: statusCode,
    errors: err.errors,
  });

  // 4. Construct safe client response
  const response = {
    success: false,
    // Mask raw unhandled error messages in production to prevent leaking internals
    message: statusCode === 500 && process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : message,
  };

  if (err.errors && Array.isArray(err.errors)) {
    response.errors = err.errors;
  }

  // Optional: Send stack trace only in development
  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;