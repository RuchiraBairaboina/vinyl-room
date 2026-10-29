const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crate = require("./data/crate");
const { lookupRecord, isAllowedCoverUrl } = require("./lib/spotify");

const app = express();
const PORT = process.env.PORT || 5001; // 5000 is taken by AirPlay Receiver on Macs

app.use(cors());
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

/** The owner's crate. Records that can't be looked up are skipped, not fatal. */
app.get("/api/crate", async (_req, res) => {
  const results = await Promise.allSettled(crate.records.map((link) => lookupRecord(link)));
  const records = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  results
    .filter((r) => r.status === "rejected")
    .forEach((r, i) => console.warn(`Skipped crate record #${i + 1}: ${r.reason.message}`));
  res.json({ owner: crate.owner, records });
});

/** Looks up one Spotify link: GET /api/record?url=https://open.spotify.com/album/… */
app.get("/api/record", async (req, res) => {
  try {
    res.json(await lookupRecord(req.query.url));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * Proxies Spotify cover art through this server so the browser can read its pixels
 * (to pick the room's lighting colors) without cross-origin restrictions.
 */
app.get("/api/cover", async (req, res) => {
  const src = String(req.query.src || "");
  if (!isAllowedCoverUrl(src)) return res.status(400).json({ error: "Only Spotify cover images can be loaded." });
  try {
    const upstream = await fetch(src, { signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) return res.status(502).json({ error: `Cover image returned ${upstream.status}.` });
    res.set("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    res.status(502).json({ error: "Couldn't load the cover image." });
  }
});

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// Serve the built React app (npm run build) when it exists.
const dist = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// Start listening unless running on Vercel (serverless) or inside the test runner.
if (!process.env.VERCEL && !process.env.NODE_TEST_CONTEXT) {
  app.listen(PORT, () => console.log(`🎶 Vinyl Room API running on http://localhost:${PORT}`));
}

module.exports = app;
