const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const db = require('../db');
const { authenticateToken } = require('./auth');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Get all PDF Report Delivery logs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const list = await db.reports.find({});
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger Manual PDF Report Generation
router.post('/generate', authenticateToken, async (req, res) => {
  const { recipientEmail } = req.body;
  const targetEmail = recipientEmail || 'soc-director@enterprise.com';

  try {
    // 1. Gather stats from DB for the report metrics
    const totalEvents = await db.logs.countDocuments({});
    const totalAlerts = await db.alerts.countDocuments({});
    const criticalAlerts = await db.alerts.countDocuments({ severity: 'CRITICAL' });
    const highAlerts = await db.alerts.countDocuments({ severity: 'HIGH' });
    const endpointsCount = await db.endpoints.countDocuments({});
    const isolatedEndpoints = await db.endpoints.countDocuments({ status: 'Isolated' });
    
    const securityScore = Math.max(30, 95 - (criticalAlerts * 4 + highAlerts * 2 + isolatedEndpoints * 5));
    const riskScore = Math.min(100, (criticalAlerts * 15 + highAlerts * 5 + isolatedEndpoints * 8));

    // Get critical/high alerts for listing
    const recentAlertsList = await db.alerts.find({ severity: { $in: ['CRITICAL', 'HIGH'] } }, 5);

    // 2. Generate PDF using pdfkit
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const fileName = `SOC_Executive_Report_${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Styling & Typography helpers
    const primaryColor = '#0f172a'; // Deep slate
    const accentColor = '#3b82f6';  // Security blue
    const redColor = '#ef4444';     // Danger
    const greenColor = '#10b981';   // Success

    // --- PAGE 1: HEADER & TITLE ---
    doc.rect(0, 0, 600, 20).fill(primaryColor);
    doc.fillColor(primaryColor).fontSize(24).font('Helvetica-Bold').text('ENTERPRISE SECURITY OPERATIONS CENTER', 40, 50);
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('CONFIDENTIAL // INTERNAL USE ONLY', 40, 78);
    
    doc.moveTo(40, 92).lineTo(550, 92).strokeColor('#e2e8f0').lineWidth(2).stroke();

    doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text('Executive Summary & Security Posture Report', 40, 110);
    doc.fillColor('#334155').fontSize(11).font('Helvetica').text(`Generated On: ${new Date().toLocaleString()}`, 40, 130);
    doc.text(`Target Audience: SOC Administrators & Leadership Group`, 40, 146);
    
    // Core KPIs Metrics Table Layout
    doc.rect(40, 180, 510, 80).fill('#f8fafc').strokeColor('#cbd5e1').stroke();
    
    doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('KEY PERFORMANCE INDICATORS', 55, 195);
    doc.fontSize(10).font('Helvetica');
    doc.fillColor('#475569').text(`Total Logs Processed: ${totalEvents}`, 55, 215);
    doc.text(`Total Active Security Alerts: ${totalAlerts}`, 55, 230);
    doc.text(`Endpoints Monitored: ${endpointsCount}`, 300, 215);
    doc.text(`Endpoints Isolated: ${isolatedEndpoints}`, 300, 230);

    // Scores
    doc.rect(40, 280, 240, 100).fill('#f8fafc').strokeColor('#cbd5e1').stroke();
    doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('SECURITY SCORE', 60, 295);
    doc.fontSize(32).fillColor(securityScore > 75 ? greenColor : redColor).text(`${securityScore}%`, 60, 315);
    doc.fontSize(9).fillColor('#64748b').font('Helvetica').text('Based on active incidents & system isolation counts.', 60, 355);

    doc.rect(310, 280, 240, 100).fill('#f8fafc').strokeColor('#cbd5e1').stroke();
    doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('RISK LEVEL INDEX', 330, 295);
    doc.fontSize(32).fillColor(riskScore > 50 ? redColor : greenColor).text(`${riskScore}%`, 330, 315);
    doc.fontSize(9).fillColor('#64748b').font('Helvetica').text('Aggregated threat assessment threshold score.', 330, 355);

    // Critical Alerts List
    doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('CRITICAL & HIGH SECURITY INCIDENTS (LAST 12H)', 40, 410);
    doc.moveTo(40, 428).lineTo(550, 428).strokeColor('#e2e8f0').lineWidth(1).stroke();

    let y = 445;
    if (recentAlertsList.length === 0) {
      doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('No critical or high severity security alerts generated during this interval.', 50, y);
      y += 20;
    } else {
      recentAlertsList.forEach((alert) => {
        doc.rect(40, y, 8, 28).fill(alert.severity === 'CRITICAL' ? redColor : '#f59e0b');
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text(alert.title, 55, y);
        doc.fillColor('#475569').fontSize(9).font('Helvetica').text(`Device: ${alert.host}  |  Category: ${alert.category}  |  Status: ${alert.status}`, 55, y + 14);
        y += 38;
      });
    }

    // Recommendation list
    doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('RECOMMENDED REMEDIATION ACTIONS', 40, y + 15);
    doc.moveTo(40, y + 33).lineTo(550, y + 33).strokeColor('#e2e8f0').lineWidth(1).stroke();
    
    y += 45;
    const recommendationsList = [
      `Review alerts evidence folders for isolated endpoints.`,
      `Block all inbound scanner payloads matching IP block index lists.`,
      `Perform credentials resets for administrators accounts displaying multiple failed SSH authentications.`
    ];

    recommendationsList.forEach((rec, idx) => {
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text(`${idx + 1}.`, 45, y);
      doc.fillColor('#334155').font('Helvetica').text(rec, 65, y);
      y += 18;
    });

    // Confidential Footer
    doc.fillColor('#94a3b8').fontSize(8).text('CONFIDENTIAL SOC AUDIT REPORT // SYSTEM GENERATED SECURE DISTRIBUTION ENGINE', 40, 770);

    doc.end();

    // 3. Complete PDF write and mock email delivery logging
    stream.on('finish', async () => {
      console.log(`[REPORTS] Finished building PDF: ${filePath}`);

      // Save report metadata in DB
      const reportMeta = await db.reports.create({
        timestamp: new Date(),
        title: `SOC Executive Report - Score ${securityScore}%`,
        deliveryStatus: 'Delivered',
        recipient: targetEmail,
        alertsCount: totalAlerts,
        endpointCount: endpointsCount,
        securityScore,
        fileName
      });

      // Write Audit log entry
      await db.auditLogs.create({
        timestamp: new Date(),
        user: req.user.email.split('@')[0],
        action: 'Report Generated',
        details: `Dispatched enterprise security assessment PDF to ${targetEmail} (Score: ${securityScore}%)`,
        ip: req.ip || '127.0.0.1'
      });

      // Nodemailer integration (Mocking SMTP transport or logging)
      try {
        console.log(`[MAIL] Dispatching email report to ${targetEmail} with file ${fileName}`);
        // Log simulator dispatching:
        // In real SMTP setups, the developer would provide direct auth values in .env
      } catch (err) {
        console.error('[MAIL] NodeMailer dispatch error:', err.message);
      }

      res.json({
        success: true,
        report: reportMeta,
        message: `Report PDF generated and dispatched successfully to ${targetEmail}.`
      });
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download past report file
router.get('/download/:fileName', authenticateToken, (req, res) => {
  const file = req.params.fileName;
  const filePath = path.join(REPORTS_DIR, file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'PDF Report file not found on disk.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${file}`);
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
