const si = require('systeminformation');
const os = require('os');

let ioInstance = null;
let intervalId = null;

// Real-Time Telemetry System Poller
async function collectTelemetry() {
  try {
    const [
      cpu, 
      mem, 
      fsSize, 
      diskIO, 
      netStats, 
      processes, 
      connections
    ] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.disksIO(),
      si.networkStats(),
      si.processes(),
      si.networkConnections()
    ]);

    // Active Processes count
    const activeProcessesCount = processes.all || 0;
    
    // Sort processes by CPU to get Top Processes
    const topProcesses = (processes.list || [])
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 5)
      .map(p => ({
        pid: p.pid,
        name: p.name,
        cpu: p.cpu.toFixed(1),
        mem: p.mem.toFixed(1),
        state: p.state
      }));

    // Network stats
    const rxSec = netStats && netStats[0] ? netStats[0].rx_sec : 0;
    const txSec = netStats && netStats[0] ? netStats[0].tx_sec : 0;

    // Disk I/O stats
    const diskR = diskIO ? diskIO.rIO_sec : 0;
    const diskW = diskIO ? diskIO.wIO_sec : 0;

    // Primary disk usage
    const primaryDisk = fsSize && fsSize[0] ? fsSize[0] : { use: 0, size: 0, used: 0 };

    const telemetryData = {
      timestamp: new Date().toISOString(),
      cpuUsage: cpu.currentLoad.toFixed(1),
      ramUsage: ((mem.active / mem.total) * 100).toFixed(1),
      diskUsage: primaryDisk.use.toFixed(1),
      diskIO: {
        read: diskR ? diskR.toFixed(1) : '0.0',
        write: diskW ? diskW.toFixed(1) : '0.0'
      },
      network: {
        download: (rxSec / 1024).toFixed(1), // KB/s
        upload: (txSec / 1024).toFixed(1)   // KB/s
      },
      activeProcesses: activeProcessesCount,
      systemUptime: os.uptime(),
      openConnections: connections ? connections.length : 0,
      topProcesses
    };

    if (ioInstance) {
      ioInstance.emit('telemetry_update', telemetryData);
    }
  } catch (err) {
    console.error('[TELEMETRY] Metrics collection failed:', err.message);
  }
}

function init(io) {
  ioInstance = io;
  
  // Start polling loop every 2 seconds
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(collectTelemetry, 2000);
  console.log('[TELEMETRY] Real-time host system information polling loop active (2s interval).');
}

module.exports = {
  init
};
