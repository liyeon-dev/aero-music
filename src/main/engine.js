// The "engine" is a hidden YouTube Music page. It does all the real work:
// playback happens in its <video> element and API calls run inside the page
// so they carry the user's session cookies. The page lives in a view so it can
// be moved into the main window when the music video is shown.
const { BrowserWindow, WebContentsView, session } = require('electron');
const path = require('path');
const { EventEmitter } = require('events');

const YTM = 'https://music.youtube.com/';
const PARTITION = 'persist:ytm';

// While the page is shown in the main window, everything but the video is
// hidden and click-through, so it looks like a bare video surface.
const VIDEO_CSS = `
html.aero-video, html.aero-video body { background: #000 !important; overflow: hidden !important; }
html.aero-video body * { visibility: hidden !important; pointer-events: none !important; }
html.aero-video #movie_player, html.aero-video #movie_player .html5-video-container, html.aero-video #movie_player video { visibility: visible !important; }
html.aero-video #movie_player { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; background: #000 !important; }
html.aero-video #movie_player .html5-video-container { position: absolute !important; inset: 0 !important; }
html.aero-video #movie_player video { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; height: 100% !important; object-fit: contain !important; }
html.aero-video #song-video { display: block !important; }
html.aero-video body *:has(#movie_player) { transform: none !important; will-change: auto !important; contain: none !important; filter: none !important; }
html.aero-video ::-webkit-scrollbar { display: none !important; }
`;

// Runs inside music.youtube.com (main world). Signs the request the same way
// the web client does so logged-in endpoints work.
const CALL_SRC = `
async (endpoint, body) => {
  const cfg = (k) => window.ytcfg && window.ytcfg.get(k);
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-AuthUser': String(cfg('SESSION_INDEX') || 0),
    'X-Origin': location.origin,
    'X-Youtube-Client-Name': String(cfg('INNERTUBE_CONTEXT_CLIENT_NAME') || 67),
    'X-Youtube-Client-Version': cfg('INNERTUBE_CLIENT_VERSION'),
  };
  const sapisid = (document.cookie.match(/(?:^|; )(?:__Secure-3PAPISID|SAPISID)=([^;]+)/) || [])[1];
  if (sapisid) {
    const ts = Math.floor(Date.now() / 1000);
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(ts + ' ' + sapisid + ' ' + location.origin));
    const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    headers.Authorization = 'SAPISIDHASH ' + ts + '_' + hex;
  }
  const url = '/youtubei/v1/' + endpoint + '?prettyPrint=false&key=' + cfg('INNERTUBE_API_KEY');
  const res = await fetch(url, {
    method: 'POST', headers, credentials: 'include',
    body: JSON.stringify({ context: cfg('INNERTUBE_CONTEXT'), ...body }),
  });
  if (!res.ok) throw new Error(endpoint + ' failed: HTTP ' + res.status);
  return res.json();
}`;

class Engine extends EventEmitter {
  constructor() {
    super();
    this.win = null;
    this.view = null;
    this.wc = null;
    this.host = null; // window the video is currently shown in
    this.ready = null;
    this.signingIn = false;
  }

  start() {
    const ses = session.fromPartition(PARTITION);
    // Google refuses sign-in from browsers that announce themselves as Electron.
    ses.setUserAgent(ses.getUserAgent().replace(/\s(Electron|aero-music)\/\S+/g, ''));

    this.win = new BrowserWindow({
      show: false,
      width: 1100,
      height: 800,
      title: 'Sign in - Aero Music',
      autoHideMenuBar: true,
      webPreferences: { backgroundThrottling: false },
    });
    this.view = new WebContentsView({
      webPreferences: {
        partition: PARTITION,
        preload: path.join(__dirname, 'engine-preload.js'),
        backgroundThrottling: false,
        contextIsolation: true,
      },
    });
    this.view.setBackgroundColor('#000000');
    this.wc = this.view.webContents;
    this.dock();
    this.win.on('resize', () => !this.host && this.fitToWindow());
    this.win.on('close', (e) => {
      // The engine lives as long as the app; closing just hides the sign-in view.
      if (!this.quitting) {
        e.preventDefault();
        this.hide();
      }
    });
    this.wc.on('did-navigate', (_e, url) => this.onNavigate(url));
    this.wc.on('did-navigate-in-page', (_e, url) => this.onNavigate(url));
    this.wc.on('ipc-message', (_e, channel, payload) => this.emit(channel, payload));
    this.wc.on('dom-ready', () => {
      if (!this.isYtm()) return;
      this.wc.insertCSS(VIDEO_CSS);
      if (this.host) this.setVideoClass(true);
    });
    // Keep keyboard shortcuts working if the video gets clicked.
    this.wc.on('focus', () => this.host && !this.host.isDestroyed() && this.host.webContents.focus());
    this.load();
  }

  fitToWindow() {
    const [width, height] = this.win.getContentSize();
    this.view.setBounds({ x: 0, y: 0, width, height });
  }

  // Shows the page inside `host` at `bounds` (window coordinates).
  showVideo(host, bounds) {
    if (this.signingIn || host.isDestroyed()) return;
    if (this.host !== host) {
      this.win.contentView.removeChildView(this.view);
      host.contentView.addChildView(this.view);
      this.host = host;
      this.view.setBorderRadius?.(3);
      this.setVideoClass(true);
    }
    this.view.setBounds(bounds);
  }

  // Puts the page back in its own (hidden) window.
  dock() {
    if (this.host && !this.host.isDestroyed()) this.host.contentView.removeChildView(this.view);
    const wasHosted = !!this.host;
    this.host = null;
    this.win.contentView.addChildView(this.view);
    this.view.setBorderRadius?.(0);
    this.fitToWindow();
    if (wasHosted) this.setVideoClass(false);
  }

  setVideoClass(on) {
    this.wc.executeJavaScript(`document.documentElement.classList.toggle('aero-video', ${on}); dispatchEvent(new Event('resize'));`).catch(() => {});
  }

  load(url = YTM) {
    this.ready = new Promise((resolve) => {
      const done = async () => {
        this.wc.off('did-finish-load', done);
        if (!this.isYtm()) return; // consent / sign-in page; resolved after it returns
        // On timeout, resolve anyway so calls go through and report their own errors.
        await this.waitFor('window.ytcfg && ytcfg.get("INNERTUBE_API_KEY") && document.getElementById("movie_player")').catch(() => {});
        resolve();
      };
      this.wc.on('did-finish-load', done);
      this._resolveReady = resolve;
    });
    this.wc.loadURL(url);
    return this.ready;
  }

  isYtm() {
    return new URL(this.wc.getURL()).host === 'music.youtube.com';
  }

  async onNavigate(url) {
    const host = new URL(url).host;
    if (host === 'music.youtube.com') {
      if (this.win.isVisible()) {
        // Back from Google sign-in or the cookie consent page.
        this.win.hide();
        await this.waitFor('window.ytcfg && ytcfg.get("INNERTUBE_API_KEY") && document.getElementById("movie_player")').catch(() => {});
        this._resolveReady?.();
        this.signingIn = false;
        this.emit('auth-changed');
      }
    } else if (!this.win.isVisible()) {
      // Something needs the user (cookie consent, Google sign-in). Show it.
      this.dock();
      this.win.show();
    }
  }

  hide() {
    this.win.hide();
    if (this.signingIn) {
      this.signingIn = false;
      this.emit('auth-changed');
    }
  }

  async waitFor(expr, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        if (await this.wc.executeJavaScript(`!!(${expr})`)) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error('Timed out waiting for YouTube Music');
  }

  async exec(code) {
    await this.ready;
    return this.wc.executeJavaScript(code, true);
  }

  send(channel, ...args) {
    if (this.wc && !this.wc.isDestroyed()) this.wc.send(channel, ...args);
  }

  call(endpoint, body = {}) {
    return this.exec(`(${CALL_SRC})(${JSON.stringify(endpoint)}, ${JSON.stringify(body)})`);
  }

  async isLoggedIn() {
    return !!(await this.exec('!!ytcfg.get("LOGGED_IN")'));
  }

  signIn() {
    this.dock();
    this.signingIn = true;
    const next = encodeURIComponent('https://www.youtube.com/signin?action_handle_signin=true&app=desktop&next=' + encodeURIComponent(YTM));
    this.wc.loadURL('https://accounts.google.com/ServiceLogin?service=youtube&passive=true&continue=' + next);
    this.win.show();
  }

  async signOut() {
    await session.fromPartition(PARTITION).clearStorageData();
    await this.load();
    this.emit('auth-changed');
  }

  // playback (runs against the page's own player)
  player(js) {
    return this.exec(`(() => { const p = document.getElementById('movie_player'); const v = document.querySelector('video'); ${js} })()`);
  }

  loadVideo(videoId, start = 0) {
    const args = start > 0 ? `{ videoId: ${JSON.stringify(videoId)}, startSeconds: ${Number(start)} }` : JSON.stringify(videoId);
    return this.player(`p.loadVideoById(${args}); p.playVideo && p.playVideo();`);
  }
  play() { return this.player('p.playVideo();'); }
  pause() { return this.player('p.pauseVideo();'); }
  seek(t) { return this.player(`p.seekTo(${Number(t)}, true);`); }
  setVolume(v) { return this.player(`p.unMute && p.unMute(); p.setVolume(${Math.round(Number(v))});`); }

  destroy() {
    this.quitting = true;
    if (this.host && !this.host.isDestroyed()) this.host.contentView.removeChildView(this.view);
    this.wc?.close();
    this.win?.destroy();
  }
}

module.exports = { Engine };
