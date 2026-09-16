const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, allowlisted IPC bindings to the renderer context
contextBridge.exposeInMainWorld('zentrixAPI', {
  platform: process.platform,
  sendNotification: (title, options) => {
    ipcRenderer.send('zentrix:notify', { title, options });
  },
  getSystemInfo: () => {
    return ipcRenderer.invoke('zentrix:get-system-info');
  }
});
