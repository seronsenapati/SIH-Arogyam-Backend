const { verifyAccessToken } = require('../config/jwt');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        ok: false, 
        error: { 
          code: 'UNAUTHORIZED', 
          message: 'Access token required' 
        } 
      });
    }

    const decoded = verifyAccessToken(token);
    
    // Handle consultant user from environment variables
    if (decoded.id === 'consultant-env') {
      req.user = {
        _id: 'consultant-env',
        email: 'consultant@arogyam.com',
        role: 'consultant'
      };
      return next();
    }
    
    const user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({ 
        ok: false, 
        error: { 
          code: 'UNAUTHORIZED', 
          message: 'Invalid token' 
        } 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ 
      ok: false, 
      error: { 
        code: 'UNAUTHORIZED', 
        message: 'Invalid token' 
      } 
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        ok: false, 
        error: { 
          code: 'UNAUTHORIZED', 
          message: 'Authentication required' 
        } 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        ok: false, 
        error: { 
          code: 'FORBIDDEN', 
          message: 'Insufficient permissions' 
        } 
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorizeRoles,
};