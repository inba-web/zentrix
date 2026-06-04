const db = require('../db');

let activeScans = new Map();

function init(io) {
  global.io = io;
}

// Highly realistic Nmap/Zenmap scan simulation
async function runScan(scanId, target, profile, io) {
  const steps = [
    { progress: 10, log: `[NMAP] Initiating ARP Ping Scan at ${new Date().toLocaleTimeString()}` },
    { progress: 20, log: `[NMAP] Scanning ${target} [1 host]` },
    { progress: 35, log: `[NMAP] Completed ARP Ping Scan - Host Detected (Latency 0.00034s)` },
    { progress: 50, log: `[NMAP] Initiating Parallel DNS resolution of 1 IP address.` },
    { progress: 65, log: `[NMAP] Initiating SYN Stealth Scan against common ports.` },
    { progress: 80, log: `[NMAP] Completed SYN Stealth Scan - Found open ports.` },
    { progress: 90, log: `[NMAP] Initiating Service/Version Detection & OS fingerprinting.` },
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    
    if (!activeScans.has(scanId)) return; // Scan was cancelled
    
    io.emit('scan_progress', {
      scanId,
      progress: step.progress,
      log: step.log
    });
  }

  // Generate Scan Results based on profile
  const hosts = [
    {
      host: target === '127.0.0.1' || target === 'localhost' ? 'localhost' : 'target-host-01',
      ip: target,
      mac: '00:50:56:C0:00:08',
      os: profile === 'Aggressive Scan' ? 'Linux 5.4 - 5.15 (Ubuntu 22.04)' : 'Linux 5.X',
      status: 'Up',
      latency: '0.00034s'
    }
  ];

  let ports = [
    { port: '22/tcp', state: 'open', service: 'ssh', version: 'OpenSSH 8.2p1 Ubuntu' },
    { port: '80/tcp', state: 'open', service: 'http', version: 'nginx 1.18.0' },
    { port: '443/tcp', state: 'open', service: 'http', version: 'nginx 1.18.0 (SSL)' }
  ];

  if (profile === 'Full Scan' || profile === 'Aggressive Scan') {
    ports.push(
      { port: '3000/tcp', state: 'open', service: 'http', version: 'Node.js Express' },
      { port: '5000/tcp', state: 'open', service: 'http', version: 'Node.js Express (ZENTRIX Core)' }
    );
  }

  if (profile === 'Aggressive Scan') {
    ports.push(
      { port: '21/tcp', state: 'closed', service: 'ftp', version: 'vsftpd' },
      { port: '3306/tcp', state: 'filtered', service: 'mysql', version: 'MySQL' }
    );
  }

  const finalLogs = [
    `[NMAP] Host ${target} appears to be up.`,
    `[NMAP] Scanned ports: ${ports.length} ports showing open or filtered states.`,
    `[NMAP] OS fingerprint: ${hosts[0].os}`,
    `[NMAP] Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel`
  ];

  io.emit('scan_complete', {
    scanId,
    hosts,
    ports,
    logs: finalLogs
  });

  // Save audit log
  await db.auditLogs.create({
    timestamp: new Date(),
    user: 'System Scanner',
    action: 'Network Scan Executed',
    details: `Nmap scan completed for target ${target} using profile ${profile}.`,
    ip: '127.0.0.1'
  });

  activeScans.delete(scanId);
}

module.exports = {
  init,
  startScan(target, profile) {
    const scanId = Math.random().toString(36).substring(2, 9);
    activeScans.set(scanId, { target, profile });
    
    // Run scan in background
    runScan(scanId, target, profile, global.io);
    
    return scanId;
  },
  cancelScan(scanId) {
    if (activeScans.has(scanId)) {
      activeScans.delete(scanId);
      return true;
    }
    return false;
  }
};
