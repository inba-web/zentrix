// backend/routes/settings.js
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const db = require('../db');
const os = require('os');
const { PLATFORM } = require('../utils/platform');
const { authenticateToken } = require('./auth');

// POST /api/settings/test-email
router.post('/settings/test-email', authenticateToken, async (req, res) => {
  const { host, port, username, password, useTls } = req.body;
  if (!host || !port) {
    return res.status(400).json({ error: 'SMTP Host and Port are required.' });
  }
  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: useTls || port === 465,
      auth: username && password ? { user: username, pass: password } : undefined,
      timeout: 5000
    });
    await transporter.verify();
    
    // Send a test email
    await transporter.sendMail({
      from: username || 'zentrix-soc@local.host',
      to: req.user.email,
      subject: 'ZENTRIX SOC — SMTP Connection Test',
      text: `SMTP configuration verification successful for ZENTRIX SOC workstation node. Host: ${host}:${port}`,
      html: `<h3>ZENTRIX SOC — SMTP Connection Test</h3><p>SMTP configuration verification successful for ZENTRIX SOC workstation node.</p><p><b>Host:</b> ${host}:${port}</p>`
    });

    res.json({ success: true, message: `SMTP verification successful. Test email dispatched to ${req.user.email}.` });
  } catch (err) {
    res.status(500).json({ error: `SMTP Verification failed: ${err.message}` });
  }
});

// POST /api/settings/test-whatsapp
router.post('/settings/test-whatsapp', authenticateToken, async (req, res) => {
  const { sid, token, fromNumber, toNumber } = req.body;
  if (!sid || !token || !fromNumber || !toNumber) {
    return res.status(400).json({ error: 'Twilio SID, Auth Token, From Number, and To Number are required.' });
  }
  try {
    const client = twilio(sid, token);
    await client.messages.create({
      from: fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`,
      to: toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber}`,
      body: 'ZENTRIX SOC — WhatsApp configuration verification successful.'
    });
    res.json({ success: true, message: 'WhatsApp test message dispatched successfully.' });
  } catch (err) {
    res.status(500).json({ error: `WhatsApp verification failed: ${err.message}` });
  }
});

// POST /api/settings/test-mongodb
router.post('/settings/test-mongodb', authenticateToken, async (req, res) => {
  const { uri } = req.body;
  if (!uri) return res.status(400).json({ error: 'MongoDB connection URI is required.' });
  
  const mongoose = require('mongoose');
  try {
    // Create a temporary connection
    const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
    await conn.close();
    res.json({ success: true, message: 'MongoDB connection successful.' });
  } catch (err) {
    res.status(500).json({ error: `MongoDB connection failed: ${err.message}` });
  }
});

// GET /api/settings/db-counts
router.get('/settings/db-counts', authenticateToken, async (req, res) => {
  try {
    const logs = await db.logs.countDocuments({});
    const auditLogs = await db.auditLogs.countDocuments({});
    res.json({ logs, auditLogs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logs/prune
router.delete('/logs/prune', authenticateToken, async (req, res) => {
  const { before } = req.query;
  if (!before) return res.status(400).json({ error: 'Date constraint parameter "before" is required.' });
  try {
    const cutoff = new Date(before).toISOString();
    const prunedLogs = await db.logs.deleteMany({ timestamp: { $lt: cutoff } });
    const prunedAudits = await db.auditLogs.deleteMany({ timestamp: { $lt: cutoff } });
    
    // Log audit action
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.name,
      action: 'Logs Pruned Manually',
      details: `Pruned log history older than ${before}. Deleted ${prunedLogs.deletedCount || 0} logs and ${prunedAudits.deletedCount || 0} audit logs.`,
      ip: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      message: `Successfully pruned records before ${before}.`,
      prunedLogs: prunedLogs.deletedCount || 0,
      prunedAudits: prunedAudits.deletedCount || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/system-versions
router.get('/settings/system-versions', authenticateToken, async (req, res) => {
  res.json({
    nodeVersion: process.version,
    electronVersion: process.versions.electron || 'N/A',
    platform: PLATFORM,
    arch: os.arch(),
    osRelease: os.release(),
    dbMode: db.isMongoose() ? 'MongoDB Connected' : 'JSON Fallback Mode',
    appVersion: '1.2.0'
  });
});

// GET /api/settings/db-backup
router.get('/settings/db-backup', authenticateToken, async (req, res) => {
  try {
    const collections = [
      'users', 'logs', 'endpoints', 'alerts', 'incidents',
      'iocs', 'playbooks', 'auditLogs', 'reports', 'deliveryLogs'
    ];
    const backup = {};
    for (const col of collections) {
      backup[col] = await db[col].find({}, 100000); // Fetch all records
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=zentrix_backup_${Date.now()}.json`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    res.status(500).json({ error: `Backup failed: ${err.message}` });
  }
});

module.exports = router;
