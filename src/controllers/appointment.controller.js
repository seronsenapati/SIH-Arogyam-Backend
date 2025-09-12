const Appointment = require('../models/Appointment');
const User = require('../models/User');
const AvailabilityTemplate = require('../models/AvailabilityTemplate');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const Joi = require('joi');

// Validation schemas
const createAppointmentSchema = Joi.object({
  consultantId: Joi.string().required(),
  startAt: Joi.date().iso().required(),
  endAt: Joi.date().iso().min(Joi.ref('startAt')).required(),
  patientNotes: Joi.string().optional().allow('')
});

const getAppointmentsSchema = Joi.object({
  role: Joi.string().valid('patient', 'consultant', 'doctor'),
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed', 'no-show')
});

const create = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    // Validate request body
    const { error } = createAppointmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }
    
    const { consultantId, startAt, endAt, patientNotes } = req.body;
    const patientId = req.user._id;
    
    // Check if consultant exists and is actually a consultant
    const consultant = await User.findById(consultantId);
    if (!consultant || consultant.role !== 'consultant') {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_CONSULTANT',
          message: 'Invalid consultant'
        }
      });
    }
    
    // Check if patient is actually a patient
    if (req.user.role !== 'patient') {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_ROLE',
          message: 'Only patients can create appointments'
        }
      });
    }
    
    // Start transaction
    session.startTransaction();
    
    // Create appointment
    const appointment = new Appointment({
      patientId,
      consultantId,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      notes: patientNotes
    });
    
    await appointment.save({ session });
    
    // Create notification for consultant
    const notification = new Notification({
      userId: consultantId,
      type: 'appointment_created',
      title: 'New Appointment Request',
      body: `You have a new appointment request from ${req.user.email}`,
      meta: { appointmentId: appointment._id }
    });
    
    await notification.save({ session });
    
    // Commit transaction
    await session.commitTransaction();
    
    res.status(201).json({
      ok: true,
      data: appointment
    });
  } catch (error) {
    // Abort transaction
    await session.abortTransaction();
    
    console.error('Create appointment error:', error);
    
    // Handle duplicate key error (slot already booked)
    if (error.code === 11000) {
      return res.status(409).json({
        ok: false,
        error: {
          code: 'SLOT_BOOKED',
          message: 'Slot already booked'
        }
      });
    }
    
    res.status(500).json({
      ok: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Error creating appointment'
      }
    });
  } finally {
    // End session
    session.endSession();
  }
};

const getAll = async (req, res) => {
  try {
    // Validate query parameters
    const { error } = getAppointmentsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }
    
    const { role, status } = req.query;
    
    // Build query based on user role
    let query = {};
    
    if (role === 'patient' || (!role && req.user.role === 'patient')) {
      query.patientId = req.user._id;
    } else if (role === 'consultant' || (!role && req.user.role === 'consultant')) {
      query.consultantId = req.user._id;
    } else if (role === 'doctor' || (!role && req.user.role === 'doctor')) {
      query.doctorId = req.user._id;
    } else {
      // Admin can see all appointments
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Not authorized to view these appointments'
          }
        });
      }
    }
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }
    
    // Get appointments
    const appointments = await Appointment.find(query)
      .populate('patientId', 'email')
      .populate('consultantId', 'email')
      .populate('doctorId', 'email')
      .sort({ startAt: -1 });
    
    res.json({
      ok: true,
      data: appointments
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching appointments'
      }
    });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find appointment and populate references
    const appointment = await Appointment.findById(id)
      .populate('patientId', 'email')
      .populate('consultantId', 'email')
      .populate('doctorId', 'email');
    
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
      appointment.patientId._id.toString() !== req.user._id.toString() &&
      appointment.consultantId._id.toString() !== req.user._id.toString() &&
      (!appointment.doctorId || appointment.doctorId._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to view this appointment'
        }
      });
    }
    
    res.json({
      ok: true,
      data: appointment
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching appointment'
      }
    });
  }
};

const cancel = async (req, res) => {
  try {
    const { id } = req.params;
    
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
          message: 'Not authorized to cancel this appointment'
        }
      });
    }
    
    // Update status
    appointment.status = 'cancelled';
    await appointment.save();
    
    // Create notification for the other party
    const recipientId = 
      req.user._id.toString() === appointment.patientId.toString() 
        ? appointment.consultantId 
        : appointment.patientId;
        
    const notification = new Notification({
      userId: recipientId,
      type: 'appointment_cancelled',
      title: 'Appointment Cancelled',
      body: `Appointment with ${req.user.email} has been cancelled`,
      meta: { appointmentId: appointment._id }
    });
    
    await notification.save();
    
    res.json({
      ok: true,
      data: appointment
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Error cancelling appointment'
      }
    });
  }
};

const confirm = async (req, res) => {
  try {
    const { id } = req.params;
    
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
    
    // Check authorization (only consultant can confirm)
    if (
      req.user.role !== 'admin' &&
      appointment.consultantId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to confirm this appointment'
        }
      });
    }
    
    // Update status
    appointment.status = 'confirmed';
    await appointment.save();
    
    // Create notification for patient
    const notification = new Notification({
      userId: appointment.patientId,
      type: 'appointment_confirmed',
      title: 'Appointment Confirmed',
      body: `Your appointment with ${req.user.email} has been confirmed`,
      meta: { appointmentId: appointment._id }
    });
    
    await notification.save();
    
    res.json({
      ok: true,
      data: appointment
    });
  } catch (error) {
    console.error('Confirm appointment error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Error confirming appointment'
      }
    });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  cancel,
  confirm
};