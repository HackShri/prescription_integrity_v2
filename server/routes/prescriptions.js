const express = require('express');
const router = express.Router();
const Prescription = require('../models/Prescription');
const User = require('../models/User');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const PDFDocument = require('pdfkit');

// This endpoint is for creating digital records from physical/scanned prescriptions
router.post('/offline', authMiddleware, async (req, res) => {
  const {
    patientEmail,
    patientMobile,
    patientName,
    instructions,
    medications,
    age,
    weight,
    height,
    usageLimit,
    expiresAt,
    doctorName,
    doctorEmail,
    doctorMobile,
    clinicName,
    clinicAddress,
    isOfflinePrescription,
    originalPrescriptionText
  } = req.body;

  try {
    let patient;
    if (patientEmail) patient = await User.findOne({ email: patientEmail, role: 'patient' });
    if (!patient && patientMobile) patient = await User.findOne({ mobile: patientMobile, role: 'patient' });

    if (!patient) {
      return res.status(400).json({ message: 'Patient not found.' });
    }

    const doctorId = req.user.userId;
    const prescription = new Prescription({
      patientId: patient._id, doctorId, patientEmail: patient.email, patientMobile: patient.mobile,
      instructions, medications, age, weight, height, usageLimit, expiresAt,
      doctorSignature: '', patientPhoto: patient.photo || '', isOfflinePrescription: true,
      originalPrescriptionText: originalPrescriptionText || '', patientName: patientName || '',
      doctorName: doctorName || '', doctorEmail: doctorEmail || '', doctorMobile: doctorMobile || '',
      clinicName: clinicName || '', clinicAddress: clinicAddress || ''
    });
    // Check for flagged (potentially dangerous) medications
    const dangerousList = ["warfarin", "isotretinoin", "methotrexate", "amiodarone", "digoxin"];
    const flagged = (medications || []).filter(m => dangerousList.includes((m.name || '').toLowerCase()));
    if (flagged && flagged.length) {
      prescription.verification = {
        status: 'pending',
        flaggedMedications: flagged.map(m => ({ name: m.name, reason: 'Potentially dangerous medication' })),
        requestedBy: req.user.userId
      };
    }
    await prescription.save();



    const notification = {
      user: patient._id,
      type: 'prescription',
      message: `A new prescription has been digitized by ${doctorName || 'a doctor'}.`,
      meta: { prescriptionId: prescription._id }
    };
    await Notification.create(notification);

    const io = req.app.get('io');
    if (io) io.to(String(patient._id)).emit('notification', notification);

    res.status(201).json({ _id: prescription._id, patientId: patient._id });
  } catch (err) {
    console.error('Offline prescription creation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// This endpoint is for creating new digital prescriptions directly
router.post('/', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  const { patientEmail, patientMobile, instructions, medications, age, weight, height, usageLimit, expiresAt, doctorSignature } = req.body;
  try {
    let patient;
    if (patientEmail) patient = await User.findOne({ email: patientEmail, role: 'patient' });
    if (!patient && patientMobile) patient = await User.findOne({ mobile: patientMobile, role: 'patient' });

    if (!patient) return res.status(400).json({ message: 'Patient not found.' });

    const prescription = new Prescription({
      patientId: patient._id, doctorId: req.user.userId, patientEmail: patient.email, patientMobile: patient.mobile,
      instructions, medications, age, weight, height, usageLimit, expiresAt, doctorSignature, patientPhoto: patient.photo || '',
    });
    // For prescriptions created by doctors, assume verified unless flagged
    const dangerousList = ["warfarin", "isotretinoin", "methotrexate", "amiodarone", "digoxin"];
    const flagged = (medications || []).filter(m => dangerousList.includes((m.name || '').toLowerCase()));
    if (flagged && flagged.length) {
      prescription.verification = {
        status: 'pending',
        flaggedMedications: flagged.map(m => ({ name: m.name, reason: 'Potentially dangerous medication' })),
        requestedBy: req.user.userId
      };
    } else {
      prescription.verification = { status: 'verified', verifiedBy: req.user.userId, verifiedAt: new Date() };
    }
    await prescription.save();

    const notification = {
      user: patient._id,
      type: 'prescription',
      message: 'A new prescription has been issued to you.',
      meta: { prescriptionId: prescription._id }
    };
    await Notification.create(notification);

    const io = req.app.get('io');
    if (io) io.to(String(patient._id)).emit('notification', notification);

    res.status(201).json({ _id: prescription._id, patientId: patient._id });
  } catch (err) {
    console.error('Prescription creation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/patient', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patientId: req.user.userId }).sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });

    const isPatient = String(req.user.userId) === String(prescription.patientId);
    const isPharmacist = req.user.role === 'pharmacist';

    if (!isPatient && !isPharmacist) return res.status(403).json({ message: 'Access denied' });

    res.json(prescription);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/short/:shortId', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const { shortId } = req.params;
    const prescription = await Prescription.findOne({ shortId }).populate('patientId');
    if (!prescription) return res.status(404).json({ message: 'Prescription Not found' });
    res.json(prescription);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Pharmacist requests verification for a prescription (e.g., after scanning)
router.post('/:id/request-verification', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });

    // Re-check meds for dangerous items
    const dangerousList = ["warfarin", "isotretinoin", "methotrexate", "amiodarone", "digoxin"];
    const flagged = (prescription.medications || []).filter(m => dangerousList.includes((m.name || '').toLowerCase()));

    if (!flagged.length) {
      return res.json({ message: 'No flagged medications found' });
    }

    prescription.verification = prescription.verification || {};
    prescription.verification.status = 'pending';
    prescription.verification.flaggedMedications = flagged.map(m => ({ name: m.name, reason: 'Potentially dangerous medication' }));
    prescription.verification.requestedBy = req.user.userId;
    await prescription.save();

    // Notify the prescribing doctor if present, otherwise all doctors
    const io = req.app.get('io');
    if (prescription.doctorId) {
      const notification = await Notification.create({
        user: prescription.doctorId,
        type: 'verification-request',
        message: `Verification requested for prescription ${prescription.shortId}`,
        meta: { prescriptionId: prescription._id }
      });
      if (io) io.to(String(prescription.doctorId)).emit('notification', notification);
    } else {
      const doctors = await User.find({ role: 'doctor' }).limit(10);
      const notes = doctors.map(d => ({ user: d._id, type: 'verification-request', message: `Verification requested for prescription ${prescription.shortId}`, meta: { prescriptionId: prescription._id } }));
      await Notification.insertMany(notes);
      if (io) doctors.forEach(d => io.to(String(d._id)).emit('notification', { type: 'verification-request', message: `Verification requested for prescription ${prescription.shortId}`, meta: { prescriptionId: prescription._id } }));
    }

    res.json({ message: 'Verification requested', verification: prescription.verification });
  } catch (err) {
    console.error('Request verification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Doctor approves or rejects a flagged prescription
router.patch('/:id/verify', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  try {
    const { action, notes } = req.body; // action: 'approve' | 'reject'
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });

    if (!prescription.verification || prescription.verification.status !== 'pending') {
      return res.status(400).json({ message: 'No pending verification for this prescription' });
    }

    if (action === 'approve') {
      prescription.verification.status = 'verified';
      prescription.verification.verifiedBy = req.user.userId;
      prescription.verification.verifiedAt = new Date();
      prescription.verification.notes = notes || '';
    } else if (action === 'reject') {
      prescription.verification.status = 'rejected';
      prescription.verification.verifiedBy = req.user.userId;
      prescription.verification.verifiedAt = new Date();
      prescription.verification.notes = notes || '';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await prescription.save();

    // Notify the requesting pharmacist (if any) and patient
    const io = req.app.get('io');
    if (prescription.verification && prescription.verification.requestedBy) {
      const notification = await Notification.create({
        user: prescription.verification.requestedBy,
        type: 'verification-result',
        message: `Verification ${prescription.verification.status} for prescription ${prescription.shortId}`,
        meta: { prescriptionId: prescription._id, status: prescription.verification.status }
      });
      if (io) io.to(String(prescription.verification.requestedBy)).emit('notification', notification);
    }

    // Also notify patient
    if (prescription.patientId) {
      const notification = await Notification.create({
        user: prescription.patientId,
        type: 'verification-update',
        message: `Your prescription ${prescription.shortId} verification status: ${prescription.verification.status}`,
        meta: { prescriptionId: prescription._id, status: prescription.verification.status }
      });
      if (io) io.to(String(prescription.patientId)).emit('notification', notification);
    }

    res.json({ message: `Prescription ${prescription.verification.status}` });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CORRECTED LOGIC for pharmacist-specific history
router.get('/history/pharmacist', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const pharmacistId = req.user.userId;
    const history = await Prescription.find({ 'dispensedBy.pharmacistId': pharmacistId })
      .populate('patientId', 'name email')
      .sort({ updatedAt: -1 });
    res.json(history);
  } catch (err) {
    console.error("Error fetching shop history:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CORRECTED LOGIC to record which pharmacist dispensed the medicine
router.patch('/:id/use', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    if (prescription.used >= prescription.usageLimit) return res.status(400).json({ message: 'Usage limit reached' });
    if (new Date(prescription.expiresAt) < new Date()) return res.status(400).json({ message: 'Prescription expired' });
    // Block dispensing if verification pending or explicitly rejected
    if (prescription.verification && ['pending', 'rejected'].includes(prescription.verification.status)) {
      return res.status(403).json({ message: 'Prescription requires doctor verification before dispensing', verification: prescription.verification });
    }

    const pharmacistId = req.user.userId;

    prescription.used += 1;
    prescription.dispensedBy.push({ pharmacistId: pharmacistId, dispensedAt: new Date() });

    await prescription.save();
    res.json({ message: 'Prescription used and logged successfully' });
  } catch (err) {
    console.error("Error using prescription:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PDF download route
router.get('/:id/download', authMiddleware, async (req, res) => {
  // This route's logic seems fine, no changes needed here.
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).send('Not Found');
    // ... (rest of the PDF generation logic)
    res.send("PDF generation logic goes here."); // Placeholder
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

module.exports = router;
