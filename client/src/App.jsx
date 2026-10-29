import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Room from "./components/Room.jsx";
import Crate from "./components/Crate.jsx";
import AddRecord from "./components/AddRecord.jsx";
import { useSpotifyPlayer } from "./lib/useSpotifyPlayer.js";
import { paletteFromCover } from "./lib/coverPalette.js";
import { DEFAULT_PALETTE } from "./lib/palette.mjs";
import { load, save } from "./lib/storage.js";

const MY_RECORDS_KEY = "vinylRoom.myRecords";
const LAST_RECORD_KEY = "vinylRoom.lastRecord";
const PORTFOLIO_URL = "https://ruchira-bairaboina.vercel.app";

function themeForNow() {
  const h = new Date().getHours();
  if (h >= 6 && h < 17) return "morning";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

export default function App() {
  const [owner, setOwner] = useState("Ruchira");
  const [ownerRecords, setOwnerRecords] = useState([]);
  const [myRecords, setMyRecords] = useState(() => load(MY_RECORDS_KEY, []));
  const [currentUrl, setCurrentUrl] = useState(() => load(LAST_RECORD_KEY, null));
  const [loadingCrate, setLoadingCrate] = useState(true);
  const [crateError, setCrateError] = useState(null);
  const [theme, setTheme] = useState(themeForNow);
  const [palette, setPalette] = useState(DEFAULT_PALETTE);
  const playerHost = useRef(null);

  useEffect(() => {
    fetch("/api/crate")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setOwner(data.owner || "Ruchira");
        setOwnerRecords(data.records || []);
      })
      .catch(() => setCrateError("Couldn't load the crate. Is the server running? Your own records still work."))
      .finally(() => setLoadingCrate(false));
  }, []);

  const records = useMemo(() => {
    const seen = new Set();
    return [...ownerRecords, ...myRecords.map((r) => ({ ...r, mine: true }))].filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
  }, [ownerRecords, myRecords]);

  // Default to the first record once the crate loads.
  const current = records.find((r) => r.url === currentUrl) || (loadingCrate ? null : records[0]) || null;

  useEffect(() => save(MY_RECORDS_KEY, myRecords), [myRecords]);
  useEffect(() => {
    if (current) save(LAST_RECORD_KEY, current.url);
  }, [current]);

  // Light the room in the album's colors.
  useEffect(() => {
    let alive = true;
    paletteFromCover(current?.cover).then((p) => alive && setPalette(p));
    return () => {
      alive = false;
    };
  }, [current?.cover]);

  const { status, playing, toggle, needsTap } = useSpotifyPlayer(playerHost, current?.uri);

  const addRecord = useCallback(
    (record) => {
      const exists = records.some((r) => r.url === record.url);
      if (!exists) setMyRecords((list) => [...list, record]);
      setCurrentUrl(record.url);
      return exists ? "exists" : "added";
    },
    [records]
  );

  const removeRecord = (record) => {
    setMyRecords((list) => list.filter((r) => r.url !== record.url));
    if (record.url === current?.url) setCurrentUrl(null);
  };

  const glowStyle = {
    "--glow1": palette[0],
    "--glow2": palette[1],
    "--glow3": palette[2],
  };

  return (
    <div className="app" style={glowStyle} data-palette={palette.join(",")}>
      <h1 className="sr-only">{owner}'s Vinyl Room</h1>

      <div className="stage">
        <Room
          owner={owner}
          record={current}
          playing={playing}
          onToggle={toggle}
          theme={theme}
          onThemeChange={setTheme}
        />
      </div>

      <div className="deck">
        <section className="panel panel--crate" aria-labelledby="crate-title">
          <h2 id="crate-title" className="hand">The crate</h2>
          <p className="panel__lead">Pick a record to put it on the turntable. Tap the window to change the time of day.</p>
          {crateError && <p className="add__note add__note--error">{crateError}</p>}
          <Crate
            records={records}
            currentUrl={current?.url}
            onSelect={(r) => setCurrentUrl(r.url)}
            onRemove={removeRecord}
            loading={loadingCrate}
          />
        </section>

        <section className="panel panel--player" aria-labelledby="player-title">
          <h2 id="player-title" className="hand">{current ? current.title : "Nothing on the turntable yet"}</h2>
          {/* Spotify's player is mounted into this div by useSpotifyPlayer — React leaves it alone. */}
          <div ref={playerHost} className="player" data-status={status} hidden={!current || status === "unavailable"} />
          {!current && <p className="player__note">Add a record and the Spotify player shows up here.</p>}
          {current && status === "unavailable" && (
            <p className="player__note" role="status">
              The Spotify player couldn't load (a content blocker may be stopping it). You can still tap the record to spin
              it, or <a href={current.url} target="_blank" rel="noreferrer">open it in Spotify</a>.
            </p>
          )}
          {needsTap && (
            <p className="player__note" role="status">
              Your browser wants one tap inside the Spotify player first. Press play there and the room follows along.
            </p>
          )}
          <AddRecord onAdd={addRecord} />
        </section>
      </div>

      <footer className="footer">
        <p>
          Made by <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer">Ruchira Bairaboina</a>. Music, titles and
          artwork are played and shown through Spotify.
        </p>
      </footer>
    </div>
  );
}
