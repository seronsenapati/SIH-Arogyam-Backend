const User = require('../models/User');
const Profile = require('../models/Profile');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const Joi = require('joi');
const catchAsync = require('../middleware/catchAsync');
const { validateRegistration, validateLogin } = require('../middleware/validation.middleware');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('patient', 'doctor').required(),
  stateCouncilNumber: Joi.when('role', {
    is: 'doctor',
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  }),
  nationalRegistrationNumber: Joi.when('role', {
    is: 'doctor',
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  }),
  profile: Joi.object().optional()
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

// Debug endpoint for JWT verification
const debugVerifyToken = catchAsync(async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Token is required'
      }
    });
  }
  
  try {
    // Log environment variables for debugging
    console.log('Debug verify - NODE_ENV:', process.env.NODE_ENV);
    console.log('Debug verify - JWT_SECRET present:', !!process.env.JWT_SECRET);
    
    // Try to verify the token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    res.json({
      ok: true,
      data: {
        decoded
      }
    });
  } catch (error) {
    console.error('Debug verify error:', error);
    res.status(401).json({
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token verification failed',
        details: error.message
      }
    });
  }
});

const register = catchAsync(async (req, res) => {
  // Validate request body
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      }
    });
  }

  const { email, password, role, stateCouncilNumber, nationalRegistrationNumber, profile } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({
      ok: false,
      error: {
        code: 'USER_EXISTS',
        message: 'User with this email already exists'
      }
    });
  }

  // Create user with hashed password
  const user = new User({
    email,
    passwordHash: password, // This will be hashed by the pre-save middleware
    role
  });

  await user.save();

  // Create profile if provided
  let profileData = {
    userId: user._id
  };
  
  // If role is doctor, add the new fields to profile
  if (role === 'doctor') {
    profileData.stateCouncilNumber = stateCouncilNumber;
    profileData.nationalRegistrationNumber = nationalRegistrationNumber;
  }
  
  if (profile) {
    profileData = {
      ...profileData,
      ...profile
    };
  }
  
  const userProfile = new Profile(profileData);
  await userProfile.save();

  // Generate tokens
  const accessToken = generateAccessToken({ id: user._id, role: user.role }, process.env.JWT_SECRET);
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role }, process.env.JWT_REFRESH_SECRET);

  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  res.status(201).json({
    ok: true,
    data: {
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    }
  });
});

const login = catchAsync(async (req, res) => {
  // Validate request body
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      }
    });
  }

  const { username, password } = req.body;

  // Handle consultant login via environment variables
  // This check should happen before checking the database
  if (username === process.env.CONSULTANT_USERNAME && password === process.env.CONSULTANT_PASSWORD) {
    // Create a temporary consultant user object
    const consultantUser = {
      _id: 'consultant-env',
      email: 'consultant@arogyam.com',
      role: 'consultant'
    };
    
    // Generate tokens
    const accessToken = generateAccessToken({ id: consultantUser._id, role: consultantUser.role }, process.env.JWT_SECRET);
    const refreshToken = generateRefreshToken({ id: consultantUser._id, role: consultantUser.role }, process.env.JWT_REFRESH_SECRET);
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return res.json({
      ok: true,
      data: {
        accessToken,
        user: {
          id: consultantUser._id,
          email: consultantUser.email,
          role: consultantUser.role
        }
      }
    });
  }

  // Find user by email (for patient and doctor)
  const user = await User.findOne({ email: username });
  if (!user) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password'
      }
    });
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password'
      }
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken({ id: user._id, role: user.role }, process.env.JWT_SECRET);
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role }, process.env.JWT_REFRESH_SECRET);

  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  res.json({
    ok: true,
    data: {
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    }
  });
});

const refresh = catchAsync(async (req, res) => {
  console.log('Refresh token request received');
  const refreshToken = req.cookies.refreshToken;
  console.log('Refresh token from cookies:', refreshToken ? 'Present' : 'Missing');
  
  if (!refreshToken) {
    console.log('No refresh token found in cookies');
    return res.status(401).json({
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Refresh token required'
      }
    });
  }

  try {
    console.log('Attempting to verify refresh token');
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken, process.env.JWT_REFRESH_SECRET);
    console.log('Refresh token verified successfully:', decoded);
    
    // Generate new access token
    const accessToken = generateAccessToken({ id: decoded.id, role: decoded.role }, process.env.JWT_SECRET);
    console.log('New access token generated');

    res.json({
      ok: true,
      data: {
        accessToken
      }
    });
  } catch (error) {
    console.error('Error during refresh token verification:', error);
    return res.status(401).json({
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid refresh token'
      }
    });
  }
});

const logout = catchAsync(async (req, res) => {
  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  res.json({
    ok: true,
    data: {
      message: 'Logged out successfully'
    }
  });
});

const getStatus = catchAsync(async (req, res) => {
  console.log('=== GET STATUS DEBUG ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
  console.log('JWT_SECRET value (first 10 chars):', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) : 'NONE');
  console.log('Full JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
  console.log('========================');
  
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No token provided'
      }
    });
  }
  
  const token = authHeader.split(' ')[1];
  console.log('Token received in getStatus, length:', token.length);
  
  try {
    // Verify token directly in this function as a workaround
    console.log('Attempting to verify token directly in getStatus');
    console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
    
    if (!process.env.JWT_SECRET) {
      console.error('CRITICAL ERROR: JWT_SECRET is not available in getStatus');
      return res.status(500).json({
        ok: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Server configuration error - JWT_SECRET not available'
        }
      });
    }
    
    // Log the actual JWT_SECRET value for debugging (remove in production)
    console.log('JWT_SECRET value for verification:', process.env.JWT_SECRET);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified in getStatus, decoded:', decoded);
    
    // Handle special consultant user
    if (decoded.id === 'consultant-env') {
      console.log('Special consultant user detected in getStatus');
      return res.json({
        ok: true,
        data: {
          authenticated: true,
          user: {
            id: 'consultant-env',
            email: 'consultant@arogyam.com',
            role: 'consultant'
          }
        }
      });
    }
    
    // Get user from token (for regular users)
    const user = await User.findById(decoded.id).select('-passwordHash');
    console.log('User found in getStatus:', user ? user.id : 'No user');
    
    if (!user) {
      console.log('User not found in database in getStatus');
      return res.status(401).json({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authorized, user not found'
        }
      });
    }
    
    res.json({
      ok: true,
      data: {
        authenticated: true,
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('=== TOKEN VERIFICATION ERROR ===');
    console.error('Token verification error in getStatus:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Token that failed verification:', token);
    console.error('===============================');
    return res.status(401).json({
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Not authorized, token failed',
        details: error.message
      }
    });
  }
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  getStatus,
  debugVerifyToken
};