// backend/middleware/authenticate.js

const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'soc_enterprise_secure_secret_token_100%';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  jwt.verify(token, JWT_SECRET, async (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired credentials.' });
    }
    // Attach full user object to request for downstream use
    try {
      const user = await db.users.findOne({ _id: payload.id });
      if (!user) return res.status(401).json({ error: 'User not found.' });
      req.user = user;
      next();
    } catch (e) {
      return res.status(500).json({ error: 'User lookup failed.' });
    }
  });
}

module.exports = { authenticateToken };
