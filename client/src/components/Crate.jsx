export default function Crate({ records, currentUrl, onSelect, onRemove, loading }) {
  if (loading) {
    return <p className="crate__empty">Flipping through the crate…</p>;
  }

  if (!records.length) {
    return (
      <div className="crate__empty" data-testid="crate-empty">
        <div className="sleeve sleeve--ghost" aria-hidden="true" />
        <p>
          The crate is empty. Paste a Spotify album or playlist link below to put your first record on the
          turntable.
        </p>
      </div>
    );
  }

  return (
    <ul className="sleeves" data-testid="crate">
      {records.map((r) => {
        const selected = r.url === currentUrl;
        return (
          <li key={r.url} className={`sleeve-slot ${selected ? "is-selected" : ""}`}>
            <button
              className="sleeve"
              aria-pressed={selected}
              aria-label={`${selected ? "On the turntable: " : "Put on the turntable: "}${r.title}`}
              onClick={() => onSelect(r)}
            >
              {r.cover ? <img src={r.cover} alt="" loading="lazy" /> : <span className="sleeve__blank" />}
            </button>
            <span className="sleeve__title" title={r.title}>{r.title}</span>
            {r.mine && (
              <button className="sleeve__remove" aria-label={`Remove ${r.title} from your crate`} onClick={() => onRemove(r)}>
                ×
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
