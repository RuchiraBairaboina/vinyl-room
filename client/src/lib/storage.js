// Small, safe wrappers around localStorage. Storage can be unavailable
// (private browsing, blocked cookies), so every call is wrapped and falls back quietly.

export function load(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the page still works, it just won't remember */
  }
}
