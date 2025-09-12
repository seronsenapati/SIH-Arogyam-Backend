const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Load environment variables
require('dotenv').config();

// Protect routes - check if user is authenticated
const protect = async (req, res, next) => {
  console.log('=== PROTECT MIDDLEWARE DEBUG ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
  console.log('JWT_SECRET value (first 10 chars):', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) : 'NONE');
  console.log('Full JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
  console.log('================================');
  
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('Token found in Authorization header');
      console.log('Token length:', token.length);

      // Log the token for debugging (remove in production)
      console.log('Token (first 20 chars):', token.substring(0, 20));

      // Verify token
      console.log('Attempting to verify token with JWT_SECRET');
      
      // Check if JWT_SECRET is available
      if (!process.env.JWT_SECRET) {
        console.error('CRITICAL ERROR: JWT_SECRET is not available in protect middleware');
        return res.status(500).json({
          ok: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Server configuration error'
          }
        });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified, decoded:', decoded);

      // Handle special consultant user
      if (decoded.id === 'consultant-env') {
        console.log('Special consultant user detected');
        req.user = {
          _id: 'consultant-env',
          id: 'consultant-env',
          email: 'consultant@arogyam.com',
          role: 'consultant'
        };
        console.log('Consultant user set in request');
        next();
        return;
      }

      // Get user from token (for regular users)
      req.user = await User.findById(decoded.id).select('-passwordHash');
      console.log('User found:', req.user ? req.user.id : 'No user');

      if (!req.user) {
        console.log('User not found in database');
        return res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authorized, user not found'
          }
        });
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      return res.status(401).json({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authorized, token failed'
        }
      });
    }
  }

  if (!token) {
    console.log('No token found in request');
    console.log('Authorization header:', req.headers.authorization);
    return res.status(401).json({
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Not authorized, no token'
      }
    });
  }
};

// Restrict to specific roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log('RestrictTo middleware called with roles:', roles);
    // Check if user exists
    if (!req.user) {
      console.log('No user found in request');
      return res.status(401).json({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authorized'
        }
      });
    }

    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      console.log('User role not allowed. User role:', req.user.role, 'Allowed roles:', roles);
      return res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied - insufficient permissions'
        }
      });
    }

    console.log('User authorized with role:', req.user.role);
    next();
  };
};

module.exports = {
  protect,
  restrictTo
};