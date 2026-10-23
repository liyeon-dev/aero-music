// Turns raw YouTube Music (InnerTube) responses into the small plain objects
// the UI renders. YouTube reshuffles its response nesting often, so these
// walk the tree looking for known renderers instead of fixed paths.

const SHELVES = [
  'musicCarouselShelfRenderer',
  'musicShelfRenderer',
  'musicPlaylistShelfRenderer',
  'gridRenderer',
  'musicCardShelfRenderer',
  'itemSectionRenderer',
];
const HEADERS = [
  'musicResponsiveHeaderRenderer',
  'musicDetailHeaderRenderer',
  'musicImmersiveHeaderRenderer',
  'musicVisualHeaderRenderer',
];

const text = (o) => (o?.runs ? o.runs.map((r) => r.text).join('') : o?.simpleText ?? '');

// Collects every value stored under `key`, without descending into matches.
function findAll(obj, key, out = []) {
  if (Array.isArray(obj)) {
    for (const x of obj) findAll(x, key, out);
  } else if (obj && typeof obj === 'object') {
    for (const k in obj) {
      if (k === key) out.push(obj[k]);
      else findAll(obj[k], key, out);
    }
  }
  return out;
}
const findFirst = (obj, key) => findAll(obj, key)[0];

function bigThumb(url) {
  if (!url) return null;
  if (/googleusercontent\.com|ggpht\.com/.test(url)) return url.replace(/=w\d+-h\d+[^/]*$/, '=w544-h544-l90-rj');
  return url;
}

function thumbOf(o) {
  const list = findFirst(o, 'thumbnails');
  return list?.length ? bigThumb(list[list.length - 1].url) : null;
}

function pageTypeOf(ep) {
  const t = ep?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
  return t ? t.replace('MUSIC_PAGE_TYPE_', '').toLowerCase() : null;
}

// Splits "Artist & Artist • Album • 2013" style runs into structured parts.
function bylineParts(runs = []) {
  const artists = [];
  let album = null;
  const extra = [];
  for (const r of runs) {
    const t = pageTypeOf(r.navigationEndpoint);
    const id = r.navigationEndpoint?.browseEndpoint?.browseId;
    if (t === 'artist' || t === 'user_channel') artists.push({ name: r.text, id });
    else if (t === 'album') album = { name: r.text, id };
    else if (r.text.trim() && !/^\s*[•&,]\s*$/.test(r.text)) extra.push(r.text.trim());
  }
  return { artists, album, extra };
}

const KIND_WORDS = ['Song', 'Video', 'Album', 'Single', 'EP', 'Artist', 'Playlist', 'Episode', 'Podcast', 'Profile'];

function parseListItem(r) {
  const cols = (r.flexColumns || []).map((c) => c.musicResponsiveListItemFlexColumnRenderer?.text);
  const titleRun = cols[0]?.runs?.[0];
  const title = text(cols[0]);
  const rest = cols.slice(1).flatMap((c) => c?.runs || []);
  const { artists, album, extra } = bylineParts(rest);
  const fixed = (r.fixedColumns || []).map((c) => text(c.musicResponsiveListItemFixedColumnRenderer?.text));
  const duration = [...fixed, ...extra].find((s) => /^\d+(:\d+)+$/.test(s)) || '';
  const kindWord = extra.find((s) => KIND_WORDS.includes(s));
  const watch = titleRun?.navigationEndpoint?.watchEndpoint;
  const videoId = r.playlistItemData?.videoId || watch?.videoId;
  const nav = r.navigationEndpoint;

  if (videoId && !nav?.browseEndpoint) {
    return {
      type: 'song',
      videoId,
      title,
      artists,
      album,
      duration,
      thumb: thumbOf(r.thumbnail),
      index: text(r.index),
      kind: kindWord === 'Video' ? 'video' : 'song',
    };
  }
  if (nav?.browseEndpoint) {
    const type = pageTypeOf(nav) || 'playlist';
    return {
      type: type === 'user_channel' ? 'artist' : type,
      browseId: nav.browseEndpoint.browseId,
      title,
      subtitle: extra.filter((s) => s !== kindWord).join(' • ') || artists.map((a) => a.name).join(', '),
      kindLabel: kindWord || '',
      artists,
      thumb: thumbOf(r.thumbnail),
    };
  }
  return null;
}

function parseTwoRow(r) {
  const nav = r.navigationEndpoint;
  const title = text(r.title);
  const subRuns = r.subtitle?.runs || [];
  const { artists } = bylineParts(subRuns);
  const subtitle = text(r.subtitle);
  const thumb = thumbOf(r.thumbnailRenderer);
  if (nav?.watchEndpoint) {
    return { type: 'song', videoId: nav.watchEndpoint.videoId, playlistId: nav.watchEndpoint.playlistId, title, artists, subtitle, thumb, kind: /video/i.test(subtitle) ? 'video' : 'song' };
  }
  if (nav?.watchPlaylistEndpoint) {
    return { type: 'playlist', playlistId: nav.watchPlaylistEndpoint.playlistId, title, subtitle, artists, thumb };
  }
  if (nav?.browseEndpoint) {
    const type = pageTypeOf(nav) || 'playlist';
    const play = findFirst(r.thumbnailOverlay, 'watchPlaylistEndpoint');
    return {
      type: type === 'user_channel' ? 'artist' : type,
      browseId: nav.browseEndpoint.browseId,
      playlistId: play?.playlistId,
      title,
      subtitle,
      artists,
      thumb,
    };
  }
  return null;
}

function parseItems(list = []) {
  const items = [];
  for (const entry of list) {
    if (entry.musicResponsiveListItemRenderer) items.push(parseListItem(entry.musicResponsiveListItemRenderer));
    else if (entry.musicTwoRowItemRenderer) items.push(parseTwoRow(entry.musicTwoRowItemRenderer));
  }
  return items.filter(Boolean);
}

function parseCard(r) {
  const run = r.title?.runs?.[0];
  const nav = run?.navigationEndpoint;
  const top = {
    title: text(r.title),
    subtitle: text(r.subtitle),
    thumb: thumbOf(r.thumbnail),
  };
  if (nav?.watchEndpoint) Object.assign(top, { type: 'song', videoId: nav.watchEndpoint.videoId, artists: bylineParts(r.subtitle?.runs).artists });
  else if (nav?.browseEndpoint) Object.assign(top, { type: pageTypeOf(nav) || 'playlist', browseId: nav.browseEndpoint.browseId });
  return { title: 'Top result', layout: 'top', top, items: parseItems(r.contents) };
}

function shelfTitle(r) {
  return text(
    r.header?.musicCarouselShelfBasicHeaderRenderer?.title ||
      r.header?.gridHeaderRenderer?.title ||
      r.header?.musicShelfHeaderRenderer?.title ||
      r.title,
  );
}

// Returns [{ title, layout: 'carousel'|'list'|'grid'|'top', items }]
function parseSections(resp) {
  const sections = [];
  (function walk(o) {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== 'object') return;
    for (const k in o) {
      if (SHELVES.includes(k)) {
        const r = o[k];
        if (k === 'musicCardShelfRenderer') {
          sections.push(parseCard(r));
          continue;
        }
        const items = parseItems(r.contents || r.items);
        if (!items.length) {
          walk(r);
          continue;
        }
        const twoRow = (r.contents || r.items || []).some((e) => e.musicTwoRowItemRenderer);
        sections.push({ title: shelfTitle(r), layout: k === 'gridRenderer' ? 'grid' : twoRow ? 'carousel' : 'list', items });
      } else if (!HEADERS.includes(k)) {
        walk(o[k]);
      }
    }
  })(resp.contents || resp.continuationContents || resp);

  // Search returns every result as its own one-item section; group them.
  const merged = [];
  for (const s of sections) {
    const prev = merged[merged.length - 1];
    if (prev && !s.title && !prev.title && s.layout === prev.layout && prev.layout === 'list') prev.items.push(...s.items);
    else merged.push(s);
  }
  return merged;
}

function parseHeader(resp) {
  for (const key of HEADERS) {
    const h = findFirst(resp, key);
    if (!h) continue;
    const strap = h.straplineTextOne?.runs || [];
    const play = findFirst(h, 'watchPlaylistEndpoint');
    return {
      title: text(h.title),
      subtitle: text(h.subtitle),
      secondSubtitle: text(h.secondSubtitle),
      artists: bylineParts(strap).artists,
      byline: text(h.straplineTextOne),
      description: text(findFirst(h, 'musicDescriptionShelfRenderer')?.description || h.description),
      thumb: thumbOf(h.thumbnail),
      playlistId: play?.playlistId,
      immersive: key === 'musicImmersiveHeaderRenderer' || key === 'musicVisualHeaderRenderer',
    };
  }
  return null;
}

function parsePage(resp, browseId) {
  const header = parseHeader(resp) || {};
  const sections = parseSections(resp);
  // Album tracks come without art or artist; borrow the header's.
  for (const s of sections) {
    for (const it of s.items) {
      if (it.type !== 'song') continue;
      if (!it.thumb) it.thumb = header.thumb;
      if (!it.artists?.length && header.artists?.length) it.artists = header.artists;
      if (!it.album && /^MPREb_/.test(browseId)) it.album = { name: header.title, id: browseId };
    }
  }
  if (!header.playlistId && browseId?.startsWith('VL')) header.playlistId = browseId.slice(2);
  return { header, sections };
}

function parseQueue(resp) {
  const panels = findAll(resp, 'playlistPanelVideoRenderer');
  const tracks = panels
    .filter((p) => p.videoId)
    .map((p) => {
      const { artists, album } = bylineParts(p.longBylineText?.runs);
      return {
        type: 'song',
        videoId: p.videoId,
        title: text(p.title),
        artists: artists.length ? artists : [{ name: text(p.shortBylineText) }],
        album,
        duration: text(p.lengthText),
        thumb: thumbOf(p.thumbnail),
      };
    });
  const cont = findFirst(resp, 'nextRadioContinuationData') || findFirst(resp, 'nextContinuationData');
  const tabs = findAll(resp, 'tabRenderer');
  const lyricsTab = tabs.find((t) => pageTypeOf(t.endpoint) === 'track_lyrics');
  const relatedTab = tabs.find((t) => pageTypeOf(t.endpoint) === 'track_related');
  return {
    tracks,
    liked: findFirst(resp.playerOverlays, 'likeButtonRenderer')?.likeStatus === 'LIKE',
    continuation: cont?.continuation || null,
    lyricsId: lyricsTab?.endpoint.browseEndpoint.browseId || null,
    relatedId: relatedTab?.endpoint.browseEndpoint.browseId || null,
  };
}

function parseLyrics(resp) {
  const shelf = findFirst(resp, 'musicDescriptionShelfRenderer');
  if (shelf) return { text: text(shelf.description), source: text(shelf.footer) };
  const msg = findFirst(resp, 'messageRenderer');
  return { text: '', source: msg ? text(msg.text) : '' };
}

function parseAccount(resp) {
  const h = findFirst(resp, 'activeAccountHeaderRenderer');
  if (!h) return null;
  return { name: text(h.accountName), handle: text(h.channelHandle), photo: thumbOf(h.accountPhoto) };
}

// The Decades button on the Moods & genres page; its params open the category.
function parseDecadesParams(resp) {
  const btn = findAll(resp, 'musicNavigationButtonRenderer').find((b) => /decade/i.test(text(b.buttonText)));
  return btn?.clickCommand?.browseEndpoint?.params || null;
}

module.exports = { parseSections, parsePage, parseQueue, parseLyrics, parseAccount, parseDecadesParams };
