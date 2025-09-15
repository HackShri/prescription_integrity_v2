const express = require('express');
const router = express.Router();
const Prescription = require('../models/Prescription');
const User = require('../models/User');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Offline prescription creation endpoint (for OCR scanned prescriptions)
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
    // Find patient by email or mobile number
    let patient;
    if (patientEmail) {
      patient = await User.findOne({ email: patientEmail, role: 'patient' });
    }
    if (!patient && patientMobile) {
      patient = await User.findOne({ mobile: patientMobile, role: 'patient' });
    }
    
    if (!patient) {
      return res.status(400).json({ message: 'Patient not found. Please check the email or mobile number.' });
    }
    
    // For offline prescriptions, we use a special doctor ID or the current user's ID
    const doctorId = req.user.userId; // The user who is digitizing the prescription
    
    const prescription = new Prescription({
      patientEmail: patient.email,
      patientMobile: patient.mobile || patientMobile,
      patientId: patient._id,
      doctorId: doctorId,
      instructions,
      medications,
      age,
      weight,
      height,
      usageLimit,
      expiresAt,
      doctorSignature: '', // No signature for offline prescriptions
      patientPhoto: patient.photo || '',
      isOfflinePrescription: true,
      originalPrescriptionText: originalPrescriptionText || '',
      patientName: patientName || '',
      doctorName: doctorName || '',
      doctorEmail: doctorEmail || '',
      doctorMobile: doctorMobile || '',
      clinicName: clinicName || '',
      clinicAddress: clinicAddress || ''
    });
    await prescription.save();

    // Create notification for patient
    await Notification.create({
      user: patient._id,
      type: 'prescription',
      message: `A new prescription has been digitized and issued to you by ${doctorName || 'a doctor'}.`,
      meta: { prescriptionId: prescription._id }
    });

    // Emit socket event to patient
    const io = req.app.get('io');
    if (io) {
      io.to(String(patient._id)).emit('notification', {
        type: 'prescription',
        message: `A new prescription has been digitized and issued to you by ${doctorName || 'a doctor'}.`,
        prescriptionId: prescription._id
      });
    }

    res.status(201).json({ _id: prescription._id, patientId: patient._id });
  } catch (err) {
    console.error('Offline prescription creation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  const {
    patientEmail,
    patientMobile,
    instructions,
    medications,
    age,
    weight,
    height,
    usageLimit,
    expiresAt,
    doctorSignature,
  } = req.body;
  try {
    // Find patient by email or mobile number
    let patient;
    if (patientEmail) {
      patient = await User.findOne({ email: patientEmail, role: 'patient' });
    }
    if (!patient && patientMobile) {
      patient = await User.findOne({ mobile: patientMobile, role: 'patient' });
    }
    
    if (!patient) {
      return res.status(400).json({ message: 'Patient not found. Please check the email or mobile number.' });
    }
    
    const prescription = new Prescription({
      patientEmail: patient.email,
      patientMobile: patient.mobile || patientMobile,
      patientId: patient._id,
      doctorId: req.user.userId,
      instructions,
      medications,
      age,
      weight,
      height,
      usageLimit,
      expiresAt,
      doctorSignature,
      patientPhoto: patient.photo || '',
    });
    await prescription.save();

    // Create notification for patient
    await Notification.create({
      user: patient._id,
      type: 'prescription',
      message: 'A new prescription has been issued to you.',
      meta: { prescriptionId: prescription._id }
    });

    // Emit socket event to patient (if using socket.io rooms by userId)
    const io = req.app.get('io');
    if (io) {
      io.to(String(patient._id)).emit('notification', {
        type: 'prescription',
        message: 'A new prescription has been issued to you.',
        prescriptionId: prescription._id
      });
    }

    res.status(201).json({ _id: prescription._id, patientId: patient._id });
  } catch (err) {
    console.error('Prescription creation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/patient', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patientId: req.user.userId });
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    if (req.user.userId !== prescription.patientId && req.user.role !== 'shop') {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(prescription);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get prescription by short ID (for QR code scanning)
router.get('/short/:shortId', authMiddleware, roleMiddleware('shop'), async (req, res) => {
  try {
    const { shortId } = req.params;
    
    // Find prescription by matching the last 8 characters of the ID
    const prescriptions = await Prescription.find();
    const prescription = prescriptions.find(p => p._id.toString().slice(-8) === shortId);
    
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    
    res.json(prescription);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get shop dispensing history
router.get('/shop-history', authMiddleware, roleMiddleware('shop'), async (req, res) => {
  try {
    // Get all prescriptions that have been used at least once
    const prescriptions = await Prescription.find({ used: { $gt: 0 } }).sort({ updatedAt: -1 });
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id/use', authMiddleware, roleMiddleware('shop'), async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    if (prescription.used >= prescription.usageLimit) {
      return res.status(400).json({ message: 'Usage limit reached' });
    }
    if (new Date(prescription.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Prescription expired' });
    }
    prescription.used += 1;
    await prescription.save();
    res.json({ message: 'Prescription used' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Download prescription as PDF
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    
    // Check if user has access to this prescription
    if (req.user.userId !== prescription.patientId && req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get patient and doctor information
    const patient = await User.findById(prescription.patientId);
    const doctor = await User.findById(prescription.doctorId);

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="prescription-${prescription._id.slice(-6)}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(24).font('Helvetica-Bold').text('PRESCRIPTION', { align: 'center' });
    doc.moveDown();
    
    // Add prescription details
    doc.fontSize(12).font('Helvetica');
    doc.text(`Prescription ID: ${prescription._id.slice(-6)}`, { align: 'left' });
    doc.text(`Date: ${new Date(prescription.createdAt).toLocaleDateString()}`, { align: 'left' });
    doc.text(`Expires: ${new Date(prescription.expiresAt).toLocaleDateString()}`, { align: 'left' });
    doc.moveDown();

    // Patient Information
    doc.fontSize(14).font('Helvetica-Bold').text('PATIENT INFORMATION');
    doc.fontSize(12).font('Helvetica');
    if (patient) {
      doc.text(`Name: ${patient.name || 'N/A'}`);
      doc.text(`Email: ${patient.email}`);
    }
    if (prescription.age) doc.text(`Age: ${prescription.age} years`);
    if (prescription.weight) doc.text(`Weight: ${prescription.weight} kg`);
    if (prescription.height) doc.text(`Height: ${prescription.height} cm`);
    doc.moveDown();

    // Doctor Information
    doc.fontSize(14).font('Helvetica-Bold').text('DOCTOR INFORMATION');
    doc.fontSize(12).font('Helvetica');
    if (doctor) {
      doc.text(`Name: ${doctor.name || 'N/A'}`);
      doc.text(`Email: ${doctor.email}`);
    }
    doc.moveDown();

    // Medications
    doc.fontSize(14).font('Helvetica-Bold').text('MEDICATIONS');
    doc.fontSize(12).font('Helvetica');
    prescription.medications.forEach((medication, index) => {
      doc.text(`${index + 1}. ${medication.name} - ${medication.dosage}`);
      doc.text(`   Quantity to buy: ${medication.quantity}`);
      doc.text(`   Frequency: ${medication.frequency}`);
      doc.text(`   Timing: ${medication.timing}`);
      doc.text(`   Duration: ${medication.duration}`);
      if (medication.instructions) {
        doc.text(`   Instructions: ${medication.instructions}`);
      }
      doc.moveDown(0.5);
    });
    doc.moveDown();

    // Instructions
    doc.fontSize(14).font('Helvetica-Bold').text('INSTRUCTIONS');
    doc.fontSize(12).font('Helvetica');
    doc.text(prescription.instructions || 'No specific instructions provided.');
    doc.moveDown();

    // Usage Information
    doc.fontSize(14).font('Helvetica-Bold').text('USAGE INFORMATION');
    doc.fontSize(12).font('Helvetica');
    doc.text(`Usage: ${prescription.used} / ${prescription.usageLimit} times`);
    doc.text(`Status: ${prescription.status || (new Date(prescription.expiresAt) < new Date() ? 'Expired' : 'Active')}`);
    doc.moveDown();

    // Add QR Code placeholder text
    doc.fontSize(14).font('Helvetica-Bold').text('QR CODE');
    doc.fontSize(12).font('Helvetica');
    doc.text(`QR Code Value: RX:${prescription._id.slice(-8)}`);
    doc.text('(Scan this code to verify prescription authenticity)');

    // Finalize PDF
    doc.end();

  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ message: 'Error generating PDF' });
  }
});

module.exports = router;