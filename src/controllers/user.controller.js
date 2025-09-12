const User = require('../models/User');
const Profile = require('../models/Profile');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const getMe = async (req, res) => {
  try {
    const user = req.user;
    
    // Get profile
    const profile = await Profile.findOne({ userId: user._id });
    
    res.json({
      ok: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin
        },
        profile
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching user data'
      }
    });
  }
};

const updateMe = async (req, res) => {
  try {
    const user = req.user;
    const updates = req.body;
    
    // Handle file upload for profile photo
    if (req.file) {
      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'profile_photos' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });
      
      // Add photo URL to updates
      updates.photoUrl = result.secure_url;
    }
    
    // Update profile
    let profile = await Profile.findOne({ userId: user._id });
    
    if (profile) {
      // Update existing profile
      Object.keys(updates).forEach(key => {
        profile[key] = updates[key];
      });
      await profile.save();
    } else {
      // Create new profile
      updates.userId = user._id;
      profile = new Profile(updates);
      await profile.save();
    }
    
    res.json({
      ok: true,
      data: {
        profile
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Error updating profile'
      }
    });
  }
};

module.exports = {
  getMe,
  updateMe,
  upload
};