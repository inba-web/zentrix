const knex = require('knex');
const knexfile = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexfile[environment];

const db = knex(config);

let migrationPromise = null;
function runMigrations() {
  if (!migrationPromise) {
    migrationPromise = db.migrate.latest()
      .then(() => {
        console.log('[DATABASE] Database schema migrated successfully.');
      })
      .catch(err => {
        console.error('[DATABASE] Database migration failed:', err.message);
        throw err;
      });
  }
  return migrationPromise;
}

const JSON_FIELDS = {
  logs: ['payload'],
  endpoints: ['processes', 'networkConnections'],
  alerts: ['evidence'],
  incidents: ['recommendations', 'timeline', 'evidence'],
  playbooks: ['steps', 'executions']
};

function deserialize(tableName, record) {
  if (!record) return record;
  const fields = JSON_FIELDS[tableName];
  if (!fields) return record;
  
  const copy = { ...record };
  for (const field of fields) {
    if (copy[field]) {
      try {
        if (typeof copy[field] === 'string') {
          copy[field] = JSON.parse(copy[field]);
        }
      } catch (e) {
        // Leave as is
      }
    }
  }
  return copy;
}

function serialize(tableName, record) {
  if (!record) return record;
  const fields = JSON_FIELDS[tableName];
  if (!fields) return record;
  
  const copy = { ...record };
  for (const field of fields) {
    if (copy[field] && typeof copy[field] === 'object') {
      copy[field] = JSON.stringify(copy[field]);
    }
  }
  return copy;
}

function applyMongoQuery(queryBuilder, query) {
  if (!query) return;
  
  for (const [key, val] of Object.entries(query)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if ('$ne' in val) {
        queryBuilder.where(key, '<>', val.$ne);
      }
      if ('$lt' in val) {
        queryBuilder.where(key, '<', val.$lt);
      }
      if ('$gt' in val) {
        queryBuilder.where(key, '>', val.$gt);
      }
      if ('$in' in val) {
        queryBuilder.whereIn(key, val.$in);
      }
      if ('$nin' in val) {
        queryBuilder.whereNotIn(key, val.$nin);
      }
    } else {
      queryBuilder.where(key, val);
    }
  }
}

const adapter = {
  db,
  runMigrations,
  
  async find(collection, query = {}, limit = 1000) {
    await runMigrations();
    let qb = db(collection);
    applyMongoQuery(qb, query);
    if (limit) {
      qb.limit(limit);
    }
    const rows = await qb;
    return rows.map(r => deserialize(collection, r));
  },
  
  async findOne(collection, query = {}) {
    await runMigrations();
    let qb = db(collection);
    applyMongoQuery(qb, query);
    const row = await qb.first();
    return deserialize(collection, row) || null;
  },
  
  async create(collection, doc) {
    await runMigrations();
    const cleanDoc = {
      _id: doc._id || Math.random().toString(36).substring(2, 9),
      ...doc
    };
    if (!cleanDoc.createdAt && (collection === 'users' || collection === 'incidents' || collection === 'iocs')) {
      cleanDoc.createdAt = new Date().toISOString();
    }
    const serialized = serialize(collection, cleanDoc);
    await db(collection).insert(serialized);
    return cleanDoc;
  },
  
  async createMany(collection, docs) {
    await runMigrations();
    const cleanDocs = docs.map(doc => ({
      _id: doc._id || Math.random().toString(36).substring(2, 9),
      ...doc
    }));
    
    const serializedDocs = cleanDocs.map(d => serialize(collection, d));
    await db(collection).insert(serializedDocs);
    return cleanDocs;
  },
  
  async update(collection, id, updates) {
    await runMigrations();
    const existing = await db(collection).where('_id', id).first();
    if (!existing) return null;
    
    const deserializedExisting = deserialize(collection, existing);
    const updated = { ...deserializedExisting };
    
    let hasOperator = false;
    if (updates.$set) {
      Object.assign(updated, updates.$set);
      hasOperator = true;
    }
    if (updates.$push) {
      for (const [key, val] of Object.entries(updates.$push)) {
        if (!Array.isArray(updated[key])) {
          updated[key] = [];
        }
        updated[key].push(val);
      }
      hasOperator = true;
    }
    if (updates.$pull) {
      for (const [key, query] of Object.entries(updates.$pull)) {
        if (Array.isArray(updated[key])) {
          if (query && typeof query === 'object') {
            updated[key] = updated[key].filter(el => {
              return !Object.entries(query).every(([k, v]) => el[k] === v);
            });
          } else {
            updated[key] = updated[key].filter(el => el !== query);
          }
        }
      }
      hasOperator = true;
    }
    
    if (!hasOperator) {
      for (const [key, val] of Object.entries(updates)) {
        if (!key.startsWith('$')) {
          updated[key] = val;
        }
      }
    }
    
    updated.updatedAt = new Date().toISOString();
    const serialized = serialize(collection, updated);
    delete serialized._id;
    
    await db(collection).where('_id', id).update(serialized);
    return updated;
  },
  
  async findOneAndUpdate(collection, query, updates) {
    await runMigrations();
    const doc = await this.findOne(collection, query);
    if (!doc) return null;
    return this.update(collection, doc._id, updates);
  },
  
  async delete(collection, query) {
    await runMigrations();
    let qb = db(collection);
    applyMongoQuery(qb, query);
    const count = await qb.delete();
    return { deletedCount: count };
  },
  
  async deleteMany(collection, query = {}) {
    await runMigrations();
    let qb = db(collection);
    applyMongoQuery(qb, query);
    const count = await qb.delete();
    return { deletedCount: count };
  },
  
  async count(collection, query = {}) {
    await runMigrations();
    let qb = db(collection);
    applyMongoQuery(qb, query);
    const countObj = await qb.count('* as count').first();
    return countObj ? parseInt(countObj.count) : 0;
  }
};

module.exports = adapter;
