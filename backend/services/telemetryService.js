// backend/services/telemetryService.js
const si = require('systeminformation');
const os = require('os');
const { runCmd, PLATFORM } = require('../utils/platform');
const alertBus = require('../utils/alertBus');
const db = require('../db');
const sysInfoCache = require('../utils/sysInfoCache');

let ioInstance = null;
let loops = [];
let cachedOpenPorts = 0;
let cachedActiveHosts = 0;

async function collectAndEmit() {
  if (!ioInstance) return;
  try {
    const [cpu, mem, procs, netConns, fsSize, netStats] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      sysInfoCache.getProcesses(),
      sysInfoCache.getNetworkConnections(),
      si.fsSize(),
      si.networkStats()
    ]);

    const activeConnsCount = (netConns || []).filter(c => c.state === 'ESTABLISHED').length;
    const topProcs = (procs.list || [])
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

    // Dynamic actual disk usage
    const rootFs = (fsSize || []).find(f => f.mount === '/') || fsSize[0] || { size: 1, used: 0, use: 0 };
    const diskUsedPercent = Math.round(rootFs.use || 0);

    // Dynamic actual network throughput
    let rxSec = 0;
    let txSec = 0;
    if (netStats && netStats.length > 0) {
      netStats.forEach(iface => {
        rxSec += iface.rx_sec || 0;
        txSec += iface.tx_sec || 0;
      });
    }
    const downloadMbps = ((rxSec * 8) / 1e6).toFixed(2);
    const uploadMbps = ((txSec * 8) / 1e6).toFixed(2);

    // Active incidents and active scans
    const scannerService = require('./scannerService');
    const runningScansCount = scannerService.getActiveScansCount ? scannerService.getActiveScansCount() : 0;
    const activeIncidentsCount = await db.incidents.countDocuments({ status: { $ne: 'RESOLVED' } });

    // Alerts severity counts
    const alertsList = await db.alerts.find({});
    const alertsBySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    alertsList.forEach(a => {
      const sev = (a.severity || 'MEDIUM').toUpperCase();
      if (sev in alertsBySeverity) {
        alertsBySeverity[sev]++;
      }
    });

    // Endpoint Health Score calculation
    const criticalCount = alertsBySeverity.CRITICAL;
    const highCount = alertsBySeverity.HIGH;
    const mediumCount = alertsBySeverity.MEDIUM;
    const healthScore = Math.max(0, 100 - (criticalCount * 15 + highCount * 5 + mediumCount * 1));

    const telemetryData = {
      ts: new Date().toISOString(),
      cpu: cpuUsedPercent,
      ram: ramUsedPercent,
      ramUsedGB: (mem.used / 1e9).toFixed(1),
      ramTotalGB: (mem.total / 1e9).toFixed(1),
      disk: diskUsedPercent,
      activeProcesses: (procs.list || []).length,
      activeHosts: cachedActiveHosts,
      openPorts: cachedOpenPorts,
      activeIncidents: activeIncidentsCount,
      alertsDistribution: alertsBySeverity,
      downloadSpeed: downloadMbps,
      uploadSpeed: uploadMbps,
      healthScore: healthScore,
      topProcesses: topProcs,
      activeConnections: activeConnsCount,
      runningScans: runningScansCount
    };

    // Emit standard updates to new UI
    ioInstance.emit('telemetry:update', telemetryData);
    
    // Also emit old format event to avoid breaking legacy code
    ioInstance.emit('telemetry_update', {
      timestamp: telemetryData.ts,
      cpuUsage: cpuUsedPercent,
      ramUsage: ramUsedPercent,
      diskUsage: diskUsedPercent.toString(),
      diskIO: { read: '1.2', write: '0.4' },
      network: { download: downloadMbps, upload: uploadMbps },
      activeProcesses: (procs.list || []).length,
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
    const lines = stdout.split('\n').filter(l => l.trim().length > 0);
    callback(lines.length);
  });
}

function getActiveHostsCount(callback) {
  const arpCmd = PLATFORM === 'win32' ? 'arp -a' : 'arp -n';
  runCmd(arpCmd, arpCmd, (err, stdout) => {
    if (err || !stdout) return callback(0);
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

  // Initial fetch for ports and hosts
  getOpenPortsCount(count => { cachedOpenPorts = count; });
  getActiveHostsCount(count => { cachedActiveHosts = count; });

  // Loop 1: telemetry:update every 3s
  loops.push(setInterval(collectAndEmit, 3000));

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
      cachedOpenPorts = count;
      ioInstance.emit('metrics:openports', count);
    });
  }, 5000));

  // Loop 4: metrics:activehosts every 10s
  loops.push(setInterval(() => {
    getActiveHostsCount(count => {
      cachedActiveHosts = count;
      ioInstance.emit('metrics:activehosts', count);
    });
  }, 10000));

  // Loop 5: metrics:runningscans every 3s
  loops.push(setInterval(() => {
    const scannerService = require('./scannerService');
    const count = scannerService.getActiveScansCount ? scannerService.getActiveScansCount() : 0;
    ioInstance.emit('metrics:runningscans', count);
  }, 3000));

  console.log('[TELEMETRY] Real-time host system information polling loop active (3s interval).');
}

module.exports = {
  init
};

