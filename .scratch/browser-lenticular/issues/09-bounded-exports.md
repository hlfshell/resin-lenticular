# 09: Keep large exports responsive and cancellable

Status: resolved
Blocked by: 06, 07

## What to build

Complete the resource-management workflow so expensive jobs show progress, cancel cleanly, and fail safely within supported browser limits.

Parent specification: [Browser lenticular generator](../spec.md).

## Acceptance criteria

- [x] Keep rendering, encoding, compression, and expensive hashing off the UI thread.
- [x] Use bounded-memory processing where practical; document measured supported limits rather than promising every paper-size/PPI combination.
- [x] Estimate resource use before generation and prevent overlapping jobs from exhausting memory.
- [x] Cancel active work promptly, release obsolete buffers/object URLs, and allow a subsequent export.
- [x] Validate repeated generation, cancellation, and oversize rejection in Firefox and Chrome.
- [x] Confirm generation and restoration do not transfer user images over the network.

## Comments

Implemented and verified on 2026-10-18. Both browsers exercise cancellation, subsequent generation, size guards, and no external application requests. Full exports of local 2345 × 3149 sources also succeed in both engines.
