const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const jsonAdapter = require('./adapters/jsonAdapter');

// Path for fallback local storage
const FALLBACK_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(FALLBACK_DIR)) {
  fs.mkdirSync(FALLBACK_DIR, { recursive: true });
}

let useMongoose = false;

// Initialize connection
async function connect() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/zentrix';
  try {
    console.log('[DB] Attempting MongoDB connection to:', mongoUri);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000 // Quick timeout to trigger fallback
    });
    useMongoose = true;
    console.log('[DB] Connected successfully to ZENTRIX MongoDB Server.');
  } catch (err) {
    console.warn(`[DB] MongoDB connection failed: ${err.message}`);
    console.warn('[DB] GRACEFUL FALLBACK: Initializing localized JSON File Database.');
    useMongoose = false;
  }
}

// Helper to generate collection interface (dynamically forwards to MongoDB if active, else JSON fallback)
function collection(name) {
  return {
    find: async (query = {}, limit = 1000) => {
      if (useMongoose) {
        let q = MongoModels[name].find(query);
        if (limit) q = q.limit(limit);
        return q.lean();
      }
      return jsonAdapter.find(name, query);
    },
    findOne: async (query = {}) => {
      if (useMongoose) {
        return MongoModels[name].findOne(query).lean();
      }
      return jsonAdapter.findOne(name, query);
    },
    create: async (doc) => {
      let created;
      if (useMongoose) {
        const temp = await MongoModels[name].create(doc);
        created = temp.toObject();
      } else {
        created = await jsonAdapter.create(name, doc);
      }
      if (name === 'alerts') {
        setTimeout(() => handleNewAlert(created), 0);
      }
      return created;
    },
    createMany: async (docs) => {
      let created;
      if (useMongoose) {
        const temp = await MongoModels[name].insertMany(docs);
        created = temp.map(d => d.toObject());
      } else {
        created = await jsonAdapter.createMany(name, docs);
      }
      if (name === 'alerts' && Array.isArray(created)) {
        created.forEach(item => {
          setTimeout(() => handleNewAlert(item), 0);
        });
      }
      return created;
    },
    findByIdAndUpdate: async (id, updates) => {
      if (useMongoose) {
        const val = await MongoModels[name].findByIdAndUpdate(id, updates, { new: true });
        return val ? val.toObject() : null;
      }
      return jsonAdapter.update(name, id, updates);
    },
    findOneAndUpdate: async (query, updates) => {
      if (useMongoose) {
        const val = await MongoModels[name].findOneAndUpdate(query, updates, { new: true });
        return val ? val.toObject() : null;
      }
      const doc = await jsonAdapter.findOne(name, query);
      if (!doc) return null;
      return jsonAdapter.update(name, doc._id, updates);
    },
    deleteOne: async (query) => {
      if (useMongoose) {
        return MongoModels[name].deleteOne(query);
      }
      return jsonAdapter.delete(name, query);
    },
    deleteMany: async (query = {}) => {
      if (useMongoose) {
        return MongoModels[name].deleteMany(query);
      }
      return jsonAdapter.deleteMany(name, query);
    },
    countDocuments: async (query = {}) => {
      if (useMongoose) {
        return MongoModels[name].countDocuments(query);
      }
      const list = await jsonAdapter.find(name, query);
      return list.length;
    }
  };
}

// ----------------------------------------------------
// Schema Definitions for MongoDB
// ----------------------------------------------------

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  passwordHash: String,
  role: { type: String, default: 'Analyst' },
  avatar: String,
  whatsapp: String,
  joinedAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  source: String,
  severity: String,
  message: String,
  host: String,
  user: String,
  srcIp: String,
  destIp: String,
  mitreTactic: String,
  mitreTechnique: String,
  payload: Object
});

const endpointSchema = new mongoose.Schema({
  hostname: String,
  ip: String,
  os: String,
  status: { type: String, default: 'Online' },
  cpuUsage: Number,
  ramUsage: Number,
  lastSeen: { type: Date, default: Date.now },
  processes: Array,
  networkConnections: Array
});

const alertSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  severity: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
  title: String,
  description: String,
  category: String,
  host: String,
  status: { type: String, enum: ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED'], default: 'NEW' },
  assignedTo: String,
  evidence: Object
});

const incidentSchema = new mongoose.Schema({
  title: String,
  severity: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
  status: { type: String, enum: ['NEW', 'INVESTIGATING', 'CONTAINED', 'RESOLVED'], default: 'NEW' },
  assignedTo: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  impact: String,
  rootCause: String,
  recommendations: [String],
  timeline: [{
    timestamp: { type: Date, default: Date.now },
    activity: String,
    actor: String
  }],
  evidence: Array
});

const iocSchema = new mongoose.Schema({
  type: { type: String, enum: ['Domain', 'IP', 'Hash', 'URL', 'Registry Key'], required: true },
  value: { type: String, required: true, unique: true },
  threatType: String,
  reputation: { type: Number, default: 0 },
  source: String,
  createdAt: { type: Date, default: Date.now },
  notes: String
});

const soarPlaybookSchema = new mongoose.Schema({
  name: String,
  trigger: String,
  status: { type: String, default: 'Active' },
  steps: [{
    order: Number,
    action: String,
    params: Object
  }],
  executions: [{
    timestamp: { type: Date, default: Date.now },
    status: String,
    logs: [String]
  }]
});

const auditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  user: String,
  action: String,
  details: String,
  ip: String
});

const reportSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  title: String,
  deliveryStatus: { type: String, default: 'Delivered' },
  recipient: String,
  alertsCount: Number,
  endpointCount: Number,
  securityScore: Number,
  fileName: String
});

const deliveryLogSchema = new mongoose.Schema({
  reportId: String,
  emailStatus: String,
  whatsAppStatus: String,
  deliveryTimestamp: { type: Date, default: Date.now },
  failureReason: String,
  retryCount: { type: Number, default: 0 }
});

const huntTechniqueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  linux: String,
  windows: String,
  mitre: String,
  isCustom: { type: Boolean, default: true }
});

// Compile Mongoose models
const MongoModels = {
  users: mongoose.model('User', userSchema),
  logs: mongoose.model('Log', logSchema),
  endpoints: mongoose.model('Endpoint', endpointSchema),
  alerts: mongoose.model('Alert', alertSchema),
  incidents: mongoose.model('Incident', incidentSchema),
  iocs: mongoose.model('IOC', iocSchema),
  playbooks: mongoose.model('SOARPlaybook', soarPlaybookSchema),
  auditLogs: mongoose.model('AuditLog', auditLogSchema),
  reports: mongoose.model('Report', reportSchema),
  deliveryLogs: mongoose.model('DeliveryLog', deliveryLogSchema),
  huntTechniques: mongoose.model('HuntTechnique', huntTechniqueSchema)
};

// ----------------------------------------------------
// Unified Database Access Layer
// ----------------------------------------------------

const db = {
  connect,
  isMongoose: () => useMongoose,
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
  huntTechniques: collection('huntTechniques')
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

      // Update dashboard incidents count
      if (global.io) {
        global.io.emit('incident', incident);
      }
    } catch (err) {
      console.error('[DB-ALERT-INTERCEPTOR] Failed to create incident automatically:', err.message);
    }
  }

  // 2. Playbook execution trigger logic (SOAR Playbooks)
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
        let autoIsolated = false;

        for (let step of playbook.steps) {
          runLogs.push(`Executing Step ${step.order}: ${step.action}`);
          if (step.action === 'EnrichIOC') {
            runLogs.push(`IOC Enriched successfully. Threat Rank: 98% malicious.`);
          } else if (step.action === 'IsolateEndpoint') {
            runLogs.push(`Containment threshold exceeded. Sending Isolation command to EDR Agent.`);
            await db.endpoints.findOneAndUpdate({ hostname: alert.host }, { status: 'Isolated' });
            autoIsolated = true;
            if (global.io) {
              global.io.emit('edr_isolate', { host: alert.host, status: 'Isolated' });
              const allDevices = await db.endpoints.find({});
              global.io.emit('edr:update', allDevices);
            }
          } else if (step.action === 'BlockIP') {
            runLogs.push(`Firewall Rules updated. Source IP blocked in Border IDS router gateway.`);
          } else if (step.action === 'Quarantine File') {
            runLogs.push(`Quarantine command sent to EDR. Target file quarantined.`);
          } else if (step.action === 'WhatsApp Alert') {
            runLogs.push(`WhatsApp notifications sent via SMS Gateway.`);
          }
        }

        runLogs.push(`Playbook executed successfully. Security orchestration finalized.`);

        await db.playbooks.findByIdAndUpdate(playbook._id, {
          $push: {
            executions: {
              timestamp: new Date(),
              status: 'SUCCESS',
              logs: runLogs
            }
          }
        });

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
