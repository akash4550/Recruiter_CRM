require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { verifyConnection, pool } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const crmRoutes = require('./routes/crmRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// 1. Strict Security Boundaries
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// 2. Payload Protection
app.use(express.json({ limit: '5mb' })); // Prevent memory exhaustion

// 3. Rate Limiting for CRM Routes
const crmRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 4. True Operational Health Check
app.get('/api/health', async (_req, res, next) => {
  try {
    const isDbConnected = await verifyConnection();
    
    if (!isDbConnected) {
      return res.status(503).json({
        status: 'error',
        service: 'Mayzax Solutions CRM API',
        message: 'Database connection lost',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      status: 'ok',
      service: 'Mayzax Solutions CRM API',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// 5. Route Registration
app.use('/api/auth', authRoutes);
app.use('/api/crm', crmRateLimit, crmRoutes);

// 6. Global Error Interceptor
app.use(errorHandler);

// 7. Server Initialization with Database Validation
const startServer = async () => {
  try {
    const isDbConnected = await verifyConnection();
    
    if (!isDbConnected) {
      console.error('FATAL: Database connection failed. Server cannot start.');
      process.exit(1);
    }
    
    console.log('Database connection verified successfully.');
    
    const server = app.listen(PORT, () => {
      console.log(`Mayzax CRM API listening on port ${PORT}`);
    });

    // 7. Graceful Shutdown Protocol
    function shutdownSequence(signal) {
      console.log(`\n[${signal}] Initiating graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async (err) => {
        if (err) {
          console.error('Error during HTTP server closure:', err);
          process.exit(1);
        }
        
        console.log('HTTP server closed. Terminating database pool...');
        
        try {
          // Safely drain the Postgres connection pool
          await pool.end();
          console.log('PostgreSQL pool drained cleanly. Process exiting.');
          process.exit(0);
        } catch (dbErr) {
          console.error('Error during database pool closure:', dbErr);
          process.exit(1);
        }
      });

      // Force shutdown if requests hang for more than 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000).unref();
    }

    process.on('SIGTERM', () => shutdownSequence('SIGTERM'));
    process.on('SIGINT', () => shutdownSequence('SIGINT'));
    
  } catch (err) {
    console.error('Error during server startup:', err);
    process.exit(1);
  }
};

startServer();

module.exports = app;