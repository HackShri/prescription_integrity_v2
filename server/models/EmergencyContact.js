const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
    name: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contactNo: { type: String, required: true },
    relatioship: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    meta: { type: Object }, // for extra info if needed
});

module.exports = mongoose.model('Notification', notificationSchema); 