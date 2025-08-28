const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['prescription', 'pill-alarm', 'admin-join'], required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  meta: { type: Object }, // for extra info if needed
});

module.exports = mongoose.model('Notification', notificationSchema); 