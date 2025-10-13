const express = require("express");
const axios = require("axios");
const multer = require("multer");
const fs = require("fs");
const FormData = require("form-data");
const crypto = require('crypto');
const redis = require('../utils/cache');

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // Using temporary storage

// NOTE: The main logic is now consolidated into a single endpoint.
// The frontend should call this endpoint for the full AI prescription generation.
router.post("/generate-prescription", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const filePath = req.file.path;
    const age = parseInt(req.body.age) || 30;
    const weight = parseFloat(req.body.weight) || 70.0;

    const formData = new FormData();
    formData.append('audio', fs.createReadStream(filePath), {
      filename: req.file.originalname || 'audio.webm',
      contentType: req.file.mimetype || 'audio/webm'
    });
    formData.append('age', age.toString());
    formData.append('weight', weight.toString());

    const response = await axios.post(
      "http://localhost:8001/generate-prescription",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000,
      }
    );

    fs.unlinkSync(filePath);

    res.json(response.data);
  } catch (err) {
    console.error("Prescription generation error:", err.message);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (err.response) {
      const status = err.response.status || 500;
      const data = err.response.data || {};
      const detail = data.detail || data.error || data.message || 'AI service error';
      return res.status(status).json({ error: detail, raw: data });
    }
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: "AI service is unavailable." });
    }
    res.status(500).json({ error: "An internal error occurred." });
  }
});

// Backwards-compatible handler for legacy client calls
// router.post('/smart-transcribe', upload.single('audio'), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: 'No audio file provided' });
//     }

//     const filePath = req.file.path;
//     const age = parseInt(req.body.age) || 30;
//     const weight = parseFloat(req.body.weight) || 70.0;

//     const formData = new FormData();
//     formData.append('audio', fs.createReadStream(filePath), {
//       filename: req.file.originalname || 'audio.webm',
//       contentType: req.file.mimetype || 'audio/webm'
//     });
//     formData.append('age', age.toString());
//     formData.append('weight', weight.toString());

//     const response = await axios.post(
//       'http://localhost:8001/generate-prescription',
//       formData,
//       { headers: { ...formData.getHeaders() }, timeout: 60000 }
//     );

//     fs.unlinkSync(filePath);

//     return res.json(response.data);
//   } catch (err) {
//     console.error('Smart transcribe proxy error:', err.message);
//     if (req.file && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }
//     if (err.response) {
//       const status = err.response.status || 500;
//       const data = err.response.data || {};
//       const detail = data.detail || data.error || data.message || 'AI service error';
//       return res.status(status).json({ error: detail, raw: data });
//     }
//     if (err.code === 'ECONNREFUSED') {
//       return res.status(503).json({ error: 'AI service is unavailable.' });
//     }
//     return res.status(500).json({ error: 'Failed to process audio.' });
//   }
// });

// Backwards-compatible handler for legacy client calls
router.post('/smart-transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const filePath = req.file.path;
    const age = parseInt(req.body.age) || 30;
    const weight = parseFloat(req.body.weight) || 70.0;

    // Compute a stable hash for the audio file combined with params
    let cacheKey;
    try {
      const audioBuffer = fs.readFileSync(filePath);
      const h = crypto.createHash('sha256');
      h.update(audioBuffer);
      h.update('\n');
      h.update(String(age));
      h.update('\n');
      h.update(String(weight));
      cacheKey = `smarttranscribe:${h.digest('hex')}`;

      // Check Redis for a cached response
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          // return cached JSON response
          const parsed = JSON.parse(cached);
          // cleanup file before returning
          try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
          return res.json(parsed);
        }
      } catch (redisErr) {
        // Non-fatal: log and continue to call AI service
        console.error('Redis get error (smart-transcribe):', redisErr && redisErr.message ? redisErr.message : redisErr);
      }
    } catch (hashErr) {
      // If hashing fails, continue without caching
      console.error('Failed to compute audio hash for caching:', hashErr && hashErr.message ? hashErr.message : hashErr);
      cacheKey = null;
    }

    const formData = new FormData();
    formData.append('audio', fs.createReadStream(filePath), {
      filename: req.file.originalname || 'audio.webm',
      contentType: req.file.mimetype || 'audio/webm'
    });
    formData.append('age', age.toString());
    formData.append('weight', weight.toString());

    const response = await axios.post(
      'http://localhost:8001/generate-prescription',
      formData,
      { headers: { ...formData.getHeaders() }, timeout: 60000 }
    );

    // Persist result to Redis if we have a cache key
    if (cacheKey) {
      try {
        // store for 1 hour (3600 seconds)
        await redis.setex(cacheKey, 3600, JSON.stringify(response.data));
      } catch (redisErr) {
        console.error('Redis set error (smart-transcribe):', redisErr && redisErr.message ? redisErr.message : redisErr);
      }
    }

    fs.unlinkSync(filePath);

    return res.json(response.data);
  } catch (err) {
    console.error('Smart transcribe proxy error:', err.message);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (err.response) {
      const status = err.response.status || 500;
      const data = err.response.data || {};
      const detail = data.detail || data.error || data.message || 'AI service error';
      return res.status(status).json({ error: detail, raw: data });
    }
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'AI service is unavailable.' });
    }
    return res.status(500).json({ error: 'Failed to process audio.' });
  }
});

// Simple transcription passthrough if needed by client (without LLM)
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const filePath = req.file.path;
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(filePath), {
      filename: req.file.originalname || 'audio.webm',
      contentType: req.file.mimetype || 'audio/webm'
    });

    const response = await axios.post(
      'http://localhost:8001/generate-prescription',
      formData,
      { headers: { ...formData.getHeaders() }, timeout: 60000 }
    );

    fs.unlinkSync(filePath);

    return res.json({ transcription: response.data.transcription || '' });
  } catch (err) {
    console.error('Transcription proxy error:', err.message);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'AI service is unavailable.' });
    }
    return res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

module.exports = router;