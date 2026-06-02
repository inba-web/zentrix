const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');
const threatIntelService = require('../services/threatIntelService');

// Perform real-time external intelligence lookup (VT, AbuseIPDB, AlienVault OTX, URLHaus)
router.post('/search', authenticateToken, async (req, res) => {
  const { type, value } = req.body; // type: IP, Hash, Domain, URL

  if (!type || !value) {
    return res.status(400).json({ error: 'Lookup Type and Value are required.' });
  }

  try {
    // Invoke Correlated Intel Engine
    const results = await threatIntelService.lookupReputation(type, value);

    // Write to audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.name || 'system',
      action: 'Threat Intel Query',
      details: `Queried ${type}: "${value}". Risk Score resolved to ${results.enrichment.virusTotal.reputationScore}%.`,
      ip: req.ip || '127.0.0.1'
    });

    res.json({
      value,
      type,
      localMatch: results.cacheHit,
      localNotes: results.enrichment.advisory,
      enrichment: results.enrichment
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get IOC Repository
router.get('/iocs', authenticateToken, async (req, res) => {
  try {
    const list = await db.iocs.find({});
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new IOC
router.post('/iocs', authenticateToken, async (req, res) => {
  const { type, value, threatType, reputation, source, notes } = req.body;

  if (!type || !value) {
    return res.status(400).json({ error: 'IOC Type and Value are required.' });
  }

  try {
    const newIoc = await db.iocs.create({
      type,
      value,
      threatType: threatType || 'Undetermined Threat',
      reputation: reputation || 50,
      source: source || 'Analyst Manual Entry',
      notes: notes || '',
      createdAt: new Date()
    });

    // Write to audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.name || 'system',
      action: 'IOC Registered',
      details: `Registered IOC: ${value} (${type}) in threat database.`,
      ip: req.ip || '127.0.0.1'
    });

    res.status(201).json(newIoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete IOC
router.delete('/iocs/:id', authenticateToken, async (req, res) => {
  try {
    const target = await db.iocs.deleteOne({ _id: req.params.id });
    if (!target) return res.status(404).json({ error: 'IOC not found.' });

    // Write to audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.name || 'system',
      action: 'IOC Retracted',
      details: `Removed IOC entry ${req.params.id} from repository.`,
      ip: req.ip || '127.0.0.1'
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
