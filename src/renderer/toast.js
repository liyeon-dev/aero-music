const el = (id) => document.getElementById(id);
const box = el('toast');
let hideTimer = null;
document.documentElement.classList.toggle('mac', navigator.platform.startsWith('Mac'));

window.toast.onShow((t) => {
  clearTimeout(hideTimer);
  el('art').src = t.thumb || '';
  el('title').textContent = t.title;
  el('artist').textContent = (t.artists || []).map((a) => a.name).join(', ');
  box.classList.remove('show');
  requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('show')));
});

function hide() {
  box.classList.remove('show');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => window.toast.hidden(), 400);
}

window.toast.onHide(hide);
el('x').onclick = (e) => {
  e.stopPropagation();
  hide();
};
el('body').onclick = () => window.toast.click();
