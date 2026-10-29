#!/usr/bin/env python3
"""Build the v0.2 full-replacement NLI preview assets (62 PNGs + manifest + README).

Offline derivation from the read-only package
`NLI_SoftFantasy_ARPG_v0.2` per the designer spec
`docs/superpowers/specs/2026-10-28-nli-v02-full-replacement-design.md` (§§3-8):

  - F entries (spec §4): complete-source premultiplied sampling with explicit
    source anchor G, frame anchor A and s0 cap:
      s = min(s0, ax/gx, (W-ax)/(Sw-gx), ay/gy, (H-ay)/(Sh-gy))  (0 denominators skipped)
      t = A - s*G   (uniform scale; s, t kept with >= 9 significant digits)
  - C entries (spec §6): complete-source centered contain with a 1 px safety
    edge: s = min((W-2)/Sw, (H-2)/Sh), t centered.
  - terrain (spec §7): declared planar material domain -> 256^2 -> composite
    over base B0 -> P = [C, flipX(C); flipY(C), flipXY(C)] -> Q (0.65/0.35
    torus blend for grass/forest/path/water; Q = P for floor/wall), 512^2
    opaque.
  - composite (spec §4.2): gate_closed = Stone_Gate OVER Wooden_Fence, both
    F-sampled on the shared 320^2 frame; inputs recorded in drawing order.
  - copy (spec §5): castle_medium / portal_blue_gold are byte-for-byte copies
    of the new-package Sprites PNGs (no F/C, no alpha edit, no flip).
  - technical (spec §6): fire 64^2 and cloud1..5 576x256 fully transparent
    compatibility frames; ts_shadow 192^2 stays byte-frozen (copied from the
    immutable v02-before snapshot, never regenerated).
  - run sheet (2026-10-29 walk lane, designer): run/warrior_run_sheet.png — a
    5-frame vertical 192x192 spritesheet stitched from same-series static Hero
    walk poses (Hero_Row01_Pose03/07/06/02/04, same equipment and facing).
    It is deliberately NOT one of the 62 quality-gate keys: warrior_run.png
    stays the frozen single-frame Pose03 export (sheet frame 0 is verified
    pixel-identical to it in-build) so the independent 62-key gate remains
    byte-compatible. Per-frame provenance, the "stitched from static poses,
    not calibrated" declaration and the cycle timing live in the manifest
    top-level "run_sheet" block.
  - terrain_cliffs (2026-10-30 native terrain phase 1, Village pilot): seven
    supplementary run/ground/ assets — three raw Island_Cliff_Composition
    slices (whole front cliff / E-W side-wall strip / north grass lip) and
    four Terrain_Samples materials recolored at the display layer with the
    throwaway spike's measured constants (.scratch/nli-terrain-spike/
    build_spike.py, "from spike, display-layer transform"; source pixels
    untouched). Recorded in the manifest top-level "terrain_cliffs" block;
    like run_sheet these are NOT part of the 62 quality-gate keys.

Sampling method (Gate R + fix1): premultiply alpha into RGB, zero-pad where
the inverse-affine window leaves the source canvas, ONE LANCZOS resample of
the PREMULTIPLIED data done per band in mode 'L' (bit-identical to relabeling
the raw bytes as Pillow's premultiplied mode 'RGBa'; an RGBA-mode resize would
apply the alpha weighting twice on Pillow >= 11.2), clamp RGB <= alpha, then
unpremultiply for the straight-alpha PNG. No v0.1 crop domains, masks or
4 px padding assumptions; no transparent-edge trimming; no orientation flips.

This exporter never imports the quality checker; the mapping tables below are
transcribed independently from the spec. CLI keeps a `--trees <keep|snow>`
argument for compatibility with the old v0.1 invocation; v0.2 expectations
ignore it (no snow variant is produced).

Usage:
  python3 scripts/build-nli-preview.py [--source <pkg root>] [--output <dir>]
                                       [--before <v02-before assets dir>]
                                       [--trees keep|snow]
Output safety: the persistent destination is only this worktree's
assets/nli-preview; --output is a test escape hatch restricted to a fresh,
non-existing directory under the approved opencode temp root. Leaf and
destination-file symlinks, resolved output inside the source package or the
before snapshot, and a non-pinned frozen ts_shadow are all refused with exit 2
before any write (full destination-set preflight, no partial exports).
Exit codes: 0 built, 2 invalid inputs or refused unsafe output.
"""
import argparse
import hashlib
import json
import math
import shutil
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageMath, ImageOps

SRC_PREFIX = "Assets/NLI_SoftFantasy_ARPG/Sprites/"
SOURCE_VERSION = "0.2.1-npc-elder"
METHOD = "premult-pad-resize-lanczos"
RESAMPLE = Image.Resampling.LANCZOS
DEFAULT_SOURCE = Path("/Users/uranus/Developer/GitHub/pyquest/assets/NLI_SoftFantasy_ARPG_v0.2")
DEFAULT_OUTPUT = Path(__file__).resolve().parent.parent / "assets" / "nli-preview"
DEFAULT_BEFORE = (Path(__file__).resolve().parent.parent / ".slim" / "deepwork" /
                  "nli-systematic-2026-10-27" / "v02-before" / "assets" / "nli-preview")

# M3: pinned sha256 of the frozen programmatic ts_shadow, taken from the
# accepted quality checker's frozen expectation and cross-checked against the
# immutable v02-before snapshot (and the shipped asset). Never derived from
# the mutable --before input at runtime.
TS_SHADOW_SHA256 = "4a1da387613e4fb91db3d60a85e16935ba13484e7df3044c954e37a5e131d5dd"
# Parent ruling: persistent output is ONLY this worktree's assets/nli-preview;
# --output is solely a test escape hatch for a fresh, non-existing destination
# under the approved opencode temp root (ancestor aliases like /var resolved).
APPROVED_TEMP_ROOT = (Path(tempfile.gettempdir()) / "opencode").resolve()


class GuardError(Exception):
    """Unsafe output/destination request; caught in main() -> exit 2."""

HERO = "Characters/Hero_Poses/"
NPC = "Characters/NPCs/"
MUSH = "Enemies/Mushrooms/"
SLIME = "Enemies/Slimes/"
BOSS = "Boss/"
NAT = "Environment/Nature_And_Props/"
BLD = "Environment/Buildings_And_Props/"
UI = "UI/Icons/"
PAN = "UI/Panels_And_Buttons/"
LOOT = "Items/Loot/"
ITEM = "Items/Consumables/"
FX = "VFX/Static_Elements/"
TERR = "Environment/Terrain_Samples/"


def H(n):
    """s0 = n / (alpha>=8 bbox height of the source), spec §3."""
    return ("H", n)


def L(n):
    """s0 = n / max(Sw, Sh), spec §3."""
    return ("L", n)


# spec §4.1/§4.2/§6: key -> (source rel path, (W, H), G=(gx, gy), A=(ax, ay), s0)
F_SPEC = {
    "warrior_idle": (HERO + "Hero_Row01_Pose02", (192, 192), (704, 1145), (96, 136), 87 / 1008),
    "warrior_run": (HERO + "Hero_Row01_Pose03", (192, 192), (720, 1168), (96, 136), 87 / 1081),
    "warrior_attack": (HERO + "Hero_Row02_Pose04", (192, 192), (544, 1091), (96, 136), 87 / 1008),
    "monk_idle": (NPC + "NPC_Elder", (192, 192), (704, 1163), (96, 136), 92 / 1026),
    "pawn_red_idle": (MUSH + "Mushroom_Pose01", (192, 192), (639, 1021), (96, 134), H(65)),
    "pawn_red_run": (MUSH + "Mushroom_Pose01", (192, 192), (639, 1021), (96, 134), H(65)),
    "warrior_black_idle": (SLIME + "Slime_Pose05", (192, 192), (641.5, 1039), (96, 134), H(64)),
    "warrior_black_run": (SLIME + "Slime_Pose05", (192, 192), (641.5, 1039), (96, 134), H(64)),
    "pawn_black_idle": (SLIME + "Slime_Pose03", (192, 192), (631.5, 1027), (96, 134), H(54)),
    "warrior_purple_idle": (BOSS + "Crimson_Knight_Large_Pose", (480, 480), (672, 928), (240, 340), H(216)),
    "warrior_purple_run": (BOSS + "Crimson_Knight_Large_Pose", (480, 480), (672, 928), (240, 340), H(216)),
    "tree1": (NAT + "Tree_Large", (256, 256), (632.5, 1206), (128, 235), H(222)),
    "tree2": (NAT + "Tree_Small", (256, 256), (635.5, 1131), (128, 235), H(210)),
    "tree3": (NAT + "Tree_Large", (256, 192), (632.5, 1206), (128, 177), H(166)),
    "tree4": (NAT + "Tree_Small", (256, 192), (635.5, 1131), (128, 177), H(150)),
    "bush1": (NAT + "Bush_01", (128, 128), (636.5, 977), (64, 108), H(70)),
    "bush2": (NAT + "Bush_02", (128, 128), (627, 992), (64, 108), H(72)),
    "bush3": (NAT + "Bush_03", (128, 128), (632.5, 1001), (64, 108), H(74)),
    "bush4": (NAT + "Bush_03", (128, 128), (632.5, 1001), (64, 108), H(56)),
    "castle": (BLD + "Castle_Tower", (192, 320), (645.5, 1191), (96, 310), H(278)),
    "tower": (NAT + "Standing_Rock", (128, 256), (625.5, 1091), (64, 224), H(122)),
    "crystal": (LOOT + "Gem_Blue", (40, 45), (652.5, 1000), (20, 37), H(34)),
    "shroom": (NAT + "Flowers_Pink", (60, 60), (629, 995), (30, 50), H(45)),
    "torch_0": (NAT + "Torch", (40, 80), (632.5, 1182), (20, 75), H(65)),
    "gate_open": (NAT + "Stone_Gate", (320, 320), (633.5, 1108), (160, 276.666667), H(220)),
    "portal_door": (BLD + "Portal_Blue_Gold", (72, 72), (633.5, 1136), (36, 64), L(70)),
    "ui_heart_full": (UI + "Heart_Red01", (64, 64), (627, 628.5), (32, 32), 38 / 894),
    "ui_heart_empty": (UI + "Heart_Empty", (64, 64), (631, 635), (32, 32), 38 / 768),
    "ground_flowers": (NAT + "White_Flowers", (96, 96), (635, 1067), (48, 80), H(70)),
}

# spec §6/§6.1: key -> (source rel path, (W, H)); complete-source centered contain
C_SPEC = {
    "dust": (FX + "Dust_Trail", (160, 160)),
    "slash_0": (FX + "Gold_Arc_01", (84, 84)),
    "slash_1": (FX + "Gold_Arc_01", (84, 84)),
    "slash_2": (FX + "Gold_Arc_01", (84, 84)),
    "shard": (UI + "Gem_03", (40, 48)),
    "heart_full": (UI + "Heart_Red01", (30, 26)),
    "ui_shard": (UI + "Gem_03", (64, 64)),
    "ui_map": (PAN + "Panel_Map02", (64, 64)),
    "ui_key": (ITEM + "Key", (64, 64)),
    "ui_stamp": (UI + "Coin_01", (64, 64)),
    "map_forest": (NAT + "Tree_Large", (256, 256)),
    "map_highland": (NAT + "Standing_Rock", (256, 256)),
    "map_tower": (BLD + "Castle_Tower", (256, 256)),
    "map_forge": (NAT + "Torch", (256, 256)),
    "map_temple": (BLD + "Stone_Pillars", (256, 256)),
    "map_signal": (BLD + "Banner_Tower", (256, 256)),
    "map_halo": (FX + "Gold_Ring", (256, 256)),
}

# spec §7: key -> (source rel path, domain (l, t, r, b), base B0 rgb, blend?)
TERRAIN_SPEC = {
    "grass": (TERR + "Terrain_R1_C1", (480, 96, 800, 416), (0x7d, 0x92, 0x58), True),
    "forest": (TERR + "Terrain_R1_C3", (480, 96, 800, 416), (0x64, 0x7d, 0x52), True),
    "path": (TERR + "Terrain_R1_C2", (400, 96, 880, 576), (0xba, 0xa3, 0x74), True),
    "water": (TERR + "Terrain_R2_C2", (128, 128, 1126, 1126), (0x3e, 0x7e, 0x88), True),
    "floor": (TERR + "Terrain_R2_C3", (160, 160, 1094, 1094), (0x77, 0x75, 0x83), False),
    "wall": (TERR + "Terrain_R3_C4", (96, 96, 1158, 1158), (0x42, 0x46, 0x51), False),
}

# spec §5: byte-for-byte new-package landmark copies
COPY_SPEC = {
    "castle_medium": BLD + "Castle_Medium",
    "portal_blue_gold": BLD + "Portal_Blue_Gold",
}

# spec §4.2 gate_closed: fence drawn first, Stone_Gate overlaid second
COMPOSITE_SPEC = {
    "gate_closed": {
        "size": (320, 320),
        "inputs": [
            (BLD + "Wooden_Fence", (320, 320), (631, 838), (160, 262), 0.13),
            (NAT + "Stone_Gate", (320, 320), (633.5, 1108), (160, 276.666667), H(220)),
        ],
    }
}

# spec §6: 7 explicit technical outputs
TECHNICAL_SPEC = {
    "fire": {"size": (64, 64), "kind": "transparent"},
    "ts_shadow": {"size": (192, 192), "kind": "frozen"},
    **{f"cloud{i}": {"size": (576, 256), "kind": "transparent"} for i in range(1, 6)},
}

KEYS = sorted(set(F_SPEC) | set(C_SPEC) | set(TERRAIN_SPEC) | set(COPY_SPEC) |
              set(COMPOSITE_SPEC) | set(TECHNICAL_SPEC))
assert len(KEYS) == 62, f"spec tables must describe exactly 62 keys, got {len(KEYS)}"

# 2026-10-29 walk lane (designer): multi-frame warrior_run spritesheet stitched
# from same-series static Hero walk poses (screen-right facing, same equipment,
# no big weapons; candidate pool Hero_Row01_Pose02..07). It is NOT a KEYS
# member: warrior_run.png stays the frozen single-frame quality-gate export and
# the sheet lives in the run/ subdirectory (outside the checker's top-level
# *.png glob), with per-frame provenance + declarations in manifest.run_sheet.
# Anchor convention per frame: gy = Generation_Records solid_alpha_bbox bottom
# edge (the same convention the frozen idle/run/attack anchors use); gx rules
# are recorded per frame — foot-band (bottom 6%) two-feet midpoint, validated
# within 1.2 source px against the two known anchors (Pose02 -0.36px,
# Pose03 -1.15px), with the bottom-25% alpha-weighted centroid fallback for the
# one-foot-off-ground pose (Pose06). s0 = H(87) keeps the visible character
# height at 87px in every frame (the exporter's own convention); frame 0 keeps
# the frozen warrior_run row (incl. its literal 87/1081 s0) so its pixels stay
# identical to the accepted single-frame export.
# Frame order: cyclic TSP minimizing adjacent-frame leg-region MAE (least-jumpy
# available stitch order), rotated so frame 0 = Pose03 for continuity with the
# previously shipped single-frame run export. Selection/order evidence:
# .superpowers/sdd/2026-10-29-ground-i18n-walk/lane-a/pose-analysis.json.
RUN_SHEET = {
    "file": "run/warrior_run_sheet.png",
    "frame_size": (192, 192),
    "frame_anchor": (96, 136),
    "frames": [
        (HERO + "Hero_Row01_Pose03", (720, 1168), 87 / 1081,
         "frozen warrior_run F row (foot-band two-feet midpoint validated "
         "-1.15 source px); frame 0 stays pixel-identical to warrior_run.png"),
        (HERO + "Hero_Row01_Pose07", (688.09, 1140), H(87),
         "foot-band (bottom 6%) two-feet midpoint"),
        (HERO + "Hero_Row01_Pose06", (687.75, 1148), H(87),
         "fallback: bottom-25% alpha-weighted centroid (one foot off ground "
         "in the 6% band)"),
        (HERO + "Hero_Row01_Pose02", (703.64, 1145), H(87),
         "foot-band (bottom 6%) two-feet midpoint"),
        (HERO + "Hero_Row01_Pose04", (701.56, 1111), H(87),
         "foot-band (bottom 6%) two-feet midpoint"),
    ],
}
# Mirrors TS_ANIMS.ts_warrior_run in src/assets/ts.js (keep in sync): dur is
# PER-FRAME ms — createTSAnimations sets frameRate = 1000/dur, Phaser derives
# msPerFrame = dur and anim.duration = N * dur. 96ms/frame is the slowest
# first-frame change that deterministically falls inside the walk-repro frame
# diversity window (7 fixed 16.667ms accumulator samples = 100ms); a 600-900ms
# whole-cycle draft would need 120-180ms/frame and cannot pass that gate at
# N=5 (cycle <= 500ms). Cadence stays a draft pending user feel.
RUN_SHEET_PER_FRAME_MS = 96

# 2026-10-30 native terrain phase 1 (Village pilot): supplementary cliff
# slices + display-layer recolored native ground materials under run/ground/.
# Like RUN_SHEET these are NOT KEYS members — the 62-key quality gate stays
# frozen; later tasks consume them by the exact relative path
# run/ground/<name>.png and the manifest top-level "terrain_cliffs" block
# records provenance. Every slice coordinate and recolor constant below is
# copied verbatim from the measured throwaway prototype
# .scratch/nli-terrain-spike/build_spike.py ("from spike, display-layer
# transform"); the read-only source pack pixels are never modified.
CLIFF_COMPOSITION = "Environment/Terrain_Compositions/Island_Cliff_Composition"

# from spike: Island_Cliff_Composition internal structure (measured) is
# top surface y~226..430 / front cliff y~430..880 / bedrock+foam y~880..1100.
CLIFF_SLICES = {
    # whole front cliff: grass lip + rock face + bedrock + foam
    "cliff_s_band": (CLIFF_COMPOSITION, (350, 405, 900, 915)),
    # E/W side-wall narrow strip (one strip; runtime mirrors it per side)
    "cliff_ew_strip": (CLIFF_COMPOSITION, (274, 400, 328, 915)),
    # north-facing grass lip (upper edge of the cliff top surface)
    "cliff_n_lip": (CLIFF_COMPOSITION, (400, 228, 850, 268)),
}

# from spike, display-layer transform: native material domain -> LANCZOS
# resize -> 2x2 mirror mosaic (seamless fill texture) -> grade with the
# prototype's measured constants (verbatim):
#   grass: color=0.66 brightness=0.97 blend=(125,146,88) blend_a=0.16
#   path:  color=0.82 brightness=0.97 blend=(186,163,116) blend_a=0.10
#   water: color=0.92 blend=(8,60,110) blend_a=0.34
# flower: the spike measured NO recolor for the flower mosaic — it ships its
# native color (grade=None).
TERRAIN_GROUND = {
    "terrain_grass": (TERR + "Terrain_R1_C1", (200, 200, 1050, 1050), 512,
                      {"color": 0.66, "brightness": 0.97,
                       "blend": (125, 146, 88), "blend_a": 0.16}),
    "terrain_path": (TERR + "Terrain_R1_C2", (200, 200, 1050, 1050), 512,
                     {"color": 0.82, "brightness": 0.97,
                      "blend": (186, 163, 116), "blend_a": 0.10}),
    "terrain_water": (TERR + "Terrain_R2_C2", (220, 220, 1030, 1030), 512,
                      {"color": 0.92, "blend": (8, 60, 110), "blend_a": 0.34}),
    "terrain_flower": (TERR + "Terrain_R1_C4", (300, 300, 950, 950), 384, None),
}

# Preflight destination list for the 7 supplementary assets (manifest
# "files" order is instead build order: cliff slices first, then materials).
TERRAIN_CLIFF_FILES = [f"run/ground/{name}.png"
                       for name in list(TERRAIN_GROUND) + list(CLIFF_SLICES)]


# ---------------------------------------------------------------- sampling ----

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def premultiply(straight):
    r, g, b, a = straight.split()
    return Image.merge("RGBA", (ImageChops.multiply(r, a), ImageChops.multiply(g, a),
                                ImageChops.multiply(b, a), a))


def clamp_premult(pm):
    r, g, b, a = pm.split()
    return Image.merge("RGBA", (ImageChops.darker(r, a), ImageChops.darker(g, a),
                                ImageChops.darker(b, a), a))


def unpremultiply(pm):
    r, g, b = (c.convert("F") for c in pm.split()[:3])
    a = pm.getchannel("A").convert("F")
    chans = [ImageMath.unsafe_eval("(ic * 255 + 0.5) / max(ia, 1)", ic=c, ia=a).convert("L")
             for c in (r, g, b)]
    return Image.merge("RGBA", chans + [pm.getchannel("A")])


def premult_resize(pm, size, box):
    """One LANCZOS resample of premultiplied data, per band in mode 'L'.

    Keeps exactly one alpha weighting (the explicit premultiply above): an
    RGBA-mode resize would premultiply/unpremultiply again on Pillow >= 11.2
    (parent-premult-repro.json). Per-band 'L' resize is bit-identical to
    relabeling the raw premultiplied bytes as mode 'RGBa'.
    """
    return Image.merge("RGBA", [ch.resize(size, RESAMPLE, box=box) for ch in pm.split()])


def sample_f(pm, s, t, size):
    """F/C sampling: zero-pad to the inverse-affine window, one LANCZOS resample."""
    left, top = (0 - t[0]) / s, (0 - t[1]) / s
    right, bottom = (size[0] - t[0]) / s, (size[1] - t[1]) / s
    pad_l, pad_t = max(0.0, -left), max(0.0, -top)
    pad_r, pad_b = max(0.0, right - pm.width), max(0.0, bottom - pm.height)
    off_x = off_y = 0
    if pad_l or pad_t or pad_r or pad_b:
        off_x, off_y = math.ceil(pad_l), math.ceil(pad_t)
        canvas = Image.new("RGBA", (pm.width + off_x + math.ceil(pad_r),
                                    pm.height + off_y + math.ceil(pad_b)))
        canvas.paste(pm, (off_x, off_y))
        pm = canvas
    out = premult_resize(pm, size, (left + off_x, top + off_y, right + off_x, bottom + off_y))
    return clamp_premult(out)


def premult_over(top, bottom):
    """top over bottom in premultiplied 8-bit space."""
    inv = ImageChops.invert(top.getchannel("A"))
    scaled = [ImageChops.multiply(c, inv) for c in bottom.split()]
    return Image.merge("RGBA", [ImageChops.add(t, sc) for t, sc in zip(top.split(), scaled)])


def torus_roll(im, sx, sy):
    n = im.width
    out = Image.new(im.mode, im.size)
    sx %= n
    sy %= n
    for dx in (sx, sx - n):
        for dy in (sy, sy - n):
            out.paste(im, (dx, dy))
    return out


def terrain_output(pm, domain, base, blend):
    """spec §7: domain resize -> composite over B0 -> P mosaic -> Q blend."""
    c = clamp_premult(premult_resize(pm, (256, 256), domain))
    a = c.getchannel("A")
    inv = ImageChops.invert(a)
    c_opaque = Image.merge("RGBA",
                           [ImageChops.add(ch, ImageChops.multiply(Image.new("L", (256, 256), v), inv))
                            for ch, v in zip(c.split()[:3], base)] + [ImageChops.add(a, inv)])
    material = Image.merge("RGBA", (*c_opaque.split()[:3], Image.new("L", (256, 256), 255)))
    p = Image.new("RGBA", (512, 512))
    p.paste(material, (0, 0))
    p.paste(ImageOps.mirror(material), (256, 0))
    p.paste(ImageOps.flip(material), (0, 256))
    p.paste(ImageOps.mirror(ImageOps.flip(material)), (256, 256))
    if not blend:
        return p
    secondary = torus_roll(ImageOps.mirror(p.transpose(Image.Transpose.TRANSPOSE)), 91, -173)
    return Image.blend(p, secondary, 0.35)


def grade_display(im, params):
    """Display-layer recolor, from spike (build_spike.py measured constants).

    Source-pack pixels are untouched; only this exported display copy is
    graded: saturation/brightness via ImageEnhance, then a partial blend
    toward the olive/deep-blue target color (toward the game's existing
    olive/deep-blue palette, per the 2026-10-29 native terrain design).
    """
    im = ImageEnhance.Color(im).enhance(params.get("color", 1.0))
    im = ImageEnhance.Brightness(im).enhance(params.get("brightness", 1.0))
    blend = params.get("blend")
    if blend is not None:
        solid = Image.new("RGBA", im.size, tuple(blend) + (255,))
        im = Image.blend(im, solid, params.get("blend_a", 0.0))
    return im


def grade_desc(params):
    """Manifest provenance string for a display-layer grade parameter set."""
    if params is None:
        return None
    parts = []
    for key in ("color", "brightness", "blend", "blend_a"):
        if key in params:
            value = params[key]
            parts.append(f"{key}={tuple(value) if isinstance(value, (tuple, list)) else value}")
    return ", ".join(parts)


# --------------------------------------------------------------- transforms ---

class Sources:
    """Read-only decode + hash cache over the v0.2 package Sprites."""

    def __init__(self, root):
        self.root = Path(root)
        self._straight, self._premult, self._b8 = {}, {}, {}

    def path(self, rel):
        p = (self.root / SRC_PREFIX / (rel + ".png")).resolve()
        if not p.is_relative_to(self.root.resolve()):
            raise ValueError(f"source path escapes package: {rel}")
        return p

    def straight(self, rel):
        if rel not in self._straight:
            with Image.open(self.path(rel)) as im:
                im.load()
                self._straight[rel] = im.convert("RGBA")
        return self._straight[rel]

    def premult(self, rel):
        if rel not in self._premult:
            self._premult[rel] = premultiply(self.straight(rel))
        return self._premult[rel]

    def b8_height(self, rel):
        if rel not in self._b8:
            bbox = self.straight(rel).getchannel("A").point(
                lambda v: 255 if v >= 8 else 0).getbbox()
            self._b8[rel] = bbox[3] - bbox[1]
        return self._b8[rel]

    def s0(self, s0, rel):
        if isinstance(s0, tuple):
            if s0[0] == "H":
                return s0[1] / self.b8_height(rel)
            return s0[1] / max(self.straight(rel).size)
        return float(s0)

    def f_transform(self, spec_row):
        rel, size, g, a, s0 = spec_row
        Sw, Sh = self.straight(rel).size
        gx, gy = g
        ax, ay = a
        width, height = size
        caps = [self.s0(s0, rel)]
        for num, den in ((ax, gx), (width - ax, Sw - gx), (ay, gy), (height - ay, Sh - gy)):
            if den != 0:
                caps.append(num / den)
        s = min(caps)
        return s, (ax - s * gx, ay - s * gy)

    def c_transform(self, rel, size):
        Sw, Sh = self.straight(rel).size
        s = min((size[0] - 2) / Sw, (size[1] - 2) / Sh)
        return s, ((size[0] - s * Sw) / 2, (size[1] - s * Sh) / 2)

    def source_meta(self, rel, domain=None):
        im = self.straight(rel)
        return {
            "source_image_path": SRC_PREFIX + rel + ".png",
            "source_sha256": digest(self.path(rel)),
            "native_size": list(im.size),
            "source_domain_xyxy": list(domain) if domain else [0, 0, im.width, im.height],
        }


# ------------------------------------------------------------------ builder ---

def validate_output_path(output_arg, worktree_root, source, before, is_default):
    """Refuse unsafe output BEFORE any write (plan line 34, parent ruling).

    - output leaf symlink rejected before resolve() (dangling links included);
      ancestor aliases such as macOS /var -> /private/var stay permitted as
      long as the RESOLVED destination remains allowed;
    - resolved output may never sit inside the read-only source package or the
      immutable before snapshot;
    - default (persistent) output must resolve to EXACTLY this worktree's
      assets/nli-preview (no intra- or extra-worktree redirect);
    - --output is a test escape hatch only: a fresh, non-existing destination
      under the approved opencode temp root, never the root itself.
    """
    output_arg = Path(output_arg)
    if output_arg.is_symlink():
        raise GuardError(f"output destination is a symlink: {output_arg}")
    resolved = output_arg.resolve()
    if resolved.is_relative_to(source):
        raise GuardError(f"output resolves inside the read-only source package: {resolved}")
    if resolved.is_relative_to(before):
        raise GuardError(f"output resolves inside the immutable before snapshot: {resolved}")
    if is_default:
        # Parent ruling: the persistent output is EXACTLY this worktree's
        # assets/nli-preview. worktree_root is fully resolved from __file__,
        # so macOS root aliases stay impossible here while an assets/nli-preview
        # symlink redirect (intra- or extra-worktree) is rejected by equality.
        persistent = worktree_root / "assets" / "nli-preview"
        if resolved != persistent:
            raise GuardError(
                f"persistent output is fixed to {persistent}; refusing redirected "
                f"default output: {resolved}")
    else:
        if not resolved.is_relative_to(APPROVED_TEMP_ROOT):
            raise GuardError(
                "--output is a test escape hatch only: resolved destination must be a "
                f"fresh non-existing path under {APPROVED_TEMP_ROOT}, got {resolved}")
        if resolved == APPROVED_TEMP_ROOT:
            raise GuardError("--output may not be the approved temp root itself")
        if resolved.exists():
            raise GuardError(f"--output destination must be fresh (non-existing): {resolved}")
    return resolved


def check_ts_shadow_pin(before):
    """M3: reject a mutated frozen ts_shadow before any copy/output write."""
    path = Path(before) / "ts_shadow.png"
    actual = digest(path) if path.is_file() else None
    if actual != TS_SHADOW_SHA256:
        raise GuardError(
            f"frozen ts_shadow.png sha256 mismatch under {before}: expected the pinned "
            f"accepted hash, got {actual}")


def preflight_destinations(output):
    """B1: check the COMPLETE destination set up front (62 PNGs + manifest +
    README + the run/ spritesheet + the 7 run/ground/ terrain_cliffs
    assets) so a symlink discovered late can never leave a partial export."""
    names = ([f"{key}.png" for key in KEYS] + ["manifest.json", "README.md",
                                               RUN_SHEET["file"]]
             + TERRAIN_CLIFF_FILES)
    for name in names:
        dest = Path(output) / name
        if dest.is_symlink():
            raise GuardError(f"destination file is a symlink: {dest}")


def build(source_root, output, before, trees):
    sources = Sources(source_root)
    output = Path(output)
    preflight_destinations(output)
    output.mkdir(parents=True, exist_ok=True)
    entries = []

    def emit_png(key, image):
        path = output / f"{key}.png"
        image.save(path, format="PNG")
        return path

    def entry(key, path, image, meta):
        return {"key": key, "url": f"/nli-preview/{key}.png", "size": list(image.size),
                "sha256": digest(path), **meta}

    for key in KEYS:
        if key in F_SPEC:
            spec_row = F_SPEC[key]
            s, t = sources.f_transform(spec_row)
            image = unpremultiply(sample_f(sources.premult(spec_row[0]), s, t, spec_row[1]))
            path = emit_png(key, image)
            entries.append(entry(key, path, image, {
                **sources.source_meta(spec_row[0]),
                "sampling": {"mode": "F", "scale": round(s, 12),
                             "translate_xy": [round(t[0], 12), round(t[1], 12)],
                             "source_anchor_xy": list(spec_row[2]),
                             "frame_anchor_xy": list(spec_row[3]),
                             "method": METHOD}}))
        elif key in C_SPEC:
            rel, size = C_SPEC[key]
            s, t = sources.c_transform(rel, size)
            image = unpremultiply(sample_f(sources.premult(rel), s, t, size))
            path = emit_png(key, image)
            entries.append(entry(key, path, image, {
                **sources.source_meta(rel),
                "sampling": {"mode": "C", "scale": round(s, 12),
                             "translate_xy": [round(t[0], 12), round(t[1], 12)],
                             "frame_anchor_xy": None,
                             "method": METHOD}}))
        elif key in TERRAIN_SPEC:
            rel, domain, base, blend = TERRAIN_SPEC[key]
            image = terrain_output(sources.premult(rel), domain, base, blend)
            path = emit_png(key, image)
            entries.append(entry(key, path, image, {
                **sources.source_meta(rel, domain),
                "sampling": {"mode": "terrain", "domain": list(domain),
                             "base_rgb": list(base), "torus_blend": bool(blend),
                             "method": METHOD}}))
        elif key in COPY_SPEC:
            rel = COPY_SPEC[key]
            src_path = sources.path(rel)
            dest = output / f"{key}.png"
            shutil.copyfile(src_path, dest)
            image = sources.straight(rel)
            entries.append(entry(key, dest, image, {
                **sources.source_meta(rel),
                "sampling": {"mode": "copy",
                             "note": "byte-for-byte new-package sprite; no resampling"}}))
        elif key in COMPOSITE_SPEC:
            spec = COMPOSITE_SPEC[key]
            refs, inputs = [], []
            for in_spec in spec["inputs"]:
                rel = in_spec[0]
                s, t = sources.f_transform(in_spec)
                refs.append(sample_f(sources.premult(rel), s, t, in_spec[1]))
                inputs.append({**sources.source_meta(rel),
                               "sampling": {"mode": "F", "scale": round(s, 12),
                                            "translate_xy": [round(t[0], 12), round(t[1], 12)],
                                            "source_anchor_xy": list(in_spec[2]),
                                            "frame_anchor_xy": list(in_spec[3]),
                                            "method": METHOD}})
            combined = premult_over(refs[1], refs[0])  # Stone_Gate over Wooden_Fence
            image = unpremultiply(combined)
            path = emit_png(key, image)
            entries.append(entry(key, path, image, {
                "sampling": {"mode": "composite", "inputs": inputs,
                             "draw_order": "Wooden_Fence first, Stone_Gate overlaid",
                             "method": METHOD}}))
        elif key in TECHNICAL_SPEC:
            spec = TECHNICAL_SPEC[key]
            if spec["kind"] == "frozen":
                frozen = Path(before) / f"{key}.png"
                dest = output / f"{key}.png"
                shutil.copyfile(frozen, dest)
                with Image.open(dest) as im:
                    im.load()
                    image = im.convert("RGBA")
                entries.append(entry(key, dest, image, {
                    "sampling": {"mode": "technical",
                                 "note": "byte-frozen programmatic contact shadow; copied from "
                                         "the immutable v02-before snapshot, not regenerated"}}))
            else:
                image = Image.new("RGBA", spec["size"])
                path = emit_png(key, image)
                entries.append(entry(key, path, image, {
                    "sampling": {"mode": "technical",
                                 "note": "fully transparent compatibility frame; no package "
                                         "provenance claimed"}}))
        else:  # pragma: no cover - KEYS is the union of the tables above
            raise KeyError(key)

    # ---- 2026-10-29 walk lane: multi-frame warrior_run spritesheet ----
    fw, fh = RUN_SHEET["frame_size"]
    frame_anchor = RUN_SHEET["frame_anchor"]
    n_frames = len(RUN_SHEET["frames"])
    sheet = Image.new("RGBA", (fw, fh * n_frames))
    run_frames_meta = []
    for idx, (rel, g, s0, rule) in enumerate(RUN_SHEET["frames"]):
        spec_row = (rel, (fw, fh), g, frame_anchor, s0)
        s, t = sources.f_transform(spec_row)
        frame = unpremultiply(sample_f(sources.premult(rel), s, t, (fw, fh)))
        sheet.paste(frame, (0, idx * fh))
        run_frames_meta.append({
            "index": idx,
            **sources.source_meta(rel),
            "sampling": {"mode": "F", "scale": round(s, 12),
                         "translate_xy": [round(t[0], 12), round(t[1], 12)],
                         "source_anchor_xy": list(g),
                         "frame_anchor_xy": list(frame_anchor),
                         "method": METHOD},
            "anchor_rule": rule,
        })
    sheet_path = output / RUN_SHEET["file"]
    sheet_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(sheet_path, format="PNG")
    # Continuity contract: sheet frame 0 must be pixel-identical to the frozen
    # single-frame warrior_run export (same pipeline, same spec row).
    with Image.open(output / "warrior_run.png") as wr_im:
        warrior_run_frame = wr_im.convert("RGBA")
    if ImageChops.difference(warrior_run_frame, sheet.crop((0, 0, fw, fh))).getbbox() is not None:
        raise RuntimeError("run sheet frame 0 must be pixel-identical to "
                           "warrior_run.png (frozen single-frame export)")
    run_sheet_meta = {
        "url": f"/nli-preview/{RUN_SHEET['file']}",
        "file": RUN_SHEET["file"],
        "sha256": digest(sheet_path),
        "size": [sheet.width, sheet.height],
        "frame_size": [fw, fh],
        "frame_count": n_frames,
        "layout": ("vertical stack; Phaser spritesheet frameWidth/frameHeight "
                   "192x192, frame k at y = k*192"),
        "sheet_key": "warrior_run",
        "anim": "ts_warrior_run",
        "ts_anims_entry": ["warrior_run", n_frames, RUN_SHEET_PER_FRAME_MS, True],
        "declaration": "stitched from static poses, not calibrated",
        "not_gate_key": ("supplementary spritesheet in the run/ subdirectory, NOT one of the "
                         "62 quality-gate keys; warrior_run.png stays the frozen single-frame "
                         "Pose03 export and sheet frame 0 is pixel-identical to it "
                         "(verified in-build)"),
        "frame0_identical_to_warrior_run_png": True,
        "frame_order": [f[0] for f in RUN_SHEET["frames"]],
        "frame_order_note": ("cyclic TSP minimizing adjacent-frame leg-region MAE; frame 0 = "
                             "Hero_Row01_Pose03 for continuity with the previous single-frame "
                             "export; NOT calibrated gait phasing"),
        "dur_semantics": ("ts.js TS_ANIMS third element is PER-FRAME ms: createTSAnimations "
                          "sets frameRate = 1000/dur (frames/sec), so Phaser msPerFrame = dur "
                          "and anim.duration = N * dur is the whole cycle"),
        "cycle": {"per_frame_ms": RUN_SHEET_PER_FRAME_MS,
                  "cycle_ms": RUN_SHEET_PER_FRAME_MS * n_frames,
                  "rationale": ("96ms/frame is the slowest first-frame change that falls inside "
                                "the walk-repro frame-diversity window (7 fixed 16.667ms "
                                "accumulator samples = 100ms); a 600-900ms whole-cycle draft "
                                "would need 120-180ms/frame and cannot pass that gate at N=5 "
                                "(cycle <= 500ms); cadence remains a draft pending user feel")},
        "frames": run_frames_meta,
        "selection_evidence": ".superpowers/sdd/2026-10-29-ground-i18n-walk/lane-a/pose-analysis.json",
    }

    # ---- 2026-10-30 native terrain phase 1: cliff slices + recolored ----
    # ---- native ground materials (supplementary run/ground/ assets) ----
    ground_dir = output / "run" / "ground"
    ground_dir.mkdir(parents=True, exist_ok=True)
    ground_files = {}

    def emit_ground(name, image):
        path = ground_dir / f"{name}.png"
        image.save(path, format="PNG")
        return path

    for name, (rel, box) in CLIFF_SLICES.items():
        # raw native slice: exact source crop, no resample, no recolor
        # (display-layer transform does not apply to the cliff slices)
        image = sources.straight(rel).crop(box)
        path = emit_ground(name, image)
        ground_files[f"{name}.png"] = {
            "sha256": digest(path),
            "size": list(image.size),
            "source": f"{Path(rel).name}.png slice {list(box)}",
            "transform": "raw native crop; no resample, no recolor",
        }

    for name, (rel, domain, base_px, grade_params) in TERRAIN_GROUND.items():
        # from spike, display-layer transform: domain crop -> LANCZOS resize
        # -> 2x2 mirror mosaic (seamless fill texture) -> measured grade
        tile = sources.straight(rel).crop(domain).resize((base_px, base_px), RESAMPLE)
        mosaic = Image.new("RGBA", (base_px * 2, base_px * 2))
        mosaic.paste(tile, (0, 0))
        mosaic.paste(ImageOps.mirror(tile), (base_px, 0))
        mosaic.paste(ImageOps.flip(tile), (0, base_px))
        mosaic.paste(ImageOps.mirror(ImageOps.flip(tile)), (base_px, base_px))
        if grade_params is not None:
            mosaic = grade_display(mosaic, grade_params)
        path = emit_ground(name, mosaic)
        desc = grade_desc(grade_params)
        ground_files[f"{name}.png"] = {
            "sha256": digest(path),
            "size": list(mosaic.size),
            "source": f"{Path(rel).name}.png domain {list(domain)}",
            "transform": ("from spike, display-layer transform: LANCZOS resize "
                          f"{base_px} + 2x2 mirror mosaic + grade({desc})") if desc
            else ("from spike, display-layer transform: LANCZOS resize "
                  f"{base_px} + 2x2 mirror mosaic; native color kept "
                  "(spike measured no flower recolor)"),
        }

    terrain_cliffs_meta = {
        "files": ground_files,
        "display_transform": ("recolor toward olive/deep-blue, display-layer only, "
                              "source pixels untouched"),
        "not_gate_keys": ("supplementary assets in run/ground/, NOT part of the "
                          "62 quality-gate keys"),
    }

    manifest = {
        "preview": "NLI 素材预览 · v0.2 全量替换 · 静态姿态 + 拼接跑动条",
        "source_package": "NLI_SoftFantasy_ARPG_v0.2 (read-only)",
        "source_version": SOURCE_VERSION,
        "style_code": "NL-ARPG-SOFT-766DF2B7",
        "output_count": len(entries),
        "sampling": ("premultiply -> zero-pad -> one LANCZOS resample of the premultiplied "
                      "bands (RGBa-safe, single alpha weighting) -> clamp RGB<=alpha -> "
                      "unpremultiply offline in Pillow; linear texture filtering in Phaser at runtime"),
        "protected": ("Read-only source package. rebuild_cutouts.py and other package Tools "
                      "are never executed. No source or Tiny Swords file is written."),
        "preserved": ("Logical canvases, texture keys/URLs, frame dimensions, normalized "
                      "feet/origins, world bodies and bounds, map data, quiz, save, UI layout."),
        "technical_retained": [
            "fire — 64x64 fully transparent; flame art lives in torch_0",
            "ts_shadow — 192x192 byte-frozen programmatic contact shadow (not package art)",
            "cloud1..cloud5 — 576x256 fully transparent compatibility textures",
        ],
        "runtime_derivatives": [
            "implemented_offline (this export): map_forest, map_highland, "
            "map_tower, map_forge, map_temple, map_signal, map_halo — 256x256 "
            "C-mode WorldMap.ART decorations (complete-source contain)",
            "runtime_integrated (designer handoff in src, task-2): operations the "
            "runtime performs over these exported PNGs, distinct from the offline "
            "PNG derivation above. Scene ground: recipe nli02-ground-v2 (raised "
            "material alpha 2026-10-29), per-scene cache key "
            "ground_${def.key}_nli02-ground-v2_${orderedInputHashPrefixes} "
            "over the input order grass/forest/path/water/floor/wall/"
            "ground_flowers (sha256 8-hex prefixes; current revision a74f521f-"
            "db6e0d35-1ff97190-ddfb6fff-d90c0441-bfc07375-e588e05c); canvas "
            "def.w*128 x def.h*128, origin (0,0), depth -10, built once and cached "
            "per scene/revision (no per-frame redraw, no random calls)",
            "ground profiles: 16 per-scene profiles (src/textures/"
            "nliGroundProfiles.js) select the material and B/path/water colors; "
            "runtime fills opaque base B then overlays the exported opaque 512x512 "
            "terrain Q with material alpha .62/.50/.55/.35/.34/.30 (grass/forest/"
            "path/water/floor/wall; single predetermined 2026-10-29 legibility "
            "raise from the previous .32/.26/.40/.18/.34/.30 — floor/wall "
            "unchanged, grid/water-edge clipping/sizes/depth/collision untouched). "
            "The ground stays this derived planar material, "
            "NOT the source package's seamless autotile",
            "warrior run sheet (2026-10-29 walk lane): run/warrior_run_sheet.png "
            "recorded in manifest.run_sheet — 5-frame stitched loop consumed by "
            "TS_SHEETS.warrior_run / TS_ANIMS.ts_warrior_run "
            "['warrior_run', 5, 96, true]; dur is PER-FRAME ms (frameRate = "
            "1000/dur, Phaser msPerFrame = dur, whole cycle = 5 x 96 = 480ms); "
            "96ms/frame is the slowest first-frame change inside the walk-repro "
            "7x16.667ms frame-diversity sample window (a 600-900ms whole-cycle "
            "draft cannot pass that gate at N=5); stitched from static poses, "
            "not calibrated; idle/attack remain single-frame",
            "ground detail on final grid cells (128-world-px): final PATH union; "
            "W=WATER|WATER2|WATER3; no inner path borders; 24px road shoulder "
            "alpha .30 only on exterior non-PATH/non-water/non-colliding cells; "
            "water-edge 14px #92b6a5 alpha .22 and land-edge 12px #54674a alpha "
            ".22 nearest-edge masks (128x128 cached templates, alpha=round(255*a*"
            "max(0,1-d/width)) at pixel centers); per-shared-edge wave line inset "
            "4+2*sin(2*pi*s/96), width 2, rgba(194,217,188,.45), clipped to water; "
            "indoor DWALL/DFLOOR use the wall/floor profiles, VOID #242833",
            "Village ground extras: FLOWER 76x76 at the original deterministic "
            "offsets, skipped only when the draw rectangle intersects "
            "[1408,1856,640,896]; two soil pads (1088,1424,320x64) and "
            "(4352,1392,208x64) drawn from path Q with alpha<=.18, clipped to "
            "non-water, 16px edge fade",
            "Village landmarks (body-free images): the original castle image/body/creation "
            "order is retained and hidden (visible=false) with castle_medium 704x704 origin "
            "(0.4,0.94) at (1024,1444) depth 1444 overlaid; the single east portal_door "
            "image at (4288,1392), with interaction anchor (4288,1344), is REPLACED by portal_blue_gold 480x480 origin (0.5,0.9) "
            "at (4352,1392) depth 1392, while the original locked body (4178,1184,220,160) "
            "and interaction remain unchanged; two dedicated landmark shadows "
            "(1088,1432,600x96) and (4352,1400,320x64) alpha .18 depth -9, tagged "
            "nliDisplayRole=landmark-shadow for exactly these two",
            "landmark/door occlusion: every 100ms, alpha 0.45 <-> 1 only — enter "
            "when a subject rect intersects the image rect and subject.y < "
            "footY+4; hold while it intersects the rect expanded by 32 and "
            "subject.y < footY+20; subjects are the active player, enemies and "
            "active snake segments via the original getBounds; applies to the two "
            "Village landmarks plus the ordinary portal_door images",
            "fixedFX and prop lights: fixedFxDepth = ceil((def.h*128+1024)/1024)"
            "*1024 + legacyDepth with the enumerated old depths "
            "1200/1500/1800/1900/2000; the torch glow keeps the source point "
            "(627,300) projected through this manifest's torch_0 sampling (s,t) "
            "onto the original 112x224 display, sparks from flameX+Between(-16,16)"
            ",flameY (original count/timing); the crystal shadow center is the "
            "crystal's projected frame point (20,37) plus (0,+4) — landing at "
            "(p.x,p.y-21.3) — 160x80, alpha .45, depth p.y-1 (the -21.3 is the "
            "result of that projection, not an extra offset)",
            "WorldMap: eight inline-SVG illustrations inside one 1000x600 SVG "
            "(base #f3e7cc, alpha .9, pointer-events none) placing castle_medium "
            "and the seven map_* PNGs at the original source rectangles; "
            "label-aware center-preserving uniform shrink only (min of 1 and each "
            "label's maximum separated-axis scale, reserving 8 design px); "
            "portrait keeps the existing CSS list mode; no node/route/click "
            "changes",
            "fallbacks: Boot fails closed on loaderror — 49 required Phaser keys "
            "plus the manifest source_version must all load before "
            "initTitle/generateAllTextures; the procedural pixelArt stub textures "
            "are smoke-only (typeof window===undefined && !scene.sys && "
            "!scene.game), and the ground missing-texture placeholder is "
            "restricted to that same nonbrowser stub; no legacy decorative "
            "fallback",
            "runtime status: the operations above are implemented in src and "
            "consume the exported PNGs at the shipped hashes; a single Dungeon "
            "frame visual triage passed, but full scene/UI/animation visual "
            "acceptance and the final all-writer validation remain pending (see "
            "limitations)",
        ],
        "limitations": [
            "static poses only: idle/attack remain single-frame exports; "
            "ts_warrior_run is a 5-pose stitched loop (see run_sheet: 'stitched "
            "from static poses, not calibrated'), not a calibrated gait; its "
            "cadence (96ms/frame, 480ms whole cycle) is a gate-constrained draft "
            "pending user feel; runtime flipX and the other 20 TS_ANIMS "
            "contracts are untouched",
            "tree2 visible source height is 987 * 21/123 = 168.51px (bottom canvas cap "
            "(256-235)/(1254-1131), per the settled tree2 verification and spec line 60) — "
            "the ~169px prose is CORRECT, not an erratum; table parameters and PNG unchanged",
            "ground material is the derived planar Q overlay, not the source seamless "
            "autotile; terrain repeat quality (possible four-petal mirror / tiling bands) "
            "needs observer judgment — the single Dungeon frame triage pass is not full "
            "scene visual acceptance",
            "boss/enemy art is an explicit visual proxy (Crimson Knight etc.); the package "
            "has no continuous snake/minotaur/dragon bodies",
            "final runtime/visual verification is still pending: full 16-scene visual "
            "regression, UI/animation acceptance and the parent-owned all-writer "
            "validation have not been run; this metadata describes the implementation, "
            "not final validation",
        ],
        "run_sheet": run_sheet_meta,
        "terrain_cliffs": terrain_cliffs_meta,
        "entries": entries,
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

    write_readme(output, trees)
    return manifest


README = """# NLI Preview — v0.2 full replacement (62 outputs)

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

## Verification

```
python3 scripts/check-nli-quality.py \
  --source /Users/uranus/Developer/GitHub/pyquest/assets/NLI_SoftFantasy_ARPG_v0.2 \
  --assets assets/nli-preview --trees snow
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
  are implemented separately in `src`: the `nli02-ground-v2` per-scene ground
  recipe (2026-10-29 material alpha raise: .62/.50/.55/.35/.34/.30 for
  grass/forest/path/water/floor/wall; floor/wall unchanged) over the terrain Q
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
"""


def write_readme(output, trees):
    note = "" if trees is None else f"\n\n(the `--trees {trees}` build flag was accepted for CLI compatibility and ignored; v0.2 produces no snow variant)"
    (Path(output) / "README.md").write_text(README + note)


def main():
    parser = argparse.ArgumentParser(description="Build the v0.2 NLI preview assets")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE,
                        help="read-only NLI_SoftFantasy_ARPG_v0.2 package root")
    parser.add_argument("--output", type=Path, default=None,
                        help="test escape hatch only: fresh non-existing directory under the "
                             "approved opencode temp root (default: this worktree's "
                             "assets/nli-preview)")
    parser.add_argument("--before", type=Path, default=DEFAULT_BEFORE,
                        help="immutable v02-before assets dir (source of the frozen ts_shadow)")
    parser.add_argument("--trees", choices=("keep", "snow"), default=None,
                        help="accepted for CLI compatibility only; ignored (no v0.2 snow variant)")
    args = parser.parse_args()
    source = args.source.resolve()
    before = args.before.resolve()
    if not (source / SRC_PREFIX).is_dir():
        print(f"INPUT_ERROR: expected {SRC_PREFIX} under --source", file=sys.stderr)
        return 2
    worktree_root = Path(__file__).resolve().parent.parent
    try:
        if args.output is None:
            output = validate_output_path(DEFAULT_OUTPUT, worktree_root, source, before,
                                          is_default=True)
        else:
            output = validate_output_path(args.output, worktree_root, source, before,
                                          is_default=False)
        check_ts_shadow_pin(before)
        manifest = build(source, output, before, args.trees)
    except GuardError as exc:
        print(f"OUTPUT_GUARD: {exc}", file=sys.stderr)
        return 2
    print(f"built {manifest['output_count']} entries in {output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
