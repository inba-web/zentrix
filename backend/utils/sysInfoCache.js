// backend/utils/sysInfoCache.js
const si = require('systeminformation');

let cachedProcs = null;
let cachedProcsTime = 0;

let cachedConns = null;
let cachedConnsTime = 0;

async function getProcesses() {
  const now = Date.now();
  if (cachedProcs && (now - cachedProcsTime < 3000)) {
    return cachedProcs;
  }
  try {
    cachedProcs = await si.processes();
    cachedProcsTime = now;
  } catch (e) {
    if (!cachedProcs) cachedProcs = { list: [] };
  }
  return cachedProcs;
}

async function getNetworkConnections() {
  const now = Date.now();
  if (cachedConns && (now - cachedConnsTime < 3000)) {
    return cachedConns;
  }
  try {
    cachedConns = await si.networkConnections();
    cachedConnsTime = now;
  } catch (e) {
    if (!cachedConns) cachedConns = [];
  }
  return cachedConns;
}

module.exports = {
  getProcesses,
  getNetworkConnections
};
