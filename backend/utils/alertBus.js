// backend/utils/alertBus.js
let _io = null;
module.exports = {
  init(io) { _io = io; },
  fireCritical(payload) {
    // payload: { title, description, severity, category, source }
    if (_io) _io.emit('threat:critical', { ...payload, ts: new Date().toISOString() });
  }
};
