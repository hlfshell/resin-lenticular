import { useState } from "react";
import { NumberField as N, Toggle, AspectLock } from "./Fields";
import { fit, type Project, type Placement, type Settings } from "./core/model";
const presets: Record<string, [number, number]> = {
  A2: [420, 594],
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
  "US Letter": [215.9, 279.4],
  "US Legal": [215.9, 355.6],
};
export function Inspector({
  project,
  selected,
  update,
  reference,
  setReference,
  overlay,
  setOverlay,
  align,
  busy,
}: {
  project: Project;
  selected: string;
  update: (p: Project) => void;
  reference: string;
  setReference: (s: string) => void;
  overlay: number;
  setOverlay: (n: number) => void;
  align: () => void;
  busy: boolean;
}) {
  const [tab, setTab] = useState("print"),
    [unit, setUnit] = useState<"mm" | "in" | "px">("mm"),
    [lock, setLock] = useState(true),
    [canvasLock, setCanvasLock] = useState(true);
  const s = project.settings,
    source = project.sources.find((i) => i.id === selected),
    p = source?.placement;
  const factor = unit === "in" ? 25.4 : unit === "px" ? 25.4 / s.ppi : 1;
  const settings = (change: Partial<Settings>) =>
    update({ ...project, settings: { ...s, ...change } });
  const placement = (change: Partial<Placement>) =>
    update({
      ...project,
      sources: project.sources.map((i) =>
        i.id === selected
          ? { ...i, placement: { ...i.placement, ...change } }
          : i,
      ),
    });
  const size = (key: "width" | "height", v: number) => {
    if (!p) return;
    const n = v * factor;
    placement({
      [key]: n,
      ...(lock
        ? {
            [key === "width" ? "height" : "width"]:
              n * (key === "width" ? p.height / p.width : p.width / p.height),
          }
        : {}),
    });
  };
  return (
    <aside className="inspector panel">
      <div className="tabs" role="tablist" aria-label="Settings">
        {["print", "image", "lens"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <fieldset disabled={busy}>
        <div className="inspector-title">
          <h2>
            {tab === "print"
              ? "Print canvas"
              : tab === "image"
                ? "Image transform"
                : "Lens geometry"}
          </h2>
          <span className="mini-label">
            {tab === "print" ? "01" : tab === "image" ? "02" : "03"}
          </span>
        </div>
        {tab !== "lens" && (
          <label className="field">
            <span>Dimension units</span>
            <select
              aria-label="Dimension units"
              value={unit}
              onChange={(e) => setUnit(e.target.value as typeof unit)}
            >
              <option value="mm">Millimeters</option>
              <option value="in">Inches</option>
              <option value="px">Pixels at output PPI</option>
            </select>
          </label>
        )}
        {tab === "print" && (
          <>
            <label className="field">
              <span>Paper preset</span>
              <select
                aria-label="Paper preset"
                value="custom"
                onChange={(e) => {
                  const preset = presets[e.target.value];
                  if (preset)
                    settings({ widthMm: preset[0], heightMm: preset[1] });
                }}
              >
                <option value="custom">Custom dimensions</option>
                {Object.keys(presets).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <div className="two-col">
              <N
                label="Canvas width"
                value={s.widthMm / factor}
                min={0.001}
                step={0.1}
                suffix={unit}
                onChange={(v) =>
                  settings({
                    widthMm: v * factor,
                    ...(canvasLock
                      ? { heightMm: (v * factor * s.heightMm) / s.widthMm }
                      : {}),
                  })
                }
              />
              <N
                label="Canvas height"
                value={s.heightMm / factor}
                min={0.001}
                step={0.1}
                suffix={unit}
                onChange={(v) =>
                  settings({
                    heightMm: v * factor,
                    ...(canvasLock
                      ? { widthMm: (v * factor * s.widthMm) / s.heightMm }
                      : {}),
                  })
                }
              />
            </div>
            <AspectLock
              label="Lock canvas aspect ratio"
              locked={canvasLock}
              onChange={setCanvasLock}
            />
            <button
              className="wide subtle"
              onClick={() =>
                settings({ widthMm: s.heightMm, heightMm: s.widthMm })
              }
            >
              ↔ Swap portrait / landscape
            </button>
            <N
              label="Print density"
              value={s.ppi}
              min={1}
              suffix="PPI"
              onChange={(ppi) => settings({ ppi })}
            />
            <p className="hint">
              Physical dimensions stay fixed when density changes. Your export
              is never silently resized.
            </p>
            <div className="note">
              <strong>Keep the pitch precise.</strong>
              <p>
                Print at the exported size. Scaling the artwork changes the
                spacing between lenses.
              </p>
            </div>
          </>
        )}
        {tab === "image" &&
          (source && p ? (
            <>
              <p className="selected-name">{source.name}</p>
              <div className="two-col">
                <N
                  label="X offset"
                  value={p.x / factor}
                  suffix={unit}
                  onChange={(x) => placement({ x: x * factor })}
                />
                <N
                  label="Y offset"
                  value={p.y / factor}
                  suffix={unit}
                  onChange={(y) => placement({ y: y * factor })}
                />
                <N
                  label="Image width"
                  value={p.width / factor}
                  min={0.001}
                  suffix={unit}
                  onChange={(v) => size("width", v)}
                />
                <N
                  label="Image height"
                  value={p.height / factor}
                  min={0.001}
                  suffix={unit}
                  onChange={(v) => size("height", v)}
                />
              </div>
              <AspectLock
                label="Lock image aspect ratio"
                locked={lock}
                onChange={setLock}
              />
              <N
                label="Image rotation"
                value={p.rotation}
                suffix="°"
                step={0.1}
                onChange={(rotation) => placement({ rotation })}
              />
              <details>
                <summary>Crop source bounds</summary>
                <p className="hint">
                  Percent of the original image. Cropping clips the image
                  without moving it.
                </p>
                <div className="two-col">
                  {(["x", "y", "width", "height"] as const).map((key) => (
                    <N
                      key={key}
                      label={`Crop ${key}`}
                      suffix="%"
                      value={p.crop[key] * 100}
                      min={key === "width" || key === "height" ? 0.01 : 0}
                      max={100}
                      onChange={(v) => {
                        const crop = { ...p.crop, [key]: v / 100 };
                        if (
                          crop.x + crop.width <= 1 &&
                          crop.y + crop.height <= 1
                        )
                          placement({ crop });
                      }}
                    />
                  ))}
                </div>
              </details>
              <button
                className="wide subtle"
                onClick={() => placement(fit(source.width, source.height, s))}
              >
                Reset to centered fit
              </button>
              <hr />
              <label className="field">
                <span>Alignment reference</span>
                <select
                  aria-label="Alignment reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                >
                  {project.sources.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>
                  Selected image overlay · {Math.round(overlay * 100)}%
                </span>
                <input
                  aria-label="Overlay opacity"
                  type="range"
                  min="0"
                  max="1"
                  step=".01"
                  value={overlay}
                  onChange={(e) => setOverlay(+e.target.value)}
                />
              </label>
              <button
                className="wide accent-outline"
                disabled={reference === selected || !reference}
                onClick={align}
              >
                ✧ Quick feature alignment
              </button>
              <p className="hint">
                A short attempt at matching features. Drag the image or use
                exact offsets if a match cannot be found.
              </p>
            </>
          ) : (
            <p className="hint">
              Add and select an image to edit its placement.
            </p>
          ))}
        {tab === "lens" && (
          <>
            <N
              label="Lens frequency"
              value={s.lpi}
              min={0.01}
              step={0.1}
              suffix="LPI"
              onChange={(lpi) => settings({ lpi })}
            />
            <label className="field">
              <span>Orientation</span>
              <select
                aria-label="Lens orientation"
                value={
                  s.angle === 0
                    ? "vertical"
                    : s.angle === 90
                      ? "horizontal"
                      : "custom"
                }
                onChange={(e) =>
                  settings({
                    angle:
                      e.target.value === "vertical"
                        ? 0
                        : e.target.value === "horizontal"
                          ? 90
                          : 45,
                  })
                }
              >
                <option value="vertical">Vertical lenses · left / right</option>
                <option value="horizontal">
                  Horizontal lenses · up / down
                </option>
                <option value="custom">Custom angle</option>
              </select>
            </label>
            <N
              label="Lens angle"
              value={s.angle}
              step={0.1}
              suffix="°"
              onChange={(angle) => settings({ angle })}
            />
            <p className="hint">
              0°: vertical ridges. 90°: horizontal ridges. Angle rotates the
              sampling direction clockwise.
            </p>
            <label className="field">
              <span>Lens profile</span>
              <select
                aria-label="Lens profile"
                value={s.profile}
                onChange={(e) =>
                  settings({ profile: e.target.value as Settings["profile"] })
                }
              >
                <option value="sine">Sine wave</option>
                <option value="arc">Circular arc</option>
              </select>
            </label>
            <N
              label="Phase"
              value={s.phase}
              step={0.01}
              suffix="cycles"
              onChange={(phase) => settings({ phase })}
            />
            <Toggle
              label="Invert depth · swap highs and lows"
              checked={s.invert}
              onChange={(invert) => settings({ invert })}
            />
            <Toggle
              label="Reverse view order"
              checked={s.reverse}
              onChange={(reverse) => settings({ reverse })}
            />
            <details>
              <summary>Depth encoding</summary>
              <p className="hint">
                Black is low, white is high by default. Endpoints encode
                relative height.
              </p>
              <div className="two-col">
                <N
                  label="Low endpoint"
                  value={(s.low / 65535) * 100}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(v) =>
                    settings({ low: Math.round((v / 100) * 65535) })
                  }
                />
                <N
                  label="High endpoint"
                  value={(s.high / 65535) * 100}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(v) =>
                    settings({ high: Math.round((v / 100) * 65535) })
                  }
                />
                <N
                  label="Low 16-bit value"
                  value={s.low}
                  min={0}
                  max={65535}
                  onChange={(v) => settings({ low: Math.round(v) })}
                />
                <N
                  label="High 16-bit value"
                  value={s.high}
                  min={0}
                  max={65535}
                  onChange={(v) => settings({ high: Math.round(v) })}
                />
              </div>
              <button
                className="wide subtle"
                onClick={() => settings({ low: s.high, high: s.low })}
              >
                Swap grayscale endpoints
              </button>
              <label className="field">
                <span>Depth export</span>
                <select
                  aria-label="Depth bit depth"
                  value={s.depthBits}
                  onChange={(e) =>
                    settings({ depthBits: +e.target.value as 8 | 16 })
                  }
                >
                  <option value="16">16-bit grayscale + alpha</option>
                  <option value="8">8-bit grayscale + alpha</option>
                </select>
              </label>
            </details>
          </>
        )}
      </fieldset>
    </aside>
  );
}
