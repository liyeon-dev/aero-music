// Renders the SVG icons below to PNG/ICO files in assets/.
// Run with: npx electron scripts/make-icons.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets');

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="o" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#bff3ff"/><stop offset=".45" stop-color="#2fb5ec"/><stop offset="1" stop-color="#0a5d9c"/></radialGradient>
    <linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d6ff7a"/><stop offset="1" stop-color="#3fae1c"/></linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/></linearGradient>
  </defs>
  <circle cx="32" cy="32" r="29.5" fill="url(#o)" stroke="#0b5d8a" stroke-width="2"/>
  <path d="M9 40c10 8 32 10 46-6-8 18-38 20-46 6z" fill="url(#l)"/>
  <path d="M38 14v20.5a6.5 5.2 0 11-3-4.3V20l-9 2.4v16a6.5 5.2 0 11-3-4.3V18.6z" fill="#fff" stroke="#0a4f78" stroke-width="1.4" stroke-linejoin="round"/>
  <ellipse cx="32" cy="17" rx="21" ry="12" fill="url(#s)"/>
</svg>`;

// Glossy blue glyphs readable on both light and dark taskbar previews.
const glyph = (d) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fe4ff"/><stop offset=".5" stop-color="#2f9be8"/><stop offset="1" stop-color="#0d5aa8"/></linearGradient></defs>
  <path d="${d}" fill="url(#g)" stroke="#06305e" stroke-width="1.3" stroke-linejoin="round"/>
</svg>`;

const GLYPHS = {
  play: 'M6 4.5v15c0 .8.9 1.3 1.6.8l11-7.5c.6-.4.6-1.2 0-1.6l-11-7.5C6.9 3.2 6 3.7 6 4.5z',
  pause: 'M5.5 4h4.5v16H5.5zM14 4h4.5v16H14z',
  next: 'M3.5 5v14c0 .8.9 1.2 1.5.8l9-6.6c.5-.4.5-1.1 0-1.5L5 5.1C4.4 4.7 3.5 5.1 3.5 5zM16 4.5h4v15h-4z',
  prev: 'M20.5 5v14c0 .8-.9 1.2-1.5.8l-9-6.6c-.5-.4-.5-1.1 0-1.5l9-6.6c.6-.4 1.5 0 1.5.8zM4 4.5h4v15H4z',
};

// Installer artwork (NSIS wants 24-bit BMPs): sidebar 164x314, header 150x57.
const SKY = `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1673c4"/><stop offset=".45" stop-color="#3ea6e6"/><stop offset=".8" stop-color="#8fd6f7"/><stop offset="1" stop-color="#d8f4ff"/></linearGradient>
    <radialGradient id="hill" cx="50%" cy="100%" r="100%"><stop offset="0" stop-color="#c9f774"/><stop offset=".6" stop-color="#6cc92f"/><stop offset="1" stop-color="#3f9c1b"/></radialGradient>
    <radialGradient id="bub" cx="32%" cy="28%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".2" stop-color="#fff" stop-opacity=".25"/><stop offset=".7" stop-color="#fff" stop-opacity=".08"/><stop offset=".95" stop-color="#fff" stop-opacity=".7"/></radialGradient>
  </defs>`;
const SIDEBAR = `<svg xmlns="http://www.w3.org/2000/svg" width="164" height="314" viewBox="0 0 164 314">${SKY}
  <rect width="164" height="314" fill="url(#sky)"/>
  <ellipse cx="82" cy="-20" rx="120" ry="90" fill="#fff" opacity=".35"/>
  <path d="M0 236C40 214 90 250 164 222" stroke="#fff" stroke-opacity=".8" stroke-width="1.6" fill="none"/>
  <path d="M0 246C46 226 96 262 164 234" stroke="#fff" stroke-opacity=".4" stroke-width="1" fill="none"/>
  <ellipse cx="120" cy="330" rx="130" ry="70" fill="url(#hill)" stroke="#2f7f12" stroke-width="1"/>
  <ellipse cx="20" cy="340" rx="110" ry="60" fill="url(#hill)" stroke="#2f7f12" stroke-width="1"/>
  <circle cx="30" cy="60" r="9" fill="url(#bub)"/><circle cx="140" cy="40" r="14" fill="url(#bub)"/>
  <circle cx="128" cy="180" r="7" fill="url(#bub)"/><circle cx="22" cy="190" r="12" fill="url(#bub)"/>
  <circle cx="60" cy="24" r="5" fill="url(#bub)"/>
  <g transform="translate(42 70) scale(1.25)">${LOGO.replace(/<\/?svg[^>]*>/g, '')}</g>
  <text x="82" y="178" text-anchor="middle" font-family="Segoe UI Light, Segoe UI" font-size="21" fill="#fff" style="paint-order:stroke" stroke="#0b4a8f" stroke-opacity=".35" stroke-width="2">Aero Music</text>
</svg>`;
const HEADER = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="57" viewBox="0 0 150 57">${SKY}
  <rect width="150" height="57" fill="url(#sky)"/>
  <path d="M0 44C40 30 90 56 150 36" stroke="#fff" stroke-opacity=".75" stroke-width="1.2" fill="none"/>
  <ellipse cx="110" cy="70" rx="80" ry="22" fill="url(#hill)"/>
  <circle cx="20" cy="14" r="5" fill="url(#bub)"/><circle cx="60" cy="40" r="4" fill="url(#bub)"/>
  <g transform="translate(100 6) scale(.7)">${LOGO.replace(/<\/?svg[^>]*>/g, '')}</g>
</svg>`;

// macOS artwork. App icons sit on Apple's 1024 grid: an 824px continuous-corner
// tile, centred, with a soft shadow. macOS 26 jails icons that don't fill it.
const ORB = LOGO.replace(/<\/?svg[^>]*>/g, '');
function squircle(x, y, size, r) {
  // Bezier fit of the continuous ("squircle") corner, as (along edge, into corner) multiples of r.
  const k = [[1.52866483, 0], [1.08849296, 0], [0.86840694, 0], [0.66993427, 0.065496], [0.37282614, 0.16905956],
    [0.16905956, 0.37282614], [0.065496, 0.66993427], [0, 0.86840694], [0, 1.08849296], [0, 1.52866483]];
  const x2 = x + size, y2 = y + size;
  const corners = [
    (p, q) => [x2 - p * r, y + q * r],
    (p, q) => [x2 - q * r, y2 - p * r],
    (p, q) => [x + p * r, y2 - q * r],
    (p, q) => [x + q * r, y + p * r],
  ];
  return corners.map((pt, i) => {
    const P = k.map(([p, q]) => pt(p, q).map((n) => +n.toFixed(2)).join(' '));
    return `${i ? 'L' : 'M'}${P[0]}C${P[1]} ${P[2]} ${P[3]}C${P[4]} ${P[5]} ${P[6]}C${P[7]} ${P[8]} ${P[9]}`;
  }).join('') + 'Z';
}
const TILE = squircle(100, 100, 824, 185);
const TILE_DEFS = `
  <defs>
    <clipPath id="tile"><path d="${TILE}"/></clipPath>
    <filter id="drop" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dy="12" stdDeviation="12" flood-color="#00264d" flood-opacity=".4"/></filter>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity=".03"/></linearGradient>
  </defs>
  <path d="${TILE}" fill="#1673c4" filter="url(#drop)"/>`;
const TILE_RIM = `<path d="${TILE}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="10" clip-path="url(#tile)"/>`;
const MAC_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${SKY}${TILE_DEFS}
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="lift" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dy="18" stdDeviation="16" flood-color="#002a55" flood-opacity=".45"/></filter>
  </defs>
  <g clip-path="url(#tile)">
    <rect x="100" y="100" width="824" height="824" fill="url(#sky)"/>
    <circle cx="512" cy="480" r="420" fill="url(#glow)"/>
    <path d="M100 742C300 668 560 806 924 690" stroke="#fff" stroke-opacity=".85" stroke-width="9" fill="none"/>
    <path d="M100 782C330 712 590 840 924 736" stroke="#fff" stroke-opacity=".45" stroke-width="6" fill="none"/>
    <ellipse cx="760" cy="1010" rx="520" ry="215" fill="url(#hill)" stroke="#2f7f12" stroke-width="5"/>
    <ellipse cx="200" cy="1040" rx="470" ry="200" fill="url(#hill)" stroke="#2f7f12" stroke-width="5"/>
    <circle cx="214" cy="238" r="46" fill="url(#bub)"/><circle cx="836" cy="214" r="62" fill="url(#bub)"/>
    <circle cx="300" cy="150" r="22" fill="url(#bub)"/><circle cx="182" cy="640" r="34" fill="url(#bub)"/>
    <circle cx="852" cy="596" r="26" fill="url(#bub)"/>
    <path d="M100 100H924V412C700 344 330 350 100 452Z" fill="url(#gloss)"/>
  </g>
  ${TILE_RIM}
  <g filter="url(#lift)"><g transform="translate(220 178) scale(9.125)">${ORB}</g></g>
</svg>`;
// At 16-32px the scene turns to mush, so the tile itself becomes the orb, with a bigger note over the gloss.
const MAC_ICON_SMALL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${TILE_DEFS}
  <g clip-path="url(#tile)">
    <g transform="translate(100 100) scale(12.875)">${LOGO.match(/<defs>[\s\S]*?<\/defs>/)[0]}
      <rect width="64" height="64" fill="url(#o)"/>
      ${LOGO.match(/<path d="M9[^>]*>/)[0]}
      <ellipse cx="32" cy="17" rx="21" ry="12" fill="url(#s)" opacity=".5"/>
      <path d="${LOGO.match(/d="(M38[^"]*)"/)[1]}" transform="translate(-7.7 -12.6) scale(1.5)" fill="#fff" stroke="#0a4f78" stroke-width="2.2" stroke-linejoin="round"/>
    </g>
  </g>
  ${TILE_RIM}
</svg>`;

// Menu bar template: black + alpha only (macOS tints it). Beamed note on an 18pt grid, stems on whole pixels.
const TRAY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
  <path d="M6 4.8L15.5 1.85V12.1H14V4.71L7.5 6.73V13.8H6z"/>
  <ellipse cx="4.58" cy="13.7" rx="3" ry="2.25" transform="rotate(-20 4.58 13.7)"/>
  <ellipse cx="12.58" cy="12" rx="3" ry="2.25" transform="rotate(-20 12.58 12)"/>
</svg>`;

// DMG window art, 540x380 (rendered again at 2x). Icon slots are centred at (140,200) and (400,200);
// the label row under them stays mid-blue so Finder's black (light) or white (dark) labels both read.
const DMG_BG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 380">${SKY}
  <defs>
    <linearGradient id="dsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d5aa8"/><stop offset=".4" stop-color="#1c7fcf"/><stop offset=".7" stop-color="#2f97dc"/><stop offset=".8" stop-color="#7cccf4"/><stop offset=".88" stop-color="#d8f4ff"/></linearGradient>
    <linearGradient id="arrow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset=".52" stop-color="#bfeaff" stop-opacity=".25"/><stop offset="1" stop-color="#e4f7ff" stop-opacity=".55"/></linearGradient>
    <filter id="soft" x="-20%" y="-40%" width="140%" height="180%"><feDropShadow dy="2" stdDeviation="3" flood-color="#00305e" flood-opacity=".35"/></filter>
  </defs>
  <rect width="540" height="380" fill="url(#dsky)"/>
  <ellipse cx="270" cy="-60" rx="400" ry="140" fill="#fff" opacity=".22"/>
  <path d="M0 318C140 290 300 338 540 300" stroke="#fff" stroke-opacity=".8" stroke-width="1.8" fill="none"/>
  <path d="M0 330C150 304 310 350 540 314" stroke="#fff" stroke-opacity=".4" stroke-width="1.2" fill="none"/>
  <ellipse cx="400" cy="420" rx="260" ry="80" fill="url(#hill)" stroke="#2f7f12" stroke-width="1"/>
  <ellipse cx="90" cy="430" rx="230" ry="74" fill="url(#hill)" stroke="#2f7f12" stroke-width="1"/>
  <circle cx="40" cy="44" r="12" fill="url(#bub)"/><circle cx="500" cy="70" r="18" fill="url(#bub)"/>
  <circle cx="466" cy="26" r="7" fill="url(#bub)"/><circle cx="30" cy="250" r="9" fill="url(#bub)"/>
  <circle cx="512" cy="232" r="11" fill="url(#bub)"/><circle cx="270" cy="120" r="5" fill="url(#bub)"/>
  <g transform="translate(186 34) scale(.72)">${ORB}</g>
  <text x="240" y="69" font-family="Segoe UI Light, Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="300" font-size="26" fill="#fff" style="paint-order:stroke" stroke="#0b4a8f" stroke-opacity=".35" stroke-width="2">Aero Music</text>
  <g filter="url(#soft)">
    <path d="M216 188H292V168L336 200L292 232V212H216A12 12 0 0 1 216 188Z" fill="url(#arrow)" stroke="#fff" stroke-opacity=".9" stroke-width="1.5" stroke-linejoin="round"/>
  </g>
  <text x="270" y="256" text-anchor="middle" font-family="Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="13" fill="#fff" style="paint-order:stroke" stroke="#0b4a8f" stroke-opacity=".4" stroke-width="2">Drag to Applications</text>
</svg>`;

// An .icns file is a list of (type, length, data) chunks; these types all take PNG data.
function icns(chunks) {
  const parts = chunks.map(({ type, data }) => {
    const head = Buffer.alloc(8);
    head.write(type, 0, 'ascii');
    head.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([head, data]);
  });
  const head = Buffer.alloc(8);
  head.write('icns', 0, 'ascii');
  head.writeUInt32BE(8 + parts.reduce((n, p) => n + p.length, 0), 4);
  return Buffer.concat([head, ...parts]);
}

// Minimal 24-bit bottom-up BMP encoder for RGBA pixel data.
function bmp(width, height, rgba) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const size = 54 + rowSize * height;
  const b = Buffer.alloc(size);
  b.write('BM', 0);
  b.writeUInt32LE(size, 2);
  b.writeUInt32LE(54, 10);
  b.writeUInt32LE(40, 14);
  b.writeInt32LE(width, 18);
  b.writeInt32LE(height, 22);
  b.writeUInt16LE(1, 26);
  b.writeUInt16LE(24, 28);
  b.writeUInt32LE(rowSize * height, 34);
  for (let y = 0; y < height; y++) {
    const row = 54 + (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      b[row + x * 3] = rgba[i + 2];
      b[row + x * 3 + 1] = rgba[i + 1];
      b[row + x * 3 + 2] = rgba[i];
    }
  }
  return b;
}

// A .ico file can hold PNG images directly.
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<canvas></canvas>');
  const render = async (svg, size, height = size) => {
    const url = await win.webContents.executeJavaScript(`new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = ${size}; c.height = ${height};
        const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
        x.drawImage(img, 0, 0, ${size}, ${height}); res(c.toDataURL('image/png'));
      };
      img.onerror = rej;
      img.src = 'data:image/svg+xml;base64,' + ${JSON.stringify(Buffer.from(svg).toString('base64'))};
    })`);
    return Buffer.from(url.split(',')[1], 'base64');
  };

  const sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256];
  const logo = [];
  for (const s of sizes) logo.push({ size: s, data: await render(LOGO, s) });
  fs.writeFileSync(path.join(OUT, 'icon.ico'), ico(logo));
  fs.writeFileSync(path.join(OUT, 'icon.png'), logo.find((p) => p.size === 256).data);

  for (const [name, d] of Object.entries(GLYPHS)) {
    fs.writeFileSync(path.join(OUT, `${name}.png`), await render(glyph(d), 16));
    fs.writeFileSync(path.join(OUT, `${name}@2x.png`), await render(glyph(d), 32));
  }
  const pixels = (svg, w, h) =>
    win.webContents.executeJavaScript(`new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = ${w}; c.height = ${h};
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, ${w}, ${h});
        x.drawImage(img, 0, 0, ${w}, ${h});
        res(Array.from(x.getImageData(0, 0, ${w}, ${h}).data));
      };
      img.onerror = rej;
      img.src = 'data:image/svg+xml;base64,' + ${JSON.stringify(Buffer.from(svg).toString('base64'))};
    })`);
  fs.writeFileSync(path.join(OUT, 'installer-sidebar.bmp'), bmp(164, 314, await pixels(SIDEBAR, 164, 314)));
  fs.writeFileSync(path.join(OUT, 'installer-header.bmp'), bmp(150, 57, await pixels(HEADER, 150, 57)));

  // macOS: app icon (.icns + a 512px PNG for the dev Dock icon), menu bar template, DMG background.
  const mac = {};
  for (const s of [1024, 512, 256, 128, 64]) mac[s] = await render(MAC_ICON, s);
  for (const s of [16, 32]) mac[s] = await render(MAC_ICON_SMALL, s);
  fs.writeFileSync(path.join(OUT, 'icon.icns'), icns([
    { type: 'icp4', data: mac[16] }, { type: 'icp5', data: mac[32] }, { type: 'ic11', data: mac[32] },
    { type: 'ic12', data: mac[64] }, { type: 'ic07', data: mac[128] }, { type: 'ic13', data: mac[256] },
    { type: 'ic08', data: mac[256] }, { type: 'ic14', data: mac[512] }, { type: 'ic09', data: mac[512] },
    { type: 'ic10', data: mac[1024] },
  ]));
  fs.writeFileSync(path.join(OUT, 'icon-mac.png'), mac[512]);
  fs.writeFileSync(path.join(OUT, 'trayTemplate.png'), await render(TRAY, 18));
  fs.writeFileSync(path.join(OUT, 'trayTemplate@2x.png'), await render(TRAY, 36));
  // electron-builder merges background.png + background@2x.png into a HiDPI TIFF with tiffutil.
  fs.writeFileSync(path.join(OUT, 'dmg-background.png'), await render(DMG_BG, 540, 380));
  fs.writeFileSync(path.join(OUT, 'dmg-background@2x.png'), await render(DMG_BG, 1080, 760));

  console.log('icons written to', OUT);
  app.quit();
});
