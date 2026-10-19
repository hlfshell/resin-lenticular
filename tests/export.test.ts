import { expect, test } from "vitest";
import { PNG } from "pngjs";
import { render } from "../src/core/render";
import { encodePNG } from "../src/core/png";
import { defaults } from "../src/core/model";

test("paired exports preserve selected alpha and true 16-bit relief", () => {
  const settings = {
    ...defaults,
    widthMm: 25.4,
    heightMm: 25.4 / 8,
    ppi: 8,
    lpi: 1,
  };
  const sources = [128, 255].map((alpha, i) => ({
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([i ? 0 : 255, 0, i ? 255 : 0, alpha]),
  }));
  const placements = sources.map(() => ({
    x: 0,
    y: 0,
    width: 25.4,
    height: 25.4 / 8,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 },
  }));
  const result = render(settings, sources, placements);
  const color = PNG.sync.read(
    Buffer.from(
      encodePNG(result.width, result.height, result.color, 8, 6, settings.ppi),
    ),
  );
  const depth = PNG.sync.read(
    Buffer.from(
      encodePNG(result.width, result.height, result.depth, 16, 4, settings.ppi),
    ),
    { skipRescale: true },
  );
  expect(color.width).toBe(8);
  expect(Array.from(color.data.slice(0, 4))).toEqual([255, 0, 0, 128]);
  expect(Array.from(color.data.slice(16, 20))).toEqual([0, 0, 255, 255]);
  expect(depth.depth).toBe(16);
  expect(depth.data[0]).toBe(0);
  expect(depth.data[3]).toBe(32896);
  expect(depth.data[16]).toBe(65535);
});

test("inversion and endpoint polarity change only depth, with exact phase and fractional pitch", () => {
  const settings = {
    ...defaults,
    widthMm: 25.4,
    heightMm: 25.4 / 10,
    ppi: 10,
    lpi: 4,
  };
  const sources = [64, 192].map((a, i) => ({
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([i * 255, 100, 0, a]),
  }));
  const placements = sources.map(() => ({
    x: 0,
    y: 0,
    width: 25.4,
    height: 25.4 / 10,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 },
  }));
  const normal = render(settings, sources, placements),
    inverted = render({ ...settings, invert: true }, sources, placements),
    reversed = render(
      { ...settings, low: 65535, high: 0 },
      sources,
      placements,
    );
  expect(Array.from(normal.color.filter((_, i) => i % 4 === 3))).toEqual([
    64, 64, 192, 64, 192, 64, 64, 192, 64, 192,
  ]);
  expect(inverted.color).toEqual(normal.color);
  expect(reversed.depth).toEqual(inverted.depth);
  for (let i = 0; i < 10; i++) {
    expect(
      Math.abs(normal.depth[i * 2] + inverted.depth[i * 2] - 65535),
    ).toBeLessThanOrEqual(1);
    expect(inverted.depth[i * 2 + 1]).toBe(normal.depth[i * 2 + 1]);
  }
  const shifted = render({ ...settings, phase: 0.5 }, sources, placements);
  expect(shifted.color[3]).toBe(192);
  expect(shifted.depth[0]).toBe(65535);
});

test("horizontal and angled geometry select the same view alpha for artwork and depth", () => {
  const settings = {
    ...defaults,
    widthMm: 25.4,
    heightMm: 25.4,
    ppi: 8,
    lpi: 1,
    angle: 90,
  };
  const sources = [1, 2].map((i) => ({
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([i * 40, 0, 0, i * 100]),
  }));
  const placements = sources.map(() => ({
    x: 0,
    y: 0,
    width: 25.4,
    height: 25.4,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 },
  }));
  const horizontal = render(settings, sources, placements);
  expect(horizontal.color[4 * 8 * 4 + 3]).toBe(200);
  expect(horizontal.color[(0 * 8 + 7) * 4 + 3]).toBe(100);
  const diagonal = render({ ...settings, angle: 45 }, sources, placements);
  expect(diagonal.color[(3 * 8 + 3) * 4 + 3]).toBe(200);
  const reversed = render(
    { ...settings, angle: 45, reverse: true },
    sources,
    placements,
  );
  expect(reversed.color[(3 * 8 + 3) * 4 + 3]).toBe(100);
  for (let i = 0; i < 64; i++)
    expect(diagonal.depth[i * 2 + 1]).toBe(diagonal.color[i * 4 + 3] * 257);
});

test("PNG contains correct print density and optional 8-bit depth alpha", () => {
  const bytes = encodePNG(
    2,
    1,
    new Uint16Array([12345, 32896, 65535, 65535]),
    8,
    4,
    1440,
  );
  const decoded = PNG.sync.read(Buffer.from(bytes));
  expect(decoded.depth).toBe(8);
  expect(Array.from(decoded.data)).toEqual([
    48, 48, 48, 128, 255, 255, 255, 255,
  ]);
  let offset = 8,
    found = false;
  while (offset < bytes.length) {
    const view = new DataView(bytes.buffer),
      length = view.getUint32(offset),
      name = new TextDecoder().decode(bytes.slice(offset + 4, offset + 8));
    if (name === "pHYs") {
      found = true;
      expect(view.getUint32(offset + 8)).toBe(56693);
      expect(view.getUint32(offset + 12)).toBe(56693);
      expect(bytes[offset + 16]).toBe(1);
    }
    offset += length + 12;
  }
  expect(found).toBe(true);
});

test("rejects finite canvases that cannot contain every view even at adequate pitch", () => {
  const settings = { ...defaults, widthMm: 0.1, heightMm: 1 };
  const sources = [0, 1].map(() => ({
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([255, 255, 255, 255]),
  }));
  const placements = sources.map(() => ({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 },
  }));
  expect(() => render(settings, sources, placements)).toThrow(/canvas/i);
  expect(() =>
    render(
      { ...settings, angle: 45, widthMm: 0.05, heightMm: 0.05 },
      sources,
      placements,
    ),
  ).toThrow(/canvas/i);
  expect(() =>
    render({ ...settings, angle: 90 }, sources, placements),
  ).not.toThrow();
});

test("cropped and rotated partial-alpha edges stay paired without changing source pixels", () => {
  const settings = {
    ...defaults,
    widthMm: 25.4,
    heightMm: 6.35,
    ppi: 4,
    lpi: 1,
  };
  const raster = {
    width: 4,
    height: 1,
    data: new Uint8ClampedArray([
      255, 0, 0, 0, 255, 0, 0, 64, 255, 0, 0, 128, 255, 0, 0, 255,
    ]),
  };
  const before = new Uint8ClampedArray(raster.data);
  const placement = {
    x: 0,
    y: 0,
    width: 25.4,
    height: 6.35,
    rotation: 0,
    crop: { x: 0.25, y: 0, width: 0.5, height: 1 },
  };
  const result = render(settings, [raster, raster], [placement, placement]);
  expect(Array.from(result.color.filter((_, i) => i % 4 === 3))).toEqual([
    0, 64, 128, 0,
  ]);
  expect(Array.from(result.depth.filter((_, i) => i % 2 === 1))).toEqual([
    0, 16448, 32896, 0,
  ]);
  const rotated = render(
    settings,
    [raster, raster],
    [
      { ...placement, rotation: 180 },
      { ...placement, rotation: 180 },
    ],
  );
  expect(Array.from(rotated.color.filter((_, i) => i % 4 === 3))).toEqual([
    0, 128, 64, 0,
  ]);
  expect(raster.data).toEqual(before);
});

test("preview scales the lens pitch with the export coordinate system", () => {
  const settings = {
    ...defaults,
    widthMm: 25.4,
    heightMm: 25.4,
    ppi: 8,
    lpi: 1,
  };
  const raster = {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([255, 0, 0, 255]),
  };
  const placement = {
    x: 0,
    y: 0,
    width: 25.4,
    height: 25.4,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 },
  };
  const full = render(settings, [raster, raster], [placement, placement]);
  const preview = render(
    settings,
    [raster, raster],
    [placement, placement],
    undefined,
    0.5,
  );
  expect(preview.width).toBe(4);
  for (let x = 0; x < 4; x++)
    expect(preview.depth[x * 2]).toBe(full.depth[x * 4]);
});
