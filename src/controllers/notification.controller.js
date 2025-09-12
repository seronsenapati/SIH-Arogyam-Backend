const Notification = require('../models/Notification');
const Joi = require('joi');

// Validation schema
const getNotificationsSchema = Joi.object({
  unread: Joi.boolean().optional()
});

const getAll = async (req, res) => {
  try {
    const { error } = getNotificationsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }
    
    const { unread } = req.query;
    const userId = req.user._id;
    
    // Build query
    const query = { userId };
    if (unread === 'true') {
      query.read = false;
    }
    
    // Get notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50); // Limit to 50 most recent notifications
    
    res.json({
      ok: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching notifications'
      }
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    // Find notification
    const notification = await Notification.findOne({ _id: id, userId });
    
    if (!notification) {
      return res.status(404).json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Notification not found'
        }
      });
    }
    
    // Update read status
    notification.read = true;
    await notification.save();
    
    res.json({
      ok: true,
      data: notification
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Error marking notification as read'
      }
    });
  }
};

module.exports = {
  getAll,
  markAsRead
};