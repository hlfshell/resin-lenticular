# 05: Attempt quick feature alignment with manual fallback

Status: resolved
Blocked by: 03

## What to build

Align related images to a selectable reference using confident feature matches, with a short processing budget and an accessible manual fallback.

Parent specification: [Browser lenticular generator](../spec.md).

## Acceptance criteria

- [x] Estimate translation, rotation, and proportional scale relative to the chosen reference.
- [x] Run off-thread, allow cancellation, and enforce an approximately two-second budget per image.
- [x] Apply only confident results as undoable edits; retain previous placement on failure or timeout.
- [x] Expose overlay controls and explain fallback without claiming a successful match.
- [x] Verify known synthetic transforms, unrelated images, timeout, cancellation, and browser responsiveness.

## Comments

Implemented and verified on 2026-10-18. Synthetic feature fixtures recover translation and modest rotation/scale; featureless and zero-budget inputs return no match. Local images exercised the browser alignment path.
