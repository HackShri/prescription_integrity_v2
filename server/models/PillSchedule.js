const mongoose = require('mongoose');

const pillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  time: { type: String, required: true },
  taken: { type: Boolean, default: false },
  date: { type: String, required: true },
});

const pillScheduleSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  schedule: [pillSchema],
});

module.exports = mongoose.model('PillSchedule', pillScheduleSchema);