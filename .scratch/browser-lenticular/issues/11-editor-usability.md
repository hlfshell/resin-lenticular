# 11: Fix import loss and streamline editor controls

Status: resolved
Blocked by: None

## What changed

- Ctrl/Cmd+Z undoes project edits; Ctrl/Cmd+Shift+Z and Ctrl+Y redo them. Native text-field shortcuts remain available. Undo preserves the selected image/reference when they still exist.
- Canvas and image dimensions are linked by default, with chain/broken-chain controls to explicitly unlock proportions.
- Source cards support drag reordering, with explicit Move left/right, Replace image, and Remove image controls.
- The marketing header/footer and repetitive preview-complete message were removed. Preview refresh lives in the workspace toolbar, and progress/cancellation appears above the editor.
- Processing-memory estimates are collapsed and explicitly distinguished from download size. Download buttons show actual compressed artifact sizes.

## Import failure diagnosis

The cold-start development-server regression reproduced loss of both selected images (expected two cards, received zero). The production build retained the same images. Vite discovered a worker-only dependency during first import and reloaded the page, discarding project state. Explicitly prebundling worker dependencies fixes this; no import or image-decoding changes were needed.

## Validation

- Typecheck and production build pass.
- Twelve production browser regressions pass across Chromium and Firefox.
- The initial six development-server regressions pass across both engines; the expanded four-test editor suite also passes independently against a cold Firefox development server.
- Regressions cover multi-file batches, retained files after worker operations, canvas/image aspect locks, Ctrl/Cmd undo and redo, selection preservation, drag/button reordering, and refresh placement.
- Local supplied images generated 9.34 MB artwork and 951.5 KB depth at the default 50 mm width. Desktop and 390 px mobile layouts were inspected; no mobile horizontal overflow. Local assets and screenshots remain ignored.

## Comments

The output geometry and compression are unchanged. The large number previously shown beside output dimensions estimated processing RAM, not file size.
