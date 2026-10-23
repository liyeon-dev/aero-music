// The "engine" is a hidden YouTube Music window. It does all the real work:
// playback happens in its <video> element and API calls run inside the page
// so they carry the user's session cookies.
const { BrowserWindow, session } = require('electron');
const path = require('path');
const { EventEmitter } = require('events');

const YTM = 'https://music.youtube.com/';
const PARTITION = 'persist:ytm';

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
      webPreferences: {
        partition: PARTITION,
        preload: path.join(__dirname, 'engine-preload.js'),
        backgroundThrottling: false,
        contextIsolation: true,
      },
    });
    this.win.on('close', (e) => {
      // The engine lives as long as the app; closing just hides the sign-in view.
      if (!this.quitting) {
        e.preventDefault();
        this.hide();
      }
    });
    this.win.webContents.on('did-navigate', (_e, url) => this.onNavigate(url));
    this.win.webContents.on('did-navigate-in-page', (_e, url) => this.onNavigate(url));
    this.win.webContents.on('ipc-message', (_e, channel, payload) => this.emit(channel, payload));
    this.load();
  }

  load(url = YTM) {
    this.ready = new Promise((resolve) => {
      const done = async () => {
        this.win.webContents.off('did-finish-load', done);
        if (!this.isYtm()) return; // consent / sign-in page; resolved after it returns
        // On timeout, resolve anyway so calls go through and report their own errors.
        await this.waitFor('window.ytcfg && ytcfg.get("INNERTUBE_API_KEY") && document.getElementById("movie_player")').catch(() => {});
        resolve();
      };
      this.win.webContents.on('did-finish-load', done);
      this._resolveReady = resolve;
    });
    this.win.loadURL(url);
    return this.ready;
  }

  isYtm() {
    return new URL(this.win.webContents.getURL()).host === 'music.youtube.com';
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
        if (await this.win.webContents.executeJavaScript(`!!(${expr})`)) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error('Timed out waiting for YouTube Music');
  }

  async exec(code) {
    await this.ready;
    return this.win.webContents.executeJavaScript(code, true);
  }

  call(endpoint, body = {}) {
    return this.exec(`(${CALL_SRC})(${JSON.stringify(endpoint)}, ${JSON.stringify(body)})`);
  }

  async isLoggedIn() {
    return !!(await this.exec('!!ytcfg.get("LOGGED_IN")'));
  }

  signIn() {
    this.signingIn = true;
    const next = encodeURIComponent('https://www.youtube.com/signin?action_handle_signin=true&app=desktop&next=' + encodeURIComponent(YTM));
    this.win.loadURL('https://accounts.google.com/ServiceLogin?service=youtube&passive=true&continue=' + next);
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

  // `expected` is the track our queue asked for; anything else that starts
  // playing came from the page's own autoplay.
  loadVideo(videoId) {
    this.expected = videoId;
    return this.player(`p.loadVideoById(${JSON.stringify(videoId)}); p.playVideo && p.playVideo();`);
  }
  cueVideo(videoId) {
    this.expected = videoId;
    return this.player(`p.cueVideoById(${JSON.stringify(videoId)});`);
  }
  videoId() { return this.player('return p.getVideoData && p.getVideoData().video_id;'); }
  play() { return this.player('p.playVideo();'); }
  pause() { return this.player('p.pauseVideo();'); }
  seek(t) { return this.player(`p.seekTo(${Number(t)}, true);`); }
  setVolume(v) { return this.player(`p.unMute && p.unMute(); p.setVolume(${Math.round(Number(v))});`); }

  destroy() {
    this.quitting = true;
    this.win?.destroy();
  }
}

module.exports = { Engine };
