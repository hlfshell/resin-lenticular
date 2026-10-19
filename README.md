# Resin Lenticular

A local-first browser studio for precisely sized lenticular artwork and transparent lens depth maps. Align two or more images, set lens geometry, and download matched PNGs plus a portable YAML configuration.

- Defaults: **1440 PPI**, **40 LPI**, sine profile, black low / white high.
- PNG, JPEG, and WebP inputs; source alpha follows the selected view into both outputs.
- Exact physical canvas sizes, paper presets, reversible crop/position/scale/rotation edits, reference overlays, and quick feature alignment.
- Vertical, horizontal, and custom-angle lenses; phase, inversion, view order, and grayscale endpoints.
- RGBA artwork and 16-bit grayscale-plus-alpha depth; optional 8-bit depth. Both files carry print-density metadata.
- Illustrative previews, calibration sheets, individual downloads, ZIP bundles, and YAML restoration with source-content verification.
- All processing stays in the browser. No account, upload service, or runtime CDN is required.

## Run locally

Use Node.js 22.12+ and npm:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Desktop Firefox and Chrome are the supported browsers. Input changes commit on blur or Enter. Use **Update preview** in the preview toolbar after edits and **Generate print files** for full-resolution artifacts.

## Build and host

```sh
npm run build
npm run preview
```

Host the contents of `dist/` with any static HTTP server. Relative asset paths support a URL subdirectory; use its trailing slash (for example `/studio/`). Serve through HTTP(S), rather than opening HTML with `file://`. Use HTTPS or localhost for browser hashing and worker APIs.

```sh
docker build -t resin-lenticular .
docker run --rm -p 8080:8080 resin-lenticular
```

Open `http://localhost:8080`. The container serves static files as an unprivileged user; processing still happens in the visiting browser. To host beneath a path, have a reverse proxy strip that path prefix before forwarding to the container.

## Workflow

1. Add at least two images. Each is fit proportionally onto a common canvas. Choose physical dimensions and density in **Print**.
2. Drag source cards to reorder them, or select one and use **Move left/right**. Ctrl/Cmd+Z undoes edits; Ctrl/Cmd+Shift+Z or Ctrl+Y redoes them. Text fields retain their normal text-editing shortcuts. Canvas and image dimensions are linked by default; use the chain control to unlock width and height. Select a source and open **Image**. Drag on the alignment canvas or enter exact offsets, size, rotation, and crop bounds. Choose a reference and adjust overlay opacity. **Quick feature alignment** attempts a bounded feature match; manual alignment remains available if confidence is insufficient.
3. Open **Lens** to set LPI, angle, profile, phase, inversion, and optional depth endpoints. An angle of 0° gives vertical ridges; 90° gives horizontal ridges. Depth inversion changes height values only.
4. Inspect the preview and generate print files. Download buttons show actual compressed file sizes. The expandable Memory usage section estimates processing RAM, not download size. Preserve the exported physical size when importing the PNGs into another application.
5. Save YAML or the ZIP bundle. To resume, upload the source images and open the YAML. Identical content is matched by SHA-256 even after renaming; changed files require explicit mapping. Source images are not embedded in the bundle.

Calibration bundles contain paired sheet PNGs, the restorable ordinary project YAML, and a separate calibration recipe with LPI/amplitude choices and sheet dimensions. Labels occupy separate bands above the samples. The view slider is an ordering illustration, not an optical simulation.

## Resource limits

The initial renderer supports up to **24 million output pixels**, with **32,767 pixels maximum per side**. Imports are limited to **24 megapixels / 100 MB per source**, and full-resolution exports to **48 megapixels of combined sources**. These are conservative application guards, not guarantees that every device has sufficient memory. The working estimate covers output buffers; source decoding, previews, and browser overhead add to it. A2 at 1440 PPI exceeds these limits; selecting a preset does not lower density automatically.

Encoding uses one scanline at a time, but output pixel arrays and compressed artifacts remain resident. This is not an unlimited streaming renderer. Export, decoding, hashing, encoding, and ZIP compression run in a worker. Cancel terminates that worker; only one expensive operation runs at a time. Alignment uses reduced images and an approximately two-second matching budget; decoding adds to elapsed time. Difficult, heavily rotated, or unrelated images may need manual alignment.

## Development verification

```sh
npm run typecheck
npm test
npx playwright install --with-deps chromium firefox
npm run test:e2e
npm run test:dev
```

Core checks independently decode PNGs and verify alpha, depth precision, geometry, and configuration behavior. Browser checks exercise the user workflow in both engines. The separate development-server suite starts Vite with a cold dependency cache to catch import-triggered reloads. Fixtures are generated; private local example images are ignored and excluded from Docker/build inputs.

The agreed specification and dependency-ordered tickets live in [`.scratch/browser-lenticular/`](.scratch/browser-lenticular/README.md).
