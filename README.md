# 💿 Vinyl Room

A cozy, interactive listening room. Drop a Spotify album on the turntable and the room lights up in the colors of its cover art. The record spins, the tonearm swings over, the speakers thump and the cat wakes up to bob along.

Built with **React (Vite)** and **Node.js / Express**, and tested with **Playwright**: end-to-end tests plus visual regression tests across the morning, dusk and night themes.

## What you can do

- **Tap the record** to play or pause. It controls Spotify's player, and the room follows the real playback state.
- **Pick a record** from the crate, or **paste any Spotify album, playlist or song link** to add your own. Your records are remembered in your browser.
- **Tap the window** to switch between morning, dusk and night.
- **Pet the cat.**

## How Spotify is connected (no API key needed)

Spotify restricted its developer Web API for new apps, so this project uses only Spotify's public features:

| Piece | Spotify feature | Used for |
|---|---|---|
| Title + cover art | public oEmbed endpoint (`open.spotify.com/oembed`) | the record label, wall poster and crate |
| Music | the embeddable player + its iFrame API | playback, and play/pause events that drive the animations |
| Room colors | cover art proxied through `/api/cover` | the browser reads the pixels and picks 3 soft lighting colors |

If a content blocker stops the Spotify player, the page says so and the record still spins silently.

## Run it

Requires Node.js 18+.

```bash
npm install
npm run dev          # API on :5001, site on http://localhost:5173
```

## Add your own records to the crate

Open `server/data/crate.js` and paste Spotify links into `records`:

```js
records: [
  "https://open.spotify.com/album/…",
  "https://open.spotify.com/playlist/…",
],
```

In Spotify: open an album → **Share → Copy link**.

## Tests

```bash
npm test                      # API + link parsing + color palette unit tests (node:test)

npx playwright install chromium   # once per computer
npm run test:e2e:update           # first run on a new computer: creates screenshot baselines
npm run test:e2e                  # end-to-end + visual regression (desktop + mobile)
npx playwright show-report        # open the HTML report
```

The Playwright tests mock all Spotify responses with fixture covers (`e2e/mockSpotify.js`), so they run offline and give the same result every time. They cover:

- crate loading
- palette lighting
- play/pause by mouse and keyboard
- switching records
- the time-of-day cycle
- adding, deduplicating, persisting and removing records
- three kinds of invalid links
- the empty state
- the blocked-player fallback
- screenshots of each theme and the playing state

## Deploy to Vercel

```bash
npx vercel --prod
```

`vercel.json` builds the React app and runs the Express API as a serverless function.

## Project structure

```
server/
  index.js            Express API: /api/crate, /api/record, /api/cover
  lib/spotify.js      link parsing, oEmbed lookup, cover host allowlist
  data/crate.js       ← your records
  tests/              API tests
client/src/
  components/Room.jsx the whole room as one SVG illustration
  components/Crate.jsx, AddRecord.jsx
  lib/palette.mjs     color extraction (+ unit tests)
  lib/useSpotifyPlayer.js   Spotify embed controller hook
e2e/                  Playwright specs, mocks and fixture covers
```

Made by [Ruchira Bairaboina](https://ruchira-bairaboina.vercel.app).
