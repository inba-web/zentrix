const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');
const vtAdapter = require('../services/vtAdapter');
const integrationManager = require('../services/integrationManager');

// GET /api/intel/status - Check external integrations status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const overview = await integrationManager.getIntegrationOverview();
    res.json(overview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/intel/virustotal/status
router.get('/virustotal/status', authenticateToken, async (req, res) => {
  try {
    const vtStatus = await vtAdapter.checkStatus();
    res.json(vtStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/intel/virustotal/config
router.post('/virustotal/config', authenticateToken, async (req, res) => {
  const { apiKey, enabled } = req.body;
  try {
    const overview = await integrationManager.configureIntegration('virustotal', { apiKey, enabled });
    res.json(overview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Perform threat intelligence search
router.post('/search', authenticateToken, async (req, res) => {
  const { type, value } = req.body; // type: Hash, URL, IP, Domain

  if (!type || !value) {
    return res.status(400).json({ error: 'Lookup Type and Value are required.' });
  }

  try {
    let vtResult = null;
    if (type.toLowerCase() === 'hash' || type.toLowerCase() === 'sha256' || type.toLowerCase() === 'md5') {
      vtResult = await vtAdapter.lookupHash(value);
    } else if (type.toLowerCase() === 'url') {
      vtResult = await vtAdapter.lookupUrl(value);
    }

    // Check local database for IOCs
    const localMatch = await db.iocs.findOne({ value });

    // Record audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.name || 'system',
      action: 'THREAT_INTEL_QUERY',
      details: `Queried ${type}: "${value}". Local match: ${Boolean(localMatch)}`,
      ip: req.ip || '127.0.0.1'
    });

    res.json({
      value,
      type,
      localMatch: Boolean(localMatch),
      localDetails: localMatch || null,
      virusTotal: vtResult
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
