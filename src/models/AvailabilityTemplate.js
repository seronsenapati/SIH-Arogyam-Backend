const mongoose = require('mongoose');

const availabilityTemplateSchema = new mongoose.Schema({
  consultantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    required: false // Optional, for recurring templates
  },
  date: {
    type: Date,
    required: false // Optional, for one-off overrides
  },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  slotDurationMin: {
    type: Number,
    default: 30,
    min: 15
  },
  maxConcurrent: {
    type: Number,
    default: 1,
    min: 1
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
availabilityTemplateSchema.index({ consultantId: 1, dayOfWeek: 1 });
availabilityTemplateSchema.index({ consultantId: 1, date: 1 });

module.exports = mongoose.model('AvailabilityTemplate', availabilityTemplateSchema);