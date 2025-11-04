const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  mobile: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor', 'shop', 'admin'], required: true },
  age: { type: Number }, // For patients
  weight: { type: Number }, // For patients
  height: { type: Number },
  // Local path to stored photo on disk (no cloud storage)
  photo: { type: String, default: '', required: false },
  // First-login survey completion flag
  surveyCompleted: { type: Boolean, default: false },
  // Medical profile captured via survey
  medicalProfile: {
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'], default: 'Unknown' },
    diabetes: { type: Boolean, default: false },
    hypertension: { type: Boolean, default: false },
    asthma: { type: Boolean, default: false },
    allergies: { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
    currentMedications: { type: [String], default: [] },
    priorSurgeries: { type: [String], default: [] },
    smoking: { type: String, enum: ['never', 'former', 'current', 'unknown'], default: 'unknown' },
    alcohol: { type: String, enum: ['never', 'occasional', 'regular', 'unknown'], default: 'unknown' },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relation: { type: String, default: '' }
    }
  },
  verified: { type: Boolean, default: false},
  createdAt: { type: Date, default: Date.now },
});

// Custom validation to ensure at least one of email or mobile is provided
userSchema.pre('save', function(next) {
  if (!this.email && !this.mobile) {
    return next(new Error('Either email or mobile number is required'));
  }
  next();
});

module.exports = mongoose.model('User', userSchema);