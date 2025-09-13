const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('find/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;

    const use = await User.findOne({
      $or:[{email: id }, { mobile:id}]
    }).select('-password');

    if(!user) {
      return res.status(404).json({
        message: 'User not found'
      });

      res.json(user);

    }
  } catch (err) {
    res.status(500).json({ message:'Server error'})
  }
});

router.patch('/verify/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { action } = req.body; // 'accept' or 'reject'
  try {
    if (action === 'accept') {
      await User.findByIdAndUpdate(req.params.id, { verified: true });
      res.json({ message: 'User verified' });
    } else if (action === 'reject') {
      await User.findByIdAndDelete(req.params.id);
      res.json({ message: 'User rejected' });
    } else {
      res.status(400).json({ message: 'Invalid action' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;