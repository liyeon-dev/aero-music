const { contextBridge, ipcRenderer } = require('electron');

const call = (name) => async (arg) => {
  const res = await ipcRenderer.invoke('api:' + name, arg);
  if (!res.ok) throw new Error(res.error);
  return res.data;
};
const on = (channel) => (cb) => ipcRenderer.on(channel, (_e, ...args) => cb(...args));

const info = ipcRenderer.sendSync('app:info');

contextBridge.exposeInMainWorld('aero', {
  glass: info.glass,
  setTheme: (mode) => ipcRenderer.send('theme:set', mode),
  nowPlaying: (np) => ipcRenderer.send('np:update', np),
  onRemote: on('remote'),
  viz: {
    enable: (on) => ipcRenderer.send('viz:enable', on),
    onData: on('viz'),
  },
  home: call('home'),
  search: call('search'),
  page: call('page'),
  library: call('library'),
  queue: call('queue'),
  lyrics: call('lyrics'),
  account: call('account'),
  like: call('like'),
  player: {
    load: (track) => ipcRenderer.invoke('player:load', track),
    cue: (track) => ipcRenderer.invoke('player:cue', track),
    play: () => ipcRenderer.invoke('player:play'),
    pause: () => ipcRenderer.invoke('player:pause'),
    seek: (t) => ipcRenderer.invoke('player:seek', t),
    volume: (v) => ipcRenderer.invoke('player:volume', v),
    onState: on('player-state'),
    onEnded: on('player-ended'),
    onMediaKey: on('media-key'),
  },
  auth: {
    status: () => ipcRenderer.invoke('auth:status'),
    signIn: () => ipcRenderer.invoke('auth:signIn'),
    signOut: () => ipcRenderer.invoke('auth:signOut'),
    onChanged: on('auth-changed'),
  },
  win: {
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    close: () => ipcRenderer.send('win:close'),
    miniMode: () => ipcRenderer.send('win:mini'),
    onMaximized: on('win-maximized'),
  },
});
