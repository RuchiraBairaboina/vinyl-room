// Picks a small lighting palette from an album cover's pixels.
// Pure functions (no DOM) so they can be unit-tested in Node.

export const DEFAULT_PALETTE = ["#F7B5C8", "#B8A4EC", "#FFD79A"];

const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));

export function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Softens a color into a gentle "light" tone so the room glows instead of shouting. */
export function toLight(rgb) {
  const [h, s, l] = rgbToHsl(rgb);
  return hslToRgb([h, Math.min(Math.max(s, 0.35), 0.75), Math.min(Math.max(l, 0.62), 0.8)]);
}

const hueDistance = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/**
 * @param {Uint8ClampedArray|number[]} data RGBA pixel data (e.g. from canvas getImageData)
 * @param {number} count how many colors to return
 * @returns {string[]} hex colors, softened for lighting; falls back to DEFAULT_PALETTE
 */
export function extractPalette(data, count = 3) {
  const buckets = new Map();
  for (let i = 0; i + 3 < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const rgb = [data[i], data[i + 1], data[i + 2]];
    // Group similar colors: 4 bits per channel.
    const key = ((rgb[0] >> 4) << 8) | ((rgb[1] >> 4) << 4) | (rgb[2] >> 4);
    const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    b.n++; b.r += rgb[0]; b.g += rgb[1]; b.b += rgb[2];
    buckets.set(key, b);
  }

  // Score each bucket by how common and how colorful it is.
  const candidates = [...buckets.values()]
    .map((b) => {
      const rgb = [b.r / b.n, b.g / b.n, b.b / b.n];
      const [h, s, l] = rgbToHsl(rgb);
      const vivid = s * (1 - Math.abs(l - 0.5) * 1.6);
      return { rgb, h, s, l, score: b.n * (0.15 + Math.max(vivid, 0)) };
    })
    .filter((c) => c.l > 0.08 && c.l < 0.95)
    .sort((a, b) => b.score - a.score);

  const picked = [];
  for (const c of candidates) {
    // Prefer colors with clearly different hues, so the lights aren't all one shade.
    if (picked.every((p) => hueDistance(p.h, c.h) > 28 || Math.abs(p.l - c.l) > 0.25)) {
      picked.push(c);
    }
    if (picked.length === count) break;
  }
  if (!picked.length) return [...DEFAULT_PALETTE];

  const out = picked.map((c) => rgbToHex(toLight(c.rgb)));
  // Pad with defaults if the cover was nearly one color.
  while (out.length < count) out.push(DEFAULT_PALETTE[out.length]);
  return out;
}
