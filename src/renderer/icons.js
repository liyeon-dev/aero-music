// Monochrome glyphs (currentColor) and full-colour Vista-style icons.
// Colour icons reference the gradients defined once in index.html (<svg id="defs">).

const glyph = (d, vb = '0 0 24 24') => `<svg class="glyph" viewBox="${vb}" aria-hidden="true"><path d="${d}"/></svg>`;

export const g = {
  play: glyph('M6.8 5.2v13.6c0 .8.9 1.3 1.6.8l10.2-6.8c.6-.4.6-1.2 0-1.6L8.4 4.4C7.7 3.9 6.8 4.4 6.8 5.2z'),
  pause: glyph('M6.5 5h3.6v14H6.5zM13.9 5h3.6v14h-3.6z'),
  next: glyph('M5 6.2v11.6c0 .7.8 1.1 1.4.7l8.2-5.8c.5-.4.5-1 0-1.4L6.4 5.5C5.8 5.1 5 5.5 5 6.2zM16.5 5.5h2.7v13h-2.7z'),
  prev: glyph('M19 6.2v11.6c0 .7-.8 1.1-1.4.7l-8.2-5.8c-.5-.4-.5-1 0-1.4l8.2-5.8c.6-.4 1.4 0 1.4.7zM4.8 5.5h2.7v13H4.8z'),
  shuffle: glyph('M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z'),
  repeat: glyph('M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'),
  repeatOne: glyph('M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zM13 15V9h-1l-2 1v1h1.5v4H13z'),
  volume: glyph('M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'),
  mute: glyph('M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z'),
  heart: glyph('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'),
  search: glyph('M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'),
  back: glyph('M20 10.6H8.4l4.9-4.9L11.6 4 3.6 12l8 8 1.7-1.7-4.9-4.9H20z'),
  forward: glyph('M4 10.6h11.6l-4.9-4.9L12.4 4l8 8-8 8-1.7-1.7 4.9-4.9H4z'),
  chevron: glyph('M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'),
  chevronLeft: glyph('M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z'),
  sun: glyph('M12 7a5 5 0 100 10 5 5 0 000-10zM2 13h2a1 1 0 000-2H2a1 1 0 000 2zm18 0h2a1 1 0 000-2h-2a1 1 0 000 2zM11 2v2a1 1 0 002 0V2a1 1 0 00-2 0zm0 18v2a1 1 0 002 0v-2a1 1 0 00-2 0zM5.99 4.58a1 1 0 00-1.41 1.41l1.06 1.06a1 1 0 001.41-1.41L5.99 4.58zm12.37 12.37a1 1 0 00-1.41 1.41l1.06 1.06a1 1 0 001.41-1.41l-1.06-1.06zm1.06-10.96a1 1 0 00-1.41-1.41l-1.06 1.06a1 1 0 001.41 1.41l1.06-1.06zM7.05 18.36a1 1 0 00-1.41-1.41l-1.06 1.06a1 1 0 001.41 1.41l1.06-1.06z'),
  moon: glyph('M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z'),
  auto: glyph('M12 2a10 10 0 100 20 10 10 0 000-20zm0 18V4a8 8 0 010 16z'),
  miniPlayer: glyph('M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z'),
  min: '<svg class="cap" viewBox="0 0 10 10"><rect x="1" y="6" width="8" height="2.6" rx=".4"/></svg>',
  max: '<svg class="cap" viewBox="0 0 10 10"><path d="M1 1h8v8H1zM2.6 3.4v4h4.8v-4z" fill-rule="evenodd"/></svg>',
  restore: '<svg class="cap" viewBox="0 0 10 10"><path d="M3 0.6h6.4V7H8V2H3zM0.6 3h6.4v6.4H0.6zM2 4.6v3.4h3.6V4.6z" fill-rule="evenodd"/></svg>',
  close: '<svg class="cap" viewBox="0 0 10 10"><path d="M1.2 0l3.8 3.4L8.8 0 10 1.3 6.4 5 10 8.7 8.8 10 5 6.6 1.2 10 0 8.7 3.6 5 0 1.3z"/></svg>',
};

// Glossy colour icons for the navigation pane.
export const c = {
  logo: `<svg class="ci" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill="url(#gl-orb)" stroke="#0b5d8a" stroke-width="1.5"/>
      <path d="M9 40c10 8 32 10 46-6-8 18-38 20-46 6z" fill="url(#gl-leaf)" opacity=".95"/>
      <path d="M38 14v20.5a6.5 5.2 0 11-3-4.3V20l-9 2.4v16a6.5 5.2 0 11-3-4.3V18.6z" fill="#fff" stroke="#0a4f78" stroke-width="1.2" stroke-linejoin="round"/>
      <ellipse cx="32" cy="17" rx="21" ry="12" fill="url(#gl-shine)"/>
    </svg>`,
  home: `<svg class="ci" viewBox="0 0 20 20"><path d="M3.5 9.5V17.5h13V9.5" fill="url(#gl-wall)" stroke="#8a6a3a" stroke-width=".9"/><path d="M8 17.5v-5h4v5" fill="url(#gl-door)" stroke="#23517e" stroke-width=".8"/><path d="M1.3 10.2L10 2.6l8.7 7.6-1.3 1.3L10 5.2l-7.4 6.3z" fill="url(#gl-roof)" stroke="#1d4e86" stroke-width=".8" stroke-linejoin="round"/></svg>`,
  now: `<svg class="ci" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.6" fill="url(#gl-green)" stroke="#2b7a12" stroke-width=".9"/><path d="M8 6.3v6.2l5.5-3.1z" fill="#fff" stroke="#2b6a15" stroke-width=".6" stroke-linejoin="round"/><ellipse cx="10" cy="6" rx="6" ry="3.4" fill="url(#gl-shine)"/></svg>`,
  search: `<svg class="ci" viewBox="0 0 20 20"><path d="M12.4 12.6l5 5" stroke="#3a3a3a" stroke-width="3" stroke-linecap="round"/><path d="M12.4 12.6l5 5" stroke="#8a8a8a" stroke-width="1.4" stroke-linecap="round"/><circle cx="8.2" cy="8.2" r="6" fill="url(#gl-lens)" stroke="#2f5f8f" stroke-width="1.5"/><ellipse cx="7" cy="6" rx="3.4" ry="2" fill="#fff" opacity=".7"/></svg>`,
  liked: `<svg class="ci" viewBox="0 0 20 20"><path d="M10 17.6l-1.2-1.1C4.5 12.6 1.7 10.1 1.7 7 1.7 4.4 3.7 2.5 6.2 2.5c1.4 0 2.8.7 3.8 1.7 1-1 2.4-1.7 3.8-1.7 2.5 0 4.5 1.9 4.5 4.5 0 3.1-2.8 5.6-7.1 9.5z" fill="url(#gl-heart)" stroke="#9a1430" stroke-width=".8"/><ellipse cx="6.4" cy="5.6" rx="2.6" ry="1.5" fill="#fff" opacity=".65" transform="rotate(-25 6.4 5.6)"/></svg>`,
  folder: `<svg class="ci" viewBox="0 0 20 20"><path d="M1.5 4.5h6l1.6 1.8h9.4v10.2h-17z" fill="#d9a33b" stroke="#9c6e1b" stroke-width=".8"/><path d="M1.5 7.6h17l-.4 8.9H1.9z" fill="url(#gl-folder)" stroke="#a87a22" stroke-width=".8"/><path d="M2 8.2h16" stroke="#fff6c8" stroke-width=".8"/></svg>`,
  cd: `<svg class="ci" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.6" fill="url(#gl-cd)" stroke="#7d8a96" stroke-width=".8"/><circle cx="10" cy="10" r="8" fill="url(#gl-rainbow)" opacity=".5"/><circle cx="10" cy="10" r="2.6" fill="#e9eef3" stroke="#7d8a96" stroke-width=".8"/><circle cx="10" cy="10" r="1" fill="#fff" stroke="#7d8a96" stroke-width=".5"/></svg>`,
  tape: `<svg class="ci" viewBox="0 0 20 20"><rect x="1.2" y="4" width="17.6" height="12" rx="1.6" fill="url(#gl-tape)" stroke="#8a4a12" stroke-width=".8"/><rect x="3.4" y="5.8" width="13.2" height="5.6" rx=".8" fill="#fff8e6" stroke="#b07a3a" stroke-width=".5"/><circle cx="7" cy="8.6" r="1.6" fill="#3a2a1a"/><circle cx="13" cy="8.6" r="1.6" fill="#3a2a1a"/><circle cx="7" cy="8.6" r=".6" fill="#fff"/><circle cx="13" cy="8.6" r=".6" fill="#fff"/><path d="M5.2 16l1.2-2.6h7.2l1.2 2.6" fill="#6b3a10" opacity=".55"/><ellipse cx="10" cy="5.4" rx="7.4" ry="1.6" fill="#fff" opacity=".45"/></svg>`,
  note: `<svg class="ci" viewBox="0 0 20 20"><path d="M14.5 2.5v9.6a2.8 2.3 0 11-1.6-2V5.6L8 6.8v7.4a2.8 2.3 0 11-1.6-2V4.4z" fill="url(#gl-roof)" stroke="#1d4e86" stroke-width=".7" stroke-linejoin="round"/></svg>`,
};
