const express = require('express');
const router = express.Router();
const PillSchedule = require('../models/PillSchedule');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.post('/', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const { date, name, time } = req.body;
    let schedule = await PillSchedule.findOne({ patientId: req.user.userId });
    if (!schedule) {
      schedule = new PillSchedule({ patientId: req.user.userId, schedule: [] });
    }
    schedule.schedule.push({ name, time, date, taken: false });
    await schedule.save();

    console.log('IO instance:', !!req.app.get('io'));
    // Real-time notification scheduling (🚀 ADD THIS)
    const io = req.app.get('io'); // get socket.io instance from app.js or server.js
    const scheduleTime = new Date(`${date}T${time}:00+05:30`);
    const delay = scheduleTime.getTime() - Date.now();

    if (delay > 0) {
      setTimeout(() => {
        io.to(req.user.userId.toString()).emit('pillNotification', {
          message: `Time to take your pill: ${name} 💊`,
        });
      }, delay);
    }

    res.status(201).json(schedule);

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const schedule = await PillSchedule.findOne({ patientId: req.user.userId });
    res.json(schedule || { schedule: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.patch('/:id/toggle', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const schedule = await PillSchedule.findOne({ patientId: req.user.userId });
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    const pill = schedule.schedule.id(req.params.id);
    if (!pill) {
      return res.status(404).json({ message: 'Pill not found' });
    }
    pill.taken = !pill.taken;
    await schedule.save();
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;