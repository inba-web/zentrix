const express = require('express');
const router = express.Router();
const userRepo = require('../repositories/userRepository');
const db = require('../db');

// Unified Local-First Authentication Middleware
// Resolves the request context to the single registered user profile, bypassing password/JWT validations.
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

// Get the current local profile
router.get('/me', async (req, res) => {
  try {
    const list = await db.users.find({});
    if (list && list.length > 0) {
      // Update last active time
      const user = list[0];
      const updated = await db.users.findByIdAndUpdate(user._id, { lastActive: new Date() });
      return res.json(updated);
    }
    return res.status(404).json({ error: 'Profile not registered.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// One-time Profile Registration System
router.post('/register', async (req, res) => {
  const { name, email, whatsapp, avatar } = req.body;

  if (!name || !email || !whatsapp) {
    return res.status(400).json({ error: 'Full Name, Email, and WhatsApp number are required.' });
  }

  try {
    const list = await db.users.find({});
    if (list && list.length > 0) {
      return res.status(400).json({ error: 'Profile is already registered on this workstation.' });
    }

    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';
    const profile = await db.users.create({
      name,
      email,
      whatsapp,
      avatar: avatar || defaultAvatar,
      role: 'Administrator',
      joinedAt: new Date(),
      lastActive: new Date()
    });

    // Write audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: name,
      action: 'Profile Registered',
      details: `One-time ZENTRIX SOC workstation profile created for ${name}.`,
      ip: req.ip || '127.0.0.1'
    });

    res.status(201).json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile
router.post('/update', authenticateToken, async (req, res) => {
  const { name, email, whatsapp, avatar } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (email) updates.email = email;
  if (whatsapp) updates.whatsapp = whatsapp;
  if (avatar) updates.avatar = avatar;

  try {
    const updated = await db.users.findByIdAndUpdate(req.user._id, updates);
    res.json({ success: true, profile: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = {
  router,
  authenticateToken
};
