const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/db');

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const RESET_TOKEN_EXPIRES_IN = process.env.RESET_TOKEN_EXPIRES_IN || '1h';

// Production dummy hash used to neutralize timing attacks during email enumeration
const DUMMY_HASH = '$2a$12$Kj9O7Hsz7VzQvX3n8L.9Oex7M3F1p1vB9xGfK8oP2zR3vY6mK1qS2';

function createAppError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function recordActivity(userId, actionType, description) {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, action_type, description)
       VALUES ($1, $2, $3)`,
      [userId, actionType, description]
    );
  } catch (logError) {
    // Fail-safe: A broken logging query should not crash core application transactions
    console.error(`System log failure: ${logError.message}`);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT id, name, email, password_hash, role, status, created_at
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    let user = result.rows[0];
    let passwordMatches = false;

    if (!user) {
      // Execute dummy comparison to consume matching execution time (~200ms+) 
      // and neutralize timing-attack user enumeration threats.
      await bcrypt.compare(password, DUMMY_HASH);
      throw createAppError('Invalid email or password.', 401);
    }

    if (user.status === 'Inactive') {
      throw createAppError('Your account is inactive. Contact an administrator.', 403);
    }

    passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      throw createAppError('Invalid email or password.', 401);
    }

    const token = signAccessToken(user);

    await recordActivity(
      user.id,
      'LOGIN',
      `User "${user.email}" logged in successfully.`
    );

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          created_at: user.created_at,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/change-password
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Use FOR UPDATE to lock the user record for mutation atomicity
    const result = await query(
      `SELECT id, email, password_hash, status
       FROM users
       WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw createAppError('User not found.', 404);
    }

    const user = result.rows[0];

    if (user.status === 'Inactive') {
      throw createAppError('Your account is inactive. Contact an administrator.', 403);
    }

    const currentMatches = await bcrypt.compare(currentPassword, user.password_hash);

    if (!currentMatches) {
      throw createAppError('Current password is incorrect.', 400);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await query(
      `UPDATE users
       SET password_hash = $1
       WHERE id = $2`,
      [newPasswordHash, userId]
    );

    await recordActivity(
      userId,
      'PASSWORD_CHANGE',
      `User "${user.email}" changed their password.`
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    const genericMessage =
      'If an account with that email exists, password reset instructions have been initiated.';

    const result = await query(
      `SELECT id, email, status
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (result.rows.length === 0 || result.rows[0].status === 'Inactive') {
      // Treat missing and inactive records identically to eliminate vector profiling
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    const user = result.rows[0];

    const resetToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        purpose: 'password_reset',
        jti: crypto.randomUUID(),
      },
      process.env.JWT_SECRET,
      { expiresIn: RESET_TOKEN_EXPIRES_IN }
    );

    const tokenFingerprint = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    await recordActivity(
      user.id,
      'PASSWORD_RESET_REQUEST',
      `Password reset token issued for "${user.email}". Fingerprint: ${tokenFingerprint}.`
    );

    // PRODUCTION SECURITY FIX:
    // Do not leak the token into the JSON body response. Instead, in a real environment,
    // dispatch the resetToken through an asynchronous background notification/email engine.
    // e.g., await emailService.sendResetEmail(user.email, resetToken);

    res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/profile
 */
async function getProfile(req, res, next) {
  try {
    const result = await query(
      `SELECT id, name, email, role, status, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw createAppError('User not found.', 404);
    }

    const user = result.rows[0];

    if (user.status === 'Inactive') {
      throw createAppError('Your account is inactive. Contact an administrator.', 403);
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          created_at: user.created_at,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  changePassword,
  forgotPassword,
  getProfile,
};