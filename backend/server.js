require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const simulator = require('./simulator');
const alertBus = require('./utils/alertBus');

// Router imports
const auth = require('./routes/auth');
const siemRouter = require('./routes/siem');
const edrRouter = require('./routes/edr');
const incidentsRouter = require('./routes/incidents');
const intelRouter = require('./routes/threatintel');
const reportsRouter = require('./routes/reports');
const malwareRouter = require('./routes/malware');
const phishingRouter = require('./routes/phishing');
const soarRouter = require('./routes/soar');
const scannerRouter = require('./routes/scanner');
const settingsRouter = require('./routes/settings');
const huntingRouter = require('./routes/hunting');

const app = express();
const server = http.createServer(app);

// Socket.io initialization with open cross-origin permissions for development
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

alertBus.init(io);

const PORT = process.env.PORT || 5001;

// Express Middlewares with increased payload size limits for file scans
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serving reports directory statically
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// Mount API routes
app.use('/api/auth', auth.router);
app.use('/api/siem', siemRouter);
app.use('/api/edr', edrRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/intel', intelRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/malware', malwareRouter);
app.use('/api/phishing', phishingRouter);
app.use('/api/soar', soarRouter);
app.use('/api/scan', scannerRouter);
app.use('/api/hunt', huntingRouter);
app.use('/api', settingsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Healthy',
    database: db.isMongoose() ? 'Enterprise MongoDB' : 'Portable JSON Database Fallback',
    timestamp: new Date()
  });
});

// Real-Time WebSockets communication handler
global.io = io;
io.on('connection', (socket) => {
  console.log(`[SOCKET] Active telemetry pipeline linked to client node: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client node disconnected: ${socket.id}`);
  });
});

// Services imports
const telemetryService = require('./services/telemetryService');
const siemService = require('./services/siemService');
const edrService = require('./services/edrService');
const idsService = require('./services/idsService');
const honeypotService = require('./services/honeypotService');
const scheduler = require('./services/scheduler');
const scannerService = require('./services/scannerService');
const packetCaptureService = require('./services/packetCaptureService');

async function seedDefaultPlaybooks() {
  try {
    const playbooks = await db.playbooks.find({});
    if (playbooks && playbooks.length > 0) {
      console.log('[SOAR] Playbooks database already populated. Skipping seed.');
      return;
    }
    
    const defaults = [
      {
        name: 'Critical Alert Response',
        trigger: 'alert:CRITICAL',
        status: 'Active',
        steps: [
          { order: 1, action: 'Notify Analyst', params: { channel: 'Console' } },
          { order: 2, action: 'Create Incident', params: { severity: 'CRITICAL' } },
          { order: 3, action: 'Isolate Endpoint', params: { auto: true } },
          { order: 4, action: 'Generate Report', params: { format: 'PDF' } }
        ],
        executions: []
      },
      {
        name: 'Ransomware Containment',
        trigger: 'keyword:ransomware',
        status: 'Active',
        steps: [
          { order: 1, action: 'Isolate Endpoint', params: { scope: 'Network' } },
          { order: 2, action: 'Block Outbound', params: { ports: [445, 139] } },
          { order: 3, action: 'Snapshot Disk State', params: { backup: true } },
          { order: 4, action: 'Alert Team', params: { urgency: 'Immediate' } }
        ],
        executions: []
      },
      {
        name: 'Brute Force Auto-Block',
        trigger: 'failedLogins:5+',
        status: 'Active',
        steps: [
          { order: 1, action: 'Block Source IP', params: { duration: '24h' } },
          { order: 2, action: 'Notify User', params: { method: 'Email' } },
          { order: 3, action: 'Create Incident', params: { severity: 'HIGH' } },
          { order: 4, action: 'Log to SIEM', params: { category: 'Access' } }
        ],
        executions: []
      },
      {
        name: 'Malware File Detected',
        trigger: 'malware:MALICIOUS',
        status: 'Active',
        steps: [
          { order: 1, action: 'Quarantine File', params: { delete: false } },
          { order: 2, action: 'Isolate Endpoint', params: { enforce: true } },
          { order: 3, action: 'Create Incident', params: { severity: 'CRITICAL' } },
          { order: 4, action: 'WhatsApp Alert', params: { notify: 'Admin' } }
        ],
        executions: []
      },
      {
        name: 'Vulnerability Scan Complete',
        trigger: 'scan:complete',
        status: 'Active',
        steps: [
          { order: 1, action: 'Parse Results', params: { format: 'JSON' } },
          { order: 2, action: 'Create IOCs for Exposed Services', params: { auto: true } },
          { order: 3, action: 'Generate Report', params: { type: 'Vulnerability' } }
        ],
        executions: []
      },
      {
        name: 'Daily Threat Summary',
        trigger: 'schedule:daily-08:00',
        status: 'Active',
        steps: [
          { order: 1, action: 'Aggregate 24h Alerts', params: { span: '24h' } },
          { order: 2, action: 'Generate PDF', params: { detailed: true } },
          { order: 3, action: 'Email Delivery', params: { sendTo: 'Admin' } }
        ],
        executions: []
      }
    ];

    await db.playbooks.createMany(defaults);
    console.log('[SOAR] Successfully seeded 6 default SOAR playbooks.');
  } catch (err) {
    console.error('[SOAR] Failed to seed default playbooks:', err);
  }
}

// Core Startup Sequence
async function startServer() {
  // Connect to persistence DB layer
  await db.connect();

  // Seed default playbooks if none exist
  await seedDefaultPlaybooks();

  // Initialize and spin up ZENTRIX active services
  telemetryService.init(io);
  siemService.init(io);
  edrService.init(io);
  idsService.init(io);
  honeypotService.init(io);
  scheduler.init(io);
  scannerService.init(io);
  packetCaptureService.init(io);
  simulator.init(io);

  server.listen(PORT, () => {
    console.log(`[SYSTEM] Unified ZENTRIX SOC Backend services initialized on port ${PORT}`);
    console.log(`[SYSTEM] Socket.io WebSocket server active.`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[ERROR] Port ${PORT} is already in use. Kill the process with: fuser -k ${PORT}/tcp`);
      process.exit(1);
    } else {
      throw err;
    }
  });
}

startServer();
