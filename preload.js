const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pet', {
  onCursor: (cb) => ipcRenderer.on('cursor', (_e, data) => cb(data)),
  onPlay: (cb) => ipcRenderer.on('play', (_e, name) => cb(name)),
  onEntry: (cb) => ipcRenderer.on('entry', (_e, data) => cb(data))
});
