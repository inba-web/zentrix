// backend/repositories/userRepository.js

const db = require('../db');

// Repository providing an abstraction over user data access.
// All methods return plain JavaScript objects (lean) for consistency.

module.exports = {
  async findByEmail(email) {
    return db.users.findOne({ email });
  },
  async findById(id) {
    return db.users.findOne({ _id: id });
  },
  async create(userObj) {
    return db.users.create(userObj);
  },
  async updateById(id, updates) {
    return db.users.findByIdAndUpdate(id, { $set: updates });
  },
  async deleteById(id) {
    // Simple deletion via findByIdAndUpdate with a flag or using deleteOne if supported.
    const result = await db.users.findOneAndUpdate({ _id: id }, { $set: { deleted: true } });
    return result;
  },
  async list(filter = {}) {
    return db.users.find(filter);
  }
};
