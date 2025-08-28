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
  photo: {type:String, default:''},
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