const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { PLATFORM } = require('../utils/platform');
const db = require('../db');
const { authenticateToken } = require('./auth');

// 20 Built-in Threat Hunting Preset Techniques
const PRESETS = {
  1: {
    id: 1,
    name: 'High-CPU Processes',
    description: 'Queries active processes consuming the highest CPU bandwidth to detect miners or rogue agents.',
    mitre: 'Resource Hijacking (T1496)',
    linux: 'ps aux --sort=-%cpu | head -20',
    windows: 'Get-Process | Sort CPU -Desc | Select -First 20 | Format-Table'
  },
  2: {
    id: 2,
    name: 'Listening Network Ports',
    description: 'Checks active TCP/UDP ports listening for remote incoming socket connections.',
    mitre: 'Remote Services (T1021)',
    linux: 'ss -tulnp',
    windows: 'netstat -ano | findstr LISTENING'
  },
  3: {
    id: 3,
    name: 'Established Connections',
    description: 'Audits established outbound or inbound TCP sockets to map command-and-control (C2) servers.',
    mitre: 'Command and Control (T1071)',
    linux: 'ss -tnp state established',
    windows: 'netstat -ano | findstr ESTABLISHED'
  },
  4: {
    id: 4,
    name: 'Scheduled Tasks / Cron',
    description: 'Dumps system crontabs and scheduled tasks configuration to identify active persistence mechanisms.',
    mitre: 'Scheduled Task/Job (T1053)',
    linux: 'crontab -l 2>/dev/null; ls -la /etc/cron* /var/spool/cron/crontabs 2>/dev/null',
    windows: 'schtasks /query /fo LIST /v'
  },
  5: {
    id: 5,
    name: 'Recent Files in /tmp',
    description: 'Scans temporary system directories for file creations modified in the last 2 hours.',
    mitre: 'Defensive Evasion (T1222)',
    linux: 'find /tmp /var/tmp -mmin -120 -type f 2>/dev/null',
    windows: 'Get-ChildItem $env:TEMP -Recurse | Where LastWriteTime -gt (Get-Date).AddHours(-2)'
  },
  6: {
    id: 6,
    name: 'Failed Login Attempts',
    description: 'Checks logs for authentication failures indicative of dictionary or brute-force scanning.',
    mitre: 'Brute Force (T1110)',
    linux: 'grep -i "failed\\|invalid" /var/log/auth.log /var/log/secure 2>/dev/null | tail -30',
    windows: 'Get-WinEvent -Id 4625 -MaxEvents 30 | Format-List TimeCreated,Message'
  },
  7: {
    id: 7,
    name: 'Processes from Temp Dirs',
    description: 'Detects processes executing binaries straight out of temporary storage scopes.',
    mitre: 'Execution (T1204)',
    linux: 'ps aux | grep -E "/tmp|/dev/shm" | grep -v grep',
    windows: 'Get-Process | Where-Object { $_.Path -like "*AppData*Temp*" }'
  },
  8: {
    id: 8,
    name: 'SUID/SGID Binaries',
    description: 'Maps binaries with SUID/SGID execution bits enabled to identify potential privilege escalations.',
    mitre: 'Abuse Elevation Control (T1548)',
    linux: 'find / -perm /6000 -type f 2>/dev/null | head -30',
    windows: 'echo "Not applicable on Windows"'
  },
  9: {
    id: 9,
    name: 'World-Writable Directories',
    description: 'Identifies directories writeable by any local user to locate low-privilege persistence directories.',
    mitre: 'Defensive Evasion (T1222)',
    linux: 'find / -xdev -type d -perm -0002 2>/dev/null | head -20',
    windows: 'icacls C:\\ /findsid * /t 2>nul | head -20'
  },
  10: {
    id: 10,
    name: 'DNS Query Anomalies',
    description: 'Tails resolving services cache and queries to scan for exfiltration queries or domain generation.',
    mitre: 'Exfiltration Over Alternative Protocol (T1048)',
    linux: 'cat /var/log/syslog /var/log/messages 2>/dev/null | grep -i "query\\|NXDOMAIN" | tail -20',
    windows: 'Get-WinEvent -LogName "DNS Client Events" -MaxEvents 20 2>$null | Format-List'
  },
  11: {
    id: 11,
    name: 'Large Outbound Transfers',
    description: 'Analyzes high bandwidth remote endpoints connections to inspect potential data exfiltration.',
    mitre: 'Exfiltration Over C2 Channel (T1041)',
    linux: "ss -tnp | awk '{print $5}' | sort | uniq -c | sort -rn | head -10",
    windows: 'netstat -s | findstr "Bytes Sent"'
  },
  12: {
    id: 12,
    name: 'New User Accounts',
    description: 'Dumps user profiles mapped on system to inspect recently registered system administrators.',
    mitre: 'Create Account (T1136)',
    linux: "awk -F: '($3 >= 1000) {print $1, $3, $7}' /etc/passwd",
    windows: 'Get-LocalUser | Sort LastLogon -Desc | Format-Table Name,Enabled,LastLogon'
  },
  13: {
    id: 13,
    name: 'Firewall / Security Status',
    description: 'Queries active host firewalls and defense filters status configurations.',
    mitre: 'Impair Defenses (T1562)',
    linux: 'systemctl status ufw 2>/dev/null || systemctl status firewalld 2>/dev/null || iptables -L -n',
    windows: 'Get-Service -Name *firewall* | Format-Table Name,Status'
  },
  14: {
    id: 14,
    name: 'PowerShell Execution History',
    description: 'Dumps shell command history to inspect remote downloader (wget/curl) or base64 patterns.',
    mitre: 'Command and Scripting Interpreter (T1059)',
    linux: 'cat ~/.bash_history ~/.zsh_history 2>/dev/null | grep -i "wget\\|curl\\|chmod\\|base64" | tail -20',
    windows: 'Get-Content (Get-PSReadlineOption).HistorySavePath | Select-String "Invoke|IEX|base64" | Select -Last 20'
  },
  15: {
    id: 15,
    name: 'Base64-Encoded Arguments',
    description: 'Scans processes arguments mapping strings matching base64 padding patterns.',
    mitre: 'Obfuscated Files or Information (T1027)',
    linux: 'cat /proc/*/cmdline 2>/dev/null | strings | grep -E "[A-Za-z0-9+/]{50,}={0,2}" | head -10',
    windows: 'Get-WinEvent -LogName Security -Id 4688 -MaxEvents 50 | Where Message -match "base64|EncodedCommand"'
  },
  16: {
    id: 16,
    name: 'Processes with No Disk Path',
    description: 'Locates processes execution hooks where the executing binary was deleted from disk.',
    mitre: 'Defensive Evasion (T1070)',
    linux: 'ls -la /proc/*/exe 2>/dev/null | grep deleted | head -10',
    windows: 'Get-Process | Where-Object { !$_.Path } | Format-Table Id,Name'
  },
  17: {
    id: 17,
    name: 'Autorun / Startup Entries',
    description: 'Checks system configuration files for autostart settings and logon entries.',
    mitre: 'Boot or Logon Autostart Execution (T1547)',
    linux: 'ls -la ~/.config/autostart/ /etc/xdg/autostart/ 2>/dev/null',
    windows: 'Get-CimInstance Win32_StartupCommand | Format-Table Name,Command,Location'
  },
  18: {
    id: 18,
    name: 'Open Files to Sensitive Paths',
    description: 'Uses system handle counters to scan for active files read operations referencing shadow files.',
    mitre: 'OS Credential Dumping (T1003)',
    linux: 'lsof /etc/passwd /etc/shadow /root 2>/dev/null | head -20',
    windows: 'handle64 C:\\Windows\\System32\\config 2>nul | head -20'
  },
  19: {
    id: 19,
    name: 'Network Interface Promiscuity',
    description: 'Queries local network interfaces link status to detect local packet sniffers.',
    mitre: 'Network Sniffing (T1040)',
    linux: 'ip link show | grep -i promisc',
    windows: 'netsh interface show interface | findstr Connected'
  },
  20: {
    id: 20,
    name: 'Active Kernel Modules',
    description: 'Audits currently loaded kernel structures to scan for rootkits or driver backdoors.',
    mitre: 'Rootkit (T1014)',
    linux: 'lsmod | head -20',
    windows: 'Get-Module | Format-Table Name,Version'
  }
};

// GET /api/hunt/presets
router.get('/presets', authenticateToken, (req, res) => {
  res.json(Object.values(PRESETS));
});

// GET /api/hunt/custom
router.get('/custom', authenticateToken, async (req, res) => {
  try {
    const list = await db.huntTechniques.find({});
    res.json(Array.isArray(list) ? list : []);
  } catch (err) {
    res.json([]);
  }
});

// POST /api/hunt/custom
router.post('/custom', authenticateToken, async (req, res) => {
  const { name, description, linux, windows, mitre } = req.body;
  if (!name || !linux) {
    return res.status(400).json({ error: 'Name and Linux command are required.' });
  }

  try {
    const custom = await db.huntTechniques.create({
      name,
      description: description || '',
      linux,
      windows: windows || '',
      mitre: mitre || 'User Custom Audit',
      isCustom: true
    });
    
    // Write audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.name || 'system',
      action: 'Custom Hunt Registered',
      details: `Registered custom hunt technique "${name}" in hunting database.`,
      ip: req.ip || '127.0.0.1'
    });

    res.status(201).json(custom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/hunt/custom/:id
router.delete('/custom/:id', authenticateToken, async (req, res) => {
  try {
    const target = await db.huntTechniques.deleteOne({ _id: req.params.id });
    if (!target) return res.status(404).json({ error: 'Technique not found' });
    
    await db.auditLogs.create({
      timestamp: new Date(),
      user: req.user.name || 'system',
      action: 'Custom Hunt Deleted',
      details: `Deleted custom hunt technique ${req.params.id} from database.`,
      ip: req.ip || '127.0.0.1'
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hunt/run
router.post('/run', authenticateToken, (req, res) => {
  const { techniqueId, isCustom, command } = req.body;
  
  let cmd = '';
  let techniqueName = 'Custom Technique';
  
  if (isCustom) {
    cmd = command;
    techniqueName = req.body.name || 'Custom Technique';
  } else {
    const preset = PRESETS[techniqueId];
    if (!preset) return res.status(404).json({ error: 'Unknown technique' });
    cmd = PLATFORM === 'win32' ? (preset.windows || 'echo "Not supported on Windows"') : preset.linux;
    techniqueName = preset.name;
  }

  if (!cmd || cmd.trim() === '') {
    return res.status(400).json({ error: 'No command defined for execution on this platform.' });
  }

  exec(cmd, { timeout: 15000 }, async (err, stdout, stderr) => {
    // Write audit log
    try {
      await db.auditLogs.create({
        timestamp: new Date(),
        user: req.user.name || 'system',
        action: 'Threat Hunt Executed',
        details: `Ran hunt technique "${techniqueName}" command on platform ${PLATFORM}.`,
        ip: req.ip || '127.0.0.1'
      });
    } catch (e) {}

    res.json({
      technique: techniqueName,
      cmd,
      output: stdout || stderr || err?.message || 'No output',
      ts: new Date().toISOString(),
      exitCode: err ? (err.code || 1) : 0
    });
  });
});

module.exports = router;
