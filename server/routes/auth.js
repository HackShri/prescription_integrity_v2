require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/signup', async (req, res) => {
  const { name, email, mobile, password, role, secretCode, age, weight, height } = req.body;
  try {
    // Validate that at least one of email or mobile is provided
    if (!email && !mobile) {
      return res.status(400).json({ message: 'Either email or mobile number is required' });
    }

    // Check if user exists with the provided email or mobile
    let existingUser = null;
    if (email) {
      existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
    }
    if (mobile) {
      existingUser = await User.findOne({ mobile });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this mobile number already exists' });
      }
    }

    if (role === 'admin' && secretCode !== process.env.ADMIN_SECRET_CODE) {
      return res.status(403).json({ message: 'Invalid secret code for admin' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email: email || null,
      mobile: mobile || null,
      password: hashedPassword,
      role,
      age,
      weight,
      height,
      photo: '',
      verified: role === 'patient' || role === 'admin',
    });

    await user.save();

    // Notify all admins if a new doctor or pharmacist signs up
    if (role === 'doctor' || role === 'pharmacist') {
      const admins = await User.find({ role: 'admin' });
      const notifications = admins.map(admin => ({
        user: admin._id,
        type: 'admin-join',
        message: `A new ${role} has joined: ${name}`,
        meta: { userId: user._id, name }
      }));
      await Notification.insertMany(notifications);
      // Emit socket event to all admins
      const io = req.app.get('io');
      if (io) {
        admins.forEach(admin => {
          io.to(String(admin._id)).emit('notification', {
            type: 'admin-join',
            message: `A new ${role} has joined: ${name}`,
            userId: user._id,
            name
          });
        });
      }
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });
    res.status(201).json({ token });
  } catch (err) {
    if (err.message === 'Either email or mobile number is required') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { emailOrMobile, password } = req.body;
  try {
    // Find user by either email or mobile number
    const user = await User.findOne({
      $or: [
        { email: emailOrMobile },
        { mobile: emailOrMobile }
      ]
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if ((user.role === 'doctor' || user.role === 'shop') && !user.verified) {
      return res.status(403).json({ message: 'Account not verified' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/upload-photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.role !== 'patient') {
      return res.status(404).json({ message: 'Patient not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    const photoBase64 = req.file.buffer.toString('base64');
    user.photo = `data:${req.file.mimetype};base64,${photoBase64}`;
    await user.save();

    res.json({ message: 'Photo uploaded successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Fetch notifications for the logged-in user
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.patch('/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.userId, read: false },
      { read: true }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;