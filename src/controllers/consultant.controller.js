const User = require('../models/User');
const Profile = require('../models/Profile');
const AvailabilityTemplate = require('../models/AvailabilityTemplate');
const Appointment = require('../models/Appointment');
const Joi = require('joi');

// Validation schemas
const availabilitySchema = Joi.object({
  dayOfWeek: Joi.number().integer().min(0).max(6).optional(),
  date: Joi.date().optional(),
  startTime: Joi.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  endTime: Joi.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  slotDurationMin: Joi.number().integer().min(15).default(30),
  maxConcurrent: Joi.number().integer().min(1).default(1),
  active: Joi.boolean().default(true)
});

const getConsultants = async (req, res) => {
  try {
    const { specialization } = req.query;
    
    // Find users with consultant role (excluding environment-based consultant)
    let query = { role: 'consultant' };
    
    // Filter by specialization if provided
    if (specialization) {
      const profiles = await Profile.find({ specialization: new RegExp(specialization, 'i') });
      const userIds = profiles.map(profile => profile.userId);
      query._id = { $in: userIds };
    }
    
    const consultants = await User.find(query).select('-passwordHash');
    
    // Get profiles for consultants
    const consultantIds = consultants.map(c => c._id);
    const profiles = await Profile.find({ userId: { $in: consultantIds } });
    
    // Combine user and profile data
    const result = consultants.map(consultant => {
      const profile = profiles.find(p => p.userId.toString() === consultant._id.toString());
      return {
        ...consultant.toObject(),
        profile: profile || null
      };
    });
    
    res.json({
      ok: true,
      data: result
    });
  } catch (error) {
    console.error('Get consultants error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching consultants'
      }
    });
  }
};

const getConsultant = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Handle environment-based consultant
    if (id === 'consultant-env') {
      return res.json({
        ok: true,
        data: {
          consultant: {
            _id: 'consultant-env',
            email: 'consultant@arogyam.com',
            role: 'consultant'
          },
          profile: null,
          availabilityCount: 0
        }
      });
    }
    
    // Find consultant
    const consultant = await User.findById(id).select('-passwordHash');
    if (!consultant || consultant.role !== 'consultant') {
      return res.status(404).json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Consultant not found'
        }
      });
    }
    
    // Get profile
    const profile = await Profile.findOne({ userId: id });
    
    // Get availability summary (count of active templates)
    const availabilityCount = await AvailabilityTemplate.countDocuments({
      consultantId: id,
      active: true
    });
    
    res.json({
      ok: true,
      data: {
        consultant,
        profile,
        availabilityCount
      }
    });
  } catch (error) {
    console.error('Get consultant error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching consultant'
      }
    });
  }
};

const getAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Date query parameter is required'
        }
      });
    }
    
    // Handle environment-based consultant
    if (id === 'consultant-env') {
      // In a real implementation, you would fetch this from a database
      // For now, we'll just return an empty array
      return res.json({
        ok: true,
        data: []
      });
    }
    
    // Parse date
    const targetDate = new Date(date);
    if (isNaN(targetDate)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid date format'
        }
      });
    }
    
    // Get availability templates for the consultant
    const templates = await AvailabilityTemplate.find({
      consultantId: id,
      active: true,
      $or: [
        { dayOfWeek: targetDate.getDay() },
        { date: { $gte: new Date(targetDate.toDateString()), $lt: new Date(targetDate.toDateString() + ' 23:59:59') } }
      ]
    });
    
    // Generate slots from templates
    const slots = [];
    
    for (const template of templates) {
      const templateDate = template.date ? new Date(template.date) : targetDate;
      templateDate.setHours(0, 0, 0, 0);
      
      // Skip if template date doesn't match target date
      if (templateDate.toDateString() !== targetDate.toDateString()) {
        continue;
      }
      
      // Parse start and end times
      const [startHours, startMinutes] = template.startTime.split(':').map(Number);
      const [endHours, endMinutes] = template.endTime.split(':').map(Number);
      
      const slotStart = new Date(templateDate);
      slotStart.setHours(startHours, startMinutes, 0, 0);
      
      const slotEnd = new Date(templateDate);
      slotEnd.setHours(endHours, endMinutes, 0, 0);
      
      // Generate time slots
      let currentSlotStart = new Date(slotStart);
      
      while (currentSlotStart < slotEnd) {
        const currentSlotEnd = new Date(currentSlotStart);
        currentSlotEnd.setMinutes(currentSlotEnd.getMinutes() + template.slotDurationMin);
        
        // Stop if we've reached the end time
        if (currentSlotEnd > slotEnd) {
          break;
        }
        
        // Check if slot is already booked
        const existingAppointment = await Appointment.findOne({
          consultantId: id,
          startAt: currentSlotStart,
          status: { $ne: 'cancelled' }
        });
        
        // Add slot if not booked
        if (!existingAppointment) {
          slots.push({
            startAt: new Date(currentSlotStart),
            endAt: new Date(currentSlotEnd),
            maxConcurrent: template.maxConcurrent
          });
        }
        
        // Move to next slot
        currentSlotStart = new Date(currentSlotEnd);
      }
    }
    
    // Sort slots by start time
    slots.sort((a, b) => a.startAt - b.startAt);
    
    res.json({
      ok: true,
      data: slots
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching availability'
      }
    });
  }
};

const createAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = availabilitySchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }
    
    // Check if user is the consultant or admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== id && req.user._id !== 'consultant-env') {
      return res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to create availability for this consultant'
        }
      });
    }
    
    // Handle environment-based consultant
    if (id === 'consultant-env') {
      // In a real implementation, you would store this in a database
      // For now, we'll just return a success response
      return res.status(201).json({
        ok: true,
        data: {
          consultantId: id,
          ...req.body
        }
      });
    }
    
    // Check if consultant exists
    const consultant = await User.findById(id);
    if (!consultant || consultant.role !== 'consultant') {
      return res.status(404).json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Consultant not found'
        }
      });
    }
    
    // Create availability template
    const availability = new AvailabilityTemplate({
      consultantId: id,
      ...req.body
    });
    
    await availability.save();
    
    res.status(201).json({
      ok: true,
      data: availability
    });
  } catch (error) {
    console.error('Create availability error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Error creating availability'
      }
    });
  }
};

module.exports = {
  getConsultants,
  getConsultant,
  getAvailability,
  createAvailability
};