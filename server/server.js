const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('../server/config/db');
const path = require('path');

dotenv.config();
const app = express();

// ✅ CORS config to allow both ports
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB"
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/pill-schedule', require('./routes/pillSchedule'));
app.use('/api/chat', require('./routes/chatbot'));



// ✅ Create HTTP server and Socket.IO with correct CORS
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ✅ Socket.IO handlers
io.on('connection', (socket) => {
  //console.log('Socket connected:', socket.id);

  socket.on('joinRoom', (userId) => {
    socket.join(userId);
  });

  socket.on('sendPrescription', ({ patientId, prescription }) => {
    io.to(patientId).emit('receivePrescription', prescription);
  });
});
app.set('io', io);
// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
