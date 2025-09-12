const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - check if user is authenticated
const protect = async (req, res, next) => {
  console.log('Protect middleware called');
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('Token found in Authorization header');

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified, decoded:', decoded);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-passwordHash');
      console.log('User found:', req.user ? req.user.id : 'No user');

      next();
    } catch (error) {
      console.error('Token verification error:', error);
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