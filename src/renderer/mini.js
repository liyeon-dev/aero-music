const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M6.8 5.2v13.6c0 .8.9 1.3 1.6.8l10.2-6.8c.6-.4.6-1.2 0-1.6L8.4 4.4C7.7 3.9 6.8 4.4 6.8 5.2z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6.5 5h3.6v14H6.5zM13.9 5h3.6v14h-3.6z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M5 6.2v11.6c0 .7.8 1.1 1.4.7l8.2-5.8c.5-.4.5-1 0-1.4L6.4 5.5C5.8 5.1 5 5.5 5 6.2zM16.5 5.5h2.7v13h-2.7z"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M19 6.2v11.6c0 .7-.8 1.1-1.4.7l-8.2-5.8c-.5-.4-.5-1 0-1.4l8.2-5.8c.6-.4 1.4 0 1.4.7zM4.8 5.5h2.7v13H4.8z"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
  open: '<svg viewBox="0 0 24 24"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM5 5h6V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-6h-2v6H5V5z"/></svg>',
};
const card = document.getElementById('card');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fmt = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
let state = null;
let trackKey = null;

function render(np) {
  document.body.classList.toggle('glass', !!np.glass);
  const t = np.track;
  const key = t ? t.videoId : '';
  if (key !== trackKey) {
    trackKey = key;
    card.innerHTML = t
      ? `<div class="art" data-cmd="open">${t.thumb ? `<img src="${esc(t.thumb)}" alt="">` : ''}</div>
         <div class="right">
           <div class="title" title="${esc(t.title)}">${esc(t.title)}</div>
           <div class="artist">${esc((t.artists || []).map((a) => a.name).join(', '))}</div>
           <div class="controls">
             <button class="t" data-cmd="prev" title="Previous">${ICON.prev}</button>
             <button class="play" data-cmd="toggle" id="play"></button>
             <button class="t" data-cmd="next" title="Next">${ICON.next}</button>
             <button class="t heart" data-cmd="like" id="heart" title="Like">${ICON.heart}</button>
           </div>
           <div class="seek"><span id="cur">0:00</span><div class="bar" id="bar"><div class="fill" id="fill"></div></div><span id="dur">0:00</span></div>
         </div>
         <button class="open" data-cmd="open" title="Open Aero Music">${ICON.open}</button>`
      : `<div class="empty">Nothing is playing.<br><br><button class="t" data-cmd="open" style="width:auto;border-radius:3px;padding:2px 8px;color:#1f7ad8">Open Aero Music</button></div>`;
  }
  if (!t) return;
  const play = document.getElementById('play');
  play.innerHTML = np.playing ? ICON.pause : ICON.play;
  play.title = np.playing ? 'Pause' : 'Play';
  document.getElementById('heart').classList.toggle('on', !!np.liked);
  document.getElementById('cur').textContent = fmt(np.time);
  document.getElementById('dur').textContent = fmt(np.duration);
  document.getElementById('fill').style.width = (np.duration ? Math.min(100, (np.time / np.duration) * 100) : 0) + '%';
}

window.mini.onUpdate((np) => {
  state = np;
  render(np);
});

document.addEventListener('click', (e) => {
  const bar = e.target.closest('#bar');
  if (bar && state?.duration) {
    const r = bar.getBoundingClientRect();
    window.mini.command('seek:' + ((e.clientX - r.left) / r.width) * state.duration);
    return;
  }
  const b = e.target.closest('[data-cmd]');
  if (b) window.mini.command(b.dataset.cmd);
});
