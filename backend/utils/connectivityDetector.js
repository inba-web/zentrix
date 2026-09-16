const dns = require('dns');

let isOnline = false;
let lastCheck = 0;
const CHECK_INTERVAL_MS = 10000; // Check every 10 seconds max

async function checkInternetConnectivity() {
  const now = Date.now();
  if (now - lastCheck < CHECK_INTERVAL_MS) {
    return isOnline;
  }
  lastCheck = now;

  return new Promise((resolve) => {
    // Non-intrusive DNS lookup of standard reliable root servers
    dns.lookup('1.1.1.1', (err) => {
      if (!err) {
        isOnline = true;
        resolve(true);
      } else {
        dns.lookup('8.8.8.8', (err2) => {
          isOnline = !err2;
          resolve(isOnline);
        });
      }
    });
  });
}

function getCachedConnectivity() {
  return isOnline;
}

module.exports = {
  checkInternetConnectivity,
  getCachedConnectivity
};
