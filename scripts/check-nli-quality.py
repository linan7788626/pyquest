#!/usr/bin/env python3
"""Independent quality gate for the v0.2 full-replacement asset lane (RED first).

Expectations derive ONLY from the designer spec
docs/superpowers/specs/2026-10-28-nli-v02-full-replacement-design.md (§§3-8, 10)
and the read-only v0.2 package PNGs. This checker never imports the exporter and
never trusts manifest metadata: declared transforms are compared against values
recomputed here from the spec formulas, and output pixels are compared against a
reference resampling rebuilt here from the source PNGs.

Exit codes: 0 pass, 1 assertion failures, 2 invalid inputs.
CLI keeps --trees <keep|snow> for argument compatibility only; v0.2 expectations
never switch back to the old v0.1 source or snow/keep behaviour.

Manifest contract checked (shared lane schema):
  entries with key, url '/nli-preview/<key>.png', size, sha256; art entries
  additionally declare source_image_path (relative to --source:
  'Assets/NLI_SoftFantasy_ARPG/Sprites/...'), source_sha256, native_size,
  source_domain_xyxy (full canvas [0,0,Sw,Sh] for F/C/copy/composite inputs;
  the spec §7 domain for terrain), and sampling:
    mode: 'F' | 'C' | 'terrain' | 'composite' | 'copy' | 'technical'
    F: scale, translate_xy, source_anchor_xy, frame_anchor_xy, method
    C: scale, translate_xy, frame_anchor_xy (key present, value null), method
    composite: inputs = [input dicts in drawing order], each carrying the full
      source fields plus its own F sampling
    copy: no transform; technical: no source fields, no invented provenance
  Top-level: source_version == '0.2.1-npc-elder', output_count == 62,
  technical_retained / runtime_derivatives / limitations stay present.
  v0.1 fields (source, crop_xyxy, mask, rendered_size, offset, source_foot_xy,
  frame_foot_xy, base_key, overlay, ...) must not survive on any entry.

Canonical sampling reference (spec §3 + v02-gate-r.md), implemented here:
  1. premultiply alpha into RGB (8-bit ImageChops.multiply);
  2. zero-pad the premultiplied source where the F/C window falls outside the
     source canvas;
  3. ONE LANCZOS resize of the PREMULTIPLIED data over the window left=(0-tx)/s,
     top=(0-ty)/s, right=(W-tx)/s, bottom=(H-ty)/s — with the raw premultiplied
     bytes relabeled as Pillow mode 'RGBa' (or equivalently resampled per band
     in mode 'L'). An RGBA-mode Image.resize must NOT be used on premultiplied
     data: Pillow >= 11.2 premultiplies/unpremultiplies RGBA around the filter,
     which would apply the alpha weighting twice;
  4. clamp premultiplied RGB to <= alpha;
  5. composite/compare in premultiplied space (no de-premultiply rounding gap).
  The sampling method string must honestly name this (e.g.
  'premult-pad-resize-lanczos') and must never claim 'transform'.

F: s = min(s0, ax/gx, (W-ax)/(Sw-gx), ay/gy, (H-ay)/(Sh-gy)), zero
denominators skipped; t = A - s*G; uniform scale (sx == sy by construction);
all four source-canvas corners land inside the output; registration error
|t + s*G - A| <= 0.5 output px. H(n) = n / (alpha>=8 bbox height of the NEW
source, measured here); L(n) = n / max(Sw, Sh).
C: s = min((W-2)/Sw, (H-2)/Sh); t = ((W-s*Sw)/2, (H-s*Sh)/2) (1 px safety edge).
Terrain (spec §7): domain -> 256^2 premultiplied LANCZOS resize, composite over
base color B0, mosaic P=[C,flipX(C);flipY(C),flipXY(C)]; Q = P for floor/wall,
else Q(x,y) = .65P(x,y) + .35P((y+173)%512,(511-x+91)%512); output 512^2 with
alpha 255; wrap-seam RGB mean diff <= 1.25 * internal adjacent mean diff + 1/255.
7 technical outputs: fire 64^2 fully transparent, ts_shadow 192^2 byte-frozen,
cloud1..5 576x256 fully transparent. 2 landmarks: byte-for-byte copies of the
new-package Sprites PNGs.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageOps, ImageStat

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
sys.dont_write_bytecode = True  # keep scripts/ free of __pycache__ side effects
from nli_paths import runtime_root, source_root

SRC_PREFIX = "Assets/NLI_SoftFantasy_ARPG/Sprites/"
SOURCE_VERSION = "0.2.1-npc-elder"
RESAMPLE = Image.Resampling.LANCZOS

SCALE_TOL = 1e-8          # spec §3: s and t keep at least 9 digits
TRANSLATE_TOL = 1e-6
ANCHOR_TOL = 1e-6
REGISTRATION_MAX = 0.5    # spec §10: registration error <= 0.5 output px
CORNER_EPS = 1e-6
FIDELITY_MAE_MAX = 2.5    # premultiplied 4-channel MAE over the content mask
FIDELITY_MAX_DIFF = 8.0   # premultiplied max channel difference
SEAM_FACTOR = 1.25        # spec §10 repeat/seam metric
SEAM_SLACK = 1 / 255

TS_SHADOW_SHA256 = "4a1da387613e4fb91db3d60a85e16935ba13484e7df3044c954e37a5e131d5dd"
LANDMARK_SHA256 = {
    "castle_medium": "5cc7d4efd37c02fc2e80f85c9e0726826039bb80bda0c196d9b26b9f10dba16a",
    "portal_blue_gold": "a67cd9a34e371cf4e76d96913aff28b63ef9b7fbed986ee43e22b0c14b938ecf",
}

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
    """s0 = n / (alpha>=8 bbox height of the new source), spec §3."""
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

# spec §6/§6.1: key -> (source rel path, (W, H)); full-source centered contain
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

# spec §7: key -> (source rel path, domain (l, t, r, b), base B0 rgb, Q blend?)
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
    "ts_shadow": {"size": (192, 192), "kind": "frozen", "sha256": TS_SHADOW_SHA256},
    **{f"cloud{i}": {"size": (576, 256), "kind": "transparent"} for i in range(1, 6)},
}

EXPECTED_SIZE = {}
for _key, _spec in F_SPEC.items():
    EXPECTED_SIZE[_key] = list(_spec[1])
for _key, _spec in C_SPEC.items():
    EXPECTED_SIZE[_key] = list(_spec[1])
for _key in TERRAIN_SPEC:
    EXPECTED_SIZE[_key] = [512, 512]
for _key in COPY_SPEC:
    EXPECTED_SIZE[_key] = [1254, 1254]
for _key, _spec in COMPOSITE_SPEC.items():
    EXPECTED_SIZE[_key] = list(_spec["size"])
for _key, _spec in TECHNICAL_SPEC.items():
    EXPECTED_SIZE[_key] = list(_spec["size"])

KEYS = set(EXPECTED_SIZE)
assert len(KEYS) == 62, f"spec tables must describe exactly 62 keys, got {len(KEYS)}"

ART_KEYS = KEYS - set(TECHNICAL_SPEC)
V01_FIELDS = ("source", "source_padding", "crop_xyxy", "rendered_size", "offset",
              "mirrored", "opacity", "source_foot_xy", "frame_foot_xy",
              "base_key", "overlay", "mask", "erase_polygons_source_xy")
SOURCE_FIELDS = ("source_image_path", "source_sha256", "native_size", "source_domain_xyxy")


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def premultiply(im):
    r, g, b, a = im.split()
    return Image.merge("RGBA", (ImageChops.multiply(r, a), ImageChops.multiply(g, a),
                                ImageChops.multiply(b, a), a))


def clamp_premult(pm):
    r, g, b, a = pm.split()
    return Image.merge("RGBA", (ImageChops.darker(r, a), ImageChops.darker(g, a),
                                ImageChops.darker(b, a), a))


def premult_composite(top, bottom):
    """top over bottom, premultiplied 8-bit alpha compositing."""
    inv = ImageChops.invert(top.getchannel("A"))
    r, g, b, a = bottom.split()
    scaled = Image.merge("RGBA", (ImageChops.multiply(r, inv), ImageChops.multiply(g, inv),
                                  ImageChops.multiply(b, inv), ImageChops.multiply(a, inv)))
    return ImageChops.add(top, scaled)


def window_sample(pm, s, t, size):
    """One premultiplied LANCZOS resize over the exact inverse-affine window.

    The raw premultiplied bytes are relabeled as Pillow's premultiplied mode
    'RGBa' for the resize: Pillow >= 11.2 resamples RGBA by premultiplying and
    unpremultiplying internally, so an RGBA-mode resize would apply the alpha
    weighting a second time (parent-premult-repro.json). Relabeled 'RGBa'
    bytes are resampled band-wise with exactly one alpha weighting (verified
    bit-identical to per-band mode 'L' resize by scripts/check-nli-sampling.py).
    """
    width, height = size
    left = (0 - t[0]) / s
    top = (0 - t[1]) / s
    right = (width - t[0]) / s
    bottom = (height - t[1]) / s
    pad_l = max(0.0, -left)
    pad_t = max(0.0, -top)
    pad_r = max(0.0, right - pm.width)
    pad_b = max(0.0, bottom - pm.height)
    off_x = off_y = 0
    if pad_l or pad_t or pad_r or pad_b:
        off_x, off_y = math.ceil(pad_l), math.ceil(pad_t)
        canvas = Image.new("RGBA", (pm.width + off_x + math.ceil(pad_r),
                                    pm.height + off_y + math.ceil(pad_b)))
        canvas.paste(pm, (off_x, off_y))
        pm = canvas
    box = (left + off_x, top + off_y, right + off_x, bottom + off_y)
    sampled = Image.merge("RGBa", pm.split()).resize(size, RESAMPLE, box=box)
    return clamp_premult(Image.merge("RGBA", sampled.split()))


def terrain_reference(pm, domain, base, blend):
    """Rebuild the spec §7 terrain output from a premultiplied source image.

    domain -> 256^2 premultiplied LANCZOS resize (raw bytes relabeled 'RGBa',
    see window_sample), composite over the base color B0, mosaic
    P = [C, flipX(C); flipY(C), flipXY(C)], then Q = P (floor/wall) or the
    0.65/0.35 torus blend (grass/forest/path/water). Returns opaque 512^2 RGBA.
    """
    raw = Image.merge("RGBa", pm.split()).resize((256, 256), RESAMPLE, box=domain)
    c_pm = clamp_premult(Image.merge("RGBA", raw.split()))
    inv = ImageChops.invert(c_pm.getchannel("A"))
    layer = Image.merge("RGBA", tuple(
        [ImageChops.multiply(Image.new("L", (256, 256), v), inv) for v in base] + [inv]))
    c_opaque = ImageChops.add(c_pm, layer)
    r, g, b = c_opaque.split()[:3]
    material = Image.merge("RGBA", (r, g, b, Image.new("L", (256, 256), 255)))
    p = Image.new("RGBA", (512, 512))
    p.paste(material, (0, 0))
    p.paste(ImageOps.mirror(material), (256, 0))
    p.paste(ImageOps.flip(material), (0, 256))
    p.paste(ImageOps.mirror(ImageOps.flip(material)), (256, 256))
    if blend:
        secondary = torus_roll(ImageOps.mirror(p.transpose(Image.Transpose.TRANSPOSE)), 91, -173)
        return Image.blend(p, secondary, 0.35)
    return p


def torus_roll(im, sx, sy):
    n = im.width
    out = Image.new(im.mode, im.size)
    sx %= n
    sy %= n
    for dx in (sx, sx - n):
        for dy in (sy, sy - n):
            out.paste(im, (dx, dy))
    return out


def close(actual, expected, tol):
    return (isinstance(actual, (int, float)) and isinstance(expected, (int, float))
            and abs(float(actual) - float(expected)) <= tol)


class Checker:
    def __init__(self, source, assets, trees):
        self.source, self.assets, self.trees = source, assets, trees
        self.results, self.measurements = [], {}
        self.entries, self.images = {}, {}
        self._sources, self._premult, self._b8 = {}, {}, {}

    def check(self, ok, key, name, actual=None, expected=None):
        self.results.append(dict(ok=bool(ok), key=key, assertion=name,
                                 actual=actual, expected=expected))

    def decode(self, path):
        with Image.open(path) as im:
            if im.format != "PNG":
                raise ValueError(f"Not a PNG: {path}")
            im.load()
            if "A" not in im.getbands():
                raise ValueError(f"Missing PNG alpha channel: {path}")
            return im.convert("RGBA")

    def source_image(self, rel):
        """Decode + hash a read-only v0.2 package sprite, cached."""
        if rel not in self._sources:
            path = (self.source / SRC_PREFIX / (rel + ".png")).resolve()
            if not path.is_relative_to(self.source.resolve()):
                raise ValueError(f"Source escapes package: {rel}")
            self._sources[rel] = (path, self.decode(path), digest(path))
        return self._sources[rel]

    def premult(self, rel):
        if rel not in self._premult:
            self._premult[rel] = premultiply(self.source_image(rel)[1])
        return self._premult[rel]

    def b8(self, rel):
        if rel not in self._b8:
            im = self.source_image(rel)[1]
            self._b8[rel] = im.getchannel("A").point(
                lambda v: 255 if v >= 8 else 0).getbbox()
        return self._b8[rel]

    # ---- spec §3 transforms ----
    def s0_value(self, s0, src_size, b8):
        if isinstance(s0, tuple):
            if s0[0] == "H":
                return s0[1] / (b8[3] - b8[1])
            return s0[1] / max(src_size)
        return float(s0)

    def f_transform(self, spec):
        _, size, g, a, s0 = spec
        src_size = self.source_image(spec[0])[1].size
        s0 = self.s0_value(s0, src_size, self.b8(spec[0]))
        gx, gy = g
        ax, ay = a
        width, height = size
        caps = []
        for num, den in ((ax, gx), (width - ax, src_size[0] - gx),
                         (ay, gy), (height - ay, src_size[1] - gy)):
            if den != 0:
                caps.append(num / den)
        s = min([s0] + caps)
        return s, (ax - s * gx, ay - s * gy)

    def c_transform(self, size, rel):
        src_size = self.source_image(rel)[1].size
        s = min((size[0] - 2) / src_size[0], (size[1] - 2) / src_size[1])
        return s, ((size[0] - s * src_size[0]) / 2, (size[1] - s * src_size[1]) / 2)

    # ---- generic entry checks ----
    def check_common(self, key, entry, path):
        im = self.decode(path)
        self.images[key] = im
        self.check(list(im.size) == EXPECTED_SIZE[key] == entry.get("size"), key,
                   "frame dimensions equal the v0.1 baseline / spec table (frozen runtime contracts)",
                   {"decoded": list(im.size), "declared": entry.get("size")},
                   EXPECTED_SIZE[key])
        self.check(entry.get("url") == f"/nli-preview/{key}.png", key,
                   "url keeps the runtime contract", entry.get("url"), f"/nli-preview/{key}.png")
        self.check(digest(path) == entry.get("sha256"), key,
                   "manifest sha256 matches actual PNG bytes", digest(path), entry.get("sha256"))
        stale = sorted(f for f in V01_FIELDS if f in entry)
        self.check(not stale, key, "no v0.1 source/mask/crop schema fields survive", stale, [])
        return im

    def check_source_fields(self, key, holder, rel, domain=None):
        """holder: entry dict or composite input dict; domain: expected xyxy."""
        declared = holder.get("source_image_path")
        expected_path = SRC_PREFIX + rel + ".png"
        self.check(declared == expected_path, key,
                   "declares the spec-mapped v0.2 source image", declared, expected_path)
        path, im, sha = self.source_image(rel)
        self.check(holder.get("source_sha256") == sha, key,
                   "source hash equals the read-only v0.2 package PNG",
                   holder.get("source_sha256"), sha)
        self.check(holder.get("native_size") == list(im.size), key,
                   "native_size equals the decoded source size",
                   holder.get("native_size"), list(im.size))
        want = list(domain) if domain else [0, 0, im.width, im.height]
        self.check(holder.get("source_domain_xyxy") == want, key,
                   "complete source domain declared (full canvas, no v0.1 crop fiction)",
                   holder.get("source_domain_xyxy"), want)
        return im

    def check_method(self, key, sampling):
        method = sampling.get("method") if isinstance(sampling, dict) else None
        ok = isinstance(method, str) and "lanczos" in method.lower() and "transform" not in method.lower()
        self.check(ok, key, "sampling method honestly names the pad+resize+LANCZOS pipeline (never 'transform')",
                   method, "e.g. 'premult-pad-resize-lanczos'")

    def check_declared_transform(self, key, sampling, mode, s, t, g=None, a=None):
        if not isinstance(sampling, dict):
            self.check(False, key, "declares a sampling object", type(sampling).__name__, "dict")
            return None, None
        self.check(sampling.get("mode") == mode, key, f"sampling mode is '{mode}'",
                   sampling.get("mode"), mode)
        self.check_method(key, sampling)
        self.check(close(sampling.get("scale"), s, SCALE_TOL), key,
                   "declared scale equals the spec-recomputed uniform scale (sx == sy)",
                   sampling.get("scale"), round(s, 9))
        declared_t = sampling.get("translate_xy")
        ok = (isinstance(declared_t, list) and len(declared_t) == 2 and
              close(declared_t[0], t[0], TRANSLATE_TOL) and close(declared_t[1], t[1], TRANSLATE_TOL))
        self.check(ok, key, "declared translate_xy equals the spec-recomputed t = A - s*G",
                   declared_t, [round(t[0], 9), round(t[1], 9)])
        if g is not None:
            declared_g = sampling.get("source_anchor_xy")
            ok = (isinstance(declared_g, list) and len(declared_g) == 2 and
                  close(declared_g[0], g[0], ANCHOR_TOL) and close(declared_g[1], g[1], ANCHOR_TOL))
            self.check(ok, key, "declared source_anchor_xy equals spec G", declared_g, list(g))
        # a is None means the mode must carry frame_anchor_xy = null (C entries);
        # the key itself must be present (schema), not merely absent.
        declared_a = sampling.get("frame_anchor_xy")
        if a is None:
            self.check("frame_anchor_xy" in sampling and declared_a is None, key,
                       "frame_anchor_xy is present and null for C entries",
                       {"present": "frame_anchor_xy" in sampling, "value": declared_a},
                       {"present": True, "value": None})
        else:
            ok = (isinstance(declared_a, list) and len(declared_a) == 2 and
                  close(declared_a[0], a[0], ANCHOR_TOL) and close(declared_a[1], a[1], ANCHOR_TOL))
            self.check(ok, key, "declared frame_anchor_xy equals spec A", declared_a, list(a))
        if isinstance(declared_t, list) and len(declared_t) == 2 and close(sampling.get("scale"), s, SCALE_TOL):
            return float(sampling["scale"]), (float(declared_t[0]), float(declared_t[1]))
        return None, None

    def check_geometry(self, key, declared_s, declared_t, spec):
        """Corner containment + registration error from the declared transform."""
        _, size, g, a, _ = spec
        src_size = self.source_image(spec[0])[1].size
        if declared_s is None or declared_t is None:
            self.check(False, key, "declared transform is testable for geometry", [declared_s, declared_t])
            return
        width, height = size
        corners = {"(0,0)": (0, 0), "(Sw,0)": (src_size[0], 0),
                   "(0,Sh)": (0, src_size[1]), "(Sw,Sh)": (src_size[0], src_size[1])}
        bad = []
        for name, (cx, cy) in corners.items():
            x = declared_t[0] + declared_s * cx
            y = declared_t[1] + declared_s * cy
            if not (-CORNER_EPS <= x <= width + CORNER_EPS and -CORNER_EPS <= y <= height + CORNER_EPS):
                bad.append({name: [round(x, 6), round(y, 6)]})
        self.check(not bad, key, "all four source-canvas corners transform inside the output frame",
                   bad, f"inside [0,{width}]x[0,{height}]")
        reg = [abs(declared_t[0] + declared_s * g[0] - a[0]),
               abs(declared_t[1] + declared_s * g[1] - a[1])]
        self.check(max(reg) <= REGISTRATION_MAX, key,
                   "anchor registration error <= 0.5 output px",
                   [round(v, 6) for v in reg], {"max": REGISTRATION_MAX})

    def check_fidelity(self, key, reference_pm, actual, label):
        actual_pm = premultiply(actual)
        mask = ImageChops.lighter(
            reference_pm.getchannel("A").point(lambda v: 255 if v >= 8 else 0),
            actual_pm.getchannel("A").point(lambda v: 255 if v >= 8 else 0))
        count = mask.histogram()[255]
        diff = ImageChops.difference(reference_pm, actual_pm)
        mae = sum(ImageStat.Stat(diff, mask).mean) / 4 if count else 255.0
        peak = max(high for low, high in diff.getextrema())
        self.measurements[key] = {"fidelity_" + label: {
            "content_px": count, "premult_mae_255": round(mae, 4), "premult_max_diff": peak}}
        self.check(count > 0, key, f"pixel fidelity ({label}): output has the resampled subject",
                   count, {"at_least": 1})
        self.check(mae <= FIDELITY_MAE_MAX, key,
                   f"pixel fidelity ({label}): premultiplied MAE vs independent reference",
                   round(mae, 4), {"max": FIDELITY_MAE_MAX})
        self.check(peak <= FIDELITY_MAX_DIFF, key,
                   f"pixel fidelity ({label}): premultiplied max channel diff vs reference",
                   peak, {"max": FIDELITY_MAX_DIFF})

    # ---- per-mode checks ----
    def check_f_entry(self, key, entry, im):
        spec = F_SPEC[key]
        s, t = self.f_transform(spec)
        self.check_source_fields(key, entry, spec[0])
        sampling = entry.get("sampling")
        declared_s, declared_t = self.check_declared_transform(
            key, sampling, "F", s, t, g=spec[2], a=spec[3])
        self.check_geometry(key, declared_s, declared_t, spec)
        reference = window_sample(self.premult(spec[0]), s, t, spec[1])
        self.check_fidelity(key, reference, im, "F")

    def check_c_entry(self, key, entry, im):
        rel, size = C_SPEC[key]
        s, t = self.c_transform(size, rel)
        self.check_source_fields(key, entry, rel)
        sampling = entry.get("sampling")
        self.check_declared_transform(key, sampling, "C", s, t, a=None)
        reference = window_sample(self.premult(rel), s, t, size)
        self.check_fidelity(key, reference, im, "C")

    def check_terrain_entry(self, key, entry, im):
        rel, domain, base, blend = TERRAIN_SPEC[key]
        self.check_source_fields(key, entry, rel, domain=domain)
        sampling = entry.get("sampling")
        if isinstance(sampling, dict):
            self.check(sampling.get("mode") == "terrain", key, "sampling mode is 'terrain'",
                       sampling.get("mode"), "terrain")
            self.check_method(key, sampling)
        else:
            self.check(False, key, "declares a sampling object", type(sampling).__name__, "dict")
        alpha = im.getchannel("A")
        self.check(alpha.getextrema() == (255, 255), key,
                   "terrain output is fully opaque (alpha 255)", alpha.getextrema(), (255, 255))
        # spec §7 recipe rebuilt here (terrain_reference applies the single-alpha
        # weighting 'RGBa' resize over the declared domain)
        q = terrain_reference(self.premult(rel), domain, base, blend)
        self.check_fidelity(key, premultiply(q), im, "terrain")
        self.check_terrain_seams(key, im)

    def check_terrain_seams(self, key, im):
        rgb = im.convert("RGB")
        dx = ImageChops.difference(rgb, torus_roll(rgb, 1, 0))
        dy = ImageChops.difference(rgb, torus_roll(rgb, 0, 1))
        col_wrap = sum(ImageStat.Stat(dx.crop((0, 0, 1, 512))).mean) / 3
        col_inner = sum(ImageStat.Stat(dx.crop((1, 0, 512, 512))).mean) / 3
        row_wrap = sum(ImageStat.Stat(dy.crop((0, 0, 512, 1))).mean) / 3
        row_inner = sum(ImageStat.Stat(dy.crop((0, 1, 512, 512))).mean) / 3
        limit_col = SEAM_FACTOR * col_inner + SEAM_SLACK
        limit_row = SEAM_FACTOR * row_inner + SEAM_SLACK
        self.measurements.setdefault(key, {})["seam_rgb"] = {
            "col_wrap": round(col_wrap, 4), "col_inner": round(col_inner, 4),
            "row_wrap": round(row_wrap, 4), "row_inner": round(row_inner, 4)}
        self.check(col_wrap <= limit_col, key,
                   "terrain repeat: wrap column seam within 1.25x internal diff + 1/255",
                   round(col_wrap, 4), {"limit": round(limit_col, 4)})
        self.check(row_wrap <= limit_row, key,
                   "terrain repeat: wrap row seam within 1.25x internal diff + 1/255",
                   round(row_wrap, 4), {"limit": round(limit_row, 4)})

    def check_copy_entry(self, key, entry, im, path):
        rel = COPY_SPEC[key]
        src_path, src_im, sha = self.source_image(rel)
        self.check_source_fields(key, entry, rel)
        self.check(sha == LANDMARK_SHA256[key], key,
                   "landmark source hash equals the pinned v0.2 package bytes",
                   sha, LANDMARK_SHA256[key])
        sampling = entry.get("sampling")
        if isinstance(sampling, dict):
            self.check(sampling.get("mode") == "copy", key, "sampling mode is 'copy'",
                       sampling.get("mode"), "copy")
        else:
            self.check(False, key, "declares a sampling object", type(sampling).__name__, "dict")
        self.check(path.read_bytes() == src_path.read_bytes(), key,
                   "landmark output is a byte-for-byte copy (no F/C, no alpha edit, no flip)")

    def check_composite_entry(self, key, entry, im):
        spec = COMPOSITE_SPEC[key]
        sampling = entry.get("sampling")
        inputs = sampling.get("inputs") if isinstance(sampling, dict) else None
        if not isinstance(sampling, dict):
            self.check(False, key, "declares a sampling object", type(sampling).__name__, "dict")
            return
        self.check(sampling.get("mode") == "composite", key, "sampling mode is 'composite'",
                   sampling.get("mode"), "composite")
        if not isinstance(inputs, list) or len(inputs) != len(spec["inputs"]):
            self.check(False, key, "composite inputs listed in drawing order",
                       inputs, [f[0] for f in spec["inputs"]])
            return
        references = []
        for index, (in_spec, in_entry) in enumerate(zip(spec["inputs"], inputs)):
            sub_key = f"{key}/input{index}"
            rel = in_spec[0]
            s, t = self.f_transform(in_spec)
            self.check_source_fields(sub_key, in_entry, rel)
            self.check_declared_transform(sub_key, in_entry.get("sampling"), "F", s, t,
                                          g=in_spec[2], a=in_spec[3])
            declared_s = (in_entry.get("sampling") or {}).get("scale") \
                if isinstance(in_entry.get("sampling"), dict) else None
            self.check(close(declared_s, s, SCALE_TOL), sub_key,
                       "composite input declared scale equals recomputed scale",
                       declared_s, round(s, 9))
            references.append(window_sample(self.premult(rel), s, t, in_spec[1]))
        # Drawing order: fence first (bottom), Stone_Gate second (top).
        combined = premult_composite(references[1], references[0])
        self.check_fidelity(key, combined, im, "composite")

    def check_technical_entry(self, key, entry, im, path):
        spec = TECHNICAL_SPEC[key]
        sampling = entry.get("sampling")
        if isinstance(sampling, dict):
            self.check(sampling.get("mode") == "technical", key, "sampling mode is 'technical'",
                       sampling.get("mode"), "technical")
        else:
            self.check(False, key, "declares a sampling object", type(sampling).__name__, "dict")
        claimed = sorted(f for f in SOURCE_FIELDS if f in entry)
        self.check(not claimed, key,
                   "technical output claims no invented package provenance", claimed, [])
        if spec["kind"] == "transparent":
            extrema = im.getchannel("A").getextrema()
            self.check(extrema == (0, 0), key,
                       "compatibility canvas is fully transparent", extrema, (0, 0))
        elif spec["kind"] == "frozen":
            self.check(digest(path) == spec["sha256"], key,
                       "ts_shadow stays byte-frozen (unchanged technical ellipse)",
                       digest(path), spec["sha256"])

    # ---- driver ----
    def check_key(self, key):
        entry = self.entries.get(key)
        if entry is None or not isinstance(entry, dict):
            self.check(False, key, "manifest entry present in the exact 62-key v0.2 set")
            return
        path = self.assets / f"{key}.png"
        if not path.is_file():
            self.check(False, key, "output PNG file present", str(path), "an existing PNG")
            return
        im = self.check_common(key, entry, path)
        if key in F_SPEC:
            self.check_f_entry(key, entry, im)
        elif key in C_SPEC:
            self.check_c_entry(key, entry, im)
        elif key in TERRAIN_SPEC:
            self.check_terrain_entry(key, entry, im)
        elif key in COPY_SPEC:
            self.check_copy_entry(key, entry, im, path)
        elif key in COMPOSITE_SPEC:
            self.check_composite_entry(key, entry, im)
        elif key in TECHNICAL_SPEC:
            self.check_technical_entry(key, entry, im, path)

    def run(self):
        manifest = json.loads((self.assets / "manifest.json").read_text())
        entries = manifest.get("entries")
        if not isinstance(entries, list):
            raise ValueError("manifest.entries must be a list")
        keys = [e.get("key") for e in entries if isinstance(e, dict)]
        self.entries = {e["key"]: e for e in entries if isinstance(e, dict) and "key" in e}
        self.check(len(keys) == len(set(keys)) == 62 and set(keys) == KEYS, "manifest",
                   "exact 62-key set (55 legacy keys + 7 WorldMap derivatives)",
                   {"actual": sorted(set(keys) - KEYS), "missing": sorted(KEYS - set(keys)),
                    "count": len(set(keys))}, {"expected": sorted(KEYS), "count": 62})
        self.check(manifest.get("source_version") == SOURCE_VERSION, "manifest",
                   "source_version records the v0.2 package", manifest.get("source_version"), SOURCE_VERSION)
        self.check(manifest.get("output_count") == 62, "manifest", "output_count",
                   manifest.get("output_count"), 62)
        for field, kind in (("technical_retained", list), ("runtime_derivatives", list),
                            ("limitations", list)):
            self.check(isinstance(manifest.get(field), kind), "manifest",
                       f"top-level {field} stays present and truthful",
                       type(manifest.get(field)).__name__, kind.__name__)
        paths = {p.stem for p in self.assets.glob("*.png")}
        self.check(paths == KEYS, "assets", "exactly the 62 expected PNG files",
                   {"extra": sorted(paths - KEYS), "missing": sorted(KEYS - paths)},
                   {"expected": sorted(KEYS)})
        for key in sorted(KEYS):
            try:
                self.check_key(key)
            except (OSError, ValueError, KeyError, TypeError, ZeroDivisionError) as exc:
                self.check(False, key, "entry is evaluable by the independent checker", repr(exc))


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--source", type=Path, default=None,
                        help="read-only NLI_SoftFantasy_ARPG_v0.2 package root (default: "
                             "$PYQUEST_ASSET_ROOT or the sibling soft-fantasy-arpg-assets "
                             "per scripts/lib/nli_paths.py)")
    parser.add_argument("--assets", type=Path, default=None,
                        help="derived PNG/manifest directory (default: "
                             "public/nli-preview per scripts/lib/nli_paths.py)")
    parser.add_argument("--trees", choices=("keep", "snow"), default="snow",
                        help="accepted for CLI compatibility only; v0.2 expectations ignore it")
    args = parser.parse_args()
    if args.source is None:
        args.source = source_root()
    if args.assets is None:
        args.assets = runtime_root()
    source, assets = args.source.resolve(), args.assets.resolve()
    if not (source / SRC_PREFIX).is_dir():
        print(json.dumps({"status": "INPUT_ERROR",
                          "error": f"Expected {SRC_PREFIX} under --source"}, indent=2))
        return 2
    if not (assets / "manifest.json").is_file():
        print(json.dumps({"status": "INPUT_ERROR",
                          "error": "Expected manifest.json under --assets"}, indent=2))
        return 2
    checker = Checker(source, assets, args.trees)
    try:
        checker.run()
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(json.dumps({"status": "INPUT_ERROR", "error": str(exc)}, indent=2))
        return 2
    failures = [r for r in checker.results if not r["ok"]]
    print(json.dumps({"status": "FAIL" if failures else "PASS",
                      "source_version": SOURCE_VERSION, "trees": args.trees,
                      "trees_note": "flag accepted for CLI compatibility; v0.2 expectations ignore it",
                      "checks": len(checker.results),
                      "passed": len(checker.results) - len(failures),
                      "failed": len(failures), "failures": failures,
                      "measurements": checker.measurements, "results": checker.results},
                     indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
