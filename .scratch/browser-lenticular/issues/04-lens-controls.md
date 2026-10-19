# 04: Configure lens angles, inversion, and multiple views

Status: resolved
Blocked by: 01

## What to build

Expose the full lens settings and allow users to experiment with more than two ordered source views.

Parent specification: [Browser lenticular generator](../spec.md).

## Acceptance criteria

- [x] Allow N sources, reordering, and image-order reversal without an arbitrary count cap.
- [x] Provide vertical/horizontal/custom angles, phase, sine and circular-arc profiles.
- [x] Provide low/high percentages and advanced exact 16-bit endpoints, including reversed endpoints.
- [x] Invert depth reverses values within the endpoint range without changing color selection or alpha.
- [x] Use consistent continuous geometry for fractional pitches and angles, without cumulative pitch-rounding drift.
- [x] Warn on poor per-view sampling and reject configurations that cannot represent all views; cover angled sampling.
- [x] Verify geometry, phase, ordering, inversion, and alpha with deterministic fixtures.

## Comments

Implemented and verified on 2026-10-18. Core fixtures cover fractional pitch, vertical/horizontal/custom-angle sampling, phase, inversion, endpoint reversal, view reversal and finite canvas coverage.
