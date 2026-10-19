# 02: Choose exact physical dimensions and paper presets

Status: resolved
Blocked by: 01

## What to build

Let users configure print dimensions, units, density, and standard paper sizes while preserving physical image placement.

Parent specification: [Browser lenticular generator](../spec.md).

## Acceptance criteria

- [x] Provide mm/inches, A2/A3/A4/A5, Letter, Legal, custom dimensions, and portrait/landscape.
- [x] Show final raster dimensions and pixel-rounding discrepancy; write consistent physical-density metadata.
- [x] Changing PPI preserves physical canvas size and image placement.
- [x] Show resource estimates and reject unsupported export sizes without silently lowering resolution.
- [x] Verify unit conversions and preset dimensions in both browser workflows.

## Comments

Implemented and verified on 2026-10-18. Browser checks cover exact dimensions, PPI editing and oversized A2 rejection. Export decoding confirms final pixel sizes.
