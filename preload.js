const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pet', {
  onCursor: (cb) => ipcRenderer.on('cursor', (_e, data) => cb(data))
});
