// Frutiger Aero visualizations, drawn on a transparent canvas over the
// Now Playing scene. Fed ~30 fps band/wave data from the hidden player and
// smoothed to the display's frame rate here.

export const VIZ_MODES = [
  { id: 'art', label: 'Album art' },
  { id: 'bars', label: 'Glass Bars' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'halo', label: 'Halo' },
];

const N = 48;

export class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = 'bars';
    this.target = new Float32Array(N);
    this.bands = new Float32Array(N);
    this.peaks = new Float32Array(N);
    this.peakVel = new Float32Array(N);
    this.wave = new Float32Array(64).fill(0.5);
    this.bubbles = [];
    this.bass = 0;
    this.lastBass = 0;
    this.t = 0;
    this.art = null;
    this.artUrl = '';
    this.dark = false;
    this.running = false;
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(canvas);
  }

  feed({ bands, wave }) {
    // A gentle curve keeps loud passages from pinning every band near the top.
    for (let i = 0; i < N; i++) this.target[i] = Math.pow((bands[i] || 0) / 255, 1.5);
    for (let i = 0; i < 64; i++) this.wave[i] = (wave[i] ?? 128) / 255;
  }

  setArt(url) {
    if (!url || url === this.artUrl) return;
    this.artUrl = url;
    const img = new Image();
    img.onload = () => {
      if (this.artUrl === url) this.art = img;
    };
    img.src = url;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
  }

  destroy() {
    this.stop();
    this.ro.disconnect();
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    for (let i = 0; i < N; i++) {
      const k = this.target[i] > this.bands[i] ? 18 : 6; // fast attack, slower release
      this.bands[i] += (this.target[i] - this.bands[i]) * Math.min(1, k * dt);
      if (this.bands[i] >= this.peaks[i]) {
        this.peaks[i] = this.bands[i];
        this.peakVel[i] = 0;
      } else {
        this.peakVel[i] += 1.6 * dt;
        this.peaks[i] = Math.max(this.bands[i], this.peaks[i] - this.peakVel[i] * dt);
      }
    }
    this.lastBass = this.bass;
    this.bass = (this.bands[1] + this.bands[2] + this.bands[3] + this.bands[4]) / 4;

    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    if (this.w > 0 && this.h > 0) this[this.mode]?.(ctx, dt);
    requestAnimationFrame(this.frame);
  }

  // Glass Bars
  bars(ctx) {
    const { w, h } = this;
    const base = h * 0.66;
    const maxH = h * 0.56;
    const gap = Math.max(2, w / N * 0.22);
    const bw = (w - gap * (N + 1)) / N;
    const r = Math.min(bw / 2, 5);

    const body = ctx.createLinearGradient(0, base - maxH, 0, base);
    body.addColorStop(0, this.dark ? '#c6ffd0' : '#d9ffbf');
    body.addColorStop(0.25, this.dark ? '#5effa0' : '#8be04a');
    body.addColorStop(0.55, '#3fd0ff');
    body.addColorStop(1, '#0d5fb8');

    const refl = ctx.createLinearGradient(0, base, 0, base + maxH * 0.45);
    refl.addColorStop(0, 'rgba(90,200,255,.38)');
    refl.addColorStop(1, 'rgba(90,200,255,0)');

    for (let i = 0; i < N; i++) {
      const x = gap + i * (bw + gap);
      const bh = Math.max(2, this.bands[i] * maxH);

      ctx.save();
      ctx.shadowColor = 'rgba(80,220,255,.65)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = body;
      roundRect(ctx, x, base - bh, bw, bh, r, true);
      ctx.restore();

      // glass highlight on the left half
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      roundRect(ctx, x + 1, base - bh + 1, bw * 0.45, Math.max(0, bh - 2), Math.min(r, bw * 0.22), true);

      // reflection on the "floor"
      ctx.fillStyle = refl;
      ctx.fillRect(x, base + 3, bw, bh * 0.45);

      // falling peak cap
      const py = base - this.peaks[i] * maxH - 6;
      ctx.save();
      ctx.shadowColor = 'rgba(160,240,255,.9)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#eafcff';
      roundRect(ctx, x, py, bw, 3, 1.5, true);
      ctx.restore();
    }

    // glossy floor line
    const floor = ctx.createLinearGradient(0, 0, w, 0);
    floor.addColorStop(0, 'rgba(255,255,255,0)');
    floor.addColorStop(0.5, 'rgba(255,255,255,.85)');
    floor.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, base + 1, w, 1.5);
  }

  // Aurora
  aurora(ctx, dt) {
    const { w, h } = this;
    const avg = (a, b) => {
      let s = 0;
      for (let i = a; i < b; i++) s += this.bands[i];
      return s / (b - a);
    };
    const ribbons = [
      { color: [110, 255, 150], e: avg(0, 8), y: 0.62, speed: 0.6, freq: 1.6, phase: 0 },
      { color: [60, 225, 255], e: avg(8, 20), y: 0.52, speed: -0.45, freq: 2.2, phase: 2 },
      { color: [170, 140, 255], e: avg(20, 34), y: 0.42, speed: 0.35, freq: 2.8, phase: 4 },
      { color: [120, 200, 255], e: avg(34, 48), y: 0.34, speed: -0.7, freq: 3.4, phase: 1 },
    ];

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const rb of ribbons) {
      const amp = h * (0.05 + rb.e * 0.16);
      const thick = h * (0.06 + rb.e * 0.22);
      const y0 = h * rb.y;
      const pts = [];
      for (let i = 0; i <= 60; i++) {
        const x = (i / 60) * w;
        const u = (i / 60) * Math.PI * 2;
        const y = y0 + Math.sin(u * rb.freq + this.t * rb.speed * 2 + rb.phase) * amp + Math.sin(u * rb.freq * 2.3 - this.t * 1.3) * amp * 0.25;
        pts.push([x, y]);
      }
      const [r, g, b] = rb.color;
      // soft glow pass then a crisp curtain pass
      for (const pass of [{ blur: 18, a: 0.35 + rb.e * 0.4 }, { blur: 3, a: 0.25 + rb.e * 0.5 }]) {
        ctx.filter = `blur(${pass.blur}px)`;
        const grad = ctx.createLinearGradient(0, y0 - thick, 0, y0 + amp + thick * 0.3);
        grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
        grad.addColorStop(0.7, `rgba(${r},${g},${b},${pass.a})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - thick) : ctx.moveTo(x, y - thick)));
        for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + thick * 0.15);
        ctx.closePath();
        ctx.fill();
      }
      ctx.filter = 'none';
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + rb.e * 0.5})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    // fade the curtains out toward the canvas edges instead of a hard cut
    ctx.globalCompositeOperation = 'destination-in';
    const edge = ctx.createLinearGradient(0, 0, w, 0);
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(0.18, 'rgba(0,0,0,1)');
    edge.addColorStop(0.82, 'rgba(0,0,0,1)');
    edge.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // bubbles rise on bass hits
    if (this.bass > 0.55 && this.bass - this.lastBass > 0.04 && this.bubbles.length < 40) {
      for (let i = 0; i < 3; i++) {
        this.bubbles.push({ x: Math.random() * w, y: h + 20, r: 6 + Math.random() * 18, vy: 30 + Math.random() * 50, wob: Math.random() * 6 });
      }
    }
    this.bubbles = this.bubbles.filter((b) => b.y + b.r > -10);
    for (const b of this.bubbles) {
      b.y -= b.vy * dt;
      b.x += Math.sin(this.t * 2 + b.wob) * 12 * dt;
      drawBubble(ctx, b.x, b.y, b.r);
    }
  }

  // Halo
  halo(ctx) {
    const { w, h } = this;
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.22 * (1 + this.bass * 0.06);
    const maxLen = Math.min(w, h) * 0.2;
    const spokes = N * 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.t * 0.05);
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(80,220,255,.8)';
    ctx.shadowBlur = 10;
    for (let i = 0; i < spokes; i++) {
      const band = i < N ? i : spokes - 1 - i; // mirror so both halves match
      const v = this.bands[band];
      const len = 4 + v * maxLen;
      const a = (i / spokes) * Math.PI * 2;
      const g = ctx.createLinearGradient(0, 0, 0, -(R + 6 + len));
      g.addColorStop(0, '#3fd0ff');
      g.addColorStop(1, v > 0.6 ? '#d4ff8a' : '#9ff3ff');
      ctx.save();
      ctx.rotate(a);
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(2, ((Math.PI * 2 * R) / spokes) * 0.55);
      ctx.beginPath();
      ctx.moveTo(0, -(R + 6));
      ctx.lineTo(0, -(R + 6 + len));
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // album art disc with a glass rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.shadowColor = 'rgba(0,30,70,.6)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#0d3f86';
    ctx.fill();
    ctx.clip();
    if (this.art) ctx.drawImage(this.art, cx - R, cy - R, R * 2, R * 2);
    const gloss = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.2, cy + R * 0.2);
    gloss.addColorStop(0, 'rgba(255,255,255,.55)');
    gloss.addColorStop(0.48, 'rgba(255,255,255,.08)');
    gloss.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.stroke();

    // waveform ring
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const v = this.wave[i % 64] - 0.5;
      const a = (i / 64) * Math.PI * 2;
      const rr = R + 6 + maxLen + 14 + v * 40;
      const x = cx + Math.sin(a) * rr;
      const y = cy - Math.cos(a) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = 'rgba(180,240,255,.55)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(120,220,255,.9)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();
  }
}

function roundRect(ctx, x, y, w, h, r, fill) {
  if (w <= 0 || h <= 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
}

function drawBubble(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,.9)');
  g.addColorStop(0.18, 'rgba(255,255,255,.25)');
  g.addColorStop(0.6, 'rgba(255,255,255,.05)');
  g.addColorStop(0.9, 'rgba(180,240,255,.45)');
  g.addColorStop(1, 'rgba(255,255,255,.15)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
