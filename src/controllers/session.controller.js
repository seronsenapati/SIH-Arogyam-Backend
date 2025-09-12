const Appointment = require('../models/Appointment');
const SessionRecord = require('../models/SessionRecord');
const Notification = require('../models/Notification');
const axios = require('axios');
const Joi = require('joi');

// Validation schemas
const completeSessionSchema = Joi.object({
  notes: Joi.string().optional().allow('')
});

const getToken = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    // Find appointment
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Appointment not found'
        }
      });
    }
    
    // Check authorization
    if (
      req.user.role !== 'admin' &&
      appointment.patientId.toString() !== req.user._id.toString() &&
      appointment.consultantId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to access this appointment'
        }
      });
    }
    
    // Check if appointment is confirmed
    if (appointment.status !== 'confirmed') {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Appointment must be confirmed to generate video token'
        }
      });
    }
    
    // Generate video room ID if not exists
    if (!appointment.videoRoomId) {
      // For Daily.co, we can use the appointment ID as room name
      appointment.videoRoomId = `appointment-${appointmentId}`;
      await appointment.save();
    }
    
    // Generate token based on provider
    let videoToken, videoUrl;
    
    switch (process.env.VIDEO_PROVIDER) {
      case 'daily':
        // Call Daily.co API to create room and get token
        try {
          const response = await axios.post(
            'https://api.daily.co/v1/rooms',
            {
              name: appointment.videoRoomId,
              privacy: 'public' // or 'private' based on requirements
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.DAILY_API_KEY}`
              }
            }
          );
          
          videoUrl = response.data.url;
          
          // Create token for user
          const tokenResponse = await axios.post(
            'https://api.daily.co/v1/meeting-tokens',
            {
              properties: {
                room_name: appointment.videoRoomId,
                is_owner: req.user._id.toString() === appointment.consultantId.toString()
              }
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.DAILY_API_KEY}`
              }
            }
          );
          
          videoToken = tokenResponse.data.token;
        } catch (error) {
          console.error('Daily.co API error:', error.response?.data || error.message);
          throw new Error('Failed to generate video token');
        }
        break;
        
      default:
        // Default to Daily.co if no provider specified
        videoUrl = `https://daily.co/${appointment.videoRoomId}`;
        videoToken = 'default-token'; // In a real implementation, generate a proper token
    }
    
    res.json({
      ok: true,
      data: {
        videoToken,
        videoUrl,
        roomId: appointment.videoRoomId
      }
    });
  } catch (error) {
    console.error('Get video token error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'TOKEN_ERROR',
        message: 'Error generating video token'
      }
    });
  }
};

const completeSession = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { error } = completeSessionSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }
    
    const { notes } = req.body;
    
    // Find appointment
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Appointment not found'
        }
      });
    }
    
    // Check authorization
    if (
      req.user.role !== 'admin' &&
      appointment.consultantId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only consultant can complete session'
        }
      });
    }
    
    // Check if appointment is confirmed
    if (appointment.status !== 'confirmed') {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Appointment must be confirmed to complete session'
        }
      });
    }
    
    // Update appointment status
    appointment.status = 'completed';
    await appointment.save();
    
    // Create session record
    const sessionRecord = new SessionRecord({
      appointmentId,
      startedAt: appointment.startAt,
      endedAt: new Date(),
      participants: [appointment.patientId, appointment.consultantId],
      notes
    });
    
    await sessionRecord.save();
    
    // Create notifications for both parties to rate each other
    const patientNotification = new Notification({
      userId: appointment.patientId,
      type: 'session_completed',
      title: 'Session Completed',
      body: 'Your session has been completed. Please rate your consultant.',
      meta: { appointmentId, sessionId: sessionRecord._id }
    });
    
    const consultantNotification = new Notification({
      userId: appointment.consultantId,
      type: 'session_completed',
      title: 'Session Completed',
      body: 'Your session has been completed. Please rate your patient.',
      meta: { appointmentId, sessionId: sessionRecord._id }
    });
    
    await Promise.all([
      patientNotification.save(),
      consultantNotification.save()
    ]);
    
    res.json({
      ok: true,
      data: {
        appointment,
        sessionRecord
      }
    });
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'COMPLETION_ERROR',
        message: 'Error completing session'
      }
    });
  }
};

module.exports = {
  getToken,
  completeSession
};