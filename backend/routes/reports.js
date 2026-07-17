const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { authenticateToken } = require('./auth');
const reportsService = require('../services/reportsService');
const scheduler = require('../services/scheduler');

const REPORTS_DIR = process.env.ZENTRIX_USER_DATA 
  ? path.join(process.env.ZENTRIX_USER_DATA, 'reports') 
  : path.join(__dirname, '..', 'reports');

// Get all PDF Report logs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const list = await db.reports.find({});
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get report delivery tracking logs
router.get('/delivery-logs', authenticateToken, async (req, res) => {
  try {
    const logs = await db.deliveryLogs.find({});
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger Manual PDF, CSV, and JSON Reports Generation
router.post('/generate', authenticateToken, async (req, res) => {
  const { recipientEmail, reportType } = req.body;
  const targetEmail = recipientEmail || req.user.email;

  try {
    console.log(`[REPORTS] Manual dispatch triggered by user for: ${targetEmail}`);
    const results = await reportsService.compileSecurityReports(targetEmail, reportType || 'Executive Summary');
    
    // Save delivery log for manual report
    const delivery = await db.deliveryLogs.create({
      reportId: results.report._id,
      emailStatus: 'Delivered',
      whatsAppStatus: 'Delivered',
      deliveryTimestamp: new Date(),
      failureReason: 'Manual generation simulated successfully.',
      retryCount: 0
    });

    // Send immediate simulated email & WhatsApp
    const fsSimLogs = path.join(REPORTS_DIR, 'logs');
    if (!fs.existsSync(fsSimLogs)) fs.mkdirSync(fsSimLogs, { recursive: true });
    
    fs.appendFileSync(
      path.join(fsSimLogs, 'email_simulator.log'),
      `[${new Date().toISOString()}] MANUAL EMAIL: Dispatched report "${results.pdfName}" to: ${targetEmail}\n`
    );
    fs.appendFileSync(
      path.join(fsSimLogs, 'whatsapp_simulator.log'),
      `[${new Date().toISOString()}] MANUAL WHATSAPP: Dispatched notification to: ${req.user.whatsapp || '+1234567890'}. Safety: ${results.report.securityScore}%\n`
    );

    // Update delivery status
    await db.reports.findByIdAndUpdate(results.report._id, { deliveryStatus: 'Dispatched' });

    res.json({
      success: true,
      report: results.report,
      message: `ZENTRIX PDF Report generated. Download formats: PDF (${results.pdfName}), CSV (${results.csvName}), JSON (${results.jsonName}).`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download past report file (PDF, CSV, or JSON)
router.get('/download/:fileName', authenticateToken, (req, res) => {
  const file = req.params.fileName;
  const filePath = path.join(REPORTS_DIR, file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Report file not found on local storage.' });
  }

  const ext = file.split('.').pop().toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === 'pdf') contentType = 'application/pdf';
  else if (ext === 'csv') contentType = 'text/csv';
  else if (ext === 'json') contentType = 'application/json';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename=${file}`);
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
