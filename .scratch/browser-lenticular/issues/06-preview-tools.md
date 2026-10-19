# 06: Inspect artwork, depth, and illustrative view transitions

Status: resolved
Blocked by: 03, 04

## What to build

Make alignment and lens generation inspectable through selectable previews and a view-order slider.

Parent specification: [Browser lenticular generator](../spec.md).

## Acceptance criteria

- [x] Provide source/artwork/depth views with zoom, checkerboard transparency, and lens boundaries.
- [x] Provide an explicitly illustrative view slider; avoid claims of accurate optical simulation.
- [x] Render responsive previews using consistently scaled export coordinates.
- [x] Preview interactions leave export settings and pixel output unchanged.
- [x] Exercise preview navigation in Firefox and Chrome.

## Comments

Implemented and verified on 2026-10-18. Both browser engines exercise artwork previews and reversed illustrative view order. Preview scaling has a deterministic geometry regression.
