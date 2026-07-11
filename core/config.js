const fs = require('fs');
const path = require('path');

const baseDir = process.env.ZENTRIX_USER_DATA || path.join(__dirname, '..');
const CONFIG_FILE = path.join(baseDir, 'settings.json');

const DEFAULTS = {
  theme: 'dark',
  language: 'en',
  proxy: '',
  updateChannel: 'stable',
  loggingLevel: 'info',
  database: {
    client: 'sqlite3',
    connection: {
      filename: process.env.ZENTRIX_USER_DATA 
        ? path.join(process.env.ZENTRIX_USER_DATA, 'database.sqlite')
        : path.join(__dirname, '..', 'database.sqlite')
    }
  },
  security: {
    rateLimitMax: 100,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 mins
    requireMfa: false
  },
  ai: {
    provider: 'gemini',
    apiKey: '',
    endpoint: ''
  }
};

let settings = { ...DEFAULTS };

function load() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(data);
      settings = { ...DEFAULTS, ...parsed };
    } else {
      save();
    }
  } catch (err) {
    console.error('[CONFIG] Failed to load settings.json, reverting to defaults:', err.message);
    settings = { ...DEFAULTS };
  }
}

function save() {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (err) {
    console.error('[CONFIG] Failed to write settings.json:', err.message);
  }
}

function get(key, defaultValue) {
  const parts = key.split('.');
  let current = settings;
  for (const part of parts) {
    if (current === undefined || current === null) {
      return defaultValue;
    }
    current = current[part];
  }
  return current !== undefined ? current : defaultValue;
}

function set(key, value) {
  const parts = key.split('.');
  let current = settings;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
  save();
}

// Initial load
load();

module.exports = {
  get,
  set,
  getAll: () => ({ ...settings }),
  reset: () => {
    settings = { ...DEFAULTS };
    save();
  }
};
