// Runs (isolated) inside the hidden YouTube Music page. Reports what the
// <video> element is doing and routes OS media keys back to our own queue.
const { ipcRenderer } = require('electron');

let video = null;
let last = '';

function report(force) {
  const v = document.querySelector('video');
  if (!v) return;
  const state = {
    time: v.currentTime || 0,
    duration: Number.isFinite(v.duration) ? v.duration : 0,
    paused: v.paused,
    buffering: v.readyState < 3 && !v.paused,
    volume: Math.round(v.volume * 100),
    muted: v.muted,
    ad: isAd(),
  };
  const key = JSON.stringify(state);
  if (force || key !== last) {
    last = key;
    ipcRenderer.send('engine-state', state);
  }
}

function attach() {
  const v = document.querySelector('video');
  if (!v || v === video) return;
  video = v;
  for (const ev of ['play', 'pause', 'playing', 'waiting', 'durationchange', 'volumechange', 'seeked']) {
    v.addEventListener(ev, () => report(true));
  }
  // The page's own autoplay takes over before 'ended' reliably fires, so call
  // the end a moment early and let our queue load the next track first.
  const checkEnd = () => {
    if (isAd() || !(v.duration > 1)) return;
    if (v.currentTime < v.duration - 1) armed = true;
    else if (armed && v.currentTime >= v.duration - 0.3) {
      armed = false;
      ipcRenderer.send('engine-ended');
    }
  };
  v.addEventListener('timeupdate', checkEnd);
  v.addEventListener('ended', checkEnd);
}

let armed = false;
const isAd = () => !!document.querySelector('#movie_player.ad-showing');

// The page owns navigator.mediaSession; we re-point next/previous at our
// queue whenever a track starts, since the page resets them per track.
function claimMediaKeys(meta) {
  try {
    const ms = navigator.mediaSession;
    ms.setActionHandler('nexttrack', () => ipcRenderer.send('engine-media', 'next'));
    ms.setActionHandler('previoustrack', () => ipcRenderer.send('engine-media', 'previous'));
    if (meta) ms.metadata = new MediaMetadata(meta);
  } catch {}
}

ipcRenderer.on('claim-media', (_e, meta) => {
  claimMediaKeys(meta);
  setTimeout(() => claimMediaKeys(meta), 1500);
  setTimeout(() => claimMediaKeys(meta), 4000);
});

// Visualizer: routes the <video> through an analyser the first time it's
// opened. That stays in place afterwards, since a media element can't be
// detached from its source node.
let audio = null;
let vizTimer = null;
const BANDS = 48;
const WAVE = 64;

function tapAudio() {
  const v = document.querySelector('video');
  if (!v) return audio;
  if (audio?.el === v) return audio;
  try {
    const ctx = audio?.ctx || new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.6;
    ctx.createMediaElementSource(v).connect(analyser);
    analyser.connect(ctx.destination);
    // Log-spaced band edges from 32 Hz to 16 kHz, as FFT bin indexes.
    const hz = ctx.sampleRate / analyser.fftSize;
    const edges = Array.from({ length: BANDS + 1 }, (_, i) => Math.max(1, Math.round((32 * Math.pow(16000 / 32, i / BANDS)) / hz)));
    audio = { ctx, analyser, el: v, edges, freq: new Uint8Array(analyser.frequencyBinCount), wave: new Uint8Array(analyser.fftSize) };
  } catch {}
  return audio;
}

function sampleViz() {
  const a = tapAudio();
  if (!a) return;
  if (a.ctx.state === 'suspended') a.ctx.resume();
  a.analyser.getByteFrequencyData(a.freq);
  a.analyser.getByteTimeDomainData(a.wave);
  const bands = [];
  for (let i = 0; i < BANDS; i++) {
    let max = 0;
    for (let b = a.edges[i]; b <= Math.max(a.edges[i], a.edges[i + 1] - 1); b++) max = Math.max(max, a.freq[b] || 0);
    bands.push(max);
  }
  const step = a.wave.length / WAVE;
  const wave = Array.from({ length: WAVE }, (_, i) => a.wave[Math.floor(i * step)]);
  ipcRenderer.send('engine-viz', { bands, wave });
}

ipcRenderer.on('viz-enable', (_e, on) => {
  clearInterval(vizTimer);
  vizTimer = on ? setInterval(sampleViz, 33) : null;
});

// Dismiss the "Video paused. Continue watching?" prompt.
function dismissYouThere() {
  const btn = document.querySelector('ytmusic-you-there-renderer button, tp-yt-paper-dialog ytmusic-you-there-renderer #button');
  if (btn) btn.click();
}

setInterval(() => {
  // Once tapped, a suspended audio context would silence playback.
  if (audio && audio.ctx.state === 'suspended') audio.ctx.resume();
  attach();
  report(false);
  dismissYouThere();
}, 250);
