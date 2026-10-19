# 07: Download export bundles and restore YAML projects

Status: resolved
Blocked by: 03, 04

## What to build

Export paired artifacts and portable settings, then reopen the project by supplying the source files again.

Parent specification: [Browser lenticular generator](../spec.md).

## Acceptance criteria

- [x] Offer individual PNG/YAML downloads and a ZIP containing generated artifacts and configuration.
- [x] Offer explicit 8-bit depth alternative while retaining alpha and dimensions.
- [x] Version YAML and persist source hashes/names/order, all transforms, crops, canvas, lens and export settings.
- [x] Restore identical source bytes even if renamed; identify missing/changed/ambiguous files and request explicit replacement mapping.
- [x] Validate malformed and unsupported configurations without destroying current work.
- [x] Exclude embedded source images; verify repeatable output after round trip and parse bundles in both browsers.

## Comments

Implemented and verified on 2026-10-18. Both browsers decode downloaded ZIPs and restore YAML. Core checks match renamed content, reject changed content, and validate bad schemas/settings.
