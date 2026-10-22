// Ambient light: picks a few dominant colours from a small video frame or
// cover art and hands them to CSS, which fades the scene towards them.

// Returns three [r, g, b] colours, strongest first.
export function palette({ pixels, bgra = false }) {
  const buckets = new Map();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const r = pixels[i + (bgra ? 2 : 0)];
    const g = pixels[i + 1];
    const b = pixels[i + (bgra ? 0 : 2)];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max ? (max - min) / max : 0;
    // Near-black and washed-out greys say little about the mood of a picture.
    const weight = (max < 28 ? 0.05 : 1) * (0.25 + sat * sat * 1.5);
    const key = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
    const bk = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0, w: 0 };
    bk.r += r;
    bk.g += g;
    bk.b += b;
    bk.n++;
    bk.w += weight;
    buckets.set(key, bk);
  }
  const ranked = [...buckets.values()].sort((a, b) => b.w - a.w).map((bk) => [bk.r / bk.n, bk.g / bk.n, bk.b / bk.n]);
  const picked = [];
  for (const c of ranked) {
    if (picked.every((p) => dist(p, c) > 70)) picked.push(c);
    if (picked.length === 3) break;
  }
  while (picked.length < 3) picked.push(picked[0] || [90, 170, 255]);
  return picked.map(glow);
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Pushes a colour towards something that reads as light: saturated and
// reasonably bright, so dull frames still give the sky a clear tint. Real
// greys stay soft rather than taking on whatever hue the noise has.
function glow([r, g, b]) {
  let [h, s, l] = rgbToHsl(r, g, b);
  s = s < 0.1 ? 0.15 : Math.min(1, Math.max(0.6, s * 1.4 + 0.15));
  l = Math.min(0.68, Math.max(0.42, l));
  return hslToRgb(h, s, l);
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

// The custom properties are registered in CSS, so each change eases in.
export function applyPalette(colors) {
  const root = document.documentElement;
  colors.forEach(([r, g, b], i) => root.style.setProperty(`--amb${i + 1}`, `rgb(${r} ${g} ${b})`));
  root.classList.add('ambient-on');
}

export function clearPalette() {
  document.documentElement.classList.remove('ambient-on');
}
