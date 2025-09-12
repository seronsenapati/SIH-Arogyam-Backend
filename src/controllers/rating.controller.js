const Appointment = require('../models/Appointment');
const SessionRecord = require('../models/SessionRecord');
const Joi = require('joi');

// Validation schema
const ratingSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().optional().allow('')
});

const submitRating = async (req, res) => {
  try {
    const { id } = req.params; // appointmentId
    const { error } = ratingSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }
    
    const { rating, comment } = req.body;
    const userId = req.user._id;
    
    // Find appointment
    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      return res.status(404).json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Appointment not found'
        }
      });
    }
    
    // Check if appointment is completed
    if (appointment.status !== 'completed') {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Appointment must be completed to submit rating'
        }
      });
    }
    
    // Find session record
    const sessionRecord = await SessionRecord.findOne({ appointmentId: id });
    
    if (!sessionRecord) {
      return res.status(404).json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Session record not found'
        }
      });
    }
    
    // Determine rating type based on user role
    if (userId.toString() === appointment.patientId.toString()) {
      // Patient rating consultant
      sessionRecord.consultantRatingByPatient = rating;
      if (comment) sessionRecord.patientComment = comment;
    } else if (userId.toString() === appointment.consultantId.toString()) {
      // Consultant rating patient
      sessionRecord.patientRatingByConsultant = rating;
      if (comment) sessionRecord.consultantComment = comment;
    } else {
      return res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to rate this appointment'
        }
      });
    }
    
    await sessionRecord.save();
    
    res.json({
      ok: true,
      data: {
        message: 'Rating submitted successfully',
        sessionRecord
      }
    });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'RATING_ERROR',
        message: 'Error submitting rating'
      }
    });
  }
};

module.exports = {
  submitRating
};