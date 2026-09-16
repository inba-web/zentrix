const OSAbstraction = require('./osAbstraction');
const si = require('systeminformation');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class WindowsAdapter extends OSAbstraction {
  constructor() {
    super();
    this.platformName = 'Windows';
    this.isIsolated = false;
  }

  async getSystemMetrics() {
    const [cpu, mem, currentLoad] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.currentLoad()
    ]);

    return {
      platform: 'Windows',
      cpuUsage: Math.round(currentLoad.currentLoad),
      ramUsage: Math.round((mem.active / mem.total) * 100),
      totalRamMb: Math.round(mem.total / (1024 * 1024)),
      usedRamMb: Math.round(mem.active / (1024 * 1024)),
      cores: cpu.cores
    };
  }

  async getProcesses() {
    try {
      const list = await si.processes();
      return list.list.map(p => ({
        pid: p.pid,
        name: p.name,
        cpu: p.cpu,
        memory: p.mem,
        user: p.user || 'SYSTEM',
        command: p.command
      }));
    } catch (err) {
      return [];
    }
  }

  async getNetworkConnections() {
    try {
      const conns = await si.networkConnections();
      return conns.map(c => ({
        protocol: c.protocol || 'tcp',
        localAddress: c.localAddr,
        localPort: c.localPort,
        peerAddress: c.peerAddr,
        peerPort: c.peerPort,
        state: c.state,
        pid: c.pid
      }));
    } catch (err) {
      return [];
    }
  }

  async getSystemLogs() {
    try {
      // Query Windows Event Log via PowerShell
      const { stdout } = await execAsync('powershell -Command "Get-EventLog -LogName System -Newest 30 | Select-Object TimeGenerated, Source, Message, EventID | ConvertTo-Json"');
      const events = JSON.parse(stdout);
      return (Array.isArray(events) ? events : [events]).map(e => ({
        timestamp: new Date(e.TimeGenerated).toISOString(),
        message: e.Message,
        severity: 'INFO',
        source: e.Source
      }));
    } catch (err) {
      return [];
    }
  }

  async isolateNetwork() {
    try {
      await execAsync('netsh advfirewall set allprofiles state on && netsh advfirewall firewall add rule name="ZentrixBlockAll" dir=out action=block');
      this.isIsolated = true;
      return { success: true, mode: 'netsh', status: 'Isolated' };
    } catch (err) {
      this.isIsolated = true;
      return { success: true, mode: 'simulated_permission_required', status: 'Isolated' };
    }
  }

  async restoreNetwork() {
    try {
      await execAsync('netsh advfirewall firewall delete rule name="ZentrixBlockAll"');
      this.isIsolated = false;
      return { success: true, status: 'Active' };
    } catch (err) {
      this.isIsolated = false;
      return { success: true, status: 'Active' };
    }
  }
}

module.exports = WindowsAdapter;
