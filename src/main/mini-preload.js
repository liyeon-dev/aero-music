const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mini', {
  onUpdate: (cb) => ipcRenderer.on('mini-update', (_e, np) => cb(np)),
  command: (cmd) => ipcRenderer.send('mini:command', cmd),
});
