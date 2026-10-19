# 01: Generate a transparent two-image print pair

Status: resolved
Blocked by: None

## What to build

Deliver the first usable browser workflow: upload two images, center-fit them, preview and download interlaced artwork plus a matching depth map at the default settings.

Parent specification: [Browser lenticular generator](../spec.md).

## Acceptance criteria

- [x] Accept PNG, JPEG, and WebP; fit without stretching and preserve source alpha.
- [x] Default to 1440 PPI, 40 LPI, sine relief, and a 50 mm wide canvas using the first image aspect ratio.
- [x] Generate registered RGBA8 artwork and grayscale16-plus-alpha depth with matching density metadata.
- [x] Use the selected source alpha for both outputs, including partial alpha; maintain full 16-bit depth precision.
- [x] Keep rendering off the UI thread, with a conservative resource guard and actionable errors.
- [x] Demonstrate generation/download in Firefox and Chrome; independently decode deterministic generated fixtures.
- [x] Keep private root images excluded from fixtures and build output; implement independently of unlicensed reference code.

## Comments

Implemented and verified on 2026-10-18. Paired PNG export checks independently decode bit depth, alpha, dimensions, and density metadata. Both browser workflows generate/download the pair.
