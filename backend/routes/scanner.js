// backend/routes/scanner.js
const express = require('express');
const router = express.Router();
const si = require('systeminformation');
const os = require('os');
const scannerService = require('../services/scannerService');
const { authenticateToken } = require('./auth');

router.get('/localinfo', authenticateToken, async (req, res) => {
  try {
    const [ifaces, osInfo] = await Promise.all([si.networkInterfaces(), si.osInfo()]);
    const active = ifaces.find(i => !i.internal && i.ip4) || ifaces[0];
    res.json({
      ip: active?.ip4 || 'N/A',
      mac: active?.mac || 'N/A',
      hostname: os.hostname(),
      os: `${osInfo.distro} ${osInfo.release}`,
      platform: osInfo.platform,
      arch: osInfo.arch,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/start', authenticateToken, (req, res) => {
  const { target, profile } = req.body;
  if (!target) {
    return res.status(400).json({ error: 'Scan target is required.' });
  }

  const scanId = scannerService.startScan(target, profile || 'quick');
  res.json({ success: true, scanId, message: 'Scan started in background.' });
});

router.post('/cancel', authenticateToken, (req, res) => {
  const { scanId } = req.body;
  if (!scanId) {
    return res.status(400).json({ error: 'Scan ID is required.' });
  }

  const cancelled = scannerService.cancelScan(scanId);
  res.json({ success: cancelled, message: cancelled ? 'Scan cancelled.' : 'Scan not found or already completed.' });
});

module.exports = router;
