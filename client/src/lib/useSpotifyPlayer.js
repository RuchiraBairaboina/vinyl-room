import { useCallback, useEffect, useRef, useState } from "react";

// Spotify's embeddable player + its small iFrame API, which tells the page
// when music starts or pauses. No developer account or API key needed.
const SCRIPT_URL = "https://open.spotify.com/embed/iframe-api/v1";
let apiPromise = null;

function loadIframeApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), 10000);
    window.onSpotifyIframeApiReady = (api) => {
      clearTimeout(timer);
      resolve(api);
    };
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error("blocked"));
    };
    document.body.appendChild(script);
  });
  return apiPromise;
}

/**
 * Mounts the Spotify player inside `hostRef` and keeps it on `uri`.
 * Returns { status, playing, toggle, needsTap }:
 *  - status: "loading" | "ready" | "unavailable" (e.g. blocked by a content blocker)
 *  - playing: true while Spotify reports music playing (or the record is spun manually)
 *  - toggle(): play/pause from anywhere on the page (the turntable)
 *  - needsTap: true if the browser blocked play from the page and the visitor
 *    needs to press play inside the Spotify player once
 */
export function useSpotifyPlayer(hostRef, uri) {
  const [status, setStatus] = useState("loading");
  const [playing, setPlaying] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const controllerRef = useRef(null);
  const lastPausedRef = useRef(true);
  const tapTimer = useRef(null);

  // Create the player once, the first time there's something to play.
  useEffect(() => {
    if (!uri || controllerRef.current || status === "unavailable") return;
    let cancelled = false;
    loadIframeApi()
      .then((api) => {
        if (cancelled || !hostRef.current) return;
        const mount = document.createElement("div");
        hostRef.current.replaceChildren(mount);
        api.createController(mount, { uri, width: "100%", height: 152 }, (controller) => {
          controllerRef.current = controller;
          controller.addListener("ready", () => setStatus("ready"));
          controller.addListener("playback_update", (e) => {
            const paused = Boolean(e?.data?.isPaused);
            if (paused !== lastPausedRef.current) {
              clearTimeout(tapTimer.current);
              setNeedsTap(false);
            }
            lastPausedRef.current = paused;
            setPlaying(!paused);
          });
          setStatus("ready");
        });
      })
      .catch(() => !cancelled && setStatus("unavailable"));
    return () => {
      cancelled = true;
    };
  }, [uri, hostRef, status]);

  // Switch records.
  useEffect(() => {
    const c = controllerRef.current;
    if (c && uri) {
      c.loadUri(uri);
      lastPausedRef.current = true;
      setPlaying(false);
    } else if (!controllerRef.current) {
      setPlaying(false);
    }
  }, [uri]);

  useEffect(() => () => clearTimeout(tapTimer.current), []);

  const toggle = useCallback(() => {
    const c = controllerRef.current;
    if (!c) {
      // No Spotify player available: the record still spins, just silently.
      setPlaying((p) => !p);
      return;
    }
    const wasPaused = lastPausedRef.current;
    c.togglePlay();
    // Some browsers only allow audio after a tap inside the player itself.
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      if (lastPausedRef.current === wasPaused) setNeedsTap(true);
    }, 1800);
  }, []);

  return { status, playing, toggle, needsTap };
}
