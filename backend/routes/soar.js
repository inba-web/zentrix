const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');

// Get all playbooks
router.get('/playbooks', authenticateToken, async (req, res) => {
  try {
    const list = await db.playbooks.find({});
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update active playbooks
router.put('/playbooks/:id', authenticateToken, async (req, res) => {
  const { status, steps, name } = req.body;
  const update = {};
  if (status) update.status = status;
  if (steps) update.steps = steps;
  if (name) update.name = name;

  try {
    const updated = await db.playbooks.findByIdAndUpdate(req.params.id, update);
    if (!updated) return res.status(404).json({ error: 'Playbook not found.' });

    // Write to audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.email.split('@')[0],
      action: 'SOAR Playbook Modified',
      details: `Modified playbooks configurations for playbook: ${name || req.params.id}`,
      ip: req.ip || '127.0.0.1'
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually trigger playbook execution
router.post('/playbooks/:id/trigger', authenticateToken, async (req, res) => {
  try {
    const playbook = await db.playbooks.findOne({ _id: req.params.id });
    if (!playbook) return res.status(404).json({ error: 'Playbook profile not found.' });

    const execLogs = [
      `Analyst manually initialized execution sequence.`,
      `Gathering workspace attributes...`,
      `Executed action EnrichedIOC on active entities.`,
      `Dispatched warning email alerts to Security Administrators.`,
      `Playbook orchestration completed successfully.`
    ];

    const updated = await db.playbooks.findByIdAndUpdate(req.params.id, {
      $push: {
        executions: {
          timestamp: new Date(),
          status: 'SUCCESS',
          logs: execLogs
        }
      }
    });

    // Write to audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.email.split('@')[0],
      action: 'SOAR Manual Execution',
      details: `Orchestrated execution for playbook: ${playbook.name}`,
      ip: req.ip || '127.0.0.1'
    });

    res.json({ success: true, logs: execLogs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
