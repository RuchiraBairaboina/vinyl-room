// API + link-parsing tests. Spotify is mocked, so these run offline.
// Run with: npm test
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { parseSpotifyLink, isAllowedCoverUrl, clearCache } = require("../lib/spotify");
const app = require("../index");

const ALBUM_ID = "4aawyAB9vmqN3uQ7FjRGTy";
const realFetch = globalThis.fetch;
let server;
let base;
let spotifyCalls = 0;

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://localhost:${server.address().port}`;
});

after(() => {
  globalThis.fetch = realFetch;
  server.close();
});

beforeEach(() => {
  clearCache();
  spotifyCalls = 0;
  // Pass local requests through; fake every request to Spotify.
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    if (u.startsWith(base)) return realFetch(url, opts);
    spotifyCalls++;
    if (u.includes("oembed") && u.includes("AAAAAAAAAAAAAAAAAAAAAA")) {
      return new Response("Not found", { status: 404 });
    }
    if (u.includes("oembed")) {
      return Response.json({ title: "Test Album", thumbnail_url: "https://i.scdn.co/image/abc123" });
    }
    return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
  };
});

/* ---------------------------- link parsing ---------------------------- */

test("parses a normal album share link with tracking params", () => {
  const r = parseSpotifyLink(`https://open.spotify.com/album/${ALBUM_ID}?si=xyz123`);
  assert.deepEqual(r, {
    type: "album",
    id: ALBUM_ID,
    uri: `spotify:album:${ALBUM_ID}`,
    url: `https://open.spotify.com/album/${ALBUM_ID}`,
  });
});

test("parses playlist, track, localized and spotify: URI forms", () => {
  assert.equal(parseSpotifyLink(`https://open.spotify.com/playlist/${ALBUM_ID}`).type, "playlist");
  assert.equal(parseSpotifyLink(`open.spotify.com/track/${ALBUM_ID}`).type, "track");
  assert.equal(parseSpotifyLink(`https://open.spotify.com/intl-es/album/${ALBUM_ID}`).id, ALBUM_ID);
  assert.equal(parseSpotifyLink(`spotify:album:${ALBUM_ID}`).type, "album");
  assert.equal(parseSpotifyLink(`  https://open.spotify.com/album/${ALBUM_ID}  `).id, ALBUM_ID);
});

test("rejects non-Spotify and malformed links", () => {
  for (const bad of [
    "",
    "hello",
    "https://youtube.com/watch?v=abc",
    "https://open.spotify.com/artist/" + ALBUM_ID, // artists aren't records
    "https://open.spotify.com/album/tooShort",
    "https://evil.com/open.spotify.com/album/" + ALBUM_ID,
  ]) {
    assert.equal(parseSpotifyLink(bad), null, `should reject: ${bad}`);
  }
});

test("cover proxy only allows Spotify image hosts over https", () => {
  assert.equal(isAllowedCoverUrl("https://i.scdn.co/image/abc"), true);
  assert.equal(isAllowedCoverUrl("https://image-cdn-ak.spotifycdn.com/image/abc"), true);
  assert.equal(isAllowedCoverUrl("http://i.scdn.co/image/abc"), false);
  assert.equal(isAllowedCoverUrl("https://example.com/cat.jpg"), false);
  assert.equal(isAllowedCoverUrl("https://i.scdn.co.evil.com/x"), false);
  assert.equal(isAllowedCoverUrl("not a url"), false);
});

/* -------------------------------- API --------------------------------- */

test("GET /api/health returns ok", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
});

test("GET /api/record returns title, cover and embed URI", async () => {
  const res = await fetch(`${base}/api/record?url=${encodeURIComponent(`https://open.spotify.com/album/${ALBUM_ID}`)}`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.title, "Test Album");
  assert.equal(data.cover, "https://i.scdn.co/image/abc123");
  assert.equal(data.uri, `spotify:album:${ALBUM_ID}`);
});

test("GET /api/record caches lookups", async () => {
  const url = `${base}/api/record?url=${encodeURIComponent(`spotify:album:${ALBUM_ID}`)}`;
  await fetch(url);
  await fetch(url);
  assert.equal(spotifyCalls, 1);
});

test("GET /api/record rejects an invalid link with 400 and a helpful message", async () => {
  const res = await fetch(`${base}/api/record?url=hello`);
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Spotify album, playlist or song link/);
});

test("GET /api/record returns 404 when Spotify can't find the link", async () => {
  const res = await fetch(`${base}/api/record?url=${encodeURIComponent("https://open.spotify.com/album/AAAAAAAAAAAAAAAAAAAAAA")}`);
  assert.equal(res.status, 404);
});

test("GET /api/cover refuses non-Spotify hosts", async () => {
  const res = await fetch(`${base}/api/cover?src=${encodeURIComponent("https://example.com/x.jpg")}`);
  assert.equal(res.status, 400);
});

test("GET /api/cover proxies Spotify images", async () => {
  const res = await fetch(`${base}/api/cover?src=${encodeURIComponent("https://i.scdn.co/image/abc")}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/jpeg");
});

test("GET /api/crate returns the owner's crate", async () => {
  const res = await fetch(`${base}/api/crate`);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(data.records));
});
