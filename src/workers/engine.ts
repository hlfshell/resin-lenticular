import { zipSync, strToU8 } from "fflate";
import { render, type Rendered } from "../core/render";
import { encodePNG } from "../core/png";
import { saveProject } from "../core/project";
import { alignImages } from "../core/alignment";
import {
  dimensions,
  exportBudget,
  type Project,
  type Raster,
  type Placement,
} from "../core/model";
export interface AssetInput {
  id: string;
  file: File;
}
export type Request =
  | { kind: "import"; files: File[] }
  | { kind: "render"; project: Project; assets: AssetInput[]; preview: boolean }
  | {
      kind: "align";
      project: Project;
      assets: AssetInput[];
      reference: string;
      selected: string;
    }
  | {
      kind: "calibrate";
      project: Project;
      assets: AssetInput[];
      lpis: number[];
      amplitudes: number[];
      sampleMm: number;
    };
const progress = (value: number, label: string) =>
  postMessage({ kind: "progress", value, label });
const blob = (bytes: Uint8Array, type = "image/png") =>
  new Blob([new Uint8Array(bytes)], { type });
async function decode(file: File, maxSide?: number): Promise<Raster> {
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 24_000_000)
      throw new Error(
        "A source exceeds 24 megapixels. Resize it before import.",
      );
    const scale = maxSide
      ? Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
      : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale)),
      height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height),
      ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, width, height);
    return { width, height, data: ctx.getImageData(0, 0, width, height).data };
  } finally {
    bitmap.close();
  }
}
async function readSources(
  project: Project,
  assets: AssetInput[],
  preview = false,
) {
  let total = 0;
  const sources: Raster[] = [];
  for (const source of project.sources) {
    total += source.width * source.height;
    if (total > 48_000_000 && !preview)
      throw new Error(
        "Sources exceed the 48-megapixel combined budget. Resize sources before export.",
      );
    const asset = assets.find((a) => a.id === source.id);
    if (!asset) throw new Error(`Missing source: ${source.name}`);
    sources.push(await decode(asset.file, preview ? 700 : undefined));
  }
  return sources;
}
function artworkCanvas(
  r: Raster,
  p: Placement,
  width: number,
  height: number,
  project: Project,
): Raster {
  const input = new OffscreenCanvas(r.width, r.height);
  input
    .getContext("2d")!
    .putImageData(
      new ImageData(new Uint8ClampedArray(r.data), r.width, r.height),
      0,
      0,
    );
  const canvas = new OffscreenCanvas(width, height),
    ctx = canvas.getContext("2d")!;
  ctx.scale(
    width / project.settings.widthMm,
    height / project.settings.heightMm,
  );
  ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
  ctx.rotate((p.rotation * Math.PI) / 180);
  const c = p.crop;
  ctx.drawImage(
    input,
    c.x * r.width,
    c.y * r.height,
    c.width * r.width,
    c.height * r.height,
    (c.x - 0.5) * p.width,
    (c.y - 0.5) * p.height,
    c.width * p.width,
    c.height * p.height,
  );
  return { width, height, data: ctx.getImageData(0, 0, width, height).data };
}
function packageOutput(
  result: Rendered,
  project: Project,
  prefix = "lenticular",
) {
  progress(0.82, "Encoding print files");
  const art = encodePNG(
    result.width,
    result.height,
    result.color,
    8,
    6,
    project.settings.ppi,
  );
  const depth = encodePNG(
    result.width,
    result.height,
    result.depth,
    project.settings.depthBits,
    4,
    project.settings.ppi,
  );
  const yaml = saveProject(project);
  progress(0.94, "Packaging downloads");
  const zip = zipSync(
    {
      [`${prefix}-artwork.png`]: [art, { level: 0 }],
      [`${prefix}-depth.png`]: [depth, { level: 0 }],
      [`${prefix}.yaml`]: strToU8(yaml),
    },
    { level: 1 },
  );
  return {
    art: blob(art),
    depth: blob(depth),
    yaml: blob(strToU8(yaml), "application/yaml"),
    zip: blob(zip, "application/zip"),
    width: result.width,
    height: result.height,
  };
}
async function calibration(request: Extract<Request, { kind: "calibrate" }>) {
  const { project, lpis, amplitudes, sampleMm } = request;
  if (
    !lpis.length ||
    !amplitudes.length ||
    lpis.length * amplitudes.length > 36 ||
    lpis.some((n) => !Number.isFinite(n) || n <= 0) ||
    amplitudes.some((n) => !Number.isFinite(n) || n < 0 || n > 100) ||
    !Number.isFinite(sampleMm) ||
    sampleMm <= 0
  )
    throw new Error(
      "Choose positive LPI/sample size, 0–100% amplitudes, and at most 36 samples.",
    );
  const gap = 2,
    labelMm = 5,
    s = project.settings;
  const sheetSettings = {
    ...s,
    widthMm: lpis.length * (sampleMm + gap) + gap,
    heightMm: amplitudes.length * (sampleMm + labelMm + gap) + gap,
  };
  if (!exportBudget(sheetSettings).supported)
    throw new Error(
      "Calibration sheet exceeds the 24-megapixel export limit. Reduce sample size or PPI.",
    );
  const { width, height } = dimensions(sheetSettings),
    color = new Uint8Array(width * height * 4),
    depth = new Uint16Array(width * height * 2);
  const sources = await readSources(project, request.assets),
    factor = sampleMm / Math.max(s.widthMm, s.heightMm);
  const placements = project.sources.map(({ placement: p }) => ({
    ...p,
    x: p.x * factor + (sampleMm - s.widthMm * factor) / 2,
    y: p.y * factor + (sampleMm - s.heightMm * factor) / 2,
    width: p.width * factor,
    height: p.height * factor,
  }));
  const labels = new OffscreenCanvas(width, height),
    ctx = labels.getContext("2d")!;
  ctx.font = `${Math.max(12, Math.round((2.4 * s.ppi) / 25.4))}px sans-serif`;
  ctx.fillStyle = "#111";
  ctx.textBaseline = "top";
  for (let row = 0; row < amplitudes.length; row++)
    for (let col = 0; col < lpis.length; col++) {
      const cell = render(
        {
          ...s,
          widthMm: sampleMm,
          heightMm: sampleMm,
          lpi: lpis[col],
          high: Math.round(s.low + ((s.high - s.low) * amplitudes[row]) / 100),
        },
        sources,
        placements,
      );
      const ox = Math.round(((gap + col * (sampleMm + gap)) * s.ppi) / 25.4),
        oy = Math.round(
          ((gap + row * (sampleMm + labelMm + gap)) * s.ppi) / 25.4,
        );
      ctx.fillText(
        `${lpis[col]} LPI · ${amplitudes[row]}%`,
        ox,
        oy,
        (sampleMm * s.ppi) / 25.4,
      );
      const top = oy + Math.round((labelMm * s.ppi) / 25.4);
      for (let y = 0; y < cell.height; y++) {
        color.set(
          cell.color.subarray(y * cell.width * 4, (y + 1) * cell.width * 4),
          ((top + y) * width + ox) * 4,
        );
        depth.set(
          cell.depth.subarray(y * cell.width * 2, (y + 1) * cell.width * 2),
          ((top + y) * width + ox) * 2,
        );
      }
      progress(
        ((row * lpis.length + col + 1) / (lpis.length * amplitudes.length)) *
          0.75,
        "Rendering calibration samples",
      );
    }
  const text = ctx.getImageData(0, 0, width, height).data;
  for (let i = 0; i < width * height; i++)
    if (text[i * 4 + 3]) {
      color.set(text.subarray(i * 4, i * 4 + 4), i * 4);
      depth[i * 2] = s.low;
      depth[i * 2 + 1] = text[i * 4 + 3] * 257;
    }
  // Keep the ordinary project restorable; include a separate recipe in the calibration bundle.
  const output = packageOutput(
    { width, height, color, depth },
    project,
    "calibration",
  );
  const recipe = {
    version: 1,
    lpis,
    amplitudes,
    sampleMm,
    widthMm: sheetSettings.widthMm,
    heightMm: sheetSettings.heightMm,
  };
  const { stringify } = await import("yaml");
  const zip = zipSync({
    "calibration-artwork.png": [
      new Uint8Array(await output.art.arrayBuffer()),
      { level: 0 },
    ],
    "calibration-depth.png": [
      new Uint8Array(await output.depth.arrayBuffer()),
      { level: 0 },
    ],
    "lenticular.yaml": strToU8(saveProject(project)),
    "calibration-recipe.yaml": strToU8(stringify(recipe)),
  });
  return { ...output, zip: blob(zip, "application/zip") };
}
self.onmessage = async ({ data: request }: { data: Request }) => {
  try {
    if (request.kind === "import") {
      const imported = [];
      for (const file of request.files) {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
          throw new Error("Use PNG, JPEG or WebP images.");
        if (file.size > 100_000_000)
          throw new Error("Source file exceeds 100 MB.");
        const bitmap = await createImageBitmap(file);
        const width = bitmap.width,
          height = bitmap.height;
        bitmap.close();
        const raster = await decode(file, 512),
          canvas = new OffscreenCanvas(raster.width, raster.height);
        canvas
          .getContext("2d")!
          .putImageData(
            new ImageData(
              new Uint8ClampedArray(raster.data),
              raster.width,
              raster.height,
            ),
            0,
            0,
          );
        const hash = Array.from(
          new Uint8Array(
            await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
          ),
          (n) => n.toString(16).padStart(2, "0"),
        ).join("");
        imported.push({
          id: crypto.randomUUID(),
          name: file.name,
          hash,
          width,
          height,
          thumbnail: await canvas.convertToBlob({ type: "image/png" }),
        });
        progress(imported.length / request.files.length, "Reading images");
      }
      postMessage({ kind: "done", result: imported });
      return;
    }
    if (request.kind === "align") {
      const { project } = request,
        sources = await readSources(project, request.assets, true),
        full = dimensions(project.settings),
        scale = 320 / Math.max(full.width, full.height),
        w = Math.max(1, Math.round(full.width * scale)),
        h = Math.max(1, Math.round(full.height * scale));
      const indices = [request.reference, request.selected].map((id) =>
        project.sources.findIndex((s) => s.id === id),
      );
      if (indices.some((i) => i < 0))
        throw new Error("Choose two images to align.");
      const rasters = indices.map((i) =>
        artworkCanvas(sources[i], project.sources[i].placement, w, h, project),
      );
      const match = alignImages(rasters[0], rasters[1]);
      postMessage({
        kind: "done",
        result: match
          ? {
              ...match,
              tx: (match.tx * project.settings.widthMm) / w,
              ty: (match.ty * project.settings.heightMm) / h,
            }
          : null,
      });
      return;
    }
    if (request.kind === "calibrate") {
      postMessage({ kind: "done", result: await calibration(request) });
      return;
    }
    const { project, preview } = request,
      s = project.settings,
      budget = exportBudget(s);
    if (!preview && !budget.supported)
      throw new Error(
        "Export exceeds 24 megapixels or 32,767 pixels per side. Reduce physical size or explicitly choose a lower PPI.",
      );
    progress(0.03, "Decoding sources");
    const sources = await readSources(project, request.assets, preview);
    const scale = preview
      ? Math.min(1, 800 / Math.max(budget.width, budget.height))
      : 1;
    const result = render(
      s,
      sources,
      project.sources.map((i) => i.placement),
      (n) => progress(0.1 + n * 0.68, "Rendering lenses"),
      scale,
    );
    if (preview) {
      postMessage({
        kind: "done",
        result: {
          art: blob(
            encodePNG(
              result.width,
              result.height,
              result.color,
              8,
              6,
              s.ppi * scale,
            ),
          ),
          depth: blob(
            encodePNG(
              result.width,
              result.height,
              result.depth,
              8,
              4,
              s.ppi * scale,
            ),
          ),
          width: result.width,
          height: result.height,
        },
      });
    } else
      postMessage({ kind: "done", result: packageOutput(result, project) });
  } catch (error) {
    postMessage({
      kind: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
