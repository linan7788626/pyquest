# scripts/inputs/nli — committed technical seed

`ts_shadow.png` is the byte-frozen **programmatic** contact shadow (not
package art) the NLI exporter needs as its `--before` input. It used to live
in the ephemeral, git-ignored `.slim/deepwork/.../v02-before` snapshot; the
2026-10-30 external asset-source migration pins it here instead, so the
default exporter invocation works with no `--before` workaround.

- sha256 (pinned literal in `scripts/build-nli-preview.py`, never derived
  from this mutable file at runtime):
  `4a1da387613e4fb91db3d60a85e16935ba13484e7df3044c954e37a5e131d5dd`
- Provenance: the accepted v02 quality-gate export of the programmatic
  contact shadow, cross-checked against the immutable v02-before snapshot
  and the previously shipped `assets/nli-preview/ts_shadow.png` (all
  byte-identical before the migration).
- This is a tiny pinned technical input, not a duplicated art-source pack:
  the raw NLI source package stays in the external read-only
  `soft-fantasy-arpg-assets` project (`PYQUEST_ASSET_ROOT` overrides), which
  contains NLI assets only; the legacy TinySwords/CC0 packs are not there —
  they remain only in the migration recovery backup of the retired game-root
  `assets/` directory.
