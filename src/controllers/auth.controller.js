const User = require('../models/User');
const Profile = require('../models/Profile');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const Joi = require('joi');
const catchAsync = require('../middleware/catchAsync');
const { validateRegistration, validateLogin } = require('../middleware/validation.middleware');

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('patient', 'doctor').required(),
  doctorLicense: Joi.when('role', {
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

  const { email, password, role, doctorLicense, profile } = req.body;

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

  // Create user
  const user = new User({
    email,
    passwordHash: password,
    role
  });

  await user.save();

  // Create profile if provided
  let profileData = {
    userId: user._id
  };
  
  // If role is doctor, add license to profile
  if (role === 'doctor') {
    profileData.doctorLicense = doctorLicense;
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
  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role });

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
  if (username === process.env.CONSULTANT_USERNAME && password === process.env.CONSULTANT_PASSWORD) {
    // Create a temporary consultant user object
    const consultantUser = {
      _id: 'consultant-env',
      email: 'consultant@arogyam.com',
      role: 'consultant'
    };
    
    // Generate tokens
    const accessToken = generateAccessToken({ id: consultantUser._id, role: consultantUser.role });
    const refreshToken = generateRefreshToken({ id: consultantUser._id, role: consultantUser.role });
    
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
  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role });

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
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Refresh token required'
      }
    });
  }

  // Verify refresh token
  const decoded = require('../config/jwt').verifyRefreshToken(refreshToken);
  
  // Generate new access token
  const accessToken = generateAccessToken({ id: decoded.id, role: decoded.role });

  res.json({
    ok: true,
    data: {
      accessToken
    }
  });
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
  // If we reach this point, the user is authenticated
  // The protect middleware would have already verified the token
  res.json({
    ok: true,
    data: {
      authenticated: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role
      }
    }
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  getStatus
};