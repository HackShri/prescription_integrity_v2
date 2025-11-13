require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Ensure upload directory exists
const avatarDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// Store photos on disk locally
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '') || '.jpg';
    cb(null, `${req.user?.userId || 'anonymous'}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Use a safe JWT secret fallback if JWT_SECRET is not set
const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'your-secret-key-change-in-production';

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
    // Build user object without inserting null for sparse unique fields
    const userData = {
      name,
      password: hashedPassword,
      role,
      age,
      weight,
      height,
      photo: '',
      verified: role === 'patient' || role === 'admin',
    };
    if (email) userData.email = email;
    if (mobile) userData.mobile = mobile;

    const user = new User(userData);

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

    // Create JWT token with 24-hour expiration
    const token = jwt.sign({ userId: user._id, role: user.role }, jwtSecret, {
      expiresIn: '24h', // 24 hours
    });

    // Create session with 24-hour expiration
    req.session.userId = user._id.toString();
    req.session.userRole = user.role;
    req.session.isAuthenticated = true;

    res.status(201).json({
      token,
      message: 'User registered successfully',
      session: {
        authenticated: true,
        expiresIn: '24h'
      }
    });
  } catch (err) {
    if (err.message === 'Either email or mobile number is required') {
      return res.status(400).json({ message: err.message });
    }
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const emailOrMobile = req.body.emailOrMobile || req.body.email || req.body.mobile;
  const password = req.body.password;

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

    // Create JWT token with 24-hour expiration
    const token = jwt.sign({ userId: user._id, role: user.role }, jwtSecret, {
      expiresIn: '24h', // 24 hours
    });

    // Create session with 24-hour expiration
    req.session.userId = user._id.toString();
    req.session.userRole = user.role;
    req.session.isAuthenticated = true;

    res.json({
      token,
      message: 'Login successful',
      session: {
        authenticated: true,
        expiresIn: '24h'
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/upload-photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'patient') {
      return res.status(404).json({ message: 'Patient not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    // Save relative path that frontend can request via static hosting
    const relativePath = path.join('uploads', 'avatars', path.basename(req.file.path));
    user.photo = relativePath.replace(/\\/g, '/');
    await user.save();

    res.json({ message: 'Photo uploaded successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save first-time survey (medical profile) for patient
router.post('/survey', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'patient') {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const {
      bloodGroup,
      diabetes,
      hypertension,
      asthma,
      allergies,
      chronicConditions,
      currentMedications,
      priorSurgeries,
      smoking,
      alcohol,
      emergencyContact,
      age,
      weight,
      height
    } = req.body || {};

    // Update basic vitals if provided
    if (typeof age !== 'undefined') user.age = age;
    if (typeof weight !== 'undefined') user.weight = weight;
    if (typeof height !== 'undefined') user.height = height;

    user.medicalProfile = {
      ...user.medicalProfile?.toObject?.(),
      bloodGroup,
      diabetes,
      hypertension,
      asthma,
      allergies,
      chronicConditions,
      currentMedications,
      priorSurgeries,
      smoking,
      alcohol,
      emergencyContact
    };
    user.surveyCompleted = true;
    await user.save();

    res.json({ message: 'Survey saved', surveyCompleted: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Logout endpoint - destroys session
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out', error: err.message });
    }
    res.clearCookie('sessionId');
    res.json({ message: 'Logout successful' });
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if session is still valid
    const sessionInfo = req.session.isAuthenticated ? {
      authenticated: true,
      expiresIn: '24h',
      sessionId: req.sessionID
    } : null;

    res.json({ ...user.toObject(), session: sessionInfo });
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