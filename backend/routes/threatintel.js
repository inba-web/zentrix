const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');

// Perform real-time external intelligence lookup (VT, AbuseIPDB, AlienVault OTX)
router.post('/search', authenticateToken, async (req, res) => {
  const { type, value } = req.body; // type: IP, Hash, Domain, URL

  if (!type || !value) {
    return res.status(400).json({ error: 'Lookup Type and Value are required.' });
  }

  try {
    // Check if the IOC exists in local database
    const localMatch = await db.iocs.findOne({ value });

    // Generate high-fidelity mockup data representing live API enrichment responses
    const reputation = localMatch ? localMatch.reputation : Math.floor(Math.random() * 85);
    const result = {
      value,
      type,
      localMatch: !!localMatch,
      localNotes: localMatch ? localMatch.notes : 'No local notes documented.',
      enrichment: {
        virusTotal: {
          maliciousVotes: reputation > 80 ? 54 : (reputation > 50 ? 12 : 0),
          harmlessVotes: reputation > 80 ? 4 : (reputation > 50 ? 30 : 64),
          reputationScore: reputation,
          lastScanDate: new Date(Date.now() - 3600000 * 4).toISOString(),
          category: type === 'Hash' ? 'Trojan.Win32.CobaltStrike.A' : (type === 'IP' ? 'Malicious Scanner' : 'C2 Node')
        },
        abuseIPDB: {
          abuseScore: type === 'IP' ? reputation : 0,
          totalReports: type === 'IP' ? Math.floor(reputation * 3.4) : 0,
          isp: type === 'IP' ? 'DigitalOcean LLC' : 'N/A',
          country: type === 'IP' ? 'Netherlands' : 'N/A'
        },
        alienVaultOTX: {
          pulseCount: reputation > 60 ? 18 : 0,
          adversaries: reputation > 80 ? ['APT29 (Cozy Bear)', 'Wizard Spider'] : [],
          industriesTargeted: reputation > 60 ? ['Finance', 'Government', 'Energy'] : []
        }
      }
    };

    // Audit logs
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.email.split('@')[0],
      action: 'Threat Intel Query',
      details: `Queried ${type}: "${value}". Risk Score resolved to ${reputation}%.`,
      ip: req.ip || '127.0.0.1'
    });

    res.json(result);
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
      notes: notes || ''
    });

    // Write to audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.email.split('@')[0],
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
      user: req.user.email.split('@')[0],
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
