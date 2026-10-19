# Implementation tickets

Parent: [Specification](spec.md). The initial ten implementation tickets and editor feedback ticket are resolved. See [verification and review](verification.md) for evidence and practical limits.

| Ticket | Blocked by |
| --- | --- |
| [01: Generate a transparent two-image print pair](issues/01-two-image-export.md) | None |
| [02: Choose exact physical dimensions and paper presets](issues/02-physical-canvas.md) | 01 |
| [03: Align and crop images manually with exact controls](issues/03-precise-editor.md) | 02 |
| [04: Configure lens angles, inversion, and multiple views](issues/04-lens-controls.md) | 01 |
| [05: Attempt quick feature alignment with manual fallback](issues/05-automatic-alignment.md) | 03 |
| [06: Inspect artwork, depth, and illustrative view transitions](issues/06-preview-tools.md) | 03, 04 |
| [07: Download export bundles and restore YAML projects](issues/07-portable-project.md) | 03, 04 |
| [08: Generate registered LPI and depth calibration sheets](issues/08-calibration-sheet.md) | 02, 04, 07 |
| [09: Keep large exports responsive and cancellable](issues/09-bounded-exports.md) | 06, 07 |
| [10: Ship the dragon identity and static Docker hosting](issues/10-branding-hosting.md) | 01 |
| [11: Fix import loss and streamline editor controls](issues/11-editor-usability.md) | None |
