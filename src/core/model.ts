export interface Settings {
  widthMm: number;
  heightMm: number;
  ppi: number;
  lpi: number;
  angle: number;
  phase: number;
  profile: "sine" | "arc";
  low: number;
  high: number;
  invert: boolean;
  reverse: boolean;
  depthBits: 8 | 16;
}
export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  crop: Crop;
}
export interface Raster {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}
export interface Source {
  id: string;
  name: string;
  hash: string;
  width: number;
  height: number;
  placement: Placement;
}
export interface Project {
  version: 1;
  settings: Settings;
  sources: Source[];
}
export const defaults: Settings = {
  widthMm: 50,
  heightMm: 50,
  ppi: 1440,
  lpi: 40,
  angle: 0,
  phase: 0,
  profile: "sine",
  low: 0,
  high: 65535,
  invert: false,
  reverse: false,
  depthBits: 16,
};
export function fit(width: number, height: number, s: Settings): Placement {
  const scale = Math.min(s.widthMm / width, s.heightMm / height);
  return {
    x: (s.widthMm - width * scale) / 2,
    y: (s.heightMm - height * scale) / 2,
    width: width * scale,
    height: height * scale,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 },
  };
}
export function dimensions(s: Settings) {
  return {
    width: Math.max(1, Math.round((s.widthMm * s.ppi) / 25.4)),
    height: Math.max(1, Math.round((s.heightMm * s.ppi) / 25.4)),
  };
}
export const MAX_PIXELS = 24_000_000;
export function checkSettings(s: Settings, count: number): string[] {
  if (
    Object.values(s).some((v) => typeof v === "number" && !Number.isFinite(v))
  )
    throw new Error("Settings must be finite numbers.");
  if (s.widthMm <= 0 || s.heightMm <= 0 || s.ppi <= 0 || s.lpi <= 0)
    throw new Error("Size, PPI and LPI must be positive.");
  if (count < 2) throw new Error("Add at least two images.");
  if (s.low < 0 || s.high < 0 || s.low > 65535 || s.high > 65535)
    throw new Error("Depth endpoints must be between 0 and 65535.");
  // Bound the largest projected step of a pixel edge: every view stripe must span at least this distance.
  const a = (s.angle * Math.PI) / 180;
  const samples =
    s.ppi /
    s.lpi /
    (Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) * count);
  if (samples < 1)
    throw new Error(
      "Too many views for this PPI, LPI and angle. Increase PPI or reduce LPI/views.",
    );
  const { width, height } = dimensions(s);
  const xExtent = ((width - 1) * Math.cos(a)) / (s.ppi / s.lpi);
  const yExtent = ((height - 1) * Math.sin(a)) / (s.ppi / s.lpi);
  const first = s.phase + Math.min(0, xExtent) + Math.min(0, yExtent);
  const last = s.phase + Math.max(0, xExtent) + Math.max(0, yExtent);
  // Each grid step is at most one view stripe (checked above), so a path
  // between the extreme corners visits every bin between these endpoints.
  if (Math.floor(last * count) - Math.floor(first * count) + 1 < count)
    throw new Error(
      "Canvas is too small to contain every view at this lens pitch and phase. Increase its physical size.",
    );
  return samples < 3
    ? ["Fewer than 3 pixels per view. Expect weak view separation."]
    : [];
}
export function exportBudget(s: Settings) {
  const { width, height } = dimensions(s);
  const pixels = width * height;
  return {
    width,
    height,
    pixels,
    bytes: pixels * 32,
    supported: pixels <= MAX_PIXELS && width <= 32767 && height <= 32767,
  };
}
