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

  const caseEntry = {
    title,
    severity: severity || 'MEDIUM',
    status: 'NEW',
    assignedTo: req.user.email.split('@')[0],
    createdAt: new Date(),
    updatedAt: new Date(),
    impact: impact || 'To be assessed',
    rootCause: rootCause || 'Under investigation',
    recommendations: recommendations || ['Collect full RAM capture', 'Monitor associated external network traffic'],
    timeline: [
      { timestamp: new Date(), activity: 'Incident Case created manually by analyst.', actor: req.user.email.split('@')[0] }
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
    const updated = await db.incidents.findByIdAndUpdate(req.params.id, update);
    if (!updated) return res.status(404).json({ error: 'Incident case not found.' });

    // Append timeline activity
    const activityMsg = `Case updated: status->${status || 'NoChange'}, assignee->${assignedTo || 'NoChange'}`;
    await db.incidents.findByIdAndUpdate(req.params.id, {
      $push: {
        timeline: {
          timestamp: new Date(),
          activity: activityMsg,
          actor: req.user.email.split('@')[0]
        }
      }
    });

    res.json(updated);
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
    const updated = await db.incidents.findByIdAndUpdate(req.params.id, {
      $push: {
        timeline: {
          timestamp: new Date(),
          activity,
          actor: req.user.email.split('@')[0]
        }
      }
    });

    if (!updated) return res.status(404).json({ error: 'Case file not found.' });
    res.json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
