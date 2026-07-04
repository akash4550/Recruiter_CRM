const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Verifies Bearer JWT, extracts identity safely, and attaches the active user to req.user.
 * Minimizes unnecessary database calls by relying on the trusted JWT payload.
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Malformed authorization header.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please log in again.',
        });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please log in again.',
        });
      }
      throw err;
    }

    // PRODUCTION OPTIMIZATION:
    // Instead of querying Postgres on every single asset/CRM request, trust the token payload.
    // Ensure your login controller packages: id, email, role, and status into the JWT.
    if (decoded.status === 'Inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Contact an administrator.',
      });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      status: decoded.status,
    };

    // OPTIONAL SECURE FALLBACK: If status isn't baked into the JWT payload,
    // look up the user, but wrap it in an efficient cache strategy.

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Restricts access to users whose role appears in allowedRoles.
 */
function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  checkRole,
};