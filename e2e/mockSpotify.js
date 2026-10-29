// Test helpers: fake the Spotify-dependent API responses so tests are fast,
// offline and deterministic. Real Spotify requests are blocked.
const fs = require("fs");
const path = require("path");

const fixture = (name) => fs.readFileSync(path.join(__dirname, "fixtures", name));

const RECORDS = {
  sunset: {
    type: "album", id: "1111111111111111111111", uri: "spotify:album:1111111111111111111111",
    url: "https://open.spotify.com/album/1111111111111111111111", title: "Sunset Tapes", cover: "https://i.scdn.co/image/sunset",
  },
  ocean: {
    type: "album", id: "2222222222222222222222", uri: "spotify:album:2222222222222222222222",
    url: "https://open.spotify.com/album/2222222222222222222222", title: "Ocean Hours", cover: "https://i.scdn.co/image/ocean",
  },
  meadow: {
    type: "playlist", id: "3333333333333333333333", uri: "spotify:playlist:3333333333333333333333",
    url: "https://open.spotify.com/playlist/3333333333333333333333", title: "Meadow Mix", cover: "https://i.scdn.co/image/meadow",
  },
};

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ crate?: object[] }} opts
 */
async function mockSpotify(page, { crate = [RECORDS.sunset, RECORDS.ocean] } = {}) {
  // Block Spotify's real player and fonts so screenshots are stable.
  await page.route(/open\.spotify\.com|fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

  await page.route("**/api/crate", (route) => route.fulfill({ json: { owner: "Ruchira", records: crate } }));

  await page.route("**/api/record?*", (route) => {
    const url = new URL(route.request().url()).searchParams.get("url") || "";
    const match = Object.values(RECORDS).find((r) => url.includes(r.id));
    if (match) return route.fulfill({ json: match });
    if (url.includes("open.spotify.com")) {
      return route.fulfill({ status: 404, json: { error: "Spotify couldn't find that link. It may be private or deleted." } });
    }
    return route.fulfill({
      status: 400,
      json: { error: "That doesn't look like a Spotify album, playlist or song link." },
    });
  });

  const serveCover = (route, url) => {
    const name = ["sunset", "ocean", "meadow"].find((n) => url.includes(n)) || "sunset";
    return route.fulfill({ body: fixture(`${name}.svg`), contentType: "image/svg+xml" });
  };
  await page.route("**/api/cover?*", (route) => serveCover(route, decodeURIComponent(route.request().url())));
  await page.route("https://i.scdn.co/**", (route) => serveCover(route, route.request().url()));
}

module.exports = { mockSpotify, RECORDS };
