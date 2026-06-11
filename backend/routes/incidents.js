const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');

// Get all Security Alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const list = await db.alerts.find({});
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Alert Status (Ack, Assign, Resolve)
router.put('/alerts/:id', authenticateToken, async (req, res) => {
  const { status, assignedTo } = req.body;
  const update = {};
  if (status) update.status = status;
  if (assignedTo) update.assignedTo = assignedTo;

  try {
    const updated = await db.alerts.findByIdAndUpdate(req.params.id, update);
    if (!updated) return res.status(404).json({ error: 'Alert entity not found.' });

    // Write to audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.email.split('@')[0],
      action: 'Alert Severity Modified',
      details: `Alert ${req.params.id} updated state to ${status || 'Unchanged'} assigned to ${assignedTo || 'Unchanged'}.`,
      ip: req.ip || '127.0.0.1'
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all Incidents Cases
router.get('/cases', authenticateToken, async (req, res) => {
  try {
    const cases = await db.incidents.find({});
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single Incident Case Details
router.get('/cases/:id', authenticateToken, async (req, res) => {
  try {
    const caseFile = await db.incidents.findOne({ _id: req.params.id });
    if (!caseFile) return res.status(404).json({ error: 'Incident case not found.' });
    res.json(caseFile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create manual incident Case
router.post('/cases', authenticateToken, async (req, res) => {
  const { title, severity, impact, rootCause, recommendations, evidence } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Incident Title is required.' });
  }

  const analystName = req.user.name || req.user.email.split('@')[0];

  const caseEntry = {
    title,
    severity: severity || 'MEDIUM',
    status: 'NEW',
    assignedTo: analystName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    impact: impact || 'To be assessed',
    rootCause: rootCause || 'Under investigation',
    recommendations: recommendations || ['Collect full RAM capture', 'Monitor associated external network traffic'],
    timeline: [
      { timestamp: new Date().toISOString(), activity: 'Incident Case created manually by analyst.', actor: analystName }
    ],
    evidence: evidence || []
  };

  try {
    const newCase = await db.incidents.create(caseEntry);

    // Audit logs
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.email.split('@')[0],
      action: 'Case Created',
      details: `Created security case file: ${title} (${newCase._id})`,
      ip: req.ip || '127.0.0.1'
    });

    if (global.io) {
      global.io.emit('incident:updated', { id: newCase._id });
    }

    res.status(201).json(newCase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Incident Case File
router.put('/cases/:id', authenticateToken, async (req, res) => {
  const { status, severity, assignedTo, rootCause, impact, recommendations } = req.body;
  const update = { updatedAt: new Date() };

  if (status) update.status = status;
  if (severity) update.severity = severity;
  if (assignedTo) update.assignedTo = assignedTo;
  if (rootCause) update.rootCause = rootCause;
  if (impact) update.impact = impact;
  if (recommendations) update.recommendations = recommendations;

  try {
    const original = await db.incidents.findOne({ _id: req.params.id });
    if (!original) return res.status(404).json({ error: 'Incident case not found.' });

    const updated = await db.incidents.findByIdAndUpdate(req.params.id, update);

    // Append timeline activity
    let activityMsg = `Case details updated.`;
    if (status && status !== original.status) {
      activityMsg = `Status changed to ${status}`;
    } else if (assignedTo && assignedTo !== original.assignedTo) {
      activityMsg = `Assigned to ${assignedTo}`;
    } else if (severity && severity !== original.severity) {
      activityMsg = `Severity changed to ${severity}`;
    }

    const actorName = req.user.name || req.user.email.split('@')[0];
    await db.incidents.findByIdAndUpdate(req.params.id, {
      $push: {
        timeline: {
          timestamp: new Date().toISOString(),
          activity: activityMsg,
          actor: actorName
        }
      }
    });

    if (global.io) {
      global.io.emit('incident:updated', { id: req.params.id });
    }

    const finalDoc = await db.incidents.findOne({ _id: req.params.id });
    res.json(finalDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Append to Case timeline manual logs
router.post('/cases/:id/timeline', authenticateToken, async (req, res) => {
  const { activity } = req.body;

  if (!activity) {
    return res.status(400).json({ error: 'Activity description required.' });
  }

  try {
    const actorName = req.user.name || req.user.email.split('@')[0];
    const updated = await db.incidents.findByIdAndUpdate(req.params.id, {
      $push: {
        timeline: {
          timestamp: new Date().toISOString(),
          activity,
          actor: actorName
        }
      }
    });

    if (!updated) return res.status(404).json({ error: 'Case file not found.' });

    if (global.io) {
      global.io.emit('incident:updated', { id: req.params.id });
    }

    res.json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
