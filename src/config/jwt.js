const jwt = require('jsonwebtoken');

const generateAccessToken = (payload) => {
  console.log('Generating access token with payload:', payload);
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Present' : 'Missing');
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  });
};

const generateRefreshToken = (payload) => {
  console.log('Generating refresh token with payload:', payload);
  console.log('JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? 'Present' : 'Missing');
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  });
};

const verifyAccessToken = (token) => {
  console.log('Verifying access token');
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined');
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.verify(token, process.env.JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  console.log('Verifying refresh token');
  if (!process.env.JWT_REFRESH_SECRET) {
    console.error('JWT_REFRESH_SECRET is not defined');
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};