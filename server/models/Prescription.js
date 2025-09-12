const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, required: true }, // e.g., "500mg", "10ml"
  quantity: { type: Number, required: true }, // number of tablets/bottles to buy
  frequency: { type: String, required: true }, // e.g., "twice daily", "once daily"
  timing: { type: String, required: true }, // e.g., "after meals", "before breakfast", "at bedtime"
  duration: { type: String, required: true }, // e.g., "7 days", "2 weeks"
  instructions: { type: String }, // additional specific instructions
});

const prescriptionSchema = new mongoose.Schema({
  patientEmail: { type: String, required: true },
  patientMobile: { type: String }, // New field for mobile number
  patientId: { type: String, required: true },
  doctorId: { type: String, required: true },
  instructions: { type: String },
  medications: [medicationSchema], // Updated to use detailed medication schema
  age: { type: Number },
  weight: { type: Number },
  height: { type: Number },
  usageLimit: { type: Number, default: 1 },
  used: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  doctorSignature: { type: String, required: true },
  patientPhoto: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Prescription', prescriptionSchema);