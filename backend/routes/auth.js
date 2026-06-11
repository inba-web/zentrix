// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Unified Local-First Authentication Middleware via JWT header
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication token required.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'zentrix-secret', async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired session token.' });
      }
      
      const user = await db.users.findOne({ email: decoded.email });
      if (!user) {
        return res.status(404).json({ error: 'Profile not found.' });
      }
      
      req.user = user;
      next();
    });
  } catch (err) {
    return res.status(500).json({ error: 'Database authentication verification failed.' });
  }
}

// Light check to see if profile exists
router.get('/check', async (req, res) => {
  try {
    const list = await db.users.find({});
    res.json({ exists: list && list.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get the current profile details
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const updated = await db.users.findByIdAndUpdate(req.user._id, { lastActive: new Date() });
    res.json({ ...updated, passwordHash: undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const user = await db.users.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'No account found. Please sign up.' });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    const token = jwt.sign({ id: user._id, email }, process.env.JWT_SECRET || 'zentrix-secret', { expiresIn: '7d' });
    res.json({ token, user: { ...user, passwordHash: undefined } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const existing = await db.users.findOne({});
    if (existing) {
      return res.status(409).json({ error: 'Account already exists. Please log in.' });
    }
    const { name, email, password, whatsapp, avatar } = req.body;
    if (!name || !email || !password || !whatsapp) {
      return res.status(400).json({ error: 'Full Name, Email, Password, and WhatsApp are required.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';
    
    const profile = await db.users.create({
      name,
      email,
      passwordHash,
      whatsapp,
      avatar: avatar || defaultAvatar,
      role: 'Administrator',
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    });

    // Write audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: name,
      action: 'Profile Registered',
      details: `One-time ZENTRIX SOC workstation profile created for ${name}.`,
      ip: req.ip || '127.0.0.1'
    });

    const token = jwt.sign({ id: profile._id, email }, process.env.JWT_SECRET || 'zentrix-secret', { expiresIn: '7d' });
    res.json({ token, user: { ...profile, passwordHash: undefined } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile
router.post('/update', authenticateToken, async (req, res) => {
  const fields = [
    'name', 'email', 'whatsapp', 'avatar',
    'emailReportsEnabled', 'whatsAppReportsEnabled', 'reportFrequency',
    'smtpHost', 'smtpPort', 'smtpUsername', 'smtpPassword', 'smtpUseTls',
    'twilioSid', 'twilioToken', 'twilioFrom', 'twilioTo',
    'alarmEnabled', 'popupEnabled', 'popupDuration', 'showSimulatedThreats', 'desktopNotifications',
    'mongodbUri'
  ];
  const updates = {};
  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  try {
    const updated = await db.users.findByIdAndUpdate(req.user._id, updates);
    res.json({ success: true, profile: { ...updated, passwordHash: undefined } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = {
  router,
  authenticateToken
};
