// backend/repositories/alertRepository.js

const db = require('../db');

module.exports = {
  async find(filter = {}, limit = 100) {
    return db.alerts.find(filter, limit);
  },
  async findOne(query) {
    return db.alerts.findOne(query);
  },
  async create(alert) {
    return db.alerts.create(alert);
  },
  async updateById(id, updates) {
    return db.alerts.findByIdAndUpdate(id, { $set: updates });
  },
  async count(query = {}) {
    return db.alerts.countDocuments(query);
  }
};