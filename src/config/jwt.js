const jwt = require('jsonwebtoken');

// Load environment variables if not already loaded
require('dotenv').config();

const generateAccessToken = (payload, secret = process.env.JWT_SECRET) => {
  console.log('Generating access token with payload:', payload);
  console.log('JWT_SECRET provided to function:', secret ? 'Present' : 'Missing');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  return jwt.sign(payload, secret, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  });
};

const generateRefreshToken = (payload, secret = process.env.JWT_REFRESH_SECRET) => {
  console.log('Generating refresh token with payload:', payload);
  console.log('JWT_REFRESH_SECRET provided to function:', secret ? 'Present' : 'Missing');
  return jwt.sign(payload, secret, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  });
};

const verifyAccessToken = (token, secret = process.env.JWT_SECRET) => {
  console.log('Verifying access token');
  console.log('JWT_SECRET provided to function:', secret ? 'Present' : 'Missing');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  if (!secret) {
    console.error('JWT_SECRET is not defined');
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.verify(token, secret);
};

const verifyRefreshToken = (token, secret = process.env.JWT_REFRESH_SECRET) => {
  console.log('Verifying refresh token');
  console.log('JWT_REFRESH_SECRET provided to function:', secret ? 'Present' : 'Missing');
  if (!secret) {
    console.error('JWT_REFRESH_SECRET is not defined');
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }
  return jwt.verify(token, secret);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};