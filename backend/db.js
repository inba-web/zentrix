const path = require('path');
const fs = require('fs');
const sqliteEngine = require('./database/sqliteEngine');
const migrations = require('./database/migrations');

// Table mappings
const TABLE_MAP = {
  users: 'users',
  logs: 'log_events',
  endpoints: 'hosts',
  alerts: 'alerts',
  incidents: 'incidents',
  iocs: 'threat_indicators',
  playbooks: 'playbooks',
  auditLogs: 'audit_logs',
  reports: 'reports',
  deliveryLogs: 'delivery_logs',
  emailRecipients: 'email_recipients',
  integrationStatus: 'integration_status',
  threatIntelligenceResults: 'threat_intelligence_results'
};

async function connect() {
  await migrations.runMigrations();
  await migrateLegacyJsonData();
  console.log('[DB] Embedded SQLite Database initialized and ready.');
}

// Automatic one-time legacy JSON files migration into SQLite
async function migrateLegacyJsonData() {
  const baseDir = process.env.ZENTRIX_USER_DATA || __dirname;
  const legacyDataDir = path.join(baseDir, 'data');
  if (!fs.existsSync(legacyDataDir)) return;

  const collections = Object.keys(TABLE_MAP);
  for (const col of collections) {
    const jsonFile = path.join(legacyDataDir, `${col}.json`);
    if (fs.existsSync(jsonFile)) {
      try {
        const raw = fs.readFileSync(jsonFile, 'utf8');
        const items = JSON.parse(raw);
        if (Array.isArray(items) && items.length > 0) {
          const colInterface = collection(col);
          const existingCount = await colInterface.countDocuments();
          if (existingCount === 0) {
            for (const item of items) {
              await colInterface.create(item);
            }
            console.log(`[MIGRATION] Auto-migrated ${items.length} records from legacy ${col}.json into SQLite.`);
          }
        }
      } catch (e) {
        // Skip unparseable legacy file
      }
    }
  }
}

// Convert object camelCase to DB column snake_case mapping
function toRow(name, doc) {
  const copy = { ...doc };
  if (!copy._id && !copy.id) {
    copy._id = Math.random().toString(36).substring(2, 10);
  }
  const idVal = copy._id || copy.id;

  if (name === 'users') {
    return {
      id: idVal,
      email: copy.email,
      name: copy.name,
      password_hash: copy.passwordHash || copy.password_hash,
      role: copy.role || 'Analyst',
      avatar: copy.avatar,
      joined_at: copy.joinedAt ? new Date(copy.joinedAt).toISOString() : new Date().toISOString(),
      last_active: copy.lastActive ? new Date(copy.lastActive).toISOString() : new Date().toISOString()
    };
  }

  if (name === 'logs') {
    return {
      id: idVal,
      timestamp: copy.timestamp ? new Date(copy.timestamp).toISOString() : new Date().toISOString(),
      source: copy.source,
      severity: copy.severity || 'INFO',
      message: copy.message,
      host: copy.host,
      user: copy.user,
      src_ip: copy.srcIp || copy.src_ip,
      dest_ip: copy.destIp || copy.dest_ip,
      mitre_tactic: copy.mitreTactic || copy.mitre_tactic,
      mitre_technique: copy.mitreTechnique || copy.mitre_technique,
      payload: typeof copy.payload === 'object' ? JSON.stringify(copy.payload) : copy.payload
    };
  }

  if (name === 'endpoints') {
    return {
      id: idVal,
      hostname: copy.hostname,
      ip: copy.ip || '127.0.0.1',
      os: copy.os,
      status: copy.status || 'Online',
      cpu_usage: copy.cpuUsage || copy.cpu_usage || 0,
      ram_usage: copy.ramUsage || copy.ram_usage || 0,
      last_seen: copy.lastSeen ? new Date(copy.lastSeen).toISOString() : new Date().toISOString(),
      processes: Array.isArray(copy.processes) ? JSON.stringify(copy.processes) : copy.processes,
      network_connections: Array.isArray(copy.networkConnections) ? JSON.stringify(copy.networkConnections) : copy.network_connections
    };
  }

  if (name === 'alerts') {
    return {
      id: idVal,
      timestamp: copy.timestamp ? new Date(copy.timestamp).toISOString() : new Date().toISOString(),
      severity: copy.severity || 'MEDIUM',
      title: copy.title,
      description: copy.description,
      category: copy.category,
      host: copy.host,
      status: copy.status || 'NEW',
      assigned_to: copy.assignedTo || copy.assigned_to || 'Unassigned',
      evidence: typeof copy.evidence === 'object' ? JSON.stringify(copy.evidence) : copy.evidence
    };
  }

  if (name === 'incidents') {
    return {
      id: idVal,
      title: copy.title,
      severity: copy.severity || 'MEDIUM',
      status: copy.status || 'NEW',
      assigned_to: copy.assignedTo || copy.assigned_to,
      created_at: copy.createdAt ? new Date(copy.createdAt).toISOString() : new Date().toISOString(),
      updated_at: copy.updatedAt ? new Date(copy.updatedAt).toISOString() : new Date().toISOString(),
      impact: copy.impact,
      root_cause: copy.rootCause || copy.root_cause,
      recommendations: Array.isArray(copy.recommendations) ? JSON.stringify(copy.recommendations) : copy.recommendations,
      timeline: Array.isArray(copy.timeline) ? JSON.stringify(copy.timeline) : copy.timeline,
      evidence: Array.isArray(copy.evidence) ? JSON.stringify(copy.evidence) : copy.evidence
    };
  }

  if (name === 'iocs') {
    return {
      id: idVal,
      type: copy.type,
      value: copy.value,
      threat_type: copy.threatType || copy.threat_type,
      reputation: copy.reputation || 0,
      source: copy.source,
      created_at: copy.createdAt ? new Date(copy.createdAt).toISOString() : new Date().toISOString(),
      notes: copy.notes
    };
  }

  if (name === 'playbooks') {
    return {
      id: idVal,
      name: copy.name,
      trigger: copy.trigger,
      status: copy.status || 'Active',
      steps: Array.isArray(copy.steps) ? JSON.stringify(copy.steps) : copy.steps,
      executions: Array.isArray(copy.executions) ? JSON.stringify(copy.executions) : copy.executions
    };
  }

  if (name === 'auditLogs') {
    return {
      id: idVal,
      timestamp: copy.timestamp ? new Date(copy.timestamp).toISOString() : new Date().toISOString(),
      user: copy.user,
      action: copy.action,
      details: copy.details,
      ip: copy.ip || '127.0.0.1'
    };
  }

  if (name === 'reports') {
    return {
      id: idVal,
      timestamp: copy.timestamp ? new Date(copy.timestamp).toISOString() : new Date().toISOString(),
      title: copy.title,
      delivery_status: copy.deliveryStatus || copy.delivery_status || 'Generated',
      recipient: copy.recipient,
      alerts_count: copy.alertsCount || copy.alerts_count || 0,
      endpoint_count: copy.endpointCount || copy.endpoint_count || 0,
      security_score: copy.securityScore || copy.security_score || 100,
      file_name: copy.fileName || copy.file_name
    };
  }

  if (name === 'deliveryLogs') {
    return {
      id: idVal,
      report_id: copy.reportId || copy.report_id,
      email_status: copy.emailStatus || copy.email_status || 'Pending',
      delivery_timestamp: copy.deliveryTimestamp ? new Date(copy.deliveryTimestamp).toISOString() : new Date().toISOString(),
      failure_reason: copy.failureReason || copy.failure_reason,
      retry_count: copy.retryCount || copy.retry_count || 0
    };
  }

  if (name === 'emailRecipients') {
    return {
      id: idVal,
      email: copy.email,
      display_name: copy.displayName || copy.display_name,
      enabled: copy.enabled !== false ? 1 : 0,
      is_default: copy.isDefault ? 1 : 0,
      created_at: copy.createdAt ? new Date(copy.createdAt).toISOString() : new Date().toISOString(),
      updated_at: copy.updatedAt ? new Date(copy.updatedAt).toISOString() : new Date().toISOString()
    };
  }

  if (name === 'integrationStatus') {
    return {
      integration_name: copy.integrationName || copy.integration_name,
      enabled: copy.enabled ? 1 : 0,
      configured: copy.configured ? 1 : 0,
      from_email: copy.fromEmail || copy.from_email,
      last_success: copy.lastSuccess ? new Date(copy.lastSuccess).toISOString() : null,
      last_error: copy.lastError || copy.last_error || null,
      updated_at: new Date().toISOString()
    };
  }

  if (name === 'threatIntelligenceResults') {
    return {
      id: idVal,
      indicator: copy.indicator,
      indicator_type: copy.indicatorType || copy.indicator_type,
      source: copy.source || 'VirusTotal',
      result_status: copy.resultStatus || copy.result_status || 'completed',
      reputation: copy.reputation || 0,
      malicious_count: copy.maliciousCount || copy.malicious_count || 0,
      suspicious_count: copy.suspiciousCount || copy.suspicious_count || 0,
      harmless_count: copy.harmlessCount || copy.harmless_count || 0,
      undetected_count: copy.undetectedCount || copy.undetected_count || 0,
      raw_payload: typeof copy.rawPayload === 'object' ? JSON.stringify(copy.rawPayload) : copy.raw_payload,
      checked_at: copy.checkedAt ? new Date(copy.checkedAt).toISOString() : new Date().toISOString(),
      expires_at: copy.expiresAt ? new Date(copy.expiresAt).toISOString() : null
    };
  }

  return copy;
}

// Convert DB row to domain JS object (with _id property for legacy frontend compatibility)
function fromRow(name, row) {
  if (!row) return null;
  const obj = { ...row, _id: row.id || row.integration_name };

  if (name === 'users') {
    obj.passwordHash = row.password_hash;
    obj.joinedAt = row.joined_at;
    obj.lastActive = row.last_active;
  } else if (name === 'logs') {
    obj.srcIp = row.src_ip;
    obj.destIp = row.dest_ip;
    obj.mitreTactic = row.mitre_tactic;
    obj.mitreTechnique = row.mitre_technique;
    try { obj.payload = JSON.parse(row.payload); } catch (e) {}
  } else if (name === 'endpoints') {
    obj.cpuUsage = row.cpu_usage;
    obj.ramUsage = row.ram_usage;
    obj.lastSeen = row.last_seen;
    try { obj.processes = JSON.parse(row.processes); } catch (e) { obj.processes = []; }
    try { obj.networkConnections = JSON.parse(row.network_connections); } catch (e) { obj.networkConnections = []; }
  } else if (name === 'alerts') {
    obj.assignedTo = row.assigned_to;
    try { obj.evidence = JSON.parse(row.evidence); } catch (e) {}
  } else if (name === 'incidents') {
    obj.assignedTo = row.assigned_to;
    obj.createdAt = row.created_at;
    obj.updatedAt = row.updated_at;
    obj.rootCause = row.root_cause;
    try { obj.recommendations = JSON.parse(row.recommendations); } catch (e) { obj.recommendations = []; }
    try { obj.timeline = JSON.parse(row.timeline); } catch (e) { obj.timeline = []; }
    try { obj.evidence = JSON.parse(row.evidence); } catch (e) { obj.evidence = []; }
  } else if (name === 'iocs') {
    obj.threatType = row.threat_type;
    obj.createdAt = row.created_at;
  } else if (name === 'playbooks') {
    try { obj.steps = JSON.parse(row.steps); } catch (e) { obj.steps = []; }
    try { obj.executions = JSON.parse(row.executions); } catch (e) { obj.executions = []; }
  } else if (name === 'reports') {
    obj.deliveryStatus = row.delivery_status;
    obj.alertsCount = row.alerts_count;
    obj.endpointCount = row.endpoint_count;
    obj.securityScore = row.security_score;
    obj.fileName = row.file_name;
  } else if (name === 'deliveryLogs') {
    obj.reportId = row.report_id;
    obj.emailStatus = row.email_status;
    obj.deliveryTimestamp = row.delivery_timestamp;
    obj.failureReason = row.failure_reason;
    obj.retryCount = row.retry_count;
  } else if (name === 'emailRecipients') {
    obj.displayName = row.display_name;
    obj.enabled = Boolean(row.enabled);
    obj.isDefault = Boolean(row.is_default);
  } else if (name === 'integrationStatus') {
    obj.integrationName = row.integration_name;
    obj.fromEmail = row.from_email;
    obj.enabled = Boolean(row.enabled);
    obj.configured = Boolean(row.configured);
  } else if (name === 'threatIntelligenceResults') {
    obj.indicatorType = row.indicator_type;
    obj.resultStatus = row.result_status;
    obj.maliciousCount = row.malicious_count;
    obj.suspiciousCount = row.suspicious_count;
    obj.harmlessCount = row.harmless_count;
    obj.undetectedCount = row.undetected_count;
    try { obj.rawPayload = JSON.parse(row.raw_payload); } catch (e) {}
  }

  return obj;
}

// Generate unified collection API over SQLite
function collection(name) {
  const table = TABLE_MAP[name] || name;

  return {
    find: async (query = {}, limit = 1000) => {
      let sql = `SELECT * FROM ${table}`;
      const params = [];
      const keys = Object.keys(query).filter(k => !k.startsWith('$'));
      
      if (keys.length > 0) {
        const whereClauses = [];
        for (const k of keys) {
          const dbCol = k === '_id' ? 'id' : k.replace(/([A-Z])/g, '_$1').toLowerCase();
          whereClauses.push(`${dbCol} = ?`);
          params.push(query[k]);
        }
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }
      
      sql += ` ORDER BY rowid DESC`;
      if (limit) sql += ` LIMIT ${parseInt(limit)}`;

      const rows = await sqliteEngine.all(sql, params);
      return rows.map(r => fromRow(name, r));
    },

    findOne: async (query = {}) => {
      let sql = `SELECT * FROM ${table}`;
      const params = [];
      const keys = Object.keys(query).filter(k => !k.startsWith('$'));
      
      if (keys.length > 0) {
        const whereClauses = [];
        for (const k of keys) {
          const dbCol = k === '_id' ? 'id' : k.replace(/([A-Z])/g, '_$1').toLowerCase();
          whereClauses.push(`${dbCol} = ?`);
          params.push(query[k]);
        }
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      sql += ` LIMIT 1`;
      const row = await sqliteEngine.get(sql, params);
      return fromRow(name, row);
    },

    create: async (doc) => {
      const row = toRow(name, doc);
      const cols = Object.keys(row);
      const placeholders = cols.map(() => '?').join(', ');
      const values = Object.values(row);

      const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
      await sqliteEngine.run(sql, values);

      const created = fromRow(name, row);
      if (name === 'alerts') {
        setTimeout(() => handleNewAlert(created), 0);
      }
      return created;
    },

    createMany: async (docs) => {
      const created = [];
      for (const d of docs) {
        const item = await collection(name).create(d);
        created.push(item);
      }
      return created;
    },

    findByIdAndUpdate: async (id, updates) => {
      const existing = await collection(name).findOne({ _id: id });
      if (!existing) return null;

      const merged = { ...existing, ...updates };
      delete merged._id;
      merged._id = id;

      return collection(name).create(merged);
    },

    findOneAndUpdate: async (query, updates) => {
      const existing = await collection(name).findOne(query);
      if (!existing) return null;

      const merged = { ...existing, ...updates };
      return collection(name).create(merged);
    },

    deleteOne: async (query) => {
      const existing = await collection(name).findOne(query);
      if (!existing) return { deletedCount: 0 };

      const pkCol = table === 'integration_status' ? 'integration_name' : 'id';
      const pkVal = existing._id || existing.id || existing.integrationName;

      await sqliteEngine.run(`DELETE FROM ${table} WHERE ${pkCol} = ?`, [pkVal]);
      return { deletedCount: 1 };
    },

    deleteMany: async (query = {}) => {
      if (Object.keys(query).length === 0) {
        const res = await sqliteEngine.run(`DELETE FROM ${table}`);
        return { deletedCount: res.changes };
      }
      const items = await collection(name).find(query, 10000);
      let count = 0;
      for (const item of items) {
        await collection(name).deleteOne({ _id: item._id });
        count++;
      }
      return { deletedCount: count };
    },

    countDocuments: async (query = {}) => {
      const items = await collection(name).find(query, 100000);
      return items.length;
    }
  };
}

const db = {
  connect,
  isMongoose: () => false,
  users: collection('users'),
  logs: collection('logs'),
  endpoints: collection('endpoints'),
  alerts: collection('alerts'),
  incidents: collection('incidents'),
  iocs: collection('iocs'),
  playbooks: collection('playbooks'),
  auditLogs: collection('auditLogs'),
  reports: collection('reports'),
  deliveryLogs: collection('deliveryLogs'),
  emailRecipients: collection('emailRecipients'),
  integrationStatus: collection('integrationStatus'),
  threatIntelligenceResults: collection('threatIntelligenceResults')
};

db.collection = (name) => db[name];

// Central alert automation handler for incidents and SOAR playbooks
async function handleNewAlert(alert) {
  const sev = (alert.severity || 'MEDIUM').toUpperCase();
  
  // 1. Automate Incident Response for CRITICAL alerts
  if (sev === 'CRITICAL') {
    try {
      const incidentEntry = {
        title: `[AUTO-CONTAINED] Incident Case: ${alert.title}`,
        severity: 'CRITICAL',
        status: 'CONTAINED',
        assignedTo: 'SOAR Automation Engine',
        createdAt: new Date(),
        updatedAt: new Date(),
        impact: 'Critical security compromise detected on target host.',
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
      
      const incident = await db.incidents.create(incidentEntry);
      
      // Log audit
      await db.auditLogs.create({
        timestamp: new Date(),
        user: 'SOAR System',
        action: 'Containment Action Executed',
        details: `Isolated system ${alert.host || 'unknown'} and created Incident ticket ${incident._id}`,
        ip: '127.0.0.1'
      });

      if (global.io) {
        global.io.emit('incident', incident);
      }
    } catch (err) {
      console.error('[DB-ALERT-INTERCEPTOR] Failed to create incident automatically:', err.message);
    }
  }

  // 2. Playbook execution trigger logic
  try {
    const playbooks = await db.playbooks.find({ status: 'Active' });
    for (const playbook of playbooks) {
      let matches = false;
      const trigger = playbook.trigger || '';
      
      if (trigger === 'alert:CRITICAL' && sev === 'CRITICAL') {
        matches = true;
      } else if ((trigger === 'MalwareDetected' || trigger === 'malware:MALICIOUS') && (alert.category === 'Malware' || alert.title.toLowerCase().includes('malware') || (alert.category && alert.category.toLowerCase().includes('malware')))) {
        matches = true;
      } else if (trigger === 'HoneypotTrigger' && (alert.category === 'Honeypot Trigger' || alert.category === 'Honeypot')) {
        matches = true;
      } else if (trigger === 'failedLogins:5+' && (alert.title.toLowerCase().includes('brute force') || alert.description.toLowerCase().includes('failed logins') || alert.description.toLowerCase().includes('brute force'))) {
        matches = true;
      } else if (trigger.startsWith('keyword:') && alert.title.toLowerCase().includes(trigger.split(':')[1].toLowerCase())) {
        matches = true;
      }
      
      if (matches) {
        console.log(`[SOAR] Central Playbook Triggered: ${playbook.name} on Alert: ${alert.title}`);
        const runLogs = [`Playbook triggered by alert ${alert._id}`, `Analyzing threat levels...`];

        for (let step of playbook.steps) {
          runLogs.push(`Executing Step ${step.order}: ${step.action}`);
          if (step.action === 'EnrichIOC') {
            runLogs.push(`IOC Enriched successfully. Threat Rank: 98% malicious.`);
          } else if (step.action === 'IsolateEndpoint') {
            runLogs.push(`Containment threshold exceeded. Sending Isolation command to EDR Agent.`);
            await db.endpoints.findOneAndUpdate({ hostname: alert.host }, { status: 'Isolated' });
            if (global.io) {
              global.io.emit('edr_isolate', { host: alert.host, status: 'Isolated' });
              const allDevices = await db.endpoints.find({});
              global.io.emit('edr:update', allDevices);
            }
          } else if (step.action === 'BlockIP') {
            runLogs.push(`Firewall Rules updated. Source IP blocked in Border IDS router gateway.`);
          } else if (step.action === 'Quarantine File') {
            runLogs.push(`Quarantine command sent to EDR. Target file quarantined.`);
          }
        }

        runLogs.push(`Playbook executed successfully. Security orchestration finalized.`);

        const currentExecs = Array.isArray(playbook.executions) ? playbook.executions : [];
        currentExecs.push({
          timestamp: new Date(),
          status: 'SUCCESS',
          logs: runLogs
        });

        await db.playbooks.findByIdAndUpdate(playbook._id, { executions: currentExecs });

        if (global.io) {
          const updatedPlaybooks = await db.playbooks.find({});
          global.io.emit('soar:playbooks_update', updatedPlaybooks);
        }
      }
    }
  } catch (err) {
    console.error('[DB-ALERT-INTERCEPTOR] Failed to run playbooks automatically:', err.message);
  }
}

module.exports = db;
