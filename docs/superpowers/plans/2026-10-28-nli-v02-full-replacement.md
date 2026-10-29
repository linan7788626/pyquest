# NLI v0.2 Full Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax. This extends the user's already selected subagent execution; no commits are authorized.

**Goal:** Replace every normally displayed legacy image with the supplied v0.2 artwork, then launch and demonstrate the real game without changing gameplay.

**Architecture:** Normalize complete new source canvases into the existing runtime texture dimensions. Keep entities, bodies, attack bounds and animation contracts unchanged; use local display-only helpers for the two Village landmarks, world-map illustrations, material rendering and fixed FX depth. A source-independent checker and real-Phaser baseline comparisons verify the asset/rendering boundary.

**Tech Stack:** Existing Phaser 3.90, Vite 7, JavaScript, Python 3/Pillow and installed Playwright; no dependency installation.

**Spec:** `docs/superpowers/specs/2026-10-28-nli-v02-full-replacement-design.md` (designer-owned).

## Global Constraints
- Source: `/Users/uranus/Developer/GitHub/pyquest/assets/NLI_SoftFantasy_ARPG_v0.2`; source/old packages/ZIP/Tiny remain read-only; never run package Tools.
- Preserve all existing uncommitted work; use this worktree and branch `preview/nli-soft-fantasy`; no staging, commit, push, merge, dependency or deployment changes.
- Freeze Phaser, 1920×1280 game canvas, normal camera 0.7, map data/grid/props/spawns/portals, physics, attacks/AI, questions/progress/save, random-consumption order and all 21 single-frame TS_ANIMS.
- Preserve `scripts/fixtures/village-logic-before.json` SHA256 `29420bb765e721f37440fc8be00251beea5ee8ebf72fef29181c9ffae9d08da3`; never refresh an existing baseline to bless a failure.
- Preserve all 55 current PNG names/dimensions; add only seven `map_*` derivatives from spec §6.1 (62 PNGs total). Seven technical outputs are `fire`, `ts_shadow`, `cloud1..5`; normal runtime must not display legacy procedural fallbacks.
- Static poses are not natural animation. Preserve technical particles/navigation SVGs; no invented art, new gameplay or real-wall collision changes.
- Existing v0.1 crop/mask/quality assumptions are superseded, not silently reapplied; old Task3A remains historical and is not final evidence.

## Review Focus
1. Missing or stale assets must cause a clear failure, not silently display old pixelArt; Task 2 checks asset URLs/network and product fallback handling.
2. A full-canvas image must not be clipped, stretched or shifted by integer placement; Task 1 checks independent F/C projections, corners and alpha-support plus bright/dark visual inspection.
3. A moving/changing Boss or hidden house must retain getBounds/body semantics; Task 2 compares same-state runtime geometry and direct attack outcomes, not texture alpha bounds.
4. Water corners, path junctions and indoor walls must follow the frozen final grid; Task 2 checks all 16 maps and Task 3 inspects seams/contrast and representative shore corners.
5. Menu-only WorldMap images and narrow viewports are easy to miss; Task 2 exercises world-map open/locked states, network coverage and non-overlap of interactive labels.

## Ownership and interfaces
- **Resource writer:** original Task2 fixer. First writes `scripts/check-nli-quality.py` from the spec independently of exporter internals and records RED. After baseline acceptance, writes `scripts/build-nli-preview.py`, `assets/nli-preview/*.png`, `manifest.json`, `README.md`; optional bounded helper `scripts/nli-v02-sampling.py` only if sampling is genuinely reusable. No source/game/browser-test edits.
- **Verification writer:** original invariant/Task3A fixer. Writes new `scripts/check-nli-v02.mjs`, new `scripts/fixtures/nli-v02-runtime-before.json` once, and own evidence/report. No exporter/quality-checker/assets/src or old immutable fixture/harness edits.
- **Visual writer:** original designer, after baseline capture and resource reconciliation. Writes `src/assets/ts.js` loader additions, `src/textures/ground.js`, narrow `src/textures/nliGroundProfiles.js` / `src/display/nliDisplay.js`, local display calls in `BootScene.js`, `WorldScene.js`, `Slime.js`, `BossSnake.js`, `pixelArt.js`, `HUD.js` / `icons.js`, `WorldMap.js` and existing CSS only where spec calls for smooth sampling. No behavior/data/source/test writes.
- **Parent:** accepts artifacts, runs independent final checks, updates plan/state, and launches the verified game. Observer owns visual judgment; oracle owns high-risk Gate R/Gate2 review.
- Exporter CLI remains `python3 scripts/build-nli-preview.py --source <package-root>`; persistent output remains current worktree `assets/nli-preview` only, with symlink/escape rejection. For deterministic tests only, optional `--output` may name a fresh non-existing descendant of the approved temporary `opencode` root; source/before overlap, other arbitrary output, root itself, output symlinks and symlinked destinations are refused before writes.
- Checker CLI remains `python3 scripts/check-nli-quality.py --source <package-root> --assets <directory> --trees <keep|snow>` for compatibility; v0.2 uses the spec's large/small trees, so legacy flag must not select v0.1 expectations. Return 0 pass, 1 assertion failure, 2 invalid input.
- Manifest keeps `entries`, `key`, `url`, `size`, `sha256`; each art entry declares `source_image_path`, `source_sha256`, `native_size`, `source_domain_xyxy`, `sampling` with mode F/C/terrain/composite/copy and actual transform. Composite lists `inputs` in drawing order. Technical entries declare no fake NLI source. Top-level `source_version`, `output_count`, `technical_retained`, `runtime_derivatives`, `limitations` are truthful.
- Display helpers consume exported texture keys and static design values, not file-system paths. `fixedFxDepth(scene, oldDepth)` returns `ceil((scene.mapDef.h*128+1024)/1024)*1024+oldDepth` (adapt actual scene definition accessor locally). No physics helper or entity wrapper is introduced.
- Browser CLI: `node scripts/check-nli-v02.mjs --url http://127.0.0.1:5186 --output <evidence-directory>`; isolated context, deterministic scenario state, nonzero errors; no real save mutation.

## Task 0: Risk gate and baseline
- [x] Preserve before files and source inventory in `.slim/deepwork/nli-systematic-2026-10-27/v02-before/`; independent preflight proves 224 hashes/sizes and old626/626.
- [x] Read complete designer contract, preserve it at the Spec path, and reconcile explorer errors using `v02-source-runtime-audit-errata.md`.
- [x] Gate R (attempt1/3): accepted without blockers; report `.slim/deepwork/nli-systematic-2026-10-27/v02-gate-r.md` read back. Sampling uses premultiplied zero-padding plus one `resize(LANCZOS, fractional box)`; clamp RGB to alpha before unpremultiplying. BootScene loaderror/required-key checks must prevent fallback masking. Baseline includes fixed-depth values.
- [x] Verification writer captured real-Phaser before for16scenes; parent reran3386matched fields/67displayRED with89runtimehashes unchanged. Freeze `nli-v02-runtime-before.json` SHAeeacfb651e1b36659770425c5b117728dedec551da750cd588282c5453a00d4b. Capture acceptance permits dimension-preserving asset export, not final browser-GREEN acceptance.
- [x] Browser fix1 evidence independently verified: selftests25+26, main3386 and supplemental521 fields unchanged; new hit fixture2dd5dbb5… frozen. Residual final-acceptance defects are separately tracked in browserfix2, not considered passed.
- [ ] Browserfix2 may run test-only alongside designer after resource reconciliation; missing static body.position evidence goes to a NEW static-bodies fixture exclusively from immutable v02-before with outside cache. Existing three fixtures remain read-only. Live after-comparison waits for all writers; frozen snapshots make before capture independent of live src edits.

## Task 1: New assets with independent checks
**Consumes:** complete spec §§3–8, original PNGs and immutable before snapshots. **Produces:** 62 PNGs + honest manifest and a runnable independent checker.
- [x] Independent quality expectations implemented and fix1 accepted: exact62/sameframes/source/F-C/pixels/technical/landmarks/terrain checks; parent sampling14/14. Further qualitychecker writes require a reported conflict, not silent exporter-driven weakening.
- [x] Parent confirmed actualassetsRED420/677 from genuine old inputs; contract passed to resource implementation. Temporary1027/1027 sampling feasibility is not actualassetsGREEN.
- [x] Exact62 same-frame resources/exporter implemented; accepted mapping/terrain/composite review and independent1027/1027 quality evidence.
- [x] Independent sampling14/14 verifies full-domain uniform premultiplied LANCZOS without double-premultiplication; accepted parameters unchanged.
- [x] Two fresh guard-positive rebuilds64/64 byte-identical; actual64 unchanged; fixed persistent-path/symlink/snapshot protections independently16/16.
- [x] Exclusive-temp negatives13/13 plus correct-composite positive1027/1027 independently passed; no real assets/source altered.
- [x] Parent code/manifest/55frames/source2917/snapshot94 verified and scoped resource review closed. Actual derived-image observer coverage remains pending in Task3's real-game review after retained-media413; no visual precheck PASS claimed.

## Task 2: Display integration and real runtime regression
**Consumes:** Task1 textures/manifest, frozen real-Phaser baseline. **Produces:** full displayed replacement, same gameplay; browser regression script.
- [ ] Verification writer establishes RED checks for old WorldMap imagery, missing two landmark loads, missing new source version/URLs and old display-only geometry; existing invariant/geometry checks remain GREEN on baseline.
- [ ] Designer integrates minimal loader/display/depth helpers and spec §§4–9; resource writer may update `runtime_derivatives` metadata only after designer supplies exact operations (sequential ownership of exporter/manifest).
- [ ] Designer replaces WorldMap ART with eight sourced illustrations (one reused castle+seven derivatives), preserves NODE_POS/routes/labels/click targets, and removes normal product use of old procedural decorative fallbacks; smoke stub remains isolated.
- [ ] Designer applies six material recipes/profiles to all maps, final-grid water/path masks, ground flower rules, original cache semantics and bounded display-only shore/path edges; no map or random-stream edits.
- [ ] Browser script checks same-state all-map body/getBounds invariants, 4-direction attack boundaries, heart15×13 post-float, open/locked/linked gates, elemental effects/cleanup, 21 animation definitions, all loaded/new URLs and absence of fallback legacy artwork. Expected GREEN; failures preserve logs/screenshots.
- [ ] Capture 16 actual scene screenshots plus Village specified views/occlusion, HUD/dialogue/quiz/WorldMap and narrow viewport. Never use a static prototype or debugger-only screenshot as finished-game evidence.

## Task 3: Reconcile, verify and demonstrate
- [ ] Parent reads all writer artifacts and task-scoped diffs versus `v02-before`; no out-of-scope edits, source changes or baseline resets.
- [ ] Run final checks once on reconciled files (each exit0; keep logs): `python3 scripts/check-nli-sampling.py`; `python3 scripts/check-nli-quality.py --source /Users/uranus/Developer/GitHub/pyquest/assets/NLI_SoftFantasy_ARPG_v0.2 --assets assets/nli-preview --trees snow`; `node scripts/check-visual-invariants.mjs`; `node scripts/smoke.mjs`; `npm run build`; `BASE_URL=http://127.0.0.1:5186/ node scripts/e2e.mjs`; `BASE_URL=http://127.0.0.1:5186/ node scripts/e2e-ch2.mjs`; `node scripts/check-nli-v02.mjs --url http://127.0.0.1:5186 --output .superpowers/sdd/2026-10-28-nli-v02-full-replacement/final-browser`. Existing E2Es launch separate ephemeral Chromium contexts and write only `scripts/shots`; run them sequentially to keep screenshots unambiguous. Reuse unchanged prior evidence; focused failure reruns only.
- [ ] Observer reads absolute screenshot/contact-sheet paths and checks spec §10, especially feet/weapon completeness, tree/body readability, water/path corners, repeat artifacts, wall contrast, locked gate silhouette and label spacing. Designer fixes visual findings, fixer only mechanical issues.
- [ ] Gate2 integrated evidence review, at most two bounded re-reviews; parent verifies focused fixes. Source/logic fingerprints unchanged except approved display paths.
- [ ] Confirm local game serves successfully and remains running; launch real game for user, provide reachable localhost URL and actual screenshots with concise limitations. No commit/push/public distribution. Historical Tiny/cc0 may remain in local dist; do not claim build exclusion without evidence.

## Plan self-review
Spec §§1–2/10 map to Task0/3; §§3–4/6 art/7 offline material map to Task1; §§4 display/5/6.1/7 runtime/8/9 map to Task2. Writes are disjoint until sequential manifest handoff. Routine visual decisions stay with designer; only actual changes to frozen gameplay or unavailable required source art return to the user.
