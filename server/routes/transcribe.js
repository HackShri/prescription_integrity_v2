const express = require("express");
const axios = require("axios");
const multer = require("multer");
const fs = require("fs");
const FormData = require("form-data");

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // temporary save

router.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const filePath = req.file.path;
    
    // Create FormData to send to FastAPI
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(filePath), {
      filename: req.file.originalname || 'audio.webm',
      contentType: req.file.mimetype || 'audio/webm'
    });

    // Send to FastAPI inference service
    const response = await axios.post(
      "http://localhost:8001/transcribe",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000, // 30 second timeout
      }
    );

    // Clean up temporary file
    fs.unlinkSync(filePath);

    res.json(response.data);
  } catch (err) {
    console.error("Transcription error:", err);
    
    // Clean up temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // Handle different error types
    if (err.code === 'ECONNREFUSED') {
      res.status(503).json({ error: "Transcription service unavailable. Please try again later." });
    } else if (err.code === 'ECONNABORTED') {
      res.status(408).json({ error: "Transcription timeout. Please try with a shorter audio clip." });
    } else {
      res.status(500).json({ error: "Transcription failed. Please try again." });
    }
  }
});

// Smart transcription endpoint with prescription generation
router.post("/smart-transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const filePath = req.file.path;
    const age = parseInt(req.body.age) || 25;
    const weight = parseFloat(req.body.weight) || 70.0;
    
    // Create FormData to send to FastAPI
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(filePath), {
      filename: req.file.originalname || 'audio.webm',
      contentType: req.file.mimetype || 'audio/webm'
    });
    formData.append('age', age.toString());
    formData.append('weight', weight.toString());

    // Send to FastAPI smart transcription service
    const response = await axios.post(
      "http://localhost:8001/smart-transcribe",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000, // 60 second timeout for smart processing
      }
    );

    // Clean up temporary file
    fs.unlinkSync(filePath);

    res.json(response.data);
  } catch (err) {
    console.error("Smart transcription error:", err);
    
    // Clean up temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // Handle different error types
    if (err.code === 'ECONNREFUSED') {
      res.status(503).json({ error: "Smart transcription service unavailable. Please try again later." });
    } else if (err.code === 'ECONNABORTED') {
      res.status(408).json({ error: "Smart transcription timeout. Please try with a shorter audio clip." });
    } else {
      res.status(500).json({ error: "Smart transcription failed. Please try again." });
    }
  }
});

module.exports = router;
//