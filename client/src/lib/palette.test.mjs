// Unit tests for the lighting palette. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPalette, hexToRgb, rgbToHex, DEFAULT_PALETTE } from "./palette.mjs";

/** Builds fake RGBA pixel data from [color, pixelCount] pairs. */
function pixels(...parts) {
  const out = [];
  for (const [[r, g, b, a = 255], n] of parts) for (let i = 0; i < n; i++) out.push(r, g, b, a);
  return Uint8ClampedArray.from(out);
}

test("hex <-> rgb round-trips", () => {
  assert.equal(rgbToHex([255, 128, 0]), "#FF8000");
  assert.deepEqual(hexToRgb("#FF8000"), [255, 128, 0]);
});

test("always returns the requested number of valid hex colors", () => {
  const p = extractPalette(pixels([[200, 30, 60], 50], [[20, 60, 200], 30]), 3);
  assert.equal(p.length, 3);
  p.forEach((c) => assert.match(c, /^#[0-9A-F]{6}$/));
});

test("the most common colorful hue comes first", () => {
  const [first] = extractPalette(pixels([[220, 40, 40], 80], [[40, 40, 220], 20]));
  const [r, , b] = hexToRgb(first);
  assert.ok(r > b, `expected red-ish first color, got ${first}`);
});

test("ignores transparent pixels", () => {
  const [first] = extractPalette(pixels([[40, 200, 60, 0], 500], [[40, 40, 220], 10]));
  const [, g, b] = hexToRgb(first);
  assert.ok(b > g, `expected blue-ish (transparent green ignored), got ${first}`);
});

test("falls back to the default palette for an empty or all-black cover", () => {
  assert.deepEqual(extractPalette([]), DEFAULT_PALETTE);
  assert.deepEqual(extractPalette(pixels([[0, 0, 0], 100])), DEFAULT_PALETTE);
});

test("output colors are soft enough to use as lighting (not too dark)", () => {
  const p = extractPalette(pixels([[60, 0, 10], 100], [[0, 30, 80], 100]));
  for (const c of p) {
    const [r, g, b] = hexToRgb(c);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    assert.ok(luminance > 0.3, `${c} is too dark for room lighting`);
  }
});
