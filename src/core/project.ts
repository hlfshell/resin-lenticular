import { parse, stringify } from "yaml";
import { z } from "zod";
import type { Project, Source } from "./model";
const finite = z.number().finite(),
  positive = finite.positive();
const crop = z
  .object({
    x: finite.min(0).max(1),
    y: finite.min(0).max(1),
    width: positive.max(1),
    height: positive.max(1),
  })
  .refine(
    (c) => c.x + c.width <= 1.000001 && c.y + c.height <= 1.000001,
    "Crop exceeds source bounds",
  );
const schema = z
  .object({
    version: z.literal(1),
    settings: z.object({
      widthMm: positive,
      heightMm: positive,
      ppi: positive,
      lpi: positive,
      angle: finite,
      phase: finite,
      profile: z.enum(["sine", "arc"]),
      low: finite.int().min(0).max(65535),
      high: finite.int().min(0).max(65535),
      invert: z.boolean(),
      reverse: z.boolean(),
      depthBits: z.union([z.literal(8), z.literal(16)]),
    }),
    sources: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string(),
        hash: z.string().regex(/^[a-f0-9]{64}$/),
        width: positive.int(),
        height: positive.int(),
        placement: z.object({
          x: finite,
          y: finite,
          width: positive,
          height: positive,
          rotation: finite,
          crop,
        }),
      }),
    ),
  })
  .refine(
    (p) => new Set(p.sources.map((s) => s.id)).size === p.sources.length,
    "Duplicate source IDs",
  );
export function saveProject(project: Project) {
  return stringify(project);
}
export function loadProject(text: string): Project {
  if (text.length > 2_000_000) throw new Error("Configuration exceeds 2 MB.");
  try {
    return schema.parse(parse(text, { maxAliasCount: 0 }));
  } catch {
    throw new Error(
      "Invalid project YAML. Check schema version 1, dimensions, crop bounds, and depth values.",
    );
  }
}
export function matchSources(
  wanted: Source[],
  available: Pick<Source, "id" | "hash" | "name">[],
): (string | null)[] {
  return wanted.map((s) => {
    const matches = available.filter((a) => a.hash === s.hash);
    if (matches.length === 1) return matches[0].id;
    const named = matches.filter((a) => a.name === s.name);
    return named.length === 1 ? named[0].id : null;
  });
}
