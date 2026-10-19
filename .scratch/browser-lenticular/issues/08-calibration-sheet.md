# 08: Generate registered LPI and depth calibration sheets

Status: resolved
Blocked by: 02, 04, 07

## What to build

Generate a labeled physical sheet of samples varying lens frequency and depth amplitude, with paired downloadable artwork and depth.

Parent specification: [Browser lenticular generator](../spec.md).

## Acceptance criteria

- [x] Allow LPI and amplitude selections; show sample dimensions and overall sheet size.
- [x] Generate samples through the production lens renderer, preserving phase, angle, and alpha behavior.
- [x] Keep readable labels outside optical sample regions; pair both output layouts exactly.
- [x] Export correctly sized artifacts and configuration through the normal download flow.
- [x] Verify geometry, registration, and labels without printer-specific language.

## Comments

Implemented and verified on 2026-10-18. Both browsers generate calibration bundles; independent decoding verifies matching dimensions, and recipe assertions verify physical sheet size.
