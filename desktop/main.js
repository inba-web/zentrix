const { app, BrowserWindow } = require('electron');
const http = require('http');

let mainWindow;

// Poll until Vite dev server is ready before loading the window
function waitForVite(url, retries = 60, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryConnect = () => {
      http.get(url, (res) => {
        resolve();
      }).on('error', () => {
        attempts++;
        if (attempts >= retries) {
          reject(new Error(`[ELECTRON] Vite dev server at ${url} did not start after ${(retries * intervalMs) / 1000}s`));
        } else {
          setTimeout(tryConnect, intervalMs);
        }
      });
    };
    tryConnect();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    title: 'ZENTRIX – Security Operations Center',
    backgroundColor: '#090d16',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.maximize();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  createWindow();
  const DEV_URL = 'http://localhost:3000';
  console.log('[ELECTRON] Waiting for Vite dev server…');
  try {
    await waitForVite(DEV_URL);
    console.log('[ELECTRON] Vite ready — loading app.');
    mainWindow.loadURL(DEV_URL);
    // Uncomment to open DevTools:
    // mainWindow.webContents.openDevTools();
  } catch (err) {
    console.error(err.message);
    app.quit();
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

