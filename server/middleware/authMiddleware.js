require('dotenv').config();
const jwt = require('jsonwebtoken');
let redis;
try {
  redis = require('../utils/cache');
} catch (e) {
  redis = null;
}

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    // console.log('❌ No token provided');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Try to get decoded token from cache
    if (redis) {
      const cacheKey = `jwt:${token}`;
      redis.get(cacheKey).then(cached => {
        if (cached) {
          try {
            req.user = JSON.parse(cached);
            return next();
          } catch (e) {
            // fallthrough to verify
          }
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        // cache for 10 minutes
        redis.setex(cacheKey, 600, JSON.stringify(decoded)).catch(() => { });
        return next();
      }).catch(err => {
        // Redis read error, just verify normally
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        return next();
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role } from JWT payload
    next();
  } catch (err) {
    // console.error('❌ Token verification failed:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};