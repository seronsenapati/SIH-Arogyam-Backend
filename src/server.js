const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Set NODE_ENV for testing
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
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

// Middleware
app.use(cors());
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

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Schedule reminder jobs (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    scheduleReminders();
  }
});

module.exports = app;