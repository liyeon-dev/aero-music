const { app, BrowserWindow, ipcMain, screen, nativeTheme, nativeImage, Tray, Menu } = require('electron');
const os = require('os');
const path = require('path');
const { Engine } = require('./engine');
const P = require('./parse');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.setAppUserModelId('AeroMusic');

if (!app.requestSingleInstanceLock()) app.quit();

const RENDERER = path.join(__dirname, '..', 'renderer');
const ASSETS = path.join(__dirname, '..', '..', 'assets');
const ICON = path.join(ASSETS, 'icon.ico');
const MAC = process.platform === 'darwin';
// Real blurred glass needs the Windows 11 22H2+ system backdrop. macOS always has vibrancy.
const GLASS = MAC || (process.platform === 'win32' && Number(os.release().split('.')[2]) >= 22621);

let win = null;
let quitting = false; // macOS: closing the window only hides it, unless the app is quitting
let toast = null;
let toastTimer = null;
let tray = null;
let mini = null;
let miniPinned = false; // pinned = "mini player mode"; otherwise a tray flyout
const engine = new Engine();

// What's playing, as last reported by the renderer (track) and the engine (playback).
const np = { track: null, liked: false, playing: false, time: 0, duration: 0 };

const glassOptions = (fallback) =>
  MAC ? { vibrancy: 'under-window', visualEffectState: 'active', backgroundColor: '#00000000' }
  : GLASS ? { backgroundMaterial: 'acrylic', backgroundColor: '#00000000' } : { backgroundColor: fallback };

// macOS: keep flyouts on whichever Space is current, without the Dock-hiding process transform.
const allSpaces = (w) => MAC && w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });

function createWindow() {
  win = new BrowserWindow({
    width: 1240,
    height: 800,
    minWidth: 960,
    minHeight: 620,
    ...(MAC ? { titleBarStyle: 'hidden', trafficLightPosition: { x: 12, y: 8 } } : { frame: false, icon: ICON }),
    show: false,
    title: 'Aero Music',
    ...glassOptions('#5e93b8'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
  win.loadFile(path.join(RENDERER, 'index.html'));
  win.once('ready-to-show', () => {
    win.show();
    updateShell();
  });
  const sendMax = () => win.webContents.send('win-maximized', win.isMaximized());
  win.on('maximize', sendMax);
  win.on('unmaximize', sendMax);
  win.on('focus', () => {
    hideToast();
    if (miniPinned) hideMini();
  });
  if (MAC) {
    win.on('enter-full-screen', () => win.webContents.send('win-fullscreen', true));
    win.on('leave-full-screen', () => win.webContents.send('win-fullscreen', false));
    // Closing hides to the Dock and playback carries on. Leave full screen first, or its Space stays black.
    win.on('close', (e) => {
      if (quitting) return;
      e.preventDefault();
      if (!win.isFullScreen()) return win.hide();
      win.once('leave-full-screen', () => win.hide());
      win.setFullScreen(false);
    });
  }
  win.on('closed', () => app.quit());
}

function showMain() {
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

// Main renderer owns the queue, so every outside control is relayed to it.
const remote = (cmd) => win?.webContents.send('remote', cmd);

// MSN-style "now playing" popup in the corner of the screen
function createToast() {
  toast = new BrowserWindow({
    width: 236,
    height: 132,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    show: false,
    // toast.html draws its own shadow; macOS's alpha-traced one goes stale as it slides.
    ...(MAC && { hasShadow: false }),
    webPreferences: { preload: path.join(__dirname, 'toast-preload.js'), contextIsolation: true },
  });
  toast.loadFile(path.join(RENDERER, 'toast.html'));
  allSpaces(toast);
}

function showToast(track) {
  if (!toast || toast.isDestroyed()) createToast();
  if (win.isFocused() && !win.isMinimized()) return;
  if (mini?.isVisible()) return;
  const { workArea } = screen.getPrimaryDisplay();
  const [w, h] = toast.getSize();
  toast.setPosition(workArea.x + workArea.width - w - 8, workArea.y + workArea.height - h - 8);
  toast.webContents.send('toast-show', track);
  toast.showInactive();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}

function hideToast() {
  clearTimeout(toastTimer);
  if (toast && !toast.isDestroyed() && toast.isVisible()) toast.webContents.send('toast-hide');
}

// taskbar thumbnail buttons + tray (Dock menu + menu bar icon on macOS)
const img = (name) => nativeImage.createFromPath(path.join(ASSETS, name + '.png'));
let trayMenu = null;

function updateShell() {
  if (!win || win.isDestroyed()) return;
  const has = !!np.track;
  const flags = has ? [] : ['disabled'];
  if (process.platform === 'win32') win.setThumbarButtons([
    { tooltip: 'Previous', icon: img('prev'), flags, click: () => remote('prev') },
    { tooltip: np.playing ? 'Pause' : 'Play', icon: img(np.playing ? 'pause' : 'play'), flags, click: () => remote('toggle') },
    { tooltip: 'Next', icon: img('next'), flags, click: () => remote('next') },
  ]);

  const artists = (np.track?.artists || []).map((a) => a.name).join(', ');
  const nowMenu = [
    { label: has ? np.track.title.slice(0, 60) : 'Nothing playing', enabled: false },
    ...(has && artists ? [{ label: artists.slice(0, 60), enabled: false }] : []),
    { type: 'separator' },
    { label: np.playing ? 'Pause' : 'Play', enabled: has, click: () => remote('toggle') },
    { label: 'Next', enabled: has, click: () => remote('next') },
    { label: 'Previous', enabled: has, click: () => remote('prev') },
  ];
  if (MAC) app.dock.setMenu(Menu.buildFromTemplate(nowMenu));

  if (!tray) return;
  const tip = has ? `${np.track.title}\n${artists}`.slice(0, 127) : 'Aero Music';
  tray.setToolTip(tip);
  trayMenu = Menu.buildFromTemplate([
    ...nowMenu,
    { label: np.liked ? 'Unlike' : 'Like', enabled: has, click: () => remote('like') },
    { type: 'separator' },
    { label: 'Show mini player', click: () => showMini() },
    { label: 'Open Aero Music', click: showMain },
    { type: 'separator' },
    { label: MAC ? 'Quit Aero Music' : 'Exit', click: () => app.quit() },
  ]);
  // A context menu on macOS would take over left-click, so it pops up on right-click instead.
  if (!MAC) tray.setContextMenu(trayMenu);
}

function createTray() {
  if (MAC) return createMenuBarIcon();
  tray = new Tray(ICON);
  tray.on('click', () => (mini?.isVisible() ? hideMini() : showMini()));
  tray.on('double-click', showMain);
  updateShell();
}

// The flyout can blur (and hide) before the icon's click arrives,
// so note at mouse-down whether that click should close it instead.
let miniHiddenAt = 0;
function createMenuBarIcon() {
  const icon = img('trayTemplate');
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setIgnoreDoubleClickEvents(true);
  let wasOpen = false;
  const popMenu = () => tray.popUpContextMenu(trayMenu);
  tray.on('mouse-down', () => (wasOpen = mini?.isVisible() || Date.now() - miniHiddenAt < 150));
  tray.on('click', (e) => (e.ctrlKey ? popMenu() : wasOpen ? hideMini() : showMini()));
  tray.on('right-click', popMenu);
  updateShell();
}

// mini player flyout (opens from the tray)
function createMini() {
  mini = new BrowserWindow({
    width: 340,
    height: 168,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    ...glassOptions('#6a9fc6'),
    webPreferences: { preload: path.join(__dirname, 'mini-preload.js'), contextIsolation: true },
  });
  mini.loadFile(path.join(RENDERER, 'mini.html'));
  mini.on('blur', () => !miniPinned && mini.hide());
  if (MAC) mini.on('blur', () => (miniHiddenAt = Date.now()));
  mini.webContents.on('did-finish-load', () => sendMini());
  allSpaces(mini);
}

function sendMini() {
  if (mini && !mini.isDestroyed()) mini.webContents.send('mini-update', { ...np, glass: GLASS, platform: process.platform });
}

function showMini(pinned = false) {
  if (!mini || mini.isDestroyed()) createMini();
  hideToast();
  const wasPinned = miniPinned && mini.isVisible();
  miniPinned = pinned;
  // A pinned mini player stays where the user dragged it.
  if (!wasPinned) {
    const [w, h] = mini.getSize();
    const tb = tray.getBounds();
    const point = tb.width ? { x: tb.x + tb.width / 2, y: tb.y } : screen.getCursorScreenPoint();
    const { workArea } = screen.getDisplayNearestPoint(point);
    const x = Math.round(Math.min(Math.max(point.x - w / 2, workArea.x + 8), workArea.x + workArea.width - w - 8));
    const y = point.y < workArea.y + workArea.height / 2 ? workArea.y + 10 : workArea.y + workArea.height - h - 10;
    mini.setPosition(x, y);
  }
  sendMini();
  mini.show();
  mini.focus();
}

function hideMini() {
  miniPinned = false;
  mini?.hide();
}

// data
async function search(query) {
  const raw = P.parseSections(await engine.call('search', { query }));
  const sections = raw.filter((s) => s.layout === 'top');
  const loose = raw.filter((s) => s.layout !== 'top').flatMap((s) => s.items);
  const groups = [
    ['Songs', (i) => i.type === 'song' && i.kind !== 'video', 'list'],
    ['Albums & singles', (i) => i.type === 'album', 'carousel'],
    ['Artists', (i) => i.type === 'artist', 'carousel'],
    ['Videos', (i) => i.type === 'song' && i.kind === 'video', 'list'],
    ['Playlists', (i) => i.type === 'playlist', 'carousel'],
  ];
  for (const [title, test, layout] of groups) {
    const items = loose.filter(test);
    if (items.length) sections.push({ title, layout, items });
  }
  return sections;
}

const api = {
  home: async () => P.parseSections(await engine.call('browse', { browseId: 'FEmusic_home' })),
  search: (q) => search(q),
  page: async (browseId) => P.parsePage(await engine.call('browse', { browseId }), browseId),
  library: async () => P.parseSections(await engine.call('browse', { browseId: 'FEmusic_liked_playlists' })),
  queue: async ({ videoId, playlistId, continuation }) =>
    P.parseQueue(
      await engine.call('next', continuation
        ? { continuation, isAudioOnly: true, enablePersistentPlaylistPanel: true }
        : { videoId, playlistId, isAudioOnly: true, enablePersistentPlaylistPanel: true }),
    ),
  lyrics: async (browseId) => P.parseLyrics(await engine.call('browse', { browseId })),
  account: async () => P.parseAccount(await engine.call('account/account_menu', {})),
  like: async ({ videoId, liked }) => {
    await engine.call(liked ? 'like/like' : 'like/removelike', { target: { videoId } });
    return liked;
  },
};

function registerIpc() {
  for (const [name, fn] of Object.entries(api)) {
    ipcMain.handle('api:' + name, async (_e, arg) => {
      try {
        return { ok: true, data: await fn(arg) };
      } catch (err) {
        return { ok: false, error: String(err.message || err) };
      }
    });
  }

  ipcMain.handle('player:load', async (_e, track) => {
    await engine.loadVideo(track.videoId);
    engine.win.webContents.send('claim-media', {
      title: track.title,
      artist: (track.artists || []).map((a) => a.name).join(', '),
      album: track.album?.name || '',
      artwork: track.thumb ? [{ src: track.thumb, sizes: '544x544', type: 'image/jpeg' }] : [],
    });
    win.setTitle(`${track.title} - Aero Music`);
    showToast(track);
  });
  ipcMain.handle('player:play', () => engine.play());
  ipcMain.handle('player:pause', () => engine.pause());
  ipcMain.handle('player:seek', (_e, t) => engine.seek(t));
  ipcMain.handle('player:volume', (_e, v) => engine.setVolume(v));

  ipcMain.on('np:update', (_e, info) => {
    np.track = info.track;
    np.liked = info.liked;
    updateShell();
    sendMini();
  });
  ipcMain.on('viz:enable', (_e, on) => engine.win?.webContents.send('viz-enable', on));
  ipcMain.on('app:info', (e) => (e.returnValue = { glass: GLASS, platform: process.platform }));
  ipcMain.on('theme:set', (_e, mode) => {
    nativeTheme.themeSource = ['light', 'dark', 'system'].includes(mode) ? mode : 'system';
  });

  ipcMain.handle('auth:status', async () => {
    try {
      return { ready: true, loggedIn: await engine.isLoggedIn() };
    } catch (err) {
      return { ready: false, error: String(err.message || err) };
    }
  });
  ipcMain.handle('auth:signIn', () => engine.signIn());
  ipcMain.handle('auth:signOut', () => engine.signOut());

  ipcMain.on('win:minimize', () => win.minimize());
  ipcMain.on('win:maximize', () => (win.isMaximized() ? win.unmaximize() : win.maximize()));
  ipcMain.on('win:close', () => win.close());

  ipcMain.on('toast:click', () => {
    hideToast();
    showMain();
  });
  ipcMain.on('toast:hidden', () => toast?.hide());

  ipcMain.on('mini:command', (_e, cmd) => {
    if (cmd === 'open') {
      hideMini();
      showMain();
    } else remote(cmd);
  });
  ipcMain.on('win:mini', () => {
    showMini(true);
    win.minimize();
  });

  engine.on('engine-state', (s) => {
    win?.webContents.send('player-state', s);
    const changed = s.paused === np.playing;
    np.playing = !s.paused;
    np.time = s.time;
    if (s.duration && !s.ad) np.duration = s.duration;
    if (changed) updateShell();
    if (mini?.isVisible()) sendMini();
  });
  engine.on('engine-ended', () => win?.webContents.send('player-ended'));
  engine.on('engine-media', (cmd) => win?.webContents.send('media-key', cmd));
  engine.on('engine-viz', (bins) => win?.webContents.send('viz', bins));
  engine.on('auth-changed', () => win?.webContents.send('auth-changed'));
}

app.on('second-instance', () => win && showMain());
app.on('activate', () => win && showMain()); // macOS Dock icon click

app.whenReady().then(() => {
  // Dev runs would show the Electron logo; packaged builds use the bundle icon.
  if (MAC && !app.isPackaged) app.dock.setIcon(path.join(ASSETS, 'icon-mac.png'));
  registerIpc();
  engine.start();
  createWindow();
  createToast();
  createTray();
});

app.on('before-quit', () => {
  quitting = true;
  tray?.destroy();
  engine.destroy();
});
app.on('window-all-closed', () => !MAC && app.quit());
