// backend/services/scannerService.js
const { spawn, execSync } = require('child_process');
const { PLATFORM } = require('../utils/platform');
const db = require('../db');

let activeScans = new Map();

function init(io) {
  global.io = io;
}

function checkNmap() {
  try {
    execSync(PLATFORM === 'win32' ? 'where nmap' : 'which nmap', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const SCAN_PROFILES = {
  quick:        ['-T4', '-F'],
  full:         ['-T4', '-p', '1-65535'],
  stealth:      ['-sS', '-T2'],
  aggressive:   ['-A', '-T4'],
  os_detect:    ['-O', '-T4'],
  svc_version:  ['-sV', '-T4'],
  vuln:         ['--script', 'vuln', '-T4'],
};

function startScan(target, profile) {
  const scanId = Math.random().toString(36).substring(2, 9);
  const io = global.io;
  
  if (!checkNmap()) {
    setTimeout(() => {
      io.emit(`scan:error:${scanId}`, { msg: 'nmap not found on this system. Install nmap and try again.' });
    }, 100);
    return scanId;
  }

  const flags = SCAN_PROFILES[profile] || SCAN_PROFILES.quick;
  
  try {
    const proc = spawn('nmap', [...flags, target]);
    activeScans.set(scanId, { target, profile, proc, hosts: [], ports: [], logs: [] });
    
    let buffer = '';
    let currentHost = null;
    const hosts = [];
    const ports = [];
    
    // Parse helper
    const parseLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // 1. Host header match: Nmap scan report for host (IP) or just Nmap scan report for IP
      const hostMatch = trimmed.match(/Nmap scan report for\s+(.+?)(?:\s+\((\d+\.\d+\.\d+\.\d+)\))?$/);
      if (hostMatch) {
        currentHost = {
          host: hostMatch[1],
          ip: hostMatch[2] || hostMatch[1],
          mac: 'N/A',
          os: 'N/A',
          status: 'Up',
          latency: 'N/A'
        };
        hosts.push(currentHost);
        return;
      }

      // 2. Host Up/Down match: Host is up (0.00034s latency)
      const hostStatusMatch = trimmed.match(/Host is\s+(up|down)(?:\s+\((.+?)\))?/);
      if (hostStatusMatch && currentHost) {
        currentHost.status = hostStatusMatch[1] === 'up' ? 'Up' : 'Down';
        if (hostStatusMatch[2] && hostStatusMatch[2].includes('latency')) {
          currentHost.latency = hostStatusMatch[2];
        }
        return;
      }

      // 3. MAC address match
      const macMatch = trimmed.match(/MAC Address:\s+([\w:]+)(?:\s+\((.+?)\))?/);
      if (macMatch && currentHost) {
        currentHost.mac = macMatch[1];
        return;
      }

      // 4. OS detection match
      const osMatch = trimmed.match(/OS details:\s+(.+)$/);
      if (osMatch && currentHost) {
        currentHost.os = osMatch[1];
        return;
      }

      // 5. Port list match: 80/tcp open http nginx
      const portMatch = trimmed.match(/^(\d+)\/(tcp|udp)\s+(open|filtered|closed)\s+(\S+)(?:\s+(.*))?$/);
      if (portMatch) {
        ports.push({
          host: currentHost ? currentHost.ip : target,
          port: `${portMatch[1]}/${portMatch[2]}`,
          state: portMatch[3],
          service: portMatch[4],
          version: portMatch[5] || 'N/A'
        });
      }
    };

    proc.stdout.on('data', chunk => {
      const chunkStr = chunk.toString();
      buffer += chunkStr;
      
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete last line
      
      lines.forEach(line => {
        io.emit(`scan:output:${scanId}`, { line, ts: new Date().toISOString() });
        parseLine(line);
      });
    });

    proc.stderr.on('data', chunk => {
      const chunkStr = chunk.toString();
      io.emit(`scan:output:${scanId}`, { line: `[WARN] ${chunkStr}`, ts: new Date().toISOString() });
    });

    proc.on('close', async (code) => {
      activeScans.delete(scanId);
      
      // Emit results and done
      io.emit(`scan:results:${scanId}`, { hosts, ports });
      io.emit(`scan:done:${scanId}`, { exitCode: code });
      
      // Save audit log
      try {
        await db.auditLogs.create({
          timestamp: new Date(),
          user: 'System Scanner',
          action: 'Network Scan Executed',
          details: `Nmap scan completed with code ${code} for target ${target} using profile ${profile}. Discovered ${hosts.length} hosts and ${ports.length} ports.`,
          ip: '127.0.0.1'
        });
      } catch (err) {
        console.error('[SCANNER] Audit log creation failed:', err.message);
      }
    });
    
  } catch (err) {
    io.emit(`scan:error:${scanId}`, { msg: `Failed to spawn nmap: ${err.message}` });
  }

  return scanId;
}

function cancelScan(scanId) {
  const scan = activeScans.get(scanId);
  if (scan) {
    if (scan.proc) {
      scan.proc.kill();
    }
    activeScans.delete(scanId);
    return true;
  }
  return false;
}

function getActiveScansCount() {
  return activeScans.size;
}

module.exports = {
  init,
  startScan,
  cancelScan,
  getActiveScansCount
};
