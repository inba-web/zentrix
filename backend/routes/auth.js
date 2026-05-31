const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'soc_enterprise_secure_secret_token_100%';

// Midleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired credentials.' });
    req.user = user;
    next();
  });
}

// Local Analyst Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    let user = await db.users.findOne({ email });
    if (!user) {
      // Automatic user creation for first-time login convenience in development
      user = await db.users.create({
        email,
        name: email.split('@')[0].toUpperCase(),
        role: email.includes('admin') ? 'Administrator' : 'Analyst',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
      });
    }

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    
    // Log login to Audit logs
    await db.auditLogs.create({
      timestamp: new Date(),
      user: user.name,
      action: 'Analyst Login',
      details: 'Local password authentication completed successfully.',
      ip: req.ip || '127.0.0.1'
    });

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Google OAuth Login Mock
router.post('/oauth', async (req, res) => {
  const { token: oauthToken, email, name, picture } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'OAuth email payload required.' });
  }

  try {
    let user = await db.users.findOne({ email });
    if (!user) {
      user = await db.users.create({
        email,
        name: name || email.split('@')[0],
        role: 'Analyst',
        avatar: picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
      });
    }

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '12h' });

    // Log login to Audit logs
    await db.auditLogs.create({
      timestamp: new Date(),
      user: user.name,
      action: 'Google OAuth Signup',
      details: 'Google authenticated single sign-on successfully completed.',
      ip: req.ip || '127.0.0.1'
    });

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get currently logged-in Profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.users.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ error: 'User profile not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = {
  router,
  authenticateToken
};
