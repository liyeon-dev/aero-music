const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('toast', {
  onShow: (cb) => ipcRenderer.on('toast-show', (_e, track) => cb(track)),
  onHide: (cb) => ipcRenderer.on('toast-hide', () => cb()),
  click: () => ipcRenderer.send('toast:click'),
  hidden: () => ipcRenderer.send('toast:hidden'),
});
