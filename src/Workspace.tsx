import { useEffect, useRef, useState } from "react";
import type { Project } from "./core/model";
export interface Asset {
  id: string;
  file: File;
  url: string;
}
export function Workspace({
  project,
  assets,
  selected,
  reference,
  overlay,
  mode,
  setMode,
  preview,
  move,
  busy,
}: {
  project: Project;
  assets: Asset[];
  selected: string;
  reference: string;
  overlay: number;
  mode: string;
  setMode: (s: string) => void;
  preview: { art: string; depth: string } | null;
  move: (x: number, y: number) => void;
  busy: boolean;
}) {
  const [zoom, setZoom] = useState(1),
    [boundaries, setBoundaries] = useState(false),
    [view, setView] = useState(0),
    [drag, setDrag] = useState<{
      x: number;
      y: number;
      dx: number;
      dy: number;
    } | null>(null);
  const stage = useRef<HTMLDivElement>(null),
    s = project.settings;
  const scroll = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ width: 600, height: 550 });
  useEffect(() => {
    if (!scroll.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setAvailable({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(scroll.current);
    return () => observer.disconnect();
  }, []);
  const source = project.sources.find((i) => i.id === selected);
  const viewIndex = Math.min(view, project.sources.length - 1);
  const orderedIndex = s.reverse
    ? project.sources.length - 1 - viewIndex
    : viewIndex;
  const ids =
    mode === "views"
      ? [project.sources[orderedIndex]?.id]
      : reference === selected
        ? [selected]
        : [reference, selected];
  return (
    <section className="workspace">
      <div className="workspace-toolbar">
        <div className="segmented">
          {[
            ["sources", "Align"],
            ["art", "Artwork"],
            ["depth", "Depth"],
            ["views", "View order"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={mode === id}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="zoom-control">
          Zoom{" "}
          <select
            aria-label="Preview zoom"
            value={zoom}
            onChange={(e) => setZoom(+e.target.value)}
          >
            <option value=".5">50%</option>
            <option value="1">Fit</option>
            <option value="1.5">150%</option>
            <option value="2">200%</option>
            <option value="4">400%</option>
          </select>
        </label>
      </div>
      <div className="stage-scroll" ref={scroll}>
        <div
          className="stage-wrap"
          style={{
            width: `${Math.max(30, Math.min(available.width, ((available.height - 60) * s.widthMm) / s.heightMm)) * zoom}px`,
          }}
        >
          <div className="ruler">
            {s.widthMm.toFixed(2)} mm <span>→</span>
          </div>
          <div
            ref={stage}
            className={`stage checker ${mode === "sources" ? "draggable" : ""}`}
            style={{ aspectRatio: `${s.widthMm}/${s.heightMm}` }}
            onPointerDown={(e) => {
              if (mode !== "sources" || !source || busy) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              setDrag({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
            }}
            onPointerMove={(e) => {
              if (!drag || !stage.current) return;
              const rect = stage.current.getBoundingClientRect();
              setDrag({
                ...drag,
                dx: ((e.clientX - drag.x) / rect.width) * s.widthMm,
                dy: ((e.clientY - drag.y) / rect.height) * s.heightMm,
              });
            }}
            onPointerUp={() => {
              if (drag && source && (drag.dx || drag.dy))
                move(
                  source.placement.x + drag.dx,
                  source.placement.y + drag.dy,
                );
              setDrag(null);
            }}
            onPointerCancel={() => setDrag(null)}
          >
            {project.sources.length === 0 ? (
              <div className="empty-canvas">
                <img
                  src={`${import.meta.env.BASE_URL}dragon.svg`}
                  alt="Angular ridged dragon"
                />
                <h2>
                  One print.
                  <br />
                  Another perspective.
                </h2>
                <p>
                  Add two images to begin.
                  <br />
                  Everything stays in your browser.
                </p>
                <span className="empty-cross">+</span>
              </div>
            ) : mode === "art" || mode === "depth" ? (
              preview ? (
                <img
                  className="render-preview"
                  src={preview[mode]}
                  alt={`${mode === "art" ? "Interlaced artwork" : "Lens depth"} preview`}
                />
              ) : (
                <div className="empty-canvas">
                  <h3>Build a preview</h3>
                  <p>
                    Use “Update preview” to render the current lens settings.
                  </p>
                </div>
              )
            ) : (
              ids.map((id, index) => {
                const image = project.sources.find((i) => i.id === id),
                  asset = assets.find((i) => i.id === id);
                if (!image || !asset) return null;
                const p = image.placement,
                  c = p.crop;
                return (
                  <img
                    key={`${id}-${index}`}
                    alt={image.name}
                    draggable={false}
                    src={asset.url}
                    className="placed-image"
                    style={{
                      left: `${((p.x + (id === selected ? (drag?.dx ?? 0) : 0)) / s.widthMm) * 100}%`,
                      top: `${((p.y + (id === selected ? (drag?.dy ?? 0) : 0)) / s.heightMm) * 100}%`,
                      width: `${(p.width / s.widthMm) * 100}%`,
                      height: `${(p.height / s.heightMm) * 100}%`,
                      transform: `rotate(${p.rotation}deg)`,
                      opacity:
                        mode === "sources" &&
                        id === selected &&
                        reference !== selected
                          ? overlay
                          : 1,
                      clipPath: `inset(${c.y * 100}% ${(1 - c.x - c.width) * 100}% ${(1 - c.y - c.height) * 100}% ${c.x * 100}%)`,
                    }}
                  />
                );
              })
            )}
            {boundaries && project.sources.length > 0 && (
              <svg
                className="lens-overlay"
                viewBox={`0 0 ${s.widthMm} ${s.heightMm}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <pattern
                    id="lenses"
                    width={25.4 / s.lpi}
                    height={25.4 / s.lpi}
                    patternUnits="userSpaceOnUse"
                    patternTransform={`rotate(${s.angle}) translate(${(-s.phase * 25.4) / s.lpi} 0)`}
                  >
                    <path
                      d={`M 0 0 V ${25.4 / s.lpi}`}
                      stroke="#35d5bf"
                      strokeWidth={0.04}
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#lenses)" />
              </svg>
            )}
          </div>
          <div className="canvas-caption">
            <span>{s.heightMm.toFixed(2)} mm tall</span>
            <span>TRANSPARENT CANVAS</span>
          </div>
        </div>
      </div>
      <div className="workspace-bottom">
        <label className="toggle">
          <input
            type="checkbox"
            checked={boundaries}
            onChange={(e) => setBoundaries(e.target.checked)}
          />
          Lens boundaries
        </label>
        <span>
          {mode === "sources"
            ? "Drag to position · use Image for exact values"
            : mode === "views"
              ? "View order illustration · not an optical simulation"
              : "Reduced-resolution preview · full-size export"}
        </span>
      </div>
      {mode === "views" && project.sources.length > 0 && (
        <label className="view-slider">
          View {Math.min(view + 1, project.sources.length)} of{" "}
          {project.sources.length}
          <input
            aria-label="Illustrative view"
            type="range"
            min="0"
            max={project.sources.length - 1}
            value={view}
            onChange={(e) => setView(+e.target.value)}
          />
        </label>
      )}
    </section>
  );
}
