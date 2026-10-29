import { useState } from "react";

export default function AddRecord({ onAdd }) {
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null); // { kind: "error" | "ok", text }

  const submit = async (e) => {
    e.preventDefault();
    if (!link.trim()) {
      setNote({ kind: "error", text: "Paste a Spotify link first. In Spotify: Share → Copy link." });
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/record?url=${encodeURIComponent(link.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't add that record. Try again.");
      const result = onAdd(data);
      setNote({
        kind: "ok",
        text: result === "exists" ? `${data.title} is already in the crate. It's on the turntable now.` : `Added ${data.title} to your crate.`,
      });
      setLink("");
    } catch (err) {
      setNote({ kind: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="add" onSubmit={submit} noValidate>
      <label htmlFor="spotify-link" className="add__label">Add a record</label>
      <div className="add__row">
        <input
          id="spotify-link"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://open.spotify.com/album/…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          aria-describedby="spotify-link-help spotify-link-note"
          aria-invalid={note?.kind === "error"}
        />
        <button type="submit" disabled={busy}>{busy ? "Looking it up…" : "Add to crate"}</button>
      </div>
      <p id="spotify-link-help" className="add__help">
        Works with albums, playlists and songs. In Spotify, open one and choose Share → Copy link.
      </p>
      <p id="spotify-link-note" className={`add__note ${note ? `add__note--${note.kind}` : ""}`} role="status" aria-live="polite">
        {note?.text}
      </p>
    </form>
  );
}
