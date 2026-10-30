# NLI Preview — v0.2 full replacement (62 outputs)

Derived offline from the read-only package `NLI_SoftFantasy_ARPG_v0.2`
(`source_version 0.2.1-npc-elder`) per
`docs/superpowers/specs/2026-10-28-nli-v02-full-replacement-design.md` (§§3–8).

## Contents (exactly 62 PNGs)

- **29 F entries** (spec §4): complete-source premultiplied sampling, explicit
  source anchor G → frame anchor A, uniform scale `s = min(s0, …caps)`,
  `t = A − s·G`; characters, trees, bushes, castle, gate, portal, torch,
  ground flowers, HUD hearts.
- **17 C entries** (spec §6/§6.1): complete-source centered contain with a
  1 px safety edge — dust, slash, shard, heart, UI icons, and the 7 new
  `map_*` WorldMap.ART decorations (256²).
- **6 terrain entries** (spec §7): declared planar material domain → 256² →
  composite over base color → mirrored mosaic P → Q (torus blend for
  grass/forest/path/water), opaque 512².
- **2 landmarks** (spec §5): `castle_medium`, `portal_blue_gold` —
  byte-for-byte copies of the new-package sprites.
- **1 composite** (spec §4.2): `gate_closed` = Stone_Gate over Wooden_Fence.
- **7 technical outputs** (spec §6): `fire` 64² and `cloud1..5` 576×256 fully
  transparent compatibility frames; `ts_shadow` 192² byte-frozen (copied from
  the immutable `v02-before` snapshot, never regenerated).
- **1 supplementary run sheet** (2026-10-29 walk lane): `run/warrior_run_sheet.png`
  — a 5-frame 192² stitched `warrior_run` loop (Hero_Row01_Pose03/07/06/02/04;
  manifest `run_sheet` block). It is deliberately not one of the 62 quality-gate
  keys: `warrior_run.png` remains the frozen single-frame Pose03 export and the
  sheet's frame 0 is pixel-identical to it. Stitched from static poses,
  not calibrated.

## Sampling

premultiply → zero-pad → one LANCZOS resample of the **premultiplied** bands
(per-band mode `L`; bit-identical to raw `RGBa` relabeling — an RGBA-mode
resize would apply the alpha weighting twice on Pillow ≥ 11.2) → clamp
RGB ≤ alpha → unpremultiply. No v0.1 crop domains, masks, or edge trimming;
no orientation flips.

## Terrain cliffs (2026-10-30 Phase 1, Village pilot)

Supplementary assets under `run/ground/` (manifest top-level `terrain_cliffs`
block) — **not** part of the 62 quality-gate keys. Two groups:

- **Native slices (raw native crop; no resample, no recolor)** from
  `Island_Cliff_Composition.png`:
  `cliff_s_band.png` 550×510 (slice [350, 405, 900, 915], south-facing
  cliff band), `cliff_ew_strip.png` 54×515 (slice [274, 400, 328, 915],
  east/west side wall), `cliff_n_lip.png` 450×40 (slice [400, 228, 850, 268],
  north grass lip trim).
- **Recolored terrain materials** `terrain_grass/path/water/flower`
  (1024²/768²): display-layer transform from the terrain spike — LANCZOS
  resize + 2×2 mirror mosaic + grade toward olive/deep-blue
  (flower keeps native color). Declared `display_transform`: recolor is
  display-layer only, source pixels untouched.
- **N-direction lip + shadow are synthetic**: the art package ships no
  north-facing cliff material, so the runtime composes a synthetic
  deep blue-green gradient shadow band (rgba(20,44,60), 0→0.35) over the
  north water tile plus the native `cliff_n_lip` grass patch as edge trim.
  S/E/W faces use the native slices above. Runtime draw geometry (display
  layer, source PNGs untouched): the south band is drawn in 128-wide
  windows (stride 64, ~50% overlap, 7 windows) stretched from the 510px-tall
  source slice into 128×104 tile strips (≈4.9:1 vertical squash); the side
  walls are drawn 52×140 from the 54×515 slice (slightly non-uniform).
- **Pads/paving nativization decisions**: the native Village ground branch
  no longer draws the two ellipse dirt pads (castle/portal surroundings are
  carried by native grass plus the grid PATH paving), and grid PATH tiles —
  the paving toward doorways — are approximated with the recolored `path`
  material as native stone paving (no native counterpart exists; the
  manifest records this approximation). Water/path/flower regions reuse the
  grid as the sole boundary; the old composite details (path shoulders,
  water-edge masks, wave lines) are not drawn in the native branch.

## Verification

```
python3 scripts/check-nli-quality.py   --source /Users/uranus/Developer/GitHub/pyquest/assets/NLI_SoftFantasy_ARPG_v0.2   --assets assets/nli-preview --trees snow
```

`--trees <keep|snow>` is accepted for CLI compatibility only; v0.2
expectations ignore it (no snow variant is produced).

## Notes

- The manifest records per-entry `source_image_path`, `source_sha256`,
  `native_size`, `source_domain_xyxy` and the actual `sampling` transform;
  technical outputs declare no package provenance.
- This directory holds exactly the 62 exported PNGs (plus `manifest.json` and
  this README) — the offline derivation described above — and the `run/`
  subdirectory with the supplementary stitched warrior run sheet (outside the
  62-key gate set). The runtime consumers
  are implemented separately in `src`: the `nli02-ground-v3` per-scene ground
  recipe (2026-10-30 Phase 1: native Village pilot laying the recolored
  native materials at full alpha; non-native scenes keep the composite path
  with material alpha .62/.50/.55/.35/.34/.30 for
  grass/forest/path/water/floor/wall) over the terrain Q
  textures, the multi-frame `ts_warrior_run` loop
  (`['warrior_run', 5, 96, true]`, dur = per-frame ms, 480ms whole cycle), the
  two body-free Village landmarks
  (`castle_medium`, `portal_blue_gold`) with occlusion and dedicated shadows,
  fixedFxDepth/torch glow/crystal shadow, the eight inline-SVG WorldMap
  illustrations, and the fail-closed Boot loader. The manifest's
  `runtime_derivatives` records those operations as implemented; it does not
  claim final validation.
- Remaining limitations: static poses (idle/attack single-frame; the run loop
  is a stitched 5-pose sequence, not calibrated, cadence draft pending user
  feel), explicit enemy/boss visual proxies, terrain repeat quality left
  to observer judgment (the single Dungeon frame triage pass is not full scene
  acceptance), and full runtime/visual regression still pending — see the
  manifest `limitations`.
