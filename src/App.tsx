import { useEffect, useRef, useState } from "react";
import { Inspector } from "./Inspector";
import { Workspace, type Asset } from "./Workspace";
import { NumberField } from "./Fields";
import {
  defaults,
  dimensions,
  exportBudget,
  checkSettings,
  fit,
  type Project,
  type Source,
} from "./core/model";
import { loadProject, matchSources, saveProject } from "./core/project";
import type { Alignment } from "./core/alignment";
import { useWorkerJob } from "./useWorkerJob";
interface Output {
  art: Blob;
  depth: Blob;
  yaml: Blob;
  zip: Blob;
  width: number;
  height: number;
}
interface Imported {
  id: string;
  name: string;
  hash: string;
  width: number;
  height: number;
  thumbnail: Blob;
}
function useBlobURLs(blobs: { art: Blob; depth: Blob } | null) {
  const [urls, setUrls] = useState<{ art: string; depth: string } | null>(null);
  useEffect(() => {
    if (!blobs) {
      setUrls(null);
      return;
    }
    const next = {
      art: URL.createObjectURL(blobs.art),
      depth: URL.createObjectURL(blobs.depth),
    };
    setUrls(next);
    return () => {
      URL.revokeObjectURL(next.art);
      URL.revokeObjectURL(next.depth);
    };
  }, [blobs]);
  return urls;
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
export default function App() {
  const [project, setProject] = useState<Project>({
      version: 1,
      settings: { ...defaults },
      sources: [],
    }),
    [past, setPast] = useState<Project[]>([]),
    [future, setFuture] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]),
    [selected, setSelected] = useState(""),
    [reference, setReference] = useState(""),
    [overlay, setOverlay] = useState(0.65),
    [mode, setMode] = useState("sources");
  const {
    busy,
    progress,
    jobLabel,
    message,
    setMessage,
    error,
    setError,
    execute,
    cancel,
  } = useWorkerJob();
  const [preview, setPreview] = useState<{ art: Blob; depth: Blob } | null>(
      null,
    ),
    [output, setOutput] = useState<Output | null>(null),
    [calibration, setCalibration] = useState<Output | null>(null);
  const [pending, setPending] = useState<Project | null>(null),
    [mapping, setMapping] = useState<(string | null)[]>([]);
  const [lpis, setLpis] = useState("30, 40, 50"),
    [amplitudes, setAmplitudes] = useState("50, 75, 100"),
    [sampleMm, setSampleMm] = useState(15);
  const fileInput = useRef<HTMLInputElement>(null),
    configInput = useRef<HTMLInputElement>(null),
    replaceInput = useRef<HTMLInputElement>(null);
  const urls = useBlobURLs(preview),
    assetRefs = useRef(assets);
  assetRefs.current = assets;
  useEffect(
    () => () => {
      assetRefs.current.forEach((a) => URL.revokeObjectURL(a.url));
    },
    [],
  );
  const invalidate = () => {
    setPreview(null);
    setOutput(null);
    setCalibration(null);
  };
  const update = (next: Project) => {
    setPast((v) => [...v.slice(-39), project]);
    setFuture([]);
    setProject(next);
    invalidate();
  };
  const restoreHistory = (direction: "undo" | "redo") => {
    const list = direction === "undo" ? past : future;
    if (!list.length) return;
    const next = list[list.length - 1];
    if (direction === "undo") {
      setPast(list.slice(0, -1));
      setFuture((v) => [...v, project]);
    } else {
      setFuture(list.slice(0, -1));
      setPast((v) => [...v, project]);
    }
    setProject(next);
    invalidate();
    setSelected(next.sources[0]?.id ?? "");
    setReference(next.sources[0]?.id ?? "");
  };
  // Retain files referenced by undo/redo, and release thumbnails once no state can reach them.
  useEffect(() => {
    const ids = new Set(
      [project, ...past, ...future].flatMap((p) => p.sources.map((s) => s.id)),
    );
    setAssets((old) => {
      const kept = old.filter((a) => ids.has(a.id));
      old
        .filter((a) => !ids.has(a.id))
        .forEach((a) => URL.revokeObjectURL(a.url));
      return kept.length === old.length ? old : kept;
    });
  }, [project, past, future]);
  const inputAssets = () => assets.map(({ id, file }) => ({ id, file }));
  async function importFiles(files: File[], replace = false) {
    if (!files.length) return;
    const result = await execute<Imported[]>({ kind: "import", files });
    if (!result) return;
    const settings = project.sources.length
      ? project.settings
      : {
          ...project.settings,
          heightMm:
            (project.settings.widthMm * result[0].height) / result[0].width,
        };
    const added: Source[] = result.map((i) => ({
      id: i.id,
      name: i.name,
      hash: i.hash,
      width: i.width,
      height: i.height,
      placement: fit(i.width, i.height, settings),
    }));
    const nextSources = replace
      ? project.sources.map((i) =>
          i.id === selected ? { ...added[0], placement: i.placement } : i,
        )
      : [...project.sources, ...added];
    setAssets((old) => [
      ...old,
      ...result.map((i, n) => ({
        id: i.id,
        file: files[n],
        url: URL.createObjectURL(i.thumbnail),
      })),
    ]);
    update({ ...project, settings, sources: nextSources });
    setSelected(added[0].id);
    setReference(
      replace && reference === selected
        ? added[0].id
        : reference || added[0].id,
    );
    setMode("sources");
    setMessage(
      `${result.length} image${result.length === 1 ? "" : "s"} added locally.`,
    );
  }
  async function generate(previewOnly: boolean) {
    const result = await execute<Output>({
      kind: "render",
      project,
      assets: inputAssets(),
      preview: previewOnly,
    });
    if (result) {
      setPreview(result);
      if (!previewOnly) setOutput(result);
      setMode("art");
      setMessage(
        previewOnly ? "Preview updated." : "Print files are ready to download.",
      );
    }
  }
  async function align() {
    setMode("sources");
    const result = await execute<Alignment | null>({
      kind: "align",
      project,
      assets: inputAssets(),
      reference,
      selected,
    });
    if (result === undefined) return;
    if (result) {
      const a = (result.rotation * Math.PI) / 180,
        c = Math.cos(a) * result.scale,
        s = Math.sin(a) * result.scale;
      update({
        ...project,
        sources: project.sources.map((i) => {
          if (i.id !== selected) return i;
          const p = i.placement,
            cx = p.x + p.width / 2,
            cy = p.y + p.height / 2,
            w = p.width * result.scale,
            h = p.height * result.scale;
          return {
            ...i,
            placement: {
              ...p,
              x: c * cx - s * cy + result.tx - w / 2,
              y: s * cx + c * cy + result.ty - h / 2,
              width: w,
              height: h,
              rotation: p.rotation + result.rotation,
            },
          };
        }),
      });
      setMessage(
        `Aligned using ${result.matches} matching features. Undo is available.`,
      );
    } else
      setMessage(
        "No confident match. Use the overlay and exact offsets to align manually.",
      );
  }
  function loadConfig(file: File | undefined) {
    if (!file) return;
    file.text().then((text) => {
      try {
        const parsed = loadProject(text);
        setPending(parsed);
        setMapping(matchSources(parsed.sources, project.sources));
        setMessage(
          "Reupload any missing source images, then confirm the mappings.",
        );
        setError(false);
      } catch (e) {
        setError(true);
        setMessage(String(e));
      }
    });
  }
  useEffect(() => {
    if (pending)
      setMapping((old) =>
        matchSources(pending.sources, project.sources).map((id, i) =>
          old[i] && project.sources.some((s) => s.id === old[i]) ? old[i] : id,
        ),
      );
  }, [pending, project.sources]);
  const sheetSize = {
    widthMm: lpis.split(",").length * (sampleMm + 2) + 2,
    heightMm: amplitudes.split(",").length * (sampleMm + 7) + 2,
  };
  const sheetBudget = exportBudget({ ...project.settings, ...sheetSize });
  const budget = exportBudget(project.settings),
    px = dimensions(project.settings);
  let warnings: string[] = [];
  let invalid = "";
  try {
    if (project.sources.length)
      warnings = checkSettings(project.settings, project.sources.length);
  } catch (e) {
    invalid = (e as Error).message;
  }
  const selectedIndex = project.sources.findIndex((s) => s.id === selected);
  const moveOrder = (direction: number) => {
    const next = [...project.sources],
      target = selectedIndex + direction;
    if (target < 0 || target >= next.length) return;
    [next[target], next[selectedIndex]] = [next[selectedIndex], next[target]];
    update({ ...project, sources: next });
  };
  return (
    <>
      <header className="app-header">
        <a className="brand" href="./">
          <img src={`${import.meta.env.BASE_URL}dragon.svg`} alt="" />
          <div>
            RESIN<span>LENTICULAR</span>
          </div>
          <small>IMAGE & LENS STUDIO</small>
        </a>
        <div className="header-actions">
          <span className="local-badge">
            <i />
            Local by design
          </span>
          <button onClick={() => configInput.current?.click()} disabled={busy}>
            Open YAML
          </button>
          <button
            disabled={busy || !project.sources.length}
            onClick={() =>
              download(
                new Blob([saveProject(project)], { type: "application/yaml" }),
                "lenticular.yaml",
              )
            }
          >
            Save YAML
          </button>
        </div>
      </header>
      <input
        ref={fileInput}
        aria-label="Add source images"
        className="file-input"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(e) => {
          void importFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <input
        ref={replaceInput}
        aria-label="Replace source image"
        className="file-input"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          void importFiles(Array.from(e.target.files ?? []), true);
          e.target.value = "";
        }}
      />
      <input
        ref={configInput}
        aria-label="Open project YAML"
        className="file-input"
        type="file"
        accept=".yaml,.yml"
        onChange={(e) => {
          loadConfig(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">A DIFFERENT WAY TO SEE</div>
            <h1>Make every angle count.</h1>
            <p>
              Align your images. Shape the lenses. Create a print that changes
              perspective.
            </p>
          </div>
          <div className="default-stats">
            <span>
              <b>{project.settings.ppi}</b> PPI
            </span>
            <span>
              <b>{project.settings.lpi}</b> LPI
            </span>
            <span>
              <b>{project.sources.length.toString().padStart(2, "0")}</b> VIEWS
            </span>
          </div>
        </section>
        <section
          className="source-strip panel"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy) void importFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <div className="source-heading">
            <div>
              <span className="eyebrow">SOURCE IMAGES</span>
              <small>Ordered by viewing direction</small>
            </div>
            <div className="history">
              <button
                aria-label="Undo"
                title="Undo"
                disabled={busy || !past.length}
                onClick={() => restoreHistory("undo")}
              >
                ↶
              </button>
              <button
                aria-label="Redo"
                title="Redo"
                disabled={busy || !future.length}
                onClick={() => restoreHistory("redo")}
              >
                ↷
              </button>
            </div>
          </div>
          <div className="source-cards">
            {project.sources.map((source, index) => (
              <button
                key={source.id}
                className={`source-card ${selected === source.id ? "selected" : ""}`}
                disabled={busy}
                onClick={() => {
                  setSelected(source.id);
                  setMode("sources");
                }}
              >
                <div className="thumb checker">
                  <img
                    src={assets.find((a) => a.id === source.id)?.url}
                    alt=""
                  />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div>
                  <strong>{source.name}</strong>
                  <small>
                    {source.width} × {source.height} px
                  </small>
                </div>
              </button>
            ))}
            <button
              className="add-card"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
            >
              <b>＋</b>
              <span>Add images</span>
              <small>PNG · JPEG · WebP</small>
            </button>
          </div>
          {selectedIndex >= 0 && (
            <div className="source-actions">
              <span>Selected: {project.sources[selectedIndex].name}</span>
              <button
                disabled={busy || selectedIndex === 0}
                onClick={() => moveOrder(-1)}
              >
                ← Earlier
              </button>
              <button
                disabled={busy || selectedIndex === project.sources.length - 1}
                onClick={() => moveOrder(1)}
              >
                Later →
              </button>
              <button
                disabled={busy}
                onClick={() => replaceInput.current?.click()}
              >
                Replace
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  const next = project.sources.filter((s) => s.id !== selected);
                  update({ ...project, sources: next });
                  setSelected(next[0]?.id ?? "");
                  if (reference === selected) setReference(next[0]?.id ?? "");
                }}
              >
                Remove
              </button>
            </div>
          )}
        </section>
        {pending && (
          <section className="restore panel">
            <h2>Restore project sources</h2>
            <p>
              Exact content matches are selected automatically. A replacement
              uses your saved placement; choosing it confirms the changed file.
            </p>
            {pending.sources.map((source, index) => {
              const matched = project.sources.find(
                (s) => s.id === mapping[index],
              );
              return (
                <label className="mapping" key={source.id}>
                  <span>
                    {source.name}
                    <small>
                      {matched
                        ? matched.hash === source.hash
                          ? "Identical content"
                          : "Changed content — explicit replacement"
                        : project.sources.some((s) => s.name === source.name)
                          ? "Same name, different content"
                          : "Missing or ambiguous — upload and choose"}
                    </small>
                  </span>
                  <select
                    aria-label={`Map ${source.name}`}
                    value={mapping[index] ?? ""}
                    onChange={(e) =>
                      setMapping((old) =>
                        old.map((id, i) =>
                          i === index ? e.target.value || null : id,
                        ),
                      )
                    }
                  >
                    <option value="">Choose uploaded source…</option>
                    {project.sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.hash.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
            <button
              className="primary"
              disabled={
                busy ||
                mapping.some((id) => !id) ||
                new Set(mapping).size !== mapping.length
              }
              onClick={() => {
                const restored = {
                  ...pending,
                  sources: pending.sources.map((s, i) => {
                    const actual = project.sources.find(
                      (a) => a.id === mapping[i],
                    )!;
                    return {
                      ...s,
                      id: actual.id,
                      name: actual.name,
                      hash: actual.hash,
                      width: actual.width,
                      height: actual.height,
                    };
                  }),
                };
                update(restored);
                setSelected(restored.sources[0]?.id ?? "");
                setReference(restored.sources[0]?.id ?? "");
                setPending(null);
                setMessage("Project restored.");
              }}
            >
              Restore project
            </button>{" "}
            <button onClick={() => setPending(null)}>Dismiss</button>
          </section>
        )}
        <div className="editor">
          <Workspace
            project={project}
            assets={assets}
            selected={selected}
            reference={reference}
            overlay={overlay}
            mode={mode}
            setMode={setMode}
            preview={urls}
            busy={busy}
            move={(x, y) =>
              update({
                ...project,
                sources: project.sources.map((s) =>
                  s.id === selected
                    ? { ...s, placement: { ...s.placement, x, y } }
                    : s,
                ),
              })
            }
          />
          <Inspector
            project={project}
            selected={selected}
            reference={reference}
            setReference={setReference}
            overlay={overlay}
            setOverlay={setOverlay}
            update={update}
            align={() => void align()}
            busy={busy}
          />
        </div>
        <section className="export-bar panel">
          <div>
            <div className="eyebrow">OUTPUT AT ACTUAL SIZE</div>
            <strong>
              {px.width.toLocaleString()} × {px.height.toLocaleString()} px
            </strong>
            <small>
              {((px.width * 25.4) / project.settings.ppi).toFixed(3)} ×{" "}
              {((px.height * 25.4) / project.settings.ppi).toFixed(3)} mm after
              pixel rounding · ~{Math.ceil(budget.bytes / 1e6)} MB working
              estimate
            </small>
          </div>
          <div className="export-actions">
            <button
              disabled={busy || project.sources.length < 2 || !!invalid}
              onClick={() => void generate(true)}
            >
              Update preview
            </button>
            <button
              className="primary"
              disabled={
                busy ||
                project.sources.length < 2 ||
                !!invalid ||
                !budget.supported
              }
              onClick={() => void generate(false)}
            >
              Generate print files <span>↗</span>
            </button>
          </div>
        </section>
        {(!budget.supported || invalid || warnings.length > 0) && (
          <div className="notice warning">
            {!budget.supported
              ? "This canvas exceeds the 24-megapixel / 32,767-pixel side export limit. Reduce size or explicitly lower PPI. "
              : ""}
            {invalid || warnings.join(" ")}
          </div>
        )}
        {busy && (
          <div className="job-status" role="status">
            <div>
              <span>{jobLabel}</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <progress value={progress} max="1" />
            <button onClick={cancel}>Cancel</button>
          </div>
        )}
        {message && (
          <div
            role={error ? "alert" : "status"}
            className={`notice ${error ? "warning" : "success"}`}
          >
            {message}
          </div>
        )}
        {output && (
          <section className="downloads panel">
            <div>
              <h2>Your print files are ready.</h2>
              <p>
                {output.width} × {output.height} pixels · matched geometry ·
                transparency preserved
              </p>
            </div>
            <button
              onClick={() => download(output.art, "lenticular-artwork.png")}
            >
              Artwork PNG
            </button>
            <button
              onClick={() => download(output.depth, "lenticular-depth.png")}
            >
              Depth PNG
            </button>
            <button
              className="primary"
              onClick={() => download(output.zip, "lenticular.zip")}
            >
              Download bundle ↓
            </button>
          </section>
        )}
        <details className="calibration panel">
          <summary>
            Calibration sheet <span>Explore LPI and depth amplitude</span>
          </summary>
          <fieldset disabled={busy}>
            <div className="calibration-fields">
              <label className="field">
                <span>LPI values</span>
                <input
                  aria-label="Calibration LPI values"
                  value={lpis}
                  onChange={(e) => setLpis(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Depth amplitudes (%)</span>
                <input
                  aria-label="Calibration amplitudes"
                  value={amplitudes}
                  onChange={(e) => setAmplitudes(e.target.value)}
                />
              </label>
              <NumberField
                label="Sample width / height"
                suffix="mm"
                value={sampleMm}
                min={1}
                onChange={setSampleMm}
              />
              <button
                disabled={project.sources.length < 2 || !!invalid}
                onClick={async () => {
                  const result = await execute<Output>({
                    kind: "calibrate",
                    project,
                    assets: inputAssets(),
                    lpis: lpis.split(",").map(Number),
                    amplitudes: amplitudes.split(",").map(Number),
                    sampleMm,
                  });
                  if (result) {
                    setCalibration(result);
                    setMessage("Calibration sheet is ready.");
                  }
                }}
              >
                Generate calibration sheet
              </button>
            </div>
            <p className="hint">
              Columns vary LPI; rows vary depth amplitude. Each square sample
              has a separate 5 mm label band and 2 mm spacing.
            </p>
            <p className="hint">
              Sheet: {sheetSize.widthMm} × {sheetSize.heightMm} mm ·{" "}
              {sheetBudget.width.toLocaleString()} ×{" "}
              {sheetBudget.height.toLocaleString()} px · ~
              {Math.ceil(sheetBudget.bytes / 1e6)} MB output working estimate.{" "}
              {!sheetBudget.supported &&
                "Exceeds export limits; reduce sample size, values, or PPI."}
            </p>
            {calibration && (
              <div className="download-row">
                <span>
                  {calibration.width} × {calibration.height} px
                </span>
                <button
                  onClick={() =>
                    download(calibration.art, "calibration-artwork.png")
                  }
                >
                  Sheet artwork
                </button>
                <button
                  onClick={() =>
                    download(calibration.depth, "calibration-depth.png")
                  }
                >
                  Sheet depth
                </button>
                <button
                  onClick={() => download(calibration.zip, "calibration.zip")}
                >
                  Sheet bundle ↓
                </button>
              </div>
            )}
          </fieldset>
        </details>
      </main>
      <footer>
        <span>
          RESIN LENTICULAR <i> / </i> A little shift. A new perspective.
        </span>
        <span>No uploads. No accounts. Just your images.</span>
      </footer>
    </>
  );
}
