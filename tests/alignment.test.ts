import { test, expect } from "vitest";
import { alignImages } from "../src/core/alignment";
import type { Raster } from "../src/core/model";
function fixture(dx = 0, dy = 0): Raster {
  const width = 160,
    height = 160,
    data = new Uint8ClampedArray(width * height * 4);
  let seed = 34;
  for (let k = 0; k < 40; k++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = 15 + (seed % 120);
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = 15 + (seed % 120);
    const value = 80 + (seed % 175);
    for (let j = 0; j < 7; j++)
      for (let i = 0; i < 7; i++) {
        const p = ((y + j + dy) * width + x + i + dx) * 4;
        data[p] = value;
        data[p + 1] = (i + 1) * 30;
        data[p + 2] = (j + 1) * 30;
        data[p + 3] = 255;
      }
  }
  return { width, height, data };
}
test("quick alignment finds translation and refuses featureless images", () => {
  const result = alignImages(fixture(), fixture(6, -4), 1800);
  expect(result).not.toBeNull();
  expect(result!.tx).toBeCloseTo(-6, 0);
  expect(result!.ty).toBeCloseTo(4, 0);
  expect(result!.scale).toBeCloseTo(1, 1);
  expect(
    alignImages(
      fixture(),
      { width: 160, height: 160, data: new Uint8ClampedArray(160 * 160 * 4) },
      100,
    ),
  ).toBeNull();
  expect(alignImages(fixture(), fixture(), 0)).toBeNull();
});

test("quick alignment recovers a modest rotation and proportional scale", () => {
  const reference = fixture(),
    moving: Raster = {
      width: 160,
      height: 160,
      data: new Uint8ClampedArray(160 * 160 * 4),
    };
  const theta = (5 * Math.PI) / 180,
    scale = 1.05,
    c = Math.cos(theta),
    s = Math.sin(theta);
  for (let y = 0; y < 160; y++)
    for (let x = 0; x < 160; x++) {
      const dx = (x - 80) / scale,
        dy = (y - 80) / scale;
      const sx = Math.round(c * dx + s * dy + 80),
        sy = Math.round(-s * dx + c * dy + 80);
      if (sx >= 0 && sx < 160 && sy >= 0 && sy < 160)
        moving.data.set(
          reference.data.subarray((sy * 160 + sx) * 4, (sy * 160 + sx) * 4 + 4),
          (y * 160 + x) * 4,
        );
    }
  const result = alignImages(reference, moving);
  expect(result).not.toBeNull();
  expect(Math.abs(result!.rotation + 5)).toBeLessThan(2);
  expect(Math.abs(result!.scale - 1 / 1.05)).toBeLessThan(0.04);
});
