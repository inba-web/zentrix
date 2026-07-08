const si = require('systeminformation');
const fs = require('fs');
const path = require('path');

let ioInstance = null;
let edrInterval = null;
let fileWatcher = null;
let lastProcesses = new Map(); // Store previous PID list

const storageDir = process.env.ZENTRIX_USER_DATA 
  ? path.join(process.env.ZENTRIX_USER_DATA, 'storage') 
  : path.join(__dirname, '..', '..', 'storage');
const watchDir = path.join(storageDir, 'uploads');
const db = require('../db');

// Setup EDR file watch
function setupFileWatcher(io) {
  if (!fs.existsSync(watchDir)) {
    fs.mkdirSync(watchDir, { recursive: true });
  }

  try {
    fileWatcher = fs.watch(watchDir, (eventType, filename) => {
      if (!filename || filename.endsWith('.tmp')) return;
      const changeMsg = `EDR File Monitor: Event [${eventType}] triggered on file: ${filename} inside monitored uploads workspace directory.`;
      
      const alert = {
        timestamp: new Date(),
        severity: 'LOW',
        title: 'File Integrity Change Detected',
        description: changeMsg,
        category: 'EDR Alert',
        host: require('os').hostname(),
        status: 'NEW',
        assignedTo: 'Unassigned',
        evidence: { eventType, filename, dir: watchDir }
      };

      // Broadcast alert and write to logs
      broadcastEDRAlert(alert, io);
    });
    console.log(`[EDR] Actively watching file integrity changes inside: ${watchDir}`);
  } catch (e) {
    console.error('[EDR] File integrity watcher failed:', e.message);
  }
}

async function broadcastEDRAlert(alert, io) {
  try {
    const saved = await db.alerts.create(alert);
    io.emit('alert', saved);

    // Also write SIEM log corresponding to EDR alert
    await db.logs.create({
      timestamp: new Date(),
      source: 'Sysmon',
      severity: alert.severity,
      message: `EDR ALERT: ${alert.title} - ${alert.description}`,
      host: alert.host,
      user: 'system',
      srcIp: '127.0.0.1',
      destIp: '127.0.0.1',
      mitreTactic: 'Defensive Evasion',
      mitreTechnique: 'T1562 - Impair Defenses',
      payload: alert.evidence
    });
  } catch (err) {
    // Silent catch
  }
}

// Compare active processes to capture creation and termination events
async function pollEDR(io) {
  try {
    const [procs, connections, cpuLoad, mem] = await Promise.all([
      si.processes(),
      si.networkConnections(),
      si.currentLoad(),
      si.mem()
    ]);

    const activeList = procs.list || [];
    const currentPids = new Map();

    const suspiciousNames = ['nc', 'ncat', 'netcat', 'mimikatz', 'xmrig', 'nmap', 'hydra', 'john', 'metasploit'];
    
    // Analyze running processes
    activeList.forEach(p => {
      currentPids.set(p.pid, p.name);

      // Check for creation (if it wasn't running in last poll)
      if (lastProcesses.size > 0 && !lastProcesses.has(p.pid)) {
        const isSuspicious = suspiciousNames.some(s => p.name.toLowerCase().includes(s));
        const severity = isSuspicious ? 'CRITICAL' : 'INFO';
        const title = isSuspicious ? 'Suspicious Process Spawned' : 'Process Creation Event';
        
        const alert = {
          timestamp: new Date(),
          severity,
          title,
          description: `Spawned Process Image: ${p.name} (PID: ${p.pid}) parented by PID: ${p.parent || 'N/A'}. Path: ${p.path || 'system'}.`,
          category: 'Process Activity',
          host: require('os').hostname(),
          status: 'NEW',
          assignedTo: 'Unassigned',
          evidence: { pid: p.pid, name: p.name, path: p.path, cpu: p.cpu }
        };

        // If suspicious, broadcast immediately
        if (isSuspicious) {
          broadcastEDRAlert(alert, io);
        }
      }
    });

    // Check for termination
    if (lastProcesses.size > 0) {
      for (let [pid, name] of lastProcesses.entries()) {
        if (!currentPids.has(pid)) {
          // Process terminated
          const isSuspicious = suspiciousNames.some(s => name.toLowerCase().includes(s));
          if (isSuspicious) {
            const alert = {
              timestamp: new Date(),
              severity: 'HIGH',
              title: 'Suspicious Process Terminated',
              description: `Terminated Process Image: ${name} (PID: ${pid}) discontinued active execution thread.`,
              category: 'Process Activity',
              host: require('os').hostname(),
              status: 'NEW',
              assignedTo: 'Unassigned',
              evidence: { pid, name }
            };
            broadcastEDRAlert(alert, io);
          }
        }
      }
    }

    lastProcesses = currentPids;

    // Filter EDR network connections
    const openConns = (connections || []).map(c => ({
      localPort: c.localPort,
      remoteAddress: c.peerAddress || '127.0.0.1',
      remotePort: c.peerPort || 0,
      state: c.state || 'ESTABLISHED'
    })).slice(0, 15);

    // Real CPU & RAM from systeminformation — no simulated values
    const realCpuUsage = Math.round(cpuLoad.currentLoad ?? 0);
    const realRamUsage = mem.total > 0 ? Math.round((mem.used / mem.total) * 100) : 0;

    // Save/update endpoint metrics in database for actual host
    const hostInfo = {
      hostname: require('os').hostname(),
      ip: '127.0.0.1',
      os: `${require('os').type()} ${require('os').release()} (${require('os').arch()})`,
      status: 'Online',
      cpuUsage: realCpuUsage,
      ramUsage: realRamUsage,
      lastSeen: new Date(),
      processes: activeList.slice(0, 20).map(p => ({
        pid: p.pid,
        name: p.name,
        path: p.path || 'system',
        parent: p.parent || 0
      })),
      networkConnections: openConns
    };

    // Update EDR DB entry for this host
    let localDevice = await db.endpoints.findOne({ hostname: hostInfo.hostname });
    if (!localDevice) {
      localDevice = await db.endpoints.create(hostInfo);
    } else {
      await db.endpoints.findByIdAndUpdate(localDevice._id, hostInfo);
    }

    // Broadcast EDR updates
    const allDevices = await db.endpoints.find({});
    io.emit('edr:update', allDevices);

    // Also emit old format event to avoid breaking legacy code
    allDevices.forEach(d => {
      io.emit('edr_stats', {
        id: d._id || d.hostname,
        hostname: d.hostname,
        cpuUsage: d.cpuUsage,
        ramUsage: d.ramUsage,
        status: d.status,
        lastSeen: d.lastSeen
      });
    });

  } catch (err) {
    console.error('[EDR] Telemetry monitor polling failure:', err.message);
  }
}

async function init(io) {
  ioInstance = io;
  
  // Seed DB with local host record if missing
  try {
    let localDevice = await db.endpoints.findOne({ hostname: require('os').hostname() });
    const localPayload = {
      hostname: require('os').hostname(),
      ip: '127.0.0.1',
      os: `${require('os').type()} ${require('os').release()}`,
      status: 'Online',
      cpuUsage: 5,
      ramUsage: 35,
      lastSeen: new Date(),
      processes: [],
      networkConnections: []
    };
    if (!localDevice) {
      await db.endpoints.create(localPayload);
    } else {
      await db.endpoints.findByIdAndUpdate(localDevice._id, { status: 'Online' });
    }
  } catch (err) {
    console.error('[EDR] Seeding local host record failed:', err.message);
  }

  // Watch directories for File changes
  setupFileWatcher(io);

  // Poll EDR stats every 3 seconds
  if (edrInterval) clearInterval(edrInterval);
  edrInterval = setInterval(() => pollEDR(io), 3000);
}

module.exports = {
  init
};
