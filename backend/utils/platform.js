// backend/utils/platform.js
const { execSync, exec, spawn } = require('child_process');
const os = require('os');

const PLATFORM = process.platform; // 'win32' | 'linux' | 'darwin'

function runCmd(linuxCmd, windowsCmd, callback) {
  const cmd = PLATFORM === 'win32' ? windowsCmd : linuxCmd;
  exec(cmd, { timeout: 10000 }, callback);
}

module.exports = { PLATFORM, runCmd };
