const LinuxAdapter = require('./linuxAdapter');
const WindowsAdapter = require('./windowsAdapter');
const MacAdapter = require('./macAdapter');

function getOSAdapter() {
  const platform = process.platform;
  if (platform === 'win32') {
    return new WindowsAdapter();
  } else if (platform === 'darwin') {
    return new MacAdapter();
  } else {
    return new LinuxAdapter();
  }
}

const adapter = getOSAdapter();

module.exports = adapter;
