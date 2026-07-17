const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const si = require('systeminformation');
const { PLATFORM } = require('../utils/platform');
const db = require('../db');

let ioInstance = null;
let tailInterval = null;

const baseDir = process.env.ZENTRIX_USER_DATA || path.join(__dirname, '..');
const localLogPath = path.join(baseDir, 'data', 'zentrix_siem.log');

// Ensure local fallback log file exists
if (!fs.existsSync(path.dirname(localLogPath))) {
  fs.mkdirSync(path.dirname(localLogPath), { recursive: true });
}
if (!fs.existsSync(localLogPath)) {
  fs.writeFileSync(localLogPath, 'ZENTRIX Live Local Ingestion Stream Active.\n');
}

// Parse syslog format lines
function parseSyslogLine(line) {
  // Pattern: Jun 11 10:25:15 host process[pid]: message
  const match = line.match(/^([A-Z][a-z]{2}\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+([^:]+):\s+(.*)$/);
  if (match) {
    const [, ts, host, source, message] = match;
    const severity = message.toLowerCase().includes('error') || message.toLowerCase().includes('fail') ? 'CRITICAL' : 
                     (message.toLowerCase().includes('warning') || message.toLowerCase().includes('warn') ? 'WARNING' : 'INFO');
    const year = new Date().getFullYear();
    const timestampDate = new Date(`${ts} ${year}`);
    const timestamp = isNaN(timestampDate.getTime()) ? new Date().toISOString() : timestampDate.toISOString();
    return {
      timestamp,
      host,
      source: source.split('[')[0],
      severity,
      message,
      user: 'system',
      srcIp: '127.0.0.1',
      destIp: '127.0.0.1'
    };
  }
  
  // Fallback
  const severity = line.toLowerCase().includes('error') || line.toLowerCase().includes('fail') ? 'CRITICAL' : 
                   (line.toLowerCase().includes('warning') || line.toLowerCase().includes('warn') ? 'WARNING' : 'INFO');
  return {
    timestamp: new Date().toISOString(),
    host: require('os').hostname(),
    source: 'Syslog',
    severity,
    message: line,
    user: 'system',
    srcIp: '127.0.0.1',
    destIp: '127.0.0.1'
  };
}

// Tail a single file and push lines
function tailLogFile(filePath, io, sourceName = null) {
  if (!fs.existsSync(filePath)) return;
  try {
    let lastSize = fs.statSync(filePath).size;
    setInterval(() => {
      try {
        const stat = fs.statSync(filePath);
        if (stat.size <= lastSize) return;
        const stream = fs.createReadStream(filePath, { start: lastSize, end: stat.size });
        lastSize = stat.size;
        const rl = readline.createInterface({ input: stream });
        rl.on('line', async line => {
          if (!line.trim()) return;
          const entry = parseSyslogLine(line);
          if (sourceName) {
            entry.source = sourceName;
          }
          io.emit('siem:log', entry);
          io.emit('siem_log', entry); // Support both formats
          try {
            await db.logs.create(entry);
          } catch (e) {}
        });
      } catch (err) {
        // Ignore read/stat error
      }
    }, 2000);
  } catch (err) {
    // Ignore initial stat error
  }
}

// Generate actual system events as local logs when root permissions are absent
async function generateLocalSystemLogs() {
  try {
    const procs = await si.processes();
    const list = procs.list || [];
    if (list.length > 0) {
      // Pick a random active process to write a log
      const p = list[Math.floor(Math.random() * list.length)];
      const msg = `System Process Monitor: Active Process: ${p.name} (PID: ${p.pid}), Command: ${p.path || 'system'}, CPU: ${p.cpu.toFixed(1)}%, Mem: ${p.mem.toFixed(1)}%`;
      
      const logLine = `[${new Date().toISOString()}] ZENTRIX-SYS-INGESTION INFO ${msg}\n`;
      fs.appendFileSync(localLogPath, logLine);
    }
  } catch (err) {
    // Silent catch
  }
}

function init(io) {
  ioInstance = io;

  // 1. Platform-specific system log tailing
  if (PLATFORM === 'linux') {
    tailLogFile('/var/log/syslog', io, 'Syslog');
    tailLogFile('/var/log/auth.log', io, 'AuthLog');
    tailLogFile('/var/log/kern.log', io, 'KernLog');
    console.log('[SIEM] Initiated Linux system log files tailer loops.');
  } else if (PLATFORM === 'darwin') {
    tailLogFile('/var/log/system.log', io, 'Syslog');
    console.log('[SIEM] Initiated macOS system.log tailer loop.');
  } else if (PLATFORM === 'win32') {
    // Poll Windows Event Log every 5 seconds using PowerShell
    setInterval(() => {
      exec(`powershell -Command "Get-WinEvent -MaxEvents 10 -LogName System | Select-Object TimeCreated, LevelDisplayName, Message | ConvertTo-Json"`, (err, stdout) => {
        if (err || !stdout) return;
        try { 
          const parsed = JSON.parse(stdout);
          const events = Array.isArray(parsed) ? parsed : [parsed];
          events.forEach(async e => {
            const entry = {
              timestamp: e.TimeCreated ? new Date(e.TimeCreated).toISOString() : new Date().toISOString(),
              host: require('os').hostname(),
              source: 'WinEvent',
              severity: e.LevelDisplayName === 'Error' || e.LevelDisplayName === 'Critical' ? 'CRITICAL' : 
                        (e.LevelDisplayName === 'Warning' ? 'WARNING' : 'INFO'),
              message: e.Message || 'Windows System Event',
              user: 'system',
              srcIp: '127.0.0.1',
              destIp: '127.0.0.1'
            };
            io.emit('siem:log', entry);
            io.emit('siem_log', entry);
            await db.logs.create(entry);
          });
        } catch (err2) {}
      });
    }, 5000);
    console.log('[SIEM] Initiated Windows Event Log PowerShell polling.');
  }

  // 2. Setup fallback local file tailer
  tailLogFile(localLogPath, io, 'ZENTRIX-Daemon');

  // Poll system information and write actual system activities to fallback log every 3 seconds
  if (tailInterval) clearInterval(tailInterval);
  tailInterval = setInterval(generateLocalSystemLogs, 3000);
}

module.exports = {
  init
};
