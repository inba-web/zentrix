// backend/adapters/jsonAdapter.js

const fs = require('fs');
const path = require('path');

// Base directory for JSON storage
const DATA_DIR = path.join(__dirname, '..', 'data');

function getFilePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function ensureFile(collection) {
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }
  return filePath;
}

function readCollection(collection) {
  const filePath = ensureFile(collection);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeCollection(collection, data) {
  const filePath = getFilePath(collection);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  // Create a single record
  async create(collection, doc) {
    const list = readCollection(collection);
    const newDoc = {
      _id: doc._id || Math.random().toString(36).substring(2, 9),
      ...doc,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: doc.updatedAt || new Date().toISOString()
    };
    list.push(newDoc);
    writeCollection(collection, list);
    return newDoc;
  },

  // Insert many records
  async createMany(collection, docs) {
    const list = readCollection(collection);
    const created = docs.map(doc => ({
      _id: doc._id || Math.random().toString(36).substring(2, 9),
      ...doc,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: doc.updatedAt || new Date().toISOString()
    }));
    list.push(...created);
    writeCollection(collection, list);
    return created;
  },

  // Find records (simple equality query + operators)
  async find(collection, query = {}) {
    const list = readCollection(collection);
    if (Object.keys(query).length === 0) return list;
    return list.filter(item => {
      return Object.entries(query).every(([k, v]) => {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          if ('$ne' in v) {
            return item[k] !== v.$ne;
          }
          if ('$lt' in v) {
            return item[k] < v.$lt;
          }
          if ('$gt' in v) {
            return item[k] > v.$gt;
          }
          if ('$in' in v) {
            return Array.isArray(v.$in) && v.$in.includes(item[k]);
          }
          if ('$nin' in v) {
            return Array.isArray(v.$nin) && !v.$nin.includes(item[k]);
          }
        }
        return item[k] === v;
      });
    });
  },

  // Find one record
  async findOne(collection, query = {}) {
    const records = await this.find(collection, query);
    return records[0] || null;
  },

  // Update by id
  async update(collection, id, updates) {
    const list = readCollection(collection);
    const idx = list.findIndex(item => item._id === id);
    if (idx === -1) return null;
    const item = list[idx];
    const updated = {
      ...item,
      ...(updates.$set || updates),
      updatedAt: new Date().toISOString()
    };
    list[idx] = updated;
    writeCollection(collection, list);
    return updated;
  },

  // Delete one (by query)
  async delete(collection, query) {
    const list = readCollection(collection);
    const idx = list.findIndex(item => {
      return Object.entries(query).every(([k, v]) => item[k] === v);
    });
    if (idx === -1) return { deletedCount: 0 };
    list.splice(idx, 1);
    writeCollection(collection, list);
    return { deletedCount: 1 };
  },

  // Delete many (by query, supports simple operators like $lt and $gt)
  async deleteMany(collection, query = {}) {
    const list = readCollection(collection);
    const initialLength = list.length;
    const filtered = list.filter(item => {
      // Return true if the item should KEEP (i.e. does NOT match the delete query)
      return !Object.entries(query).every(([k, v]) => {
        if (v && typeof v === 'object') {
          if ('$lt' in v) {
            return item[k] < v.$lt;
          }
          if ('$gt' in v) {
            return item[k] > v.$gt;
          }
        }
        return item[k] === v;
      });
    });
    writeCollection(collection, filtered);
    return { deletedCount: initialLength - filtered.length };
  },

  // Count documents
  async count(collection) {
    const list = readCollection(collection);
    return list.length;
  }
};
