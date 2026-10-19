# 10: Ship the dragon identity and static Docker hosting

Status: resolved
Blocked by: 01

## What to build

Make the usable app available through a documented static build or Docker container, with the angular lens-inspired dragon identity.

Parent specification: [Browser lenticular generator](../spec.md).

## Acceptance criteria

- [x] Create an original crisp SVG dragon from wavy jagged angular ridges/valleys; support one-color and small-size use.
- [x] Apply a neutral, precise responsive editor shell and working Resin Lenticular name.
- [x] Provide reproducible install/build commands and a Dockerfile that builds and serves static assets.
- [x] Bundle runtime dependencies and support hosting beneath a URL subpath.
- [x] Exclude private images and local configuration from build context and distributable output.
- [x] Smoke-check static and Docker hosting in Firefox and Chrome; keep product/docs free of printer branding.

## Comments

Implemented and verified on 2026-10-18. Production/Docker builds succeed. Both browsers import/export through the Docker server and static /studio/ subpath. At a 390 px viewport the page has no horizontal overflow. Private images are excluded from build context and Git.
