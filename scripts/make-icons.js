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
  const render = async (svg, size) => {
    const url = await win.webContents.executeJavaScript(`new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = ${size};
        const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
        x.drawImage(img, 0, 0, ${size}, ${size}); res(c.toDataURL('image/png'));
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

  console.log('icons written to', OUT);
  app.quit();
});
