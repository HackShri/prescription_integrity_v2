// routes/transcribe.js
//const express = require("express");
//const axios = require("axios");
//const multer = require("multer");
//
//const router = express.Router();
//const upload = multer({ dest: "uploads/" }); // temporary save
//
//router.post("/transcribe", upload.single("audio"), async (req, res) => {
//  try {
//    const filePath = req.file.path;
//
//    // Send to FastAPI
//    const response = await axios.post(
//      "http://localhost:8001/transcribe", // your FastAPI service
//      {
//        file: {
//          value: fs.createReadStream(filePath),
//          options: {
//            filename: req.file.originalname,
//            contentType: req.file.mimetype,
//          },
//        },
//      },
//      {
//        headers: { "Content-Type": "multipart/form-data" },
//      }
//    );
//
//    res.json(response.data);
//  } catch (err) {
//    console.error(err);
//    res.status(500).json({ error: "Transcription failed" });
//  }
//});
//
//export default router;
//