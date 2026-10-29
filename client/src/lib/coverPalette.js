import { extractPalette, DEFAULT_PALETTE } from "./palette.mjs";

const cache = new Map();

/**
 * Loads a cover through our own server (/api/cover) so the canvas can read its pixels,
 * then returns three soft lighting colors. Never throws — falls back to the default palette.
 */
export async function paletteFromCover(coverUrl) {
  if (!coverUrl) return DEFAULT_PALETTE;
  if (cache.has(coverUrl)) return cache.get(coverUrl);

  const palette = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const size = 48;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);
        resolve(extractPalette(ctx.getImageData(0, 0, size, size).data, 3));
      } catch {
        resolve(DEFAULT_PALETTE);
      }
    };
    img.onerror = () => resolve(DEFAULT_PALETTE);
    img.src = `/api/cover?src=${encodeURIComponent(coverUrl)}`;
  });

  cache.set(coverUrl, palette);
  return palette;
}
