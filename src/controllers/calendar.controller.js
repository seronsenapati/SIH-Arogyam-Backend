const Appointment = require('../models/Appointment');
const moment = require('moment');
const Joi = require('joi');
const catchAsync = require('../middleware/catchAsync');

// Validation schema
const getEventsSchema = Joi.object({
  month: Joi.string().regex(/^\d{4}-\d{2}$/).required()
});

const getEvents = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { error } = getEventsSchema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      }
    });
  }
  
  const { month } = req.query; // Format: YYYY-MM
  
  // Check authorization
  if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
    return res.status(403).json({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Not authorized to view this calendar'
      }
    });
  }
  
  // Parse month
  const startDate = moment(month, 'YYYY-MM').startOf('month').toDate();
  const endDate = moment(month, 'YYYY-MM').endOf('month').toDate();
  
  // Get appointments for the month
  const appointments = await Appointment.find({
    $or: [
      { patientId: userId },
      { consultantId: userId },
      { doctorId: userId }
    ],
    startAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('patientId', 'email').populate('consultantId', 'email');
  
  // Group appointments by date
  const eventsByDate = {};
  
  appointments.forEach(appointment => {
    const dateKey = moment(appointment.startAt).format('YYYY-MM-DD');
    
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = {
        date: dateKey,
        count: 0,
        appointments: []
      };
    }
    
    eventsByDate[dateKey].count++;
    eventsByDate[dateKey].appointments.push({
      id: appointment._id,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      patient: appointment.patientId ? {
        id: appointment.patientId._id,
        email: appointment.patientId.email
      } : null,
      consultant: appointment.consultantId ? {
        id: appointment.consultantId._id,
        email: appointment.consultantId.email
      } : null
    });
  });
  
  // Convert to array
  const events = Object.values(eventsByDate);
  
  res.json({
    ok: true,
    data: events
  });
});

module.exports = {
  getEvents
};