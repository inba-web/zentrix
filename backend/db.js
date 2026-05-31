const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const jsonAdapter = require('./adapters/jsonAdapter');

// Unified Database Access Layer using JSON storage only
console.log('[DB] Using Local JSON Database');

// Helper to generate collection interface
function collection(name) {
  return {
    find: (query = {}) => jsonAdapter.find(name, query),
    findOne: (query = {}) => jsonAdapter.findOne(name, query),
    create: (doc) => jsonAdapter.create(name, doc),
    createMany: (docs) => jsonAdapter.createMany(name, docs),
    findByIdAndUpdate: (id, updates) => jsonAdapter.update(name, id, updates),
    findOneAndUpdate: async (query, updates) => {
      const doc = await jsonAdapter.findOne(name, query);
      if (!doc) return null;
      return jsonAdapter.update(name, doc._id, updates);
    },
    deleteOne: (query) => jsonAdapter.delete(name, query),
    countDocuments: () => jsonAdapter.count(name)
  };
}


// Path for fallback local storage
const FALLBACK_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(FALLBACK_DIR)) {
  fs.mkdirSync(FALLBACK_DIR, { recursive: true });
}

let useMongoose = false;

// Initialize connection
async function connect() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/enterprise_soc';
  try {
    console.log('[DB] Attempting MongoDB connection...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000 // Quick timeout to trigger fallback
    });
    useMongoose = true;
    console.log('[DB] Connected successfully to Enterprise MongoDB Server.');
  } catch (err) {
    console.warn(`[DB] MongoDB connection failed: ${err.message}`);
    console.warn('[DB] GRACEFUL FALLBACK: Initializing localized JSON File Database.');
    useMongoose = false;
  }
}

// ----------------------------------------------------
// Schema Definitions for MongoDB
// ----------------------------------------------------

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  role: { type: String, default: 'Analyst' },
  avatar: String,
  joinedAt: { type: Date, default: Date.now }
});

const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  source: String,     // 'WinEvent', 'Sysmon', 'AuthLog', 'AppLog', 'Suricata'
  severity: String,   // 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
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
  status: { type: String, default: 'Online' }, // 'Online', 'Offline', 'Isolated'
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
  category: String, // 'Malware', 'Credential Theft', 'IDS Intrusion', 'Honeypot Trigger', etc.
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
  reputation: { type: Number, default: 0 }, // 0 to 100
  source: String,
  createdAt: { type: Date, default: Date.now },
  notes: String
});

const soarPlaybookSchema = new mongoose.Schema({
  name: String,
  trigger: String, // 'AlertCritical', 'MalwareDetected', 'HoneypotTrigger'
  status: { type: String, default: 'Active' },
  steps: [{
    order: Number,
    action: String, // 'EnrichIOC', 'NotifyAnalyst', 'IsolateEndpoint', 'BlockIP'
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
  reports: mongoose.model('Report', reportSchema)
};

// ----------------------------------------------------
// Local File Storage Engine (Fallback Layer)
// ----------------------------------------------------

class FileCollection {
  constructor(name) {
    this.name = name;
    this.filePath = path.join(FALLBACK_DIR, `${name}.json`);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2));
    }
  }

  _read() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  _write(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  async find(query = {}) {
    const list = this._read();
    return list.filter(item => {
      for (let key in query) {
        if (query[key] && typeof query[key] === 'object' && query[key].$regex) {
          const reg = new RegExp(query[key].$regex, query[key].$options || 'i');
          if (!reg.test(item[key])) return false;
        } else if (item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });
  }

  async findOne(query = {}) {
    const list = await this.find(query);
    return list[0] || null;
  }

  async create(doc) {
    const list = this._read();
    const newDoc = {
      _id: doc._id || Math.random().toString(36).substring(2, 9),
      ...doc,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: doc.updatedAt || new Date().toISOString()
    };
    list.push(newDoc);
    this._write(list);
    return newDoc;
  }

  async insertMany(docs) {
    const list = this._read();
    const createdDocs = docs.map(doc => ({
      _id: doc._id || Math.random().toString(36).substring(2, 9),
      ...doc,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: doc.updatedAt || new Date().toISOString()
    }));
    list.push(...createdDocs);
    this._write(list);
    return createdDocs;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const list = this._read();
    const idx = list.findIndex(item => item._id === id);
    if (idx === -1) return null;
    const item = list[idx];
    const updated = {
      ...item,
      ...(update.$set || update),
      updatedAt: new Date().toISOString()
    };
    list[idx] = updated;
    this._write(list);
    return updated;
  }

  async findOneAndUpdate(query, update, options = {}) {
    const item = await this.findOne(query);
    if (!item) return null;
    return this.findByIdAndUpdate(item._id, update, options);
  }

  async deleteOne(query) {
    const list = this._read();
    const idx = list.findIndex(item => {
      for (let key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
    if (idx === -1) return false;
    list.splice(idx, 1);
    this._write(list);
    return { deletedCount: 1 };
  }

  async countDocuments(query = {}) {
    const items = await this.find(query);
    return items.length;
  }
}

const FileModels = {
  users: new FileCollection('users'),
  logs: new FileCollection('logs'),
  endpoints: new FileCollection('endpoints'),
  alerts: new FileCollection('alerts'),
  incidents: new FileCollection('incidents'),
  iocs: new FileCollection('iocs'),
  playbooks: new FileCollection('playbooks'),
  auditLogs: new FileCollection('auditLogs'),
  reports: new FileCollection('reports')
};

// ----------------------------------------------------
// Unified Database Access Layer
// ----------------------------------------------------

const db = {
  // No connection step needed for JSON storage
  connect: async () => console.log('[DB] JSON storage ready'),
  // Collection interfaces
  users: collection('users'),
  logs: collection('logs'),
  endpoints: collection('endpoints'),
  alerts: collection('alerts'),
  incidents: collection('incidents'),
  iocs: collection('iocs'),
  playbooks: collection('playbooks'),
  auditLogs: collection('auditLogs'),
  reports: collection('reports')
};

module.exports = db;
