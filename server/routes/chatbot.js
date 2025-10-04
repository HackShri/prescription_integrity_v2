const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;
    const lastMessage = messages[messages.length - 1].content;

    // Forward to inference-service /ask endpoint
    try {
      const resp = await axios.post('http://localhost:8001/ask', { question: lastMessage }, { timeout: 15000 });
      if (resp && resp.data && resp.data.content) {
        return res.json({ content: resp.data.content });
      }
    } catch (err) {
      // If inference service unreachable, log and fallback
      console.error('Error calling inference-service /ask:', err.message || err);
    }

    // Fallback mock response
    const response = `I understood: "${lastMessage}". How can I assist you further?`;
    res.json({ content: response });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;