require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const simulator = require('./simulator');

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

const app = express();
const server = http.createServer(app);

// Socket.io initialization with open cross-origin permissions for development
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 5000;

// Express Middlewares
app.use(cors());
app.use(express.json());

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

// Core Startup Sequence
async function startServer() {
  // Connect to persistence DB layer
  await db.connect();

  // Initialize and spin up ZENTRIX active services
  telemetryService.init(io);
  siemService.init(io);
  edrService.init(io);
  idsService.init(io);
  honeypotService.init(io);
  scheduler.init(io);
  scannerService.init(io);
  packetCaptureService.init(io);

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
