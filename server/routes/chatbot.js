const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid request. Expected { messages: [{ role, content }] }' 
      });
    }

    const lastMessage = messages[messages.length - 1];
    const question = lastMessage.content || lastMessage.message;

    if (!question) {
      return res.status(400).json({ 
        message: 'No message content found in the last message' 
      });
    }

    console.log(`Chatbot request: "${question.substring(0, 100)}..."`);

    // Forward to inference-service /ask endpoint with full message history
    try {
      const resp = await axios.post(
        'http://localhost:8001/ask', 
        { 
          question: question,  // Support simple format
          messages: messages    // Also send full history for future use
        }, 
        { 
          timeout: 300000  // 5 minutes timeout - enough for LLM processing
        }
      );
      
      if (resp && resp.data && resp.data.content) {
        console.log(`Chatbot response: ${resp.data.content.substring(0, 100)}...`);
        return res.json({ content: resp.data.content });
      } else {
        throw new Error('Invalid response format from inference service');
      }
    } catch (err) {
      // If inference service unreachable, log and fallback
      console.error('Error calling inference-service /ask:', err.message || err);
      
      if (err.code === 'ECONNREFUSED') {
        console.error('Cannot connect to inference service on port 8001. Is it running?');
        return res.status(503).json({ 
          content: 'The AI service is not available. Please ensure the inference service is running on port 8001.'
        });
      }
      
      if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
        console.error('Request to inference service timed out');
        return res.status(504).json({ 
          content: 'The AI service is taking longer than expected to respond. Please try again with a simpler question.'
        });
      }
      
      if (err.response) {
        // Service responded but with an error
        console.error('Service error:', err.response.status, err.response.data);
        const statusCode = err.response.status || 503;
        return res.status(statusCode).json({ 
          content: err.response.data?.detail || err.response.data?.message || err.message || 'Service error occurred'
        });
      }
      
      // Fallback response for other errors
      console.error('Unexpected error:', err);
      return res.status(503).json({ 
        content: 'Unable to connect to the AI service. Please ensure Ollama is running and the meditron model is available.'
      });
    }
  } catch (error) {
    console.error('Chatbot route error:', error);
    res.status(500).json({ 
      content: 'An internal error occurred. Please try again later.',
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;