const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');

// OS-native application directory selection
function getDatabasePath() {
  if (process.env.ZENTRIX_USER_DATA) {
    return path.join(process.env.ZENTRIX_USER_DATA, 'database', 'zentrix.db');
  }

  const platform = process.platform;
  let baseDir;
  if (platform === 'win32') {
    baseDir = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(baseDir, 'Zentrix', 'database', 'zentrix.db');
  } else if (platform === 'darwin') {
    baseDir = path.join(os.homedir(), 'Library', 'Application Support');
    return path.join(baseDir, 'Zentrix', 'database', 'zentrix.db');
  } else {
    // Linux / Unix fallback
    baseDir = path.join(os.homedir(), '.local', 'share');
    return path.join(baseDir, 'zentrix', 'database', 'zentrix.db');
  }
}

const dbPath = getDatabasePath();
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance = null;

function getDbConnection() {
  if (!dbInstance) {
    dbInstance = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('[SQLITE] Connection failure:', err.message);
      } else {
        console.log(`[SQLITE] Embedded database linked at: ${dbPath}`);
      }
    });
    // Enable Write-Ahead Logging (WAL) and Foreign Keys
    dbInstance.run('PRAGMA journal_mode = WAL;');
    dbInstance.run('PRAGMA foreign_keys = ON;');
  }
  return dbInstance;
}

// Async wrapper methods for sqlite3
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDbConnection();
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDbConnection();
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDbConnection();
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    const db = getDbConnection();
    db.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = {
  dbPath,
  getDbConnection,
  run,
  get,
  all,
  exec
};
