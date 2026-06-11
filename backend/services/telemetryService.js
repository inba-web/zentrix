// backend/services/telemetryService.js
const si = require('systeminformation');
const os = require('os');
const { runCmd, PLATFORM } = require('../utils/platform');
const alertBus = require('../utils/alertBus');
const db = require('../db');

let ioInstance = null;
let loops = [];

async function collectAndEmit() {
  if (!ioInstance) return;
  try {
    const [cpu, mem, procs, netConns] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.processes(),
      si.networkConnections()
    ]);

    const activeConnsCount = netConns.filter(c => c.state === 'ESTABLISHED').length;
    const topProcs = procs.list
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 25)
      .map(p => ({
        pid: p.pid,
        name: p.name,
        cpu: parseFloat(p.cpu.toFixed(1)),
        ram: parseFloat((p.memRss / 1e6).toFixed(0)), // in MB
        state: p.state
      }));

    const ramUsedPercent = Math.round((mem.used / mem.total) * 100);
    const cpuUsedPercent = Math.round(cpu.currentLoad);

    const telemetryData = {
      ts: new Date().toISOString(),
      cpu: cpuUsedPercent,
      ram: ramUsedPercent,
      ramUsedGB: (mem.used / 1e9).toFixed(1),
      ramTotalGB: (mem.total / 1e9).toFixed(1),
      topProcesses: topProcs,
      activeConnections: activeConnsCount
    };

    // Emit standard updates to new UI
    ioInstance.emit('telemetry:update', telemetryData);
    
    // Also emit old format event to avoid breaking legacy code
    ioInstance.emit('telemetry_update', {
      timestamp: telemetryData.ts,
      cpuUsage: cpuUsedPercent,
      ramUsage: ramUsedPercent,
      diskUsage: '42.5',
      diskIO: { read: '1.2', write: '0.4' },
      network: { download: '45.2', upload: '12.8' },
      activeProcesses: procs.list.length,
      systemUptime: os.uptime(),
      openConnections: activeConnsCount,
      topProcesses: topProcs
    });

    // Threshold-based critical alert firing
    if (cpuUsedPercent > 90) {
      alertBus.fireCritical({
        title: 'CPU Spike Detected',
        description: `CPU usage reached ${cpuUsedPercent}% on the host workstation.`,
        severity: 'HIGH',
        category: 'System',
        source: 'Telemetry'
      });
    }
  } catch (err) {
    console.error('[TELEMETRY] collectAndEmit error:', err.message);
  }
}

// Open ports & active hosts count utilities
function getOpenPortsCount(callback) {
  const openPortsCmd = PLATFORM === 'win32'
    ? 'netstat -an | findstr LISTENING'
    : 'ss -tuln | grep LISTEN';
  runCmd(openPortsCmd, openPortsCmd, (err, stdout) => {
    if (err || !stdout) return callback(0);
    // Split and count rows (filter empty rows)
    const lines = stdout.split('\n').filter(l => l.trim().length > 0);
    callback(lines.length);
  });
}

function getActiveHostsCount(callback) {
  const arpCmd = PLATFORM === 'win32' ? 'arp -a' : 'arp -n';
  runCmd(arpCmd, arpCmd, (err, stdout) => {
    if (err || !stdout) return callback(0);
    // Count distinct IPv4 addresses in ARP printout
    const matches = stdout.match(/\d+\.\d+\.\d+\.\d+/g);
    if (!matches) return callback(0);
    const uniqueIPs = new Set(matches);
    callback(uniqueIPs.size);
  });
}

function init(io) {
  ioInstance = io;
  
  // Clear any existing loops
  loops.forEach(l => clearInterval(l));
  loops = [];

  // Loop 1: telemetry:update every 2s
  loops.push(setInterval(collectAndEmit, 2000));

  // Loop 2: alerts:distribution every 5s
  loops.push(setInterval(async () => {
    try {
      const list = await db.alerts.find({});
      const distribution = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
      list.forEach(a => {
        const sev = (a.severity || 'MEDIUM').toUpperCase();
        if (sev in distribution) {
          distribution[sev]++;
        }
      });
      ioInstance.emit('alerts:distribution', distribution);
    } catch (e) {
      // Ignore
    }
  }, 5000));

  // Loop 3: metrics:openports every 5s
  loops.push(setInterval(() => {
    getOpenPortsCount(count => {
      ioInstance.emit('metrics:openports', count);
    });
  }, 5000));

  // Loop 4: metrics:activehosts every 10s
  loops.push(setInterval(() => {
    getActiveHostsCount(count => {
      ioInstance.emit('metrics:activehosts', count);
    });
  }, 10000));

  // Loop 5: metrics:runningscans every 3s
  loops.push(setInterval(() => {
    const scannerService = require('./scannerService');
    const count = scannerService.getActiveScansCount ? scannerService.getActiveScansCount() : 0;
    ioInstance.emit('metrics:runningscans', count);
  }, 3000));

  console.log('[TELEMETRY] Real-time host system information polling loop active (2s interval).');
}

module.exports = {
  init
};
