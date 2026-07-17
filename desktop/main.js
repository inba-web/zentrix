const { app, BrowserWindow } = require('electron');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let agentProcess;

// Poll until server is ready before loading the window
function waitForServer(url, retries = 60, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryConnect = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          attempts++;
          if (attempts >= retries) {
            reject(new Error(`[ELECTRON] Server at ${url} responded with status ${res.statusCode}`));
          } else {
            setTimeout(tryConnect, intervalMs);
          }
        }
      }).on('error', () => {
        attempts++;
        if (attempts >= retries) {
          reject(new Error(`[ELECTRON] Server at ${url} did not start after ${(retries * intervalMs) / 1000}s`));
        } else {
          setTimeout(tryConnect, intervalMs);
        }
      });
    };
    tryConnect();
  });
}

function startAgent() {
  let agentScriptPath = path.join(__dirname, '../agent/agent.py');
  if (app.isPackaged) {
    agentScriptPath = agentScriptPath.replace('app.asar', 'app.asar.unpacked');
  }
  console.log('[ELECTRON] Attempting EDR agent execution at:', agentScriptPath);
  
  // Try python3 first, fallback to python
  let pythonCmd = 'python3';
  
  const spawnAgent = (cmd) => {
    const proc = spawn(cmd, ['-u', agentScriptPath], {
      stdio: 'inherit',
      windowsHide: true
    });
    
    proc.on('error', (err) => {
      if (cmd === 'python3') {
        console.log('[ELECTRON] python3 not found, trying python...');
        spawnAgent('python');
      } else {
        console.warn('[ELECTRON] Python is not installed. Python EDR agent was not started.');
      }
    });
    
    proc.on('exit', (code, signal) => {
      console.log(`[ELECTRON] EDR agent exited with code ${code} and signal ${signal}`);
    });
    
    agentProcess = proc;
  };
  
  spawnAgent(pythonCmd);
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

  const isPackaged = app.isPackaged;

  if (isPackaged) {
    console.log('[ELECTRON] Starting backend server in production mode...');
    // Set production environment variables
    process.env.NODE_ENV = 'production';
    
    // Set user data directory
    const userDataPath = app.getPath('userData');
    process.env.ZENTRIX_USER_DATA = userDataPath;
    console.log(`[ELECTRON] Production writable paths mapped to User Data: ${userDataPath}`);

    process.env.PORT = process.env.PORT || '5001';
    
    // Start backend server
    try {
      require('../backend/server.js');
    } catch (err) {
      console.error('[ELECTRON] Failed to start backend server:', err);
    }
    
    // Start EDR agent
    startAgent();
    
    const PROD_URL = `http://localhost:${process.env.PORT}`;
    console.log('[ELECTRON] Waiting for backend server...');
    try {
      await waitForServer(`${PROD_URL}/api/health`);
      console.log('[ELECTRON] Backend ready — loading app.');
      mainWindow.loadURL(PROD_URL);
    } catch (err) {
      console.error(err.message);
      app.quit();
    }
  } else {
    const DEV_URL = 'http://localhost:3000';
    console.log('[ELECTRON] Waiting for Vite dev server…');
    try {
      await waitForServer(DEV_URL);
      console.log('[ELECTRON] Vite ready — loading app.');
      mainWindow.loadURL(DEV_URL);
      // Uncomment to open DevTools:
      // mainWindow.webContents.openDevTools();
    } catch (err) {
      console.error(err.message);
      app.quit();
    }
  }
});

app.on('will-quit', () => {
  if (agentProcess) {
    console.log('[ELECTRON] Terminating EDR agent...');
    agentProcess.kill();
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
