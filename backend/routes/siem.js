const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');

// Get real-time SIEM logs stream with simple query support
router.get('/logs', authenticateToken, async (req, res) => {
  const { source, severity, host, search, limit = 100 } = req.query;
  const filter = {};

  if (source) filter.source = source;
  if (severity) filter.severity = severity;
  if (host) filter.host = host;
  if (search) {
    filter.message = { $regex: search, $options: 'i' };
  }

  try {
    const logs = await db.logs.find(filter, parseInt(limit));
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Run KQL/SPL Style Query Mocks
router.post('/search', authenticateToken, async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  try {
    console.log(`[SIEM] Running query parser on command: "${query}"`);

    // Fetch all logs to filter locally inside the parsing engine
    const allLogs = await db.logs.find({}, 1000);
    let results = [...allLogs];

    // Simple parser for SPL/KQL
    // Example: source="AuthLog" | where severity="WARNING"
    // Example: host="WIN-SOC-AD-02" | stats count by severity
    const segments = query.split('|').map(s => s.trim());
    
    // Process base query (First segment)
    const base = segments[0];
    if (base && base !== '*') {
      const match = base.match(/(\w+)[\s]*=[\s]*"([^"]+)"/);
      if (match) {
        const [, field, val] = match;
        results = results.filter(item => String(item[field] || '').toLowerCase() === val.toLowerCase());
      } else {
        // Fallback to text search across all logs
        const searchWord = base.replace(/"/g, '').toLowerCase();
        results = results.filter(item => 
          String(item.message || '').toLowerCase().includes(searchWord) ||
          String(item.host || '').toLowerCase().includes(searchWord) ||
          String(item.source || '').toLowerCase().includes(searchWord)
        );
      }
    }

    // Process piping commands (subsequent segments)
    let stats = null;
    for (let i = 1; i < segments.length; i++) {
      const cmd = segments[i];
      
      // WHERE command
      if (cmd.startsWith('where ') || cmd.startsWith('filter ')) {
        const inner = cmd.replace(/^(where|filter)\s+/, '');
        const match = inner.match(/(\w+)[\s]*=[\s]*"([^"]+)"/);
        if (match) {
          const [, field, val] = match;
          results = results.filter(item => String(item[field] || '').toLowerCase() === val.toLowerCase());
        }
      }
      
      // STATS command
      if (cmd.startsWith('stats ')) {
        const statsMatch = cmd.match(/stats\s+count\s+by\s+(\w+)/);
        if (statsMatch) {
          const field = statsMatch[1];
          const counts = {};
          results.forEach(item => {
            const key = item[field] || 'Unknown';
            counts[key] = (counts[key] || 0) + 1;
          });
          stats = Object.entries(counts).map(([name, count]) => ({ name, count }));
        }
      }

      // LIMIT command
      if (cmd.startsWith('limit ')) {
        const limitCount = parseInt(cmd.replace('limit ', ''), 10);
        if (!isNaN(limitCount)) {
          results = results.slice(0, limitCount);
        }
      }
    }

    // Write to audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.email.split('@')[0],
      action: 'SIEM Query Executed',
      details: `Search Query: "${query}". Returned ${results.length} results.`,
      ip: req.ip || '127.0.0.1'
    });

    res.json({
      query,
      count: results.length,
      results: stats ? null : results, // If it was a stats command, only return statistics
      statistics: stats
    });

  } catch (err) {
    res.status(500).json({ error: `Query execution error: ${err.message}` });
  }
});

// MITRE ATT&CK Matrix coverage calculator
router.get('/mitre', authenticateToken, async (req, res) => {
  try {
    const logs = await db.logs.find({ mitreTactic: { $ne: '' } }, 500);
    const matrix = {};

    logs.forEach(log => {
      if (!log.mitreTactic) return;
      const tactic = log.mitreTactic;
      const technique = log.mitreTechnique || 'General Technique';

      if (!matrix[tactic]) {
        matrix[tactic] = { count: 0, techniques: {} };
      }

      matrix[tactic].count += 1;
      matrix[tactic].techniques[technique] = (matrix[tactic].techniques[technique] || 0) + 1;
    });

    res.json(matrix);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
