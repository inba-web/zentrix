const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { authenticateToken } = require('./auth');
const phishingAnalyzer = require('../services/phishingAnalyzer');

const storageDir = process.env.ZENTRIX_USER_DATA 
  ? path.join(process.env.ZENTRIX_USER_DATA, 'storage') 
  : path.join(__dirname, '..', '..', 'storage');
const PHISHING_DIR = path.join(storageDir, 'phishing');
if (!fs.existsSync(PHISHING_DIR)) {
  fs.mkdirSync(PHISHING_DIR, { recursive: true });
}

// Analyze raw EML email headers/body
router.post('/analyze', authenticateToken, async (req, res) => {
  const { headersContent } = req.body;

  if (!headersContent) {
    return res.status(400).json({ error: 'Email raw header or EML content is required.' });
  }

  try {
    // Write EML dump locally in storage
    const stamp = Date.now();
    const fileName = `phishing_email_${stamp}.eml`;
    const targetPath = path.join(PHISHING_DIR, fileName);
    fs.writeFileSync(targetPath, headersContent);

    // Run dynamic scanner
    const results = phishingAnalyzer.analyzePhishing(headersContent);

    // Save alert if suspicious or malicious
    if (results.status !== 'Legitimate') {
      const saved = await db.alerts.create({
        timestamp: new Date(),
        severity: results.status === 'Malicious' ? 'HIGH' : 'MEDIUM',
        title: `Phishing Attempt: ${results.subject}`,
        description: `Sender: ${results.sender} // SPF Status: ${results.spfStatus} // Score: ${results.score}% (${results.status})`,
        category: 'Phishing Analysis',
        host: require('os').hostname(),
        status: 'NEW',
        assignedTo: 'Unassigned',
        evidence: results
      });

      // Write dynamic SIEM log
      await db.logs.create({
        timestamp: new Date(),
        source: 'AppLog',
        severity: saved.severity,
        message: `PHISHING DETECTED: Sender ${results.sender}. Subject: ${results.subject}. Score: ${results.score}%`,
        host: saved.host,
        user: 'system',
        srcIp: results.senderReputation === 'Dangerous' ? '185.220.101.5' : '127.0.0.1',
        destIp: '127.0.0.1',
        mitreTactic: 'Initial Access',
        mitreTechnique: 'T1566 - Phishing',
        payload: results
      });

      // WhatsApp alert if critical phishing
      if (results.status === 'Malicious') {
        const scheduler = require('../services/scheduler');
        scheduler.triggerImmediateWhatsAppAlert(`Phishing Spoof: ${results.subject}`, `Alert! ${results.sender} attempted credentials spoofing.`);
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
