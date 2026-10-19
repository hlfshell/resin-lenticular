import {
  checkSettings,
  dimensions,
  type Settings,
  type Raster,
  type Placement,
} from "./model";

export interface Rendered {
  width: number;
  height: number;
  color: Uint8Array;
  depth: Uint16Array;
}
export function render(
  s: Settings,
  sources: Raster[],
  placements: Placement[],
  progress?: (n: number) => void,
  scale = 1,
): Rendered {
  checkSettings(s, sources.length);
  const full = dimensions(s);
  const width = Math.max(1, Math.round(full.width * scale)),
    height = Math.max(1, Math.round(full.height * scale));
  const color = new Uint8Array(width * height * 4),
    depth = new Uint16Array(width * height * 2);
  const a = (s.angle * Math.PI) / 180,
    cos = Math.cos(a),
    sin = Math.sin(a),
    pitch = s.ppi / s.lpi;
  const transforms = placements.map((p) => {
    const r = (p.rotation * Math.PI) / 180;
    return { p, c: Math.cos(r), s: Math.sin(r) };
  });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = ((x * cos + y * sin) / (pitch * scale) + s.phase) % 1;
      const t = u < 0 ? u + 1 : u;
      let frame = Math.min(sources.length - 1, Math.floor(t * sources.length));
      if (s.reverse) frame = sources.length - 1 - frame;
      const src = sources[frame],
        { p, c, s: sn } = transforms[frame];
      const dx = ((x + 0.5) * 25.4) / (s.ppi * scale) - p.x - p.width / 2,
        dy = ((y + 0.5) * 25.4) / (s.ppi * scale) - p.y - p.height / 2;
      const nx = (dx * c + dy * sn) / p.width + 0.5,
        ny = (-dx * sn + dy * c) / p.height + 0.5;
      const offset = (y * width + x) * 4;
      if (
        nx >= p.crop.x &&
        nx < p.crop.x + p.crop.width &&
        ny >= p.crop.y &&
        ny < p.crop.y + p.crop.height &&
        nx >= 0 &&
        nx < 1 &&
        ny >= 0 &&
        ny < 1
      ) {
        // Premultiplied bilinear sampling avoids color fringes along transparent edges.
        const fx = nx * src.width - 0.5,
          fy = ny * src.height - 0.5,
          ix = Math.floor(fx),
          iy = Math.floor(fy);
        let alpha = 0,
          r = 0,
          g = 0,
          b = 0;
        for (let j = 0; j < 2; j++)
          for (let i = 0; i < 2; i++) {
            const sx = Math.max(0, Math.min(src.width - 1, ix + i)),
              sy = Math.max(0, Math.min(src.height - 1, iy + j));
            const k = (sy * src.width + sx) * 4,
              w = (i ? fx - ix : 1 - (fx - ix)) * (j ? fy - iy : 1 - (fy - iy)),
              aw = src.data[k + 3] * w;
            alpha += aw;
            r += src.data[k] * aw;
            g += src.data[k + 1] * aw;
            b += src.data[k + 2] * aw;
          }
        if (alpha > 0) {
          color[offset] = Math.round(r / alpha);
          color[offset + 1] = Math.round(g / alpha);
          color[offset + 2] = Math.round(b / alpha);
          color[offset + 3] = Math.round(alpha);
        }
      }
      let h =
        s.profile === "sine"
          ? (1 - Math.cos(t * 2 * Math.PI)) / 2
          : Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
      if (s.invert) h = 1 - h;
      depth[(y * width + x) * 2] = Math.round(s.low + (s.high - s.low) * h);
      depth[(y * width + x) * 2 + 1] = color[offset + 3] * 257;
    }
    if (y % 32 === 0) progress?.(y / height);
  }
  progress?.(1);
  return { width, height, color, depth };
}
