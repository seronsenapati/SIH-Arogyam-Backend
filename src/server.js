const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

// Add extensive debug logging for environment variables
console.log('=== EXTENSIVE Environment Variables Debug ===');
console.log('All env keys:', Object.keys(process.env));
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET value (first 10 chars):', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) : 'NONE');
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
console.log('JWT_REFRESH_SECRET present:', !!process.env.JWT_REFRESH_SECRET);
console.log('JWT_REFRESH_SECRET value (first 10 chars):', process.env.JWT_REFRESH_SECRET ? process.env.JWT_REFRESH_SECRET.substring(0, 10) : 'NONE');
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI present:', !!process.env.MONGO_URI);
console.log('CONSULTANT_USERNAME:', process.env.CONSULTANT_USERNAME);
console.log('CONSULTANT_PASSWORD present:', !!process.env.CONSULTANT_PASSWORD);
console.log('=============================================');

// Set NODE_ENV for testing
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
  console.log('NODE_ENV was not set, setting to development');
}

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const consultantRoutes = require('./routes/consultant.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const sessionRoutes = require('./routes/session.routes');
const ratingRoutes = require('./routes/rating.routes');
const prescriptionRoutes = require('./routes/prescription.routes');
const calendarRoutes = require('./routes/calendar.routes');
const blogRoutes = require('./routes/blog.routes');
const notificationRoutes = require('./routes/notification.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');

// Import config
const connectDB = require('./config/db');

// Import jobs
const { scheduleReminders } = require('./jobs/reminder.job');

// Initialize app
const app = express();
const PORT = process.env.PORT || 4000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cookieParser());

// Enhanced CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://sih-arogyam-frontend.onrender.com'
];

// Add FRONTEND_URL if it exists
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Construct frontend URL from FRONTEND_PORT if provided
if (process.env.FRONTEND_PORT) {
  allowedOrigins.push(`http://localhost:${process.env.FRONTEND_PORT}`);
}

// Add deployed frontend URL
allowedOrigins.push('https://sih-arogyam-frontend.onrender.com');

const corsOptions = {
  origin: function (origin, callback) {
    console.log('CORS request from origin:', origin);
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('No origin, allowing request');
      return callback(null, true);
    }
    
    // Always allow localhost for development
    if (origin.startsWith('http://localhost:')) {
      console.log('Localhost origin, allowing request');
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      console.log('CORS blocked origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
      return callback(new Error(msg), false);
    }
    
    console.log('Origin allowed by configuration');
    return callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes - Fixed for Express v5
app.options(/.*/, cors(corsOptions));

// Simple debug endpoint to check environment variables
app.get('/debug-env', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET_PRESENT: !!process.env.JWT_SECRET,
    JWT_SECRET_LENGTH: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
    JWT_REFRESH_SECRET_PRESENT: !!process.env.JWT_REFRESH_SECRET,
    PORT: process.env.PORT,
    MONGO_URI_PRESENT: !!process.env.MONGO_URI
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// JWT_SECRET test endpoint
app.get('/test-jwt-secret', (req, res) => {
  res.json({
    JWT_SECRET_PRESENT: !!process.env.JWT_SECRET,
    JWT_SECRET_LENGTH: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
    JWT_SECRET_VALUE: process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) : null
  });
});

// JWT Test endpoint
app.get('/test-jwt', (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    
    // Test JWT_SECRET
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        ok: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'JWT_SECRET not configured'
        }
      });
    }
    
    // Create a test token
    const testPayload = { id: 'test-user', role: 'test' };
    const token = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '1m' });
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    res.json({
      ok: true,
      data: {
        message: 'JWT configuration is working',
        token: token,
        decoded: decoded
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: {
        code: 'JWT_ERROR',
        message: 'JWT configuration error',
        details: error.message
      }
    });
  }
});

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  next();
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/consultants', consultantRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true, message: 'Server is running' });
});

// Error handling middleware - This should be before the 404 handler
app.use(errorHandler);

// 404 handler - This should be the last middleware
app.use((req, res) => {
  console.log('404 handler triggered for:', req.method, req.path);
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Only start server if this file is run directly (not imported)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Schedule reminder jobs (skip in test environment)
    if (process.env.NODE_ENV !== 'test') {
      scheduleReminders();
    }
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });
}

module.exports = app;