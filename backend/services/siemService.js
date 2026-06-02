const fs = require('fs');
const path = require('path');
const si = require('systeminformation');

let ioInstance = null;
let tailInterval = null;

// Paths to check
const LOG_PATHS = {
  syslog: '/var/log/syslog',
  auth: '/var/log/auth.log',
  kern: '/var/log/kern.log'
};

const localLogPath = path.join(__dirname, '..', 'data', 'zentrix_siem.log');
const db = require('../db');

// Ensure local fallback log file exists
if (!fs.existsSync(path.dirname(localLogPath))) {
  fs.mkdirSync(path.dirname(localLogPath), { recursive: true });
}
if (!fs.existsSync(localLogPath)) {
  fs.writeFileSync(localLogPath, 'ZENTRIX Live Local Ingestion Stream Active.\n');
}

// Tail a single file and push lines
function tailFile(filePath, source, io) {
  let fileSize = fs.statSync(filePath).size;
  
  fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
    if (curr.mtimeMs <= prev.mtimeMs) return;
    
    const stream = fs.createReadStream(filePath, {
      start: fileSize,
      end: curr.size
    });
    
    let buffer = '';
    stream.on('data', chunk => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep partial line
      
      lines.forEach(async line => {
        if (!line.trim()) return;
        const severity = line.includes('error') || line.includes('fail') ? 'ERROR' : 
                         (line.includes('warning') || line.includes('warn') ? 'WARNING' : 'INFO');
        
        const logEntry = {
          timestamp: new Date(),
          source,
          severity,
          message: line.substring(0, 1000),
          host: require('os').hostname(),
          user: line.includes('user') ? (line.match(/user\s+(\w+)/) || [, 'system'])[1] : 'system',
          srcIp: line.includes('from') ? (line.match(/from\s+([0-9.]+)/) || [, '127.0.0.1'])[1] : '127.0.0.1',
          destIp: '127.0.0.1',
          mitreTactic: severity === 'ERROR' ? 'Execution' : '',
          mitreTechnique: severity === 'ERROR' ? 'T1059 - Command and Scripting Interpreter' : '',
          payload: { path: filePath }
        };

        // Write log entry to DB
        try {
          const saved = await db.logs.create(logEntry);
          io.emit('siem_log', saved);
        } catch (e) {
          // Silent catch
        }
      });
    });
    
    fileSize = curr.size;
  });
}

// Generate actual system events as local logs when root permissions are absent
async function generateLocalSystemLogs(io) {
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
  
  let syslogActive = false;
  let authActive = false;

  // 1. Attempt to tail Linux syslog
  try {
    if (fs.existsSync(LOG_PATHS.syslog)) {
      // Test read access
      fs.accessSync(LOG_PATHS.syslog, fs.constants.R_OK);
      tailFile(LOG_PATHS.syslog, 'Syslog', io);
      syslogActive = true;
      console.log('[SIEM] Successfully tailing Linux /var/log/syslog.');
    }
  } catch (e) {
    console.warn('[SIEM] EACCES: System syslog access denied. Falling back to local tailing.');
  }

  // 2. Attempt to tail Linux auth.log
  try {
    if (fs.existsSync(LOG_PATHS.auth)) {
      fs.accessSync(LOG_PATHS.auth, fs.constants.R_OK);
      tailFile(LOG_PATHS.auth, 'AuthLog', io);
      authActive = true;
      console.log('[SIEM] Successfully tailing Linux /var/log/auth.log.');
    }
  } catch (e) {
    // Auth access denied
  }

  // 3. Setup fallback local file tailer
  tailFile(localLogPath, 'ZENTRIX-Daemon', io);

  // Poll system information and write actual system activities to fallback log every 3 seconds
  if (tailInterval) clearInterval(tailInterval);
  tailInterval = setInterval(() => generateLocalSystemLogs(io), 3000);
}

module.exports = {
  init
};
