const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, required: true }, // e.g., "500mg", "10ml"
  quantity: { type: Number },//, required: true }, // number of tablets/bottles to buy
  frequency: { type: String },//, required: true }, // e.g., "twice daily", "once daily"
  timing: { type: String },//, required: true }, // e.g., "after meals", "before breakfast", "at bedtime"
  duration: { type: String },//, required: true }, // e.g., "7 days", "2 weeks"
  instructions: { type: String }, // additional specific instructions
});

const prescriptionSchema = new mongoose.Schema({
  patientEmail: { type: String, required: true },
  patientMobile: { type: String }, // New field for mobile number
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shortId: { type: String, unique: true, index: true },
  instructions: { type: String },
  medications: [medicationSchema], // Updated to use detailed medication schema
  age: { type: Number },
  weight: { type: Number },
  height: { type: Number },
  usageLimit: { type: Number, default: 1 },
  used: { type: Number, default: 0 },
  dispensedBy: [{
    pharmacistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    dispensedAt: {
      type: Date,
      default: Date.now
    }
  }],
  expiresAt: { type: Date, required: true },
  doctorSignature: { type: String }, // Made optional for offline prescriptions
  patientPhoto: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  // New fields for offline prescriptions
  isOfflinePrescription: { type: Boolean, default: false },
  originalPrescriptionText: { type: String, default: '' },
  patientName: { type: String, default: '' },
  doctorName: { type: String, default: '' },
  doctorEmail: { type: String, default: '' },
  doctorMobile: { type: String, default: '' },
  clinicName: { type: String, default: '' },
  clinicAddress: { type: String, default: '' }
  ,
  // Verification metadata for pharmacist/doctor cross-check workflow
  verification: {
    status: { type: String, enum: ['none', 'pending', 'verified', 'rejected'], default: 'none' },
    flaggedMedications: [{ name: String, reason: String }],
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    notes: { type: String, default: '' }
  }
}, { timestamps: true });
prescriptionSchema.pre('save', function (next) {
  if (this.isNew && !this.shortId) {
    this.shortId = this._id.toString().slice(-8);
  }
  next();
});


module.exports = mongoose.model('Prescription', prescriptionSchema);