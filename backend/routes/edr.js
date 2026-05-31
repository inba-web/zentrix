const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');

// Get all monitored devices inventory
router.get('/devices', authenticateToken, async (req, res) => {
  try {
    const list = await db.endpoints.find({});
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get detailed device health and telemetry
router.get('/device/:id', authenticateToken, async (req, res) => {
  try {
    const device = await db.endpoints.findOne({ _id: req.params.id });
    if (!device) return res.status(404).json({ error: 'Endpoint device not found.' });
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Isolate Endpoint Device from network
router.post('/isolate', authenticateToken, async (req, res) => {
  const { hostname, action } = req.body; // action: 'Isolate' or 'Reconnect'

  if (!hostname) {
    return res.status(400).json({ error: 'Hostname parameters are required.' });
  }

  try {
    const status = action === 'Isolate' ? 'Isolated' : 'Online';
    const updated = await db.endpoints.findOneAndUpdate({ hostname }, { status });

    if (!updated) {
      return res.status(404).json({ error: 'Device not found.' });
    }

    // Write to audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.email.split('@')[0],
      action: action === 'Isolate' ? 'Network Isolation' : 'Network Reconnection',
      details: `State changed for endpoint hostname: ${hostname} to ${status}.`,
      ip: req.ip || '127.0.0.1'
    });

    res.json({ success: true, status, hostname });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Telemetry endpoint for Python agent check-ins
router.post('/agent-telemetry', async (req, res) => {
  const { hostname, ip, os, cpuUsage, ramUsage, status } = req.body;

  if (!hostname) {
    return res.status(400).json({ error: 'Hostname parameter is required.' });
  }

  try {
    // Find or create endpoint record
    let device = await db.endpoints.findOne({ hostname });
    const updatePayload = {
      ip: ip || '127.0.0.1',
      os: os || 'System Node',
      cpuUsage: cpuUsage || 5,
      ramUsage: ramUsage || 10,
      status: device ? device.status : (status || 'Online'), // Preserve isolated state
      lastSeen: new Date()
    };

    if (!device) {
      // Register new system dynamically
      device = await db.endpoints.create({
        hostname,
        ...updatePayload,
        processes: [
          { pid: 1, name: 'systemd', path: '/sbin/init', parent: 0 },
          { pid: 512, name: 'python3', path: '/usr/bin/python3', parent: 1 }
        ],
        networkConnections: [
          { localPort: 22, remoteAddress: '0.0.0.0', remotePort: 0, state: 'LISTENING' }
        ]
      });
      console.log(`[EDR] Dynamic agent auto-enrollment completed: ${hostname}`);
    } else {
      await db.endpoints.findByIdAndUpdate(device._id, updatePayload);
    }

    // Broadcast update via WebSockets to all connected UIs
    if (global.io) {
      global.io.emit('edr_stats', {
        id: device._id,
        hostname,
        cpuUsage: updatePayload.cpuUsage,
        ramUsage: updatePayload.ramUsage,
        status: updatePayload.status,
        lastSeen: updatePayload.lastSeen
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
