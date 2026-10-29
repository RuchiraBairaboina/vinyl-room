// Helpers for working with public Spotify links — no API key or developer app needed.
// Album art and titles come from Spotify's public oEmbed endpoint (the same thing
// that powers link previews), and playback uses Spotify's embeddable player.

const ID = "([A-Za-z0-9]{22})";
const TYPES = "(album|playlist|track)";

const LINK_PATTERNS = [
  // https://open.spotify.com/album/<id>?si=…  (also /intl-xx/ localized links)
  new RegExp(`^(?:https?://)?open\\.spotify\\.com/(?:intl-[a-z-]+/)?(?:embed/)?${TYPES}/${ID}(?:[/?#].*)?$`, "i"),
  // spotify:album:<id>
  new RegExp(`^spotify:${TYPES}:${ID}$`, "i"),
];

/** Turns any Spotify album / playlist / track link into a canonical form, or returns null. */
function parseSpotifyLink(input) {
  const text = String(input || "").trim();
  for (const pattern of LINK_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const type = m[1].toLowerCase();
      const id = m[2];
      return {
        type,
        id,
        uri: `spotify:${type}:${id}`,
        url: `https://open.spotify.com/${type}/${id}`,
      };
    }
  }
  return null;
}

// Spotify serves cover art from these hosts. The cover proxy only fetches from them,
// so it can't be abused to fetch arbitrary URLs.
const COVER_HOST_RE = /^(i\.scdn\.co|mosaic\.scdn\.co|[a-z0-9-]+\.spotifycdn\.com)$/i;

function isAllowedCoverUrl(src) {
  try {
    const u = new URL(src);
    return u.protocol === "https:" && COVER_HOST_RE.test(u.hostname);
  } catch {
    return false;
  }
}

const cache = new Map();

/** Looks up a record's title and cover art. Throws an Error with a .status on failure. */
async function lookupRecord(link) {
  const parsed = parseSpotifyLink(link);
  if (!parsed) {
    const err = new Error("That doesn't look like a Spotify album, playlist or song link.");
    err.status = 400;
    throw err;
  }
  if (cache.has(parsed.url)) return cache.get(parsed.url);

  let res;
  try {
    res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(parsed.url)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    const err = new Error("Couldn't reach Spotify. Check your connection and try again.");
    err.status = 502;
    throw err;
  }
  if (res.status === 404 || res.status === 400) {
    const err = new Error("Spotify couldn't find that link. It may be private or deleted.");
    err.status = 404;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`Spotify returned an error (${res.status}). Try again in a moment.`);
    err.status = 502;
    throw err;
  }

  const data = await res.json();
  const record = {
    ...parsed,
    title: data.title || "Untitled record",
    cover: data.thumbnail_url || null,
  };
  cache.set(parsed.url, record);
  return record;
}

function clearCache() {
  cache.clear();
}

module.exports = { parseSpotifyLink, isAllowedCoverUrl, lookupRecord, clearCache };
