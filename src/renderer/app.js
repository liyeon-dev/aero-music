import { g, c } from './icons.js';
import { Visualizer, VIZ_MODES } from './viz.js';

const aero = window.aero;
const mac = aero.platform === 'darwin';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fmt = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m % 60).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};
const parseDur = (str) => (str || '').split(':').reduce((acc, n) => acc * 60 + Number(n), 0);
const names = (artists) => (artists || []).map((a) => a.name).join(', ');
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

const S = {
  route: null,
  back: [],
  fwd: [],
  loggedIn: false,
  signingIn: false,
  account: null,
  playlists: [],
  queue: [],
  index: -1,
  queueCont: null,
  playing: false,
  time: 0,
  duration: 0,
  ad: false,
  volume: store.get('volume', 80),
  muted: false,
  shuffle: store.get('shuffle', false),
  repeat: store.get('repeat', 'off'),
  liked: false,
  info: {},
  lyrics: {},
  npTab: 'queue',
  vizMode: store.get('vizMode', 'art'),
  theme: store.get('theme', 'system'),
  seeking: false,
  page: null,
};

const content = $('#content');
let viz = null;
let registry = [];
let lists = [];
let pageToken = 0;

const current = () => S.queue[S.index] || null;
const reg = (item) => registry.push(item) - 1;

// markup

function bubbles(n) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const s = 8 + Math.random() * 36;
    out += `<span class="bubble" style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 90).toFixed(1)}%;width:${s.toFixed(0)}px;height:${s.toFixed(0)}px;animation-duration:${(6 + Math.random() * 8).toFixed(1)}s;animation-delay:${(-Math.random() * 8).toFixed(1)}s"></span>`;
  }
  return `<div class="bubbles">${out}</div>`;
}

const loadingHtml = (msg = 'Loading…') => `<div class="loading"><div class="progress"></div><div>${esc(msg)}</div></div>`;

const artistLinks = (artists = []) =>
  artists.map((a) => (a.id ? `<span class="link" data-go="${esc(a.id)}">${esc(a.name)}</span>` : esc(a.name))).join(', ');

function banner(title, sub) {
  return `<div class="banner">${bubbles(9)}<h1>${esc(title)}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
}

function tile(item) {
  const i = reg(item);
  const isArtist = item.type === 'artist';
  const sub = item.subtitle || names(item.artists);
  return `<button class="tile ${isArtist ? 'artist' : ''}" data-open="${i}" title="${esc(item.title)}">
      <div class="art">${item.thumb ? `<img src="${esc(item.thumb)}" loading="lazy" alt="">` : ''}
        ${isArtist ? '' : `<span class="mini-orb" data-play="${i}" title="Play">${g.play}</span>`}</div>
      <div class="t1">${esc(item.title)}</div>
      <div class="t2">${esc(sub)}</div>
    </button>`;
}

function section(title, inner, scrollable = false) {
  const head = title || scrollable
    ? `<div class="section-head"><h2>${esc(title || '')}</h2><span class="line"></span>${
        scrollable ? `<button class="scroll-btn" data-scroll="-1" title="Scroll left">${g.chevronLeft}</button><button class="scroll-btn" data-scroll="1" title="Scroll right">${g.chevron}</button>` : ''
      }</div>`
    : '';
  return `<section class="section">${head}${inner}</section>`;
}

// mode: 'list' plays the list as the queue, 'radio' starts a radio from the song.
function listBlock(items, { numbered = false, mode = 'radio' } = {}) {
  const songs = items.filter((it) => it.type === 'song');
  const L = lists.push({ items: songs, mode }) - 1;
  const showAlbum = songs.some((it) => it.album);
  const rows = songs
    .map((it, n) => {
      const i = reg(it);
      const lead = numbered || !it.thumb ? `<span class="idx">${esc(it.index || n + 1)}</span>` : `<img src="${esc(it.thumb)}" loading="lazy" alt="">`;
      return `<div class="row" data-list="${L}" data-pos="${n}" data-vid="${esc(it.videoId)}">
          <div class="r-num">${lead}<span class="eq"><i></i><i></i><i></i></span><button class="row-play" data-rowplay="1" title="Play">${g.play}</button></div>
          <div class="r-title" title="${esc(it.title)}">${esc(it.title)}</div>
          <div class="r-sub">${artistLinks(it.artists)}</div>
          ${showAlbum ? `<div class="r-album">${it.album ? `<span class="link" data-go="${esc(it.album.id)}">${esc(it.album.name)}</span>` : ''}</div>` : ''}
          <div class="r-dur">${esc(it.duration || '')}</div>
        </div>`;
    })
    .join('');
  return `<div class="list ${showAlbum ? '' : 'no-album'}">
      <div class="list-head"><div>#</div><div>Title</div><div>Artist</div>${showAlbum ? '<div>Album</div>' : ''}<div>Length</div></div>
      <div class="rows">${rows}</div>
    </div>`;
}

function topSection(s) {
  const t = s.top;
  const i = reg(t);
  const playable = t.type === 'song' || t.type === 'album' || t.type === 'playlist';
  const card = `<div class="top-card">
      <div class="art" ${t.type === 'artist' ? 'style="border-radius:50%"' : ''}>${t.thumb ? `<img src="${esc(t.thumb)}" alt="">` : ''}</div>
      <div style="min-width:0">
        <div class="tt">${esc(t.title)}</div>
        <div class="ts">${esc(t.subtitle)}</div>
        ${playable ? `<button class="btn-aero blue" data-play="${i}">${g.play} Play</button>` : ''}
        ${t.browseId ? `<button class="btn" data-open="${i}">Open</button>` : ''}
      </div>
    </div>`;
  const songs = s.items.filter((x) => x.type === 'song');
  return section('Top result', `<div class="top-wrap">${card}${songs.length ? listBlock(songs) : '<div></div>'}</div>`);
}

function renderSections(sections, opts = {}) {
  return sections
    .map((s) => {
      if (s.layout === 'top') return topSection(s);
      const allSongs = s.items.every((it) => it.type === 'song');
      if (s.layout === 'list' && allSongs) return section(s.title, listBlock(s.items, opts));
      if (s.layout === 'grid' || s.layout === 'list') return section(s.title, `<div class="grid">${s.items.map(tile).join('')}</div>`);
      return section(s.title, `<div class="carousel">${s.items.map(tile).join('')}</div>`, true);
    })
    .join('');
}

// views

async function loadInto(fetcher, render, msg) {
  const token = ++pageToken;
  content.scrollTop = 0;
  content.innerHTML = loadingHtml(msg);
  try {
    const data = await fetcher();
    if (token !== pageToken) return;
    registry = [];
    lists = [];
    content.innerHTML = render(data);
    highlightRows();
  } catch (err) {
    if (token !== pageToken) return;
    console.error(err);
    content.innerHTML = `<div class="infobar"><span>Aero Music couldn't load this page. ${esc(err.message)}</span><button class="btn" data-act="retry">Try again</button></div>`;
  }
}

function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return S.account?.name ? `${part}, ${S.account.name.split(' ')[0]}` : part;
}

const views = {
  home() {
    return loadInto(aero.home, (sections) => banner(greeting(), 'Fresh picks from YouTube Music') + `<div class="page-pad">${renderSections(sections)}</div>`);
  },

  search({ q }) {
    $('#searchInput').value = q;
    return loadInto(
      () => aero.search(q),
      (sections) =>
        banner('Search results', `Showing results for “${esc(q)}”`) +
        `<div class="page-pad">${sections.length ? renderSections(sections) : '<p class="nav-empty">No results.</p>'}</div>`,
      'Searching…',
    );
  },

  library() {
    if (!S.loggedIn) return views.signin();
    return loadInto(aero.library, (sections) => banner('Library', 'Your playlists, albums and mixes') + `<div class="page-pad">${renderSections(sections)}</div>`);
  },

  page(route) {
    return loadInto(
      () => aero.page(route.id),
      (data) => {
        S.page = { ...data, id: route.id };
        const h = data.header;
        route.title = h.title || route.title;
        renderAddress();
        const isArtist = route.id.startsWith('UC') || h.immersive;
        const isAlbum = route.id.startsWith('MPREb_');
        const songs = data.sections.flatMap((s) => (s.layout === 'list' ? s.items.filter((i) => i.type === 'song') : []));
        const canPlay = h.playlistId || songs.length;
        const kind = isArtist ? 'Artist' : (h.subtitle || 'Playlist').split(' • ')[0];
        const sub = [h.artists?.length ? artistLinks(h.artists) : esc(h.byline), esc(h.subtitle.split(' • ').slice(1).join(' • ')), esc(h.secondSubtitle)]
          .filter(Boolean)
          .join(' • ');
        const hero = `<div class="banner">${bubbles(10)}
            <div class="hero">
              <div class="hero-art ${isArtist ? 'round' : ''}">${h.thumb ? `<img src="${esc(h.thumb)}" alt="">` : ''}</div>
              <div class="hero-text">
                <div class="kind">${esc(kind)}</div>
                <h1>${esc(h.title)}</h1>
                <div class="sub">${sub}</div>
                <div class="hero-actions">
                  ${canPlay ? `<button class="btn-aero" data-act="page-play">${g.play} Play</button><button class="btn-aero glass" data-act="page-shuffle">${g.shuffle} Shuffle</button>` : ''}
                </div>
              </div>
            </div>
          </div>`;
        const desc = h.description ? `<p class="desc" title="${esc(h.description)}">${esc(h.description)}</p>` : '';
        return hero + `<div class="page-pad">${desc}${renderSections(data.sections, { numbered: isAlbum, mode: isArtist ? 'radio' : 'list' })}</div>`;
      },
    );
  },

  now() {
    ++pageToken;
    registry = [];
    lists = [];
    content.scrollTop = 0;
    content.innerHTML = `<div class="np">${bubbles(16)}
        <div class="np-left" id="npLeft">
          <div class="np-stage" id="npStage"></div>
          <div class="np-meta" id="npMeta"></div>
          <div class="viz-modes" id="vizModes">${VIZ_MODES.map((m) => `<button class="viz-mode" data-viz="${m.id}">${m.label}</button>`).join('')}</div>
        </div>
        <div class="glass-panel">
          <div class="tabs">
            <button class="tab" data-tab="queue">Up Next</button>
            <button class="tab" data-tab="lyrics">Lyrics</button>
          </div>
          <div class="panel-body" id="panelBody"></div>
        </div>
      </div>`;
    renderStage();
    refreshNow();
  },

  signin() {
    ++pageToken;
    content.innerHTML = `<div class="signin">${bubbles(18)}
        <div class="signin-card">
          <div class="logo">${c.logo}</div>
          <h1>Aero Music</h1>
          ${
            S.signingIn
              ? `<div class="signin-wait"><div class="busy"></div><div>Finish signing in with Google in the window that just opened.</div><div style="color:#6d7b8c">Close that window to cancel.</div></div>`
              : `<p>Sign in with your Google account to bring your YouTube Music library, playlists and Premium playback into Aero Music.</p>
                 <button class="btn-aero blue" data-act="signin">Sign in</button>
                 <div class="alt"><button data-act="skip-signin">Browse without signing in</button></div>`
          }
        </div>
      </div>`;
  },
};

// The stage holds either the album art or the visualizer canvas.
function renderStage() {
  const stage = $('#npStage');
  if (!stage) return;
  stopViz();
  const t = current();
  $('#vizModes').hidden = !t;
  if (!t) {
    stage.innerHTML = `<div class="np-empty">Nothing is playing yet.<br><br><button class="btn-aero glass" data-nav="home">Find something to play</button></div>`;
    return;
  }
  if (S.vizMode === 'art') {
    stage.innerHTML = `<div class="np-art" id="npArt"></div>`;
    return;
  }
  stage.innerHTML = `<canvas class="viz-canvas" id="vizCanvas"></canvas>`;
  viz = new Visualizer($('#vizCanvas'));
  viz.mode = S.vizMode;
  viz.dark = isDark();
  viz.start();
  aero.viz.enable(true);
}

function stopViz() {
  if (!viz) return;
  viz.destroy();
  viz = null;
  aero.viz.enable(false);
}

function refreshNow() {
  if (!$('#npLeft')) return;
  const t = current();
  if (!!t !== !$('.np-empty')) renderStage();
  const art = $('#npArt');
  if (art) art.innerHTML = t?.thumb ? `<img src="${esc(t.thumb)}" alt="">` : '';
  viz?.setArt(t?.thumb);
  $('#npMeta').innerHTML = t
    ? `<div class="np-title" title="${esc(t.title)}">${esc(t.title)}</div>
       <div class="np-artist">${artistLinks(t.artists)}${t.album ? ` — <span class="link" data-go="${esc(t.album.id)}">${esc(t.album.name)}</span>` : ''}</div>`
    : '';
  $$('.viz-mode').forEach((b) => b.classList.toggle('active', b.dataset.viz === S.vizMode));
  renderPanel();
}

function renderPanel() {
  const body = $('#panelBody');
  if (!body) return;
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === S.npTab));
  const t = current();
  if (S.npTab === 'queue') {
    body.innerHTML = S.queue.length
      ? S.queue
          .map(
            (q, i) => `<button class="q-item ${i === S.index ? 'current' : ''}" data-q="${i}">
              ${q.thumb ? `<img src="${esc(q.thumb)}" loading="lazy" alt="">` : ''}
              <div class="q-text"><div class="q-title">${esc(q.title)}</div><div class="q-artist">${esc(names(q.artists))}</div></div>
              <span class="q-dur">${esc(q.duration || '')}</span>
            </button>`,
          )
          .join('')
      : `<div class="panel-note">Your queue is empty.</div>`;
    $('.q-item.current', body)?.scrollIntoView({ block: 'nearest' });
    return;
  }
  if (!t) {
    body.innerHTML = `<div class="panel-note">Play a song to see its lyrics.</div>`;
    return;
  }
  const info = S.info[t.videoId];
  const lyr = S.lyrics[t.videoId];
  if (!info || (info.lyricsId && !lyr)) {
    body.innerHTML = loadingHtml('Fetching lyrics…');
    if (info?.lyricsId) fetchLyrics(t, info.lyricsId);
    return;
  }
  if (!info.lyricsId || !lyr?.text) {
    body.innerHTML = `<div class="panel-note">No lyrics available for this song.</div>`;
    return;
  }
  body.innerHTML = `<div class="lyrics">${esc(lyr.text)}</div><div class="lyrics-src">${esc(lyr.source)}</div>`;
  body.scrollTop = 0;
}

async function fetchLyrics(t, id) {
  if (S.lyrics[t.videoId]?.pending) return;
  S.lyrics[t.videoId] = { pending: true };
  try {
    S.lyrics[t.videoId] = await aero.lyrics(id);
  } catch {
    S.lyrics[t.videoId] = { text: '', source: '' };
  }
  if (current() === t && S.npTab === 'lyrics') renderPanel();
}

// routing + chrome

function sameRoute(a, b) {
  return a && b && a.view === b.view && a.id === b.id && a.q === b.q;
}

function go(route, { replace = false } = {}) {
  if (S.route && !replace && !sameRoute(S.route, route)) {
    S.back.push(S.route);
    S.fwd = [];
  }
  S.route = route;
  render();
}

function render() {
  stopViz();
  renderAddress();
  updateNavActive();
  $('#navBack').disabled = !S.back.length;
  $('#navFwd').disabled = !S.fwd.length;
  views[S.route.view](S.route);
}

const ROUTE_LABEL = { home: 'Home', library: 'Library', now: 'Now Playing', signin: 'Sign in' };

function renderAddress() {
  const r = S.route;
  if (!r) return;
  const crumbs = [`<button class="crumb" data-nav="home">Aero Music</button>`];
  if (r.view === 'search') crumbs.push(`<span class="crumb">Search</span>`, `<span class="crumb">“${esc(r.q)}”</span>`);
  else if (r.view === 'page') crumbs.push(`<span class="crumb">${esc(r.title || 'Loading…')}</span>`);
  else crumbs.push(`<span class="crumb">${ROUTE_LABEL[r.view]}</span>`);
  const sep = `<span class="crumb-sep">${g.chevron}</span>`;
  const icon = r.view === 'now' ? c.now : r.view === 'search' ? c.search : r.view === 'library' ? c.cd : r.id === 'VLLM' ? c.liked : r.view === 'page' ? c.note : c.home;
  $('#address').innerHTML = icon + crumbs.join(sep);
}

function renderNav() {
  const item = (attrs, icon, label) => `<button class="nav-item" ${attrs}>${icon}<span>${esc(label)}</span></button>`;
  const pls = S.playlists
    .filter((p) => p.browseId !== 'VLLM')
    .slice(0, 40)
    .map((p) => item(`data-nav-page="${esc(p.browseId)}" title="${esc(p.title)}"`, p.thumb ? `<img src="${esc(p.thumb)}" alt="">` : c.folder, p.title))
    .join('');
  $('#navpane').innerHTML = `<div class="nav-scroll">
      <div class="nav-group">
        <div class="nav-head">Music</div>
        ${item('data-nav="home"', c.home, 'Home')}
        ${item('data-nav="now"', c.now, 'Now Playing')}
        ${item('data-nav="search"', c.search, 'Search')}
      </div>
      <div class="nav-group">
        <div class="nav-head">Library</div>
        ${
          S.loggedIn
            ? item('data-nav-page="VLLM"', c.liked, 'Liked music') + item('data-nav="library"', c.cd, 'Playlists & albums')
            : `<div class="nav-empty">Sign in to see your library.</div>`
        }
      </div>
      ${S.loggedIn ? `<div class="nav-group"><div class="nav-head">Playlists</div>${pls || '<div class="nav-empty">No playlists yet.</div>'}</div>` : ''}
    </div>
    ${buddyCard()}`;
  updateNavActive();
}

function buddyCard() {
  if (!S.loggedIn) {
    return `<div class="buddy">
        <div class="dp-frame offline"><div class="dp-blank">${c.logo}</div></div>
        <div class="buddy-info">
          <div class="buddy-name"><span class="status-dot off"></span><span>Not signed in</span></div>
          <div class="buddy-psm">Appear offline</div>
          <button class="buddy-link" data-act="signin">Sign in</button>
        </div>
      </div>`;
  }
  const a = S.account || {};
  return `<div class="buddy">
      <div class="dp-frame">${a.photo ? `<img src="${esc(a.photo)}" alt="">` : `<div class="dp-blank">${c.logo}</div>`}</div>
      <div class="buddy-info">
        <div class="buddy-name"><span class="status-dot"></span><span>${esc(a.name || 'You')}</span></div>
        <div class="buddy-psm" id="psm"></div>
        <button class="buddy-link" data-act="signout">Sign out</button>
      </div>
    </div>`;
}

function updatePsm() {
  const el = $('#psm');
  if (!el) return;
  const t = current();
  el.textContent = t ? `♫ ${t.title} - ${names(t.artists)}` : 'Online';
  el.title = el.textContent;
}

function updateNavActive() {
  const r = S.route;
  $$('.nav-item').forEach((b) => {
    const on = r && ((b.dataset.nav && b.dataset.nav === r.view) || (b.dataset.navPage && r.view === 'page' && b.dataset.navPage === r.id));
    b.classList.toggle('active', !!on);
  });
}

// playback

function setQueue(tracks, index, cont = null) {
  S.queue = tracks;
  S.index = index;
  S.queueCont = cont;
  loadCurrent();
}

async function loadCurrent() {
  const t = current();
  if (!t) return;
  S.time = 0;
  S.duration = parseDur(t.duration);
  S.liked = !!S.info[t.videoId]?.liked;
  updateTrackUi();
  try {
    await aero.player.load(t);
    aero.player.volume(S.muted ? 0 : S.volume);
  } catch (err) {
    console.error('load failed', err);
  }
  fetchInfo(t);
  if (S.queueCont && S.index >= S.queue.length - 3) extendQueue();
}

async function fetchInfo(t) {
  if (!S.info[t.videoId]) {
    try {
      const q = await aero.queue({ videoId: t.videoId });
      S.info[t.videoId] = { lyricsId: q.lyricsId, liked: q.liked };
    } catch {
      S.info[t.videoId] = {};
    }
  }
  if (current() !== t) return;
  S.liked = !!S.info[t.videoId].liked;
  updateLike();
  if (S.route.view === 'now' && S.npTab === 'lyrics') renderPanel();
}

async function extendQueue() {
  const cont = S.queueCont;
  S.queueCont = null;
  try {
    const q = await aero.queue({ continuation: cont });
    const have = new Set(S.queue.map((t) => t.videoId));
    S.queue.push(...q.tracks.filter((t) => !have.has(t.videoId)));
    S.queueCont = q.continuation;
    if (S.route.view === 'now' && S.npTab === 'queue') renderPanel();
  } catch {}
}

async function startRadio(track) {
  setQueue([track], 0);
  try {
    const q = await aero.queue({ videoId: track.videoId, playlistId: 'RDAMVM' + track.videoId });
    if (S.queue[0] !== track) return;
    S.queue = [track, ...q.tracks.filter((t) => t.videoId !== track.videoId)];
    S.queueCont = q.continuation;
    if (S.route.view === 'now') renderPanel();
  } catch {}
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function playCollection(item, shuffle = false) {
  let tracks = [];
  let cont = null;
  try {
    // An album's own track list has the right cover art and titles; its
    // playlist queue can swap in the music-video uploads.
    if (item.type === 'album' && item.browseId) {
      const p = await aero.page(item.browseId);
      tracks = p.sections.flatMap((s) => (s.layout === 'list' ? s.items.filter((i) => i.type === 'song') : []));
    }
    if (!tracks.length && item.playlistId) {
      const q = await aero.queue({ playlistId: item.playlistId });
      tracks = q.tracks;
      cont = q.continuation;
    }
    if (!tracks.length && item.browseId) {
      const p = await aero.page(item.browseId);
      tracks = p.sections.flatMap((s) => s.items.filter((i) => i.type === 'song'));
    }
  } catch (err) {
    console.error(err);
  }
  if (!tracks.length) return;
  setQueue(shuffle ? shuffled(tracks) : tracks, 0, shuffle ? null : cont);
}

function playItem(item) {
  if (item.type === 'song') return startRadio(item);
  if (item.type === 'artist') return go({ view: 'page', id: item.browseId, title: item.title });
  return playCollection(item);
}

function playFromList(listIdx, pos) {
  const L = lists[listIdx];
  if (!L) return;
  if (L.mode === 'radio') return startRadio(L.items[pos]);
  setQueue(L.items.slice(), pos);
}

function next(auto = false) {
  if (!S.queue.length) return;
  if (auto && S.repeat === 'one') {
    aero.player.seek(0);
    aero.player.play();
    return;
  }
  let i = S.index + 1;
  if (S.shuffle && S.queue.length > 1) {
    do i = Math.floor(Math.random() * S.queue.length);
    while (i === S.index);
  }
  if (i >= S.queue.length) {
    if (S.repeat !== 'all') return;
    i = 0;
  }
  S.index = i;
  loadCurrent();
}

function prev() {
  if (S.time > 3 || S.index <= 0) {
    aero.player.seek(0);
    return;
  }
  S.index--;
  loadCurrent();
}

function togglePlay() {
  if (!current()) {
    const firstList = lists.find((l) => l.items.length);
    if (firstList) playFromList(lists.indexOf(firstList), 0);
    return;
  }
  S.playing ? aero.player.pause() : aero.player.play();
}

// transport ui

function updateTrackUi() {
  const t = current();
  $('#npMini').innerHTML = t
    ? `<div class="mini-art" data-nav="now" title="Now Playing">${t.thumb ? `<img src="${esc(t.thumb)}" alt="">` : ''}</div>
       <div class="mini-text">
         <div class="mini-title" title="${esc(t.title)}">${esc(t.title)}</div>
         <div class="mini-artist">${artistLinks(t.artists)}</div>
       </div>
       <button class="like-btn ${S.liked ? 'on' : ''}" id="btnLike" title="Like">${g.heart}</button>`
    : '';
  document.title = t ? `${t.title} - Aero Music` : 'Aero Music';
  $('#titleText').textContent = document.title;
  updateProgress();
  updatePsm();
  highlightRows();
  publishNowPlaying();
  if (S.route?.view === 'now') refreshNow();
}

function updateLike() {
  $('#btnLike')?.classList.toggle('on', S.liked);
  publishNowPlaying();
}

function toggleLike() {
  const tr = current();
  if (!tr || !S.loggedIn) return;
  S.liked = !S.liked;
  S.info[tr.videoId] = { ...S.info[tr.videoId], liked: S.liked };
  updateLike();
  aero.like({ videoId: tr.videoId, liked: S.liked }).catch(() => {});
}

// Keeps the taskbar buttons, tray and mini player in sync.
function publishNowPlaying() {
  aero.nowPlaying({ track: current(), liked: S.liked });
}

function updatePlayBtn() {
  const b = $('#btnPlay');
  const want = S.playing ? 'pause' : 'play';
  if (b.dataset.icon !== want) {
    b.dataset.icon = want;
    b.innerHTML = g[want];
    b.title = S.playing ? 'Pause' : 'Play';
    b.classList.toggle('is-paused', !S.playing);
  }
  document.body.classList.toggle('paused', !S.playing);
}

function updateProgress() {
  const d = S.duration || 0;
  const pct = d ? Math.min(100, (S.time / d) * 100) : 0;
  $('#seekFill').style.width = pct + '%';
  $('#timeCur').textContent = S.ad ? 'Ad' : fmt(S.time);
  $('#timeDur').textContent = fmt(d);
}

function highlightRows() {
  const vid = current()?.videoId;
  $$('.row').forEach((r) => r.classList.toggle('playing', !!vid && r.dataset.vid === vid));
  $$('.q-item').forEach((q) => q.classList.toggle('current', Number(q.dataset.q) === S.index));
}

function updateToggles() {
  $('#btnShuffle').classList.toggle('on', S.shuffle);
  $('#btnRepeat').classList.toggle('on', S.repeat !== 'off');
  $('#btnRepeat').innerHTML = S.repeat === 'one' ? g.repeatOne : g.repeat;
  $('#btnRepeat').title = { off: 'Repeat: off', all: 'Repeat: all', one: 'Repeat: one' }[S.repeat];
}

function updateVolumeUi() {
  const v = S.muted ? 0 : S.volume;
  $('#vol').value = v;
  $('#vol').style.setProperty('--v', v + '%');
  $('#btnMute').innerHTML = v === 0 ? g.mute : g.volume;
}

function initSeek() {
  const bar = $('#seek');
  const frac = (e) => {
    const r = bar.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };
  bar.addEventListener('pointerdown', (e) => {
    if (!S.duration) return;
    S.seeking = true;
    bar.classList.add('dragging');
    bar.setPointerCapture(e.pointerId);
    S.time = frac(e) * S.duration;
    updateProgress();
  });
  bar.addEventListener('pointermove', (e) => {
    if (!S.seeking) return;
    S.time = frac(e) * S.duration;
    updateProgress();
  });
  bar.addEventListener('pointerup', (e) => {
    if (!S.seeking) return;
    S.seeking = false;
    bar.classList.remove('dragging');
    S.time = frac(e) * S.duration;
    aero.player.seek(S.time);
  });
}

// auth

async function loadAccount() {
  try {
    S.account = await aero.account();
  } catch {
    S.account = null;
  }
  try {
    const secs = await aero.library();
    S.playlists = secs.flatMap((s) => s.items).filter((i) => i.type === 'playlist' && i.browseId);
  } catch {
    S.playlists = [];
  }
}

async function checkAuth() {
  const st = await aero.auth.status();
  if (!st.ready) throw new Error(st.error || 'YouTube Music did not respond.');
  S.loggedIn = st.loggedIn;
  if (S.loggedIn) await loadAccount();
  else {
    S.account = null;
    S.playlists = [];
  }
  renderNav();
  updatePsm();
}

// theme

// themeSource in the main process also drives prefers-color-scheme for the
// toast and mini player windows.
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => document.documentElement.classList.contains('dark');
const THEMES = {
  system: { next: 'light', icon: 'auto', label: mac ? 'Theme: match macOS' : 'Theme: match Windows' },
  light: { next: 'dark', icon: 'sun', label: 'Theme: light' },
  dark: { next: 'system', icon: 'moon', label: 'Theme: dark' },
};

function applyTheme() {
  aero.setTheme(S.theme);
  syncDark();
  const th = THEMES[S.theme];
  $('#themeBtn').innerHTML = g[th.icon];
  $('#themeBtn').title = th.label;
}

function syncDark() {
  const dark = S.theme === 'dark' || (S.theme === 'system' && darkQuery.matches);
  document.documentElement.classList.toggle('dark', dark);
  if (viz) viz.dark = dark;
}

// events

function wire() {
  if (!THEMES[S.theme]) S.theme = 'system';
  applyTheme();
  darkQuery.addEventListener('change', syncDark);
  $('#themeBtn').onclick = () => {
    S.theme = THEMES[S.theme].next;
    store.set('theme', S.theme);
    applyTheme();
  };
  document.documentElement.classList.toggle('glass', aero.glass);
  document.documentElement.classList.toggle('mac', mac);
  $('#titleOrb').innerHTML = c.logo;
  $('#capMin').innerHTML = g.min;
  $('#capMax').innerHTML = g.max;
  $('#capClose').innerHTML = g.close;
  $('#navBack').innerHTML = g.back;
  $('#navFwd').innerHTML = g.forward;
  $('#searchBtn').innerHTML = g.search;
  $('#btnPrev').innerHTML = g.prev;
  $('#btnNext').innerHTML = g.next;
  $('#btnShuffle').innerHTML = g.shuffle;
  $('#btnMini').innerHTML = g.miniPlayer;
  $('#btnMini').onclick = () => aero.win.miniMode();
  updatePlayBtn();
  updateToggles();
  updateVolumeUi();
  updateProgress();
  initSeek();

  $('#capMin').onclick = () => aero.win.minimize();
  $('#capMax').onclick = () => aero.win.maximize();
  $('#capClose').onclick = () => aero.win.close();
  aero.win.onMaximized((max) => {
    // A zoomed Mac window keeps its native corners and traffic lights.
    document.body.classList.toggle('maximized', max && !mac);
    $('#capMax').innerHTML = max ? g.restore : g.max;
    $('#capMax').title = max ? 'Restore Down' : 'Maximize';
  });
  if (mac) aero.win.onFullScreen((fs) => document.body.classList.toggle('fullscreen', fs));

  $('#navBack').onclick = () => {
    if (!S.back.length) return;
    S.fwd.push(S.route);
    S.route = S.back.pop();
    render();
  };
  $('#navFwd').onclick = () => {
    if (!S.fwd.length) return;
    S.back.push(S.route);
    S.route = S.fwd.pop();
    render();
  };

  $('#searchForm').onsubmit = (e) => {
    e.preventDefault();
    const q = $('#searchInput').value.trim();
    if (q) go({ view: 'search', q });
  };

  $('#btnPlay').onclick = togglePlay;
  $('#btnNext').onclick = () => next();
  $('#btnPrev').onclick = prev;
  $('#btnShuffle').onclick = () => {
    S.shuffle = !S.shuffle;
    store.set('shuffle', S.shuffle);
    updateToggles();
  };
  $('#btnRepeat').onclick = () => {
    S.repeat = { off: 'all', all: 'one', one: 'off' }[S.repeat];
    store.set('repeat', S.repeat);
    updateToggles();
  };
  $('#vol').oninput = (e) => {
    S.volume = Number(e.target.value);
    S.muted = false;
    store.set('volume', S.volume);
    updateVolumeUi();
    aero.player.volume(S.volume);
  };
  $('#btnMute').onclick = () => {
    S.muted = !S.muted;
    updateVolumeUi();
    aero.player.volume(S.muted ? 0 : S.volume);
  };

  aero.player.onState((s) => {
    S.playing = !s.paused;
    S.ad = s.ad;
    if (!S.seeking) S.time = s.time;
    if (s.duration && !s.ad) S.duration = s.duration;
    updateProgress();
    updatePlayBtn();
  });
  aero.player.onEnded(() => next(true));
  aero.viz.onData((d) => viz?.feed(d));
  aero.player.onMediaKey((cmd) => (cmd === 'next' ? next() : prev()));
  aero.onRemote((cmd) => {
    if (cmd === 'toggle') togglePlay();
    else if (cmd === 'next') next();
    else if (cmd === 'prev') prev();
    else if (cmd === 'like') toggleLike();
    else if (cmd.startsWith('seek:')) {
      S.time = Number(cmd.slice(5));
      aero.player.seek(S.time);
      updateProgress();
    }
  });

  aero.auth.onChanged(async () => {
    S.signingIn = false;
    try {
      await checkAuth();
    } catch {}
    S.back = [];
    S.fwd = [];
    go({ view: S.loggedIn ? 'home' : 'signin' }, { replace: true });
  });

  document.addEventListener('click', onClick);
  document.addEventListener('dblclick', (e) => {
    const row = e.target.closest('.row');
    if (row && !e.target.closest('[data-go]')) playFromList(Number(row.dataset.list), Number(row.dataset.pos));
  });

  document.addEventListener('keydown', (e) => {
    const typing = e.target.matches('input[type=text]');
    const mod = e.ctrlKey || e.metaKey;
    // On macOS Option/Cmd+←/→ move the caret in text fields.
    const keepCaret = mac && typing;
    if (e.key === ' ' && !typing) {
      e.preventDefault();
      togglePlay();
    } else if ((mod && (e.key === 'f' || e.key === 'l')) || (e.key === '/' && !typing)) {
      e.preventDefault();
      $('#searchInput').focus();
      $('#searchInput').select();
    } else if (keepCaret) return;
    else if (e.altKey && e.key === 'ArrowLeft') $('#navBack').click();
    else if (e.altKey && e.key === 'ArrowRight') $('#navFwd').click();
    else if (mod && e.key === 'ArrowRight') next();
    else if (mod && e.key === 'ArrowLeft') prev();
  });
  document.addEventListener('mouseup', (e) => {
    if (e.button === 3) $('#navBack').click();
    if (e.button === 4) $('#navFwd').click();
  });
}

async function onClick(e) {
  const t = e.target;
  const el = (sel) => t.closest(sel);
  let x;

  if ((x = el('[data-go]'))) return go({ view: 'page', id: x.dataset.go });
  if ((x = el('[data-play]'))) {
    e.stopPropagation();
    return playItem(registry[Number(x.dataset.play)]);
  }
  if ((x = el('[data-rowplay]'))) {
    const row = x.closest('.row');
    return playFromList(Number(row.dataset.list), Number(row.dataset.pos));
  }
  if ((x = el('.row'))) {
    $$('.row.selected').forEach((r) => r.classList.remove('selected'));
    x.classList.add('selected');
    return;
  }
  if ((x = el('[data-open]'))) {
    const item = registry[Number(x.dataset.open)];
    if (item.browseId) return go({ view: 'page', id: item.browseId, title: item.title });
    return playItem(item);
  }
  if ((x = el('[data-scroll]'))) {
    const car = x.closest('.section').querySelector('.carousel');
    car.scrollBy({ left: Number(x.dataset.scroll) * car.clientWidth * 0.8 });
    return;
  }
  if ((x = el('[data-nav-page]'))) return go({ view: 'page', id: x.dataset.navPage, title: x.title || 'Liked music' });
  if ((x = el('[data-nav]'))) {
    const v = x.dataset.nav;
    if (v === 'search') {
      $('#searchInput').focus();
      return;
    }
    return go({ view: v });
  }
  if ((x = el('[data-viz]'))) {
    S.vizMode = x.dataset.viz;
    store.set('vizMode', S.vizMode);
    renderStage();
    return refreshNow();
  }
  if ((x = el('[data-tab]'))) {
    S.npTab = x.dataset.tab;
    return renderPanel();
  }
  if ((x = el('[data-q]'))) {
    S.index = Number(x.dataset.q);
    return loadCurrent();
  }
  if ((x = el('#btnLike'))) return toggleLike();
  if ((x = el('[data-act]'))) {
    const act = x.dataset.act;
    if (act === 'retry') return render();
    if (act === 'signin') {
      S.signingIn = true;
      if (S.route.view !== 'signin') go({ view: 'signin' });
      else render();
      return aero.auth.signIn();
    }
    if (act === 'skip-signin') return go({ view: 'home' }, { replace: true });
    if (act === 'signout') {
      content.innerHTML = loadingHtml('Signing out…');
      return aero.auth.signOut();
    }
    if (act === 'page-play' || act === 'page-shuffle') {
      const p = S.page;
      const shuffle = act === 'page-shuffle';
      const isArtist = p.id.startsWith('UC');
      const songs = p.sections.flatMap((s) => (s.layout === 'list' ? s.items.filter((i) => i.type === 'song') : []));
      if (p.id.startsWith('MPREb_') && songs.length) return setQueue(shuffle ? shuffled(songs) : songs, 0);
      if (p.header.playlistId) return playCollection({ playlistId: p.header.playlistId }, shuffle);
      if (isArtist && songs.length) return shuffle ? setQueue(shuffled(songs), 0) : startRadio(songs[0]);
      if (songs.length) return setQueue(shuffle ? shuffled(songs) : songs, 0);
    }
  }
}

// boot

async function boot() {
  wire();
  renderNav();
  S.route = { view: 'home' };
  renderAddress();
  content.innerHTML = loadingHtml('Connecting to YouTube Music…');
  try {
    await checkAuth();
    go({ view: S.loggedIn ? 'home' : 'signin' }, { replace: true });
  } catch (err) {
    content.innerHTML = `<div class="infobar"><span>Couldn't reach YouTube Music. ${esc(err.message)}</span><button class="btn" data-act="retry-boot">Try again</button></div>`;
    $('[data-act="retry-boot"]').onclick = () => location.reload();
  }
}

boot();
