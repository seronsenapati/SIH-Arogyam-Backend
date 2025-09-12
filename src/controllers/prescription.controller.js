const Prescription = require('../models/Prescription');
const User = require('../models/User');
const Joi = require('joi');

// Validation schemas
const createPrescriptionSchema = Joi.object({
  fields: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    label: Joi.string().required(),
    type: Joi.string().valid('text', 'number', 'date', 'checkbox', 'textarea').required(),
    value: Joi.any().optional(),
    order: Joi.number().required()
  })).required(),
  patientId: Joi.string().required()
});

const getPrescriptionsSchema = Joi.object({
  patientId: Joi.string().required()
});

const create = async (req, res) => {
  try {
    // Only doctors can create prescriptions
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only doctors can create prescriptions'
        }
      });
    }
    
    const { error } = createPrescriptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }
    
    const { fields, patientId } = req.body;
    const doctorId = req.user._id;
    
    // Check if patient exists and is actually a patient
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_PATIENT',
          message: 'Invalid patient'
        }
      });
    }
    
    // Create prescription
    const prescription = new Prescription({
      doctorId,
      patientId,
      fields
    });
    
    await prescription.save();
    
    res.status(201).json({
      ok: true,
      data: prescription
    });
  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Error creating prescription'
      }
    });
  }
};

const getAll = async (req, res) => {
  try {
    const { error } = getPrescriptionsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }
    
    const { patientId } = req.query;
    
    // Check authorization
    if (req.user.role !== 'admin' && req.user.role !== 'doctor' && req.user._id.toString() !== patientId) {
      // Patients can only see their own prescriptions
      if (req.user.role === 'patient' && req.user._id.toString() !== patientId) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Not authorized to view these prescriptions'
          }
        });
      }
    }
    
    // Get prescriptions
    const prescriptions = await Prescription.find({ patientId })
      .populate('doctorId', 'email')
      .sort({ createdAt: -1 });
    
    res.json({
      ok: true,
      data: prescriptions
    });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching prescriptions'
      }
    });
  }
};

module.exports = {
  create,
  getAll
};