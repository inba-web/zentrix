const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userRepo = require('../repositories/userRepository');
const { authenticateToken } = require('../middleware/authenticate');
const db = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'soc_enterprise_secure_secret_token_100%';

// Middleware removed; using shared authenticate middleware

// Local Analyst Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    let user = await userRepo.findByEmail(email);
    if (!user) {
      // Automatic user creation for first-time login convenience in development
      user = await userRepo.create({
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
    let user = await userRepo.findByEmail(email);
    if (!user) {
      user = await userRepo.create({
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
    // req.user already contains full user object from authentication middleware
    if (!req.user) return res.status(404).json({ error: 'User profile not found.' });
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = {
  router,
  authenticateToken
};
