# Browser lenticular generator

Status: implemented; browser and file verification complete

## Purpose

Create precisely sized interlaced artwork and a corresponding procedural lens depth map from two or more images. The application runs entirely in the browser, supports desktop Firefox and Chrome, and is deployable as static assets or through a Docker image.

The product is printer-independent. UI, presets, documentation, and acceptance criteria must not name or target printer brands. Depth values encode relative relief, not a guaranteed physical height.

## Defaults and inputs

- Output density: 1440 PPI (print pixels per inch, not screen resolution).
- Lens frequency: 40 LPI (lenses per inch).
- Two images are the primary workflow; support N images without an arbitrary fixed count cap, subject to sampling and memory limits.
- Input formats: PNG, JPEG, WebP. Preserve source alpha, including partial alpha.
- Default canvas width: 50 mm; derive initial height from the first image's aspect ratio.
- Default profile: sine. Default depth range: full black-to-white, black low and white high.
- Working project name: Resin Lenticular.

## Physical canvas and sampling

Users control the physical output size independently of source dimensions. Default units are millimeters, with inches available. Include A2, A3, A4, A5, US Letter (8.5 × 11 inches), Legal, and custom sizes, in portrait or landscape. Custom dimensions cover nonstandard paper sizes.

Compute raster dimensions from physical size and PPI, rounded to whole pixels. Display requested physical dimensions, actual pixel dimensions, and any pixel-rounding discrepancy. Encode matching physical-density metadata in both PNGs. Never silently lower PPI, resize, stretch, or crop exports to accommodate limits. Changing PPI preserves physical image placement and canvas dimensions.

Use the same continuous spatial coordinates for interlacing and lens relief. Do not accumulate lens-pitch error by rounding each pitch to an integer: arbitrary PPI/LPI ratios and angles must stay registered across the image. At the defaults there are 36 pixels per lens period. Warn when views have poor sampling; reject combinations that cannot represent all requested views. Define and exercise the sampling check for custom angles during implementation rather than relying only on the horizontal case.

Paper sizes are selectable independently of available rendering memory. Show output dimensions and estimated resource use before export; refuse jobs beyond supported limits with an actionable explanation. Large paper presets do not imply that every browser/device can export them at every PPI.

## Image placement and editing

Initially fit each image proportionally and center it on the common canvas with transparent padding. Keep source pixels intact; record transformations and crops as reversible edits.

Provide:

- Image selection, ordering, replacement, removal, and a selectable alignment reference.
- Movement, proportional resizing, rotation, and cropping.
- Exact X/Y offsets and size fields; pixel offsets use final output-canvas coordinates.
- Dimensional fields switchable between pixels, mm, and inches; aspect-ratio lock.
- Crop bounds and an adjustable-opacity reference overlay for manual alignment.
- Undo, redo, and reset.

Use familiar image-editor toolbar conventions. The overlay opacity is an editing aid and must not alter exported source alpha.

### Automatic feature alignment

Attempt feature matching against the first image by default, with another reference selectable. Estimate translation, rotation, and uniform scale. Run outside the interface thread, with cancellation and an approximately two-second budget per image. Apply only confident matches. On low confidence or timeout, retain the existing placement (initially centered fit), explain that manual alignment is needed, and expose the overlay controls. Unrelated images must not be forced into a speculative match.

## Lens geometry and depth

Support vertical, horizontal, and custom-angle lens orientation, plus image-order reversal. Define and label angle conventions consistently. Interlacing and depth must use identical orientation, pitch, and phase conventions.

Expose sine and circular-arc profiles and phase adjustment. Advanced depth settings provide low/high endpoints as normalized percentages, with exact 16-bit values available. Endpoints may encode reversed grayscale polarity.

A separate Invert depth control reverses the generated depth values within the configured endpoint range: high becomes low and low becomes high. It does not reorder images, move stripes, or modify alpha. This is a literal depth-map inversion, not an additional optical transformation.

Generate procedural periodic lens relief, not inferred scene depth. Physical relief height is configured outside this application.

### Transparency contract

At each output pixel, select the source view using the interlacing geometry. The transformed/cropped source view supplies the color and alpha for that pixel. Copy that same alpha to the corresponding depth-map pixel. Preserve partial alpha; do not substitute the union of all source silhouettes, fill transparent regions, or infer alpha from black RGB values. Depth inversion and endpoint remapping leave alpha unchanged.

## Previews and calibration

Provide aligned-source, interlaced-artwork, and depth previews; zoom; a transparency checkerboard; and an optional lens-boundary overlay. A view slider illustrates source-view order and is explicitly not an accurate optical simulation.

Use reduced-resolution previews for responsiveness without modifying export settings. In particular, scale preview lens geometry consistently with export coordinates.

Provide a printable calibration sheet varying LPI and depth amplitude, with readable labels and paired artwork/depth outputs. Keep labels outside optical sample areas and maintain matching registration and physical dimensions across both outputs. Calibration uses the same renderer as ordinary export.

## Export and restoration

Normal exports:

1. Interlaced 8-bit RGBA PNG.
2. Matching 16-bit grayscale-plus-alpha depth PNG.
3. YAML configuration.

Offer individual downloads and a ZIP bundle. Offer explicitly selected 8-bit grayscale-plus-alpha depth as an alternative. Preserve full 16-bit values in the encoder; an 8-bit canvas preview must not become the depth export source. Output PNGs have identical pixel dimensions and matching physical-density metadata. Encoding and compression happen locally.

YAML contains a schema version, image identities and order, canvas dimensions, source transformations/crops, lens parameters, and export settings. Identify source files by filename and content hash. Do not embed source images in YAML or the normal export bundle.

On restoration, users reupload source images. Match exact hashes even when filenames change; distinguish missing files, changed content with the same name, and duplicate candidates. Require explicit mapping for replacements or ambiguous matches. Identical sources plus YAML restore the same output. Validate imported settings and report unsupported schema versions or malformed files without losing the current project.

## Runtime and deployment

All user-image processing, hashing, configuration loading, rendering, encoding, and compression stay in the browser. No image uploads or backend processing. Bundle runtime dependencies for static hosting; avoid requiring remote APIs or CDN resources for generation.

Target desktop Firefox and Chrome. The interface is responsive, but large mobile exports are not promised. Run expensive work off the interface thread, expose progress and cancellation, release obsolete image buffers and object URLs, and prevent overlapping renders from exhausting memory. Use bounded-memory processing where practical; report actual implementation limits honestly.

Include reproducible install/build commands and a Dockerfile that builds and serves static assets. Support hosting beneath a URL subpath. Docker is a hosting option, not a processing service.

## Visual identity

Create a crisp SVG dragon mark from wavy, jagged, angular ridges and valleys resembling the lens depth profile. It should work in one color and at small sizes. Pair it with a neutral, precise editing interface. The dragon is branding, separate from generated print artwork.

## Local development assets

The user supplied root files lent1.png and lent2.png as their current project examples. They may be used locally for development and validation, but must never be committed, embedded in application assets, or included in published builds. Keep their exact paths ignored. Automated checks must use generated or independently redistributable fixtures and work without these private files.

## Verification

- Exercise import, editing, generation, downloads, and restoration in both Firefox and Chrome.
- Decode exported PNGs independently to check dimensions, bit depth, alpha, depth values, and physical-density metadata.
- Verify fractional pitch, custom angles, phase, view ordering, endpoint reversal, and inversion using deterministic synthetic inputs.
- Verify that color and depth select the same source alpha, including partial alpha and transformed/cropped edges.
- Verify physical placement survives PPI changes and preview scaling does not affect final geometry.
- Verify graceful alignment timeout/failure, cancellation, and resource-limit errors.
- Verify static and Docker deployments and absence of user-image network transfers.

## Reference and implementation boundary

Behavioral reference: https://kermit-r-wood.github.io/lenticular-uv-printing/
Source reference: https://github.com/kermit-r-wood/lenticular-uv-printing/

The reference provides periodic sine/arc relief and paired PNG output but does not implement the agreed alpha/editor workflow. Its reported Firefox failure has not been reproduced. No license was found during inspection; implement independently and do not copy its source or assets without establishing permission.

## Delivery sequence

See the individually numbered files in issues/. Their blocking edges define execution order; ready-for-agent means specified, not necessarily unblocked. This specification records the approved product scope. Implementation details may be chosen without changing these observable requirements.
