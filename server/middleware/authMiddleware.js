require('dotenv').config();
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Check for session first (cookie-based authentication)
  if (req.session && req.session.isAuthenticated && req.session.userId) {
    req.user = {
      userId: req.session.userId,
      role: req.session.userRole
    };
    return next();
  }
  
  // Fallback to JWT token (header-based authentication)
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token or session, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role } from JWT payload
    
    // Optionally sync session with token
    if (!req.session.isAuthenticated) {
      req.session.userId = decoded.userId;
      req.session.userRole = decoded.role;
      req.session.isAuthenticated = true;
    }
    
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};