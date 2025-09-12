const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - check if user is authenticated
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-passwordHash');

      next();
    } catch (error) {
      console.error(error);
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
    // Check if user exists
    if (!req.user) {
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
      return res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied - insufficient permissions'
        }
      });
    }

    next();
  };
};

module.exports = {
  protect,
  restrictTo
};