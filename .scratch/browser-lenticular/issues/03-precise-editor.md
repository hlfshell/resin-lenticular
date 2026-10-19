# 03: Align and crop images manually with exact controls

Status: resolved
Blocked by: 02

## What to build

Provide a reversible editor with numerical transforms and reference-image overlay for precise manual alignment.

Parent specification: [Browser lenticular generator](../spec.md).

## Acceptance criteria

- [x] Provide move, size, rotation, crop bounds, aspect-ratio lock, and exact X/Y fields.
- [x] Allow px/mm/inch fields; pixels refer to final output coordinates.
- [x] Provide selectable reference and variable-opacity overlay; overlay opacity never changes output alpha.
- [x] Provide undo/redo/reset and image replacement/removal; keep source pixels intact.
- [x] Preview and exports agree for transformed/cropped partial-alpha edges.
- [x] Exercise numerical edits and undo/redo in Firefox and Chrome.

## Comments

Implemented and verified on 2026-10-18. Browser workflow covers exact offsets, undo, crop-bound rejection, and manual controls. Core regression covers cropped/rotated partial alpha without modifying source bytes.
