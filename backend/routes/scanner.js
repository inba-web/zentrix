const express = require('express');
const router = express.Router();
const scannerService = require('../services/scannerService');
const { authenticateToken } = require('./auth');

router.post('/start', authenticateToken, (req, res) => {
  const { target, profile } = req.body;
  if (!target) {
    return res.status(400).json({ error: 'Scan target is required.' });
  }

  const scanId = scannerService.startScan(target, profile || 'Quick Scan');
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
