const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;
    const lastMessage = messages[messages.length - 1].content;
    // Mock response (replace with AI service like OpenAI later)
    const response = `I understood: "${lastMessage}". How can I assist you further?`;
    res.json({ content: response });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;