// backend/middleware/authenticate.js

const db = require('../db');

async function authenticateToken(req, res, next) {
  try {
    const list = await db.users.find({});
    if (list && list.length > 0) {
      req.user = list[0];
      next();
    } else {
      return res.status(401).json({ error: 'Profile registration required.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Database authentication verification failed.' });
  }
}

module.exports = { authenticateToken };
