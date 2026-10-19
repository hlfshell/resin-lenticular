import type { Raster } from "./model";
interface Feature {
  x: number;
  y: number;
  score: number;
  descriptor: number[];
}
export interface Alignment {
  tx: number;
  ty: number;
  scale: number;
  rotation: number;
  matches: number;
}
function features(image: Raster, deadline: number): Feature[] {
  const { width: w, height: h, data } = image,
    gray = new Float32Array(w * h);
  for (let i = 0; i < gray.length; i++)
    gray[i] =
      ((data[i * 4] * 0.299 +
        data[i * 4 + 1] * 0.587 +
        data[i * 4 + 2] * 0.114) *
        data[i * 4 + 3]) /
      255;
  const candidates: Feature[] = [];
  for (let y = 10; y < h - 10; y += 2) {
    if (performance.now() > deadline) return [];
    for (let x = 10; x < w - 10; x += 2) {
      let xx = 0,
        yy = 0,
        xy = 0;
      for (let j = -2; j <= 2; j++)
        for (let i = -2; i <= 2; i++) {
          const p = (y + j) * w + x + i,
            gx = gray[p + 1] - gray[p - 1],
            gy = gray[p + w] - gray[p - w];
          xx += gx * gx;
          yy += gy * gy;
          xy += gx * gy;
        }
      const score = xx * yy - xy * xy - 0.04 * (xx + yy) ** 2;
      if (score > 100000) candidates.push({ x, y, score, descriptor: [] });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const selected: Feature[] = [];
  for (const point of candidates) {
    if (selected.some((f) => (f.x - point.x) ** 2 + (f.y - point.y) ** 2 < 64))
      continue;
    // Normalized patches are fast; similarity consensus recovers modest rotation and scale.
    const desc: number[] = [];
    for (let j = -6; j <= 6; j += 2)
      for (let i = -6; i <= 6; i += 2)
        desc.push(gray[(point.y + j) * w + point.x + i]);
    const mean = desc.reduce((a, b) => a + b, 0) / desc.length;
    const norm = Math.sqrt(desc.reduce((a, b) => a + (b - mean) ** 2, 0));
    if (norm < 1) continue;
    point.descriptor = desc.map((v) => (v - mean) / norm);
    selected.push(point);
    if (selected.length >= 140) break;
  }
  return selected;
}
/** Returns a similarity transform mapping moving-image pixels into reference-image pixels. */
export function alignImages(
  reference: Raster,
  moving: Raster,
  budgetMs = 1800,
): Alignment | null {
  const deadline = performance.now() + budgetMs;
  const a = features(reference, deadline),
    b = features(moving, deadline);
  if (a.length < 5 || b.length < 5) return null;
  const pairs: { a: Feature; b: Feature; distance: number }[] = [];
  for (const point of b) {
    if (performance.now() > deadline) return null;
    let best = Infinity,
      second = Infinity,
      match: Feature | undefined;
    for (const target of a) {
      const d = point.descriptor.reduce(
        (n, v, i) => n + (v - target.descriptor[i]) ** 2,
        0,
      );
      if (d < best) {
        second = best;
        best = d;
        match = target;
      } else if (d < second) second = d;
    }
    if (match && best < 0.65 * second && best < 0.8)
      pairs.push({ a: match, b: point, distance: best });
  }
  // One reference feature can vote only once.
  pairs.sort((a, b) => a.distance - b.distance);
  const unique = pairs.filter(
    (p, i) => pairs.findIndex((q) => q.a === p.a) === i,
  );
  let best: Alignment | null = null,
    bestInliers: typeof pairs = [];
  for (let i = 0; i < unique.length; i++)
    for (let j = i + 1; j < unique.length; j++) {
      if (performance.now() > deadline) return null;
      const p = unique[i],
        q = unique[j],
        bx = q.b.x - p.b.x,
        by = q.b.y - p.b.y,
        ax = q.a.x - p.a.x,
        ay = q.a.y - p.a.y;
      const denom = bx * bx + by * by;
      if (denom < 100) continue;
      const c = (ax * bx + ay * by) / denom,
        s = (ay * bx - ax * by) / denom,
        scale = Math.hypot(c, s);
      if (scale < 0.5 || scale > 2) continue;
      const tx = p.a.x - c * p.b.x + s * p.b.y,
        ty = p.a.y - s * p.b.x - c * p.b.y;
      const votes = unique.filter(
        (k) =>
          Math.hypot(
            c * k.b.x - s * k.b.y + tx - k.a.x,
            s * k.b.x + c * k.b.y + ty - k.a.y,
          ) < 3,
      );
      if (votes.length > bestInliers.length) {
        bestInliers = votes;
        best = {
          tx,
          ty,
          scale,
          rotation: (Math.atan2(s, c) * 180) / Math.PI,
          matches: votes.length,
        };
      }
    }
  if (
    !best ||
    bestInliers.length < 5 ||
    bestInliers.length < unique.length * 0.45
  )
    return null;
  // Least-squares refinement across the consensus avoids privileging one noisy pair.
  const n = bestInliers.length;
  const center = (side: "a" | "b", axis: "x" | "y") =>
    bestInliers.reduce((sum, p) => sum + p[side][axis], 0) / n;
  const ax = center("a", "x"),
    ay = center("a", "y"),
    bx = center("b", "x"),
    by = center("b", "y");
  let dot = 0,
    cross = 0,
    den = 0;
  for (const p of bestInliers) {
    const x = p.b.x - bx,
      y = p.b.y - by,
      u = p.a.x - ax,
      v = p.a.y - ay;
    dot += x * u + y * v;
    cross += x * v - y * u;
    den += x * x + y * y;
  }
  const c = dot / den,
    s = cross / den;
  return {
    tx: ax - c * bx + s * by,
    ty: ay - s * bx - c * by,
    scale: Math.hypot(c, s),
    rotation: (Math.atan2(s, c) * 180) / Math.PI,
    matches: n,
  };
}
