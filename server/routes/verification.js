const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Prescription = require('../models/Prescription');

const dangerousPath = path.join(__dirname, '..', 'data', 'dangerous_drugs.json');
let dangerousCache = null;
function loadDangerous() {
  if (!dangerousCache) {
    const raw = fs.readFileSync(dangerousPath, 'utf-8');
    dangerousCache = JSON.parse(raw);
  }
  return dangerousCache;
}

function findDangerousMatches(medications) {
  const { drugs } = loadDangerous();
  const names = (medications || []).map(m => (m.name || '').toLowerCase().trim());
  const matches = [];
  for (const item of drugs) {
    const target = (item.name || '').toLowerCase().trim();
    if (names.includes(target)) {
      matches.push({ name: item.name, reason: item.reason });
    }
  }
  return matches;
}

// Get dangerous list (for debugging/testing)
router.get('/dangerous-list', authMiddleware, (req, res) => {
  try {
    res.json(loadDangerous());
  } catch (e) {
    res.status(500).json({ message: 'Failed to load list' });
  }
});

// Check a prescription or a set of medications for dangerous matches
router.post('/check', authMiddleware, async (req, res) => {
  try {
    const { prescriptionId, medications } = req.body || {};
    let meds = medications;
    if (!meds && prescriptionId) {
      const p = await Prescription.findById(prescriptionId);
      if (!p) return res.status(404).json({ message: 'Prescription not found' });
      meds = p.medications;
    }
    const matches = findDangerousMatches(meds || []);
    res.json({ flagged: matches });
  } catch (e) {
    res.status(500).json({ message: 'Check failed' });
  }
});

// Pharmacist requests verification
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { prescriptionId, notes } = req.body || {};
    const p = await Prescription.findById(prescriptionId);
    if (!p) return res.status(404).json({ message: 'Prescription not found' });

    const flagged = findDangerousMatches(p.medications);
    if (flagged.length === 0) return res.status(400).json({ message: 'No dangerous drugs to verify' });

    p.verification = {
      status: 'pending',
      flaggedMedications: flagged,
      requestedBy: req.user.userId,
      notes: notes || ''
    };
    await p.save();

    // Notify doctor via socket if available
    const io = req.app.get('io');
    if (io) {
      io.to(String(p.doctorId)).emit('verification:requested', { prescriptionId: p._id, flagged });
    }

    res.json({ message: 'Verification requested', verification: p.verification });
  } catch (e) {
    res.status(500).json({ message: 'Request failed' });
  }
});

// Doctor approves/rejects verification
router.post('/approve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') return res.status(403).json({ message: 'Only doctors can approve' });
    const { prescriptionId, approve, notes } = req.body || {};
    const p = await Prescription.findById(prescriptionId);
    if (!p) return res.status(404).json({ message: 'Prescription not found' });

    if (!p.verification || p.verification.status !== 'pending') {
      return res.status(400).json({ message: 'No pending verification' });
    }

    p.verification.status = approve ? 'verified' : 'rejected';
    p.verification.verifiedBy = req.user.userId;
    p.verification.verifiedAt = new Date();
    p.verification.notes = notes || p.verification.notes;
    await p.save();

    const io = req.app.get('io');
    if (io) {
      // notify pharmacist(s) listening globally (for demo we broadcast)
      io.emit('verification:updated', { prescriptionId: p._id, status: p.verification.status });
    }

    res.json({ message: 'Verification updated', verification: p.verification });
  } catch (e) {
    res.status(500).json({ message: 'Approve failed' });
  }
});

// Fetch verification status for a prescription
router.get('/status/:id', authMiddleware, async (req, res) => {
  try {
    const p = await Prescription.findById(req.params.id).select('verification');
    if (!p) return res.status(404).json({ message: 'Prescription not found' });
    res.json(p.verification || { status: 'none' });
  } catch (e) {
    res.status(500).json({ message: 'Status failed' });
  }
});

// Doctor: list pending verification requests for this doctor
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') return res.status(403).json({ message: 'Only doctors can view pending verifications' });
    const list = await Prescription.find({ doctorId: req.user.userId, 'verification.status': 'pending' })
      .select('_id patientId patientName medications verification createdAt')
      .populate('patientId', 'name');
    res.json(list || []);
  } catch (e) {
    res.status(500).json({ message: 'Fetch pending failed' });
  }
});

module.exports = router;


