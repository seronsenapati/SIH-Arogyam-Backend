const mongoose = require('mongoose');

const sessionRecordSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    unique: true
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  notes: {
    type: String,
    trim: true
  },
  consultantRatingByPatient: {
    type: Number,
    min: 1,
    max: 5
  },
  patientRatingByConsultant: {
    type: Number,
    min: 1,
    max: 5
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SessionRecord', sessionRecordSchema);