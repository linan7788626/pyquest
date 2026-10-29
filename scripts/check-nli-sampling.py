#!/usr/bin/env python3
"""Independent sampling self-tests for check-nli-quality.py (TDD, fix1).

Root cause these tests pin down (parent-premult-repro.json): Pillow >= 11.2
resamples RGBA images by premultiplying, filtering and unpremultiplying
internally, so feeding manually premultiplied RGBA into Image.resize applies
the alpha weighting TWICE. The checker's window_sample() and the terrain
domain resize must therefore resample the raw premultiplied bytes without a
second alpha weighting (relabel as Pillow's premultiplied mode 'RGBa', or
resample per band in mode 'L' — both verified bit-identical).

Every expected value below is a hand-derived literal (derivation in comments)
or an explicit schema rule. No expected value is produced by the checker's own
helpers. Run: python3 scripts/check-nli-sampling.py   (exit 0 pass / 1 fail)
"""
import sys

sys.dont_write_bytecode = True  # keep scripts/ free of __pycache__ side effects

import importlib.util
import warnings
from pathlib import Path

from PIL import Image

warnings.filterwarnings("ignore", category=DeprecationWarning)

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("check_nli_quality", HERE / "check-nli-quality.py")
cq = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cq)

RESULTS = []


def check(name, ok, detail=""):
    RESULTS.append(bool(ok))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))


def literal_image(w, h, pixel):
    im = Image.new("RGBA", (w, h))
    im.putdata([pixel] * (w * h))
    return im


# --- premultiplied resampling -------------------------------------------------

def t_half_alpha_literal():
    # parent-premult-repro case. Premultiplied 2x2 rows [(255,0,0,255),
    # (0,0,128,128)] repeated; 0.5 scale, t=(0,0) -> one output pixel averaging
    # the premultiplied bands: R=255/2=128, B=128/2=64, A=(255+128)/2=192.
    # Pillow's RGBA-mode double premultiply instead yields (170,0,42,192).
    pm = Image.new("RGBA", (2, 2))
    pm.putdata([(255, 0, 0, 255), (0, 0, 128, 128), (255, 0, 0, 255), (0, 0, 128, 128)])
    got = cq.window_sample(pm, 0.5, (0, 0), (1, 1)).getpixel((0, 0))
    check("window_sample half-alpha 2x2->1x1 equals literal (128,0,64,192) (single alpha weighting)",
          got == (128, 0, 64, 192), f"got {got}")


def t_fractional_interior_literal():
    # uniform premultiplied source + fractional box fully inside: the LANCZOS
    # weights are normalized to 1, so the output pixel is exactly the input.
    pm = literal_image(4, 4, (100, 150, 200, 255))
    # s=2/3, t=(-5/6,-5/6) -> window = (1.25, 1.25, 2.75, 2.75)
    got = cq.window_sample(pm, 2 / 3, (-5 / 6, -5 / 6), (1, 1)).getpixel((0, 0))
    check("fractional window fully inside a uniform source resamples exactly",
          got == (100, 150, 200, 255), f"got {got}")


def t_fractional_padded_invariants():
    # s=1, t=(2.25,-3.5) on a 32x32 canvas -> window (-2.25, 3.5, 29.75, 28.5):
    # fractional box crossing the left edge (zero-padded). Output pixel (16,16)
    # maps to source (13.75, 19.5) whose kernel support lies fully inside the
    # uniform canvas -> exact color; padded regions must stay pure zero alpha.
    pm = literal_image(32, 32, (200, 100, 50, 255))
    out = cq.window_sample(pm, 1.0, (2.25, -3.5), (32, 32))
    center = out.getpixel((16, 16))
    data = list(out.getdata())
    bad = [p for p in data if p[0] > p[3] or p[1] > p[3] or p[2] > p[3]]
    leak = [p for p in data if p[3] == 0 and (p[0] or p[1] or p[2])]
    ok = center == (200, 100, 50, 255) and not bad and not leak
    check("fractional padded window: interior exact, zero-pad stays transparent, RGB<=alpha everywhere",
          ok, f"center={center}, rgb>alpha={len(bad)}, transparent-rgb leaks={len(leak)}")


def t_padded_far_pixel():
    # 1x1 source blown up to 16x16: pixel (15,15) lies far beyond the LANCZOS
    # support of the window -> must be exactly (0,0,0,0) (zero-pad, no RGB
    # pollution from the unpremultiplied-looking source).
    pm = Image.new("RGBA", (1, 1), (200, 100, 50, 255))
    out = cq.window_sample(pm, 1.0, (0, 0), (16, 16))
    got = out.getpixel((15, 15))
    check("padded window far pixel is exactly fully transparent", got == (0, 0, 0, 0),
          f"got {got}")


# --- terrain recipe (spec §7) --------------------------------------------------

def _terrain(name, pm, domain, base, blend, points, expected, note):
    if not hasattr(cq, "terrain_reference"):
        check(name, False, "checker is missing terrain_reference()")
        return
    q = cq.terrain_reference(pm, domain, base, blend)
    got = [q.getpixel(p) for p in points]
    check(name, all(g == expected for g in got), f"{note}; got {got[:2]}")


def t_terrain_transparent_base():
    # fully transparent source: c_opaque = base * 1 -> uniform base color,
    # and blending/rolling a uniform image changes nothing.
    _terrain("terrain: fully transparent source composites to the base color (blend on)",
             literal_image(8, 8, (0, 0, 0, 0)), (0, 0, 8, 8), (125, 146, 88), True,
             ((0, 0), (511, 511), (256, 256), (91, 173)), (125, 146, 88, 255),
             "expected (125,146,88,255) everywhere")


def t_terrain_opaque_uniform():
    # fully opaque uniform source: the base contributes nothing.
    _terrain("terrain: fully opaque uniform source keeps its exact color",
             literal_image(8, 8, (10, 20, 30, 255)), (0, 0, 8, 8), (125, 146, 88), True,
             ((0, 0), (128, 384), (511, 511)), (10, 20, 30, 255),
             "expected (10,20,30,255) everywhere")


def t_terrain_half_alpha_discriminator():
    # uniform premultiplied (0,0,128,128): single-weighting resize keeps B=128,
    # then material over white base: inv=127, RGB = c_pm + 255*127/255 = (127,127,255).
    # The double-premultiply bug resizes to B=127 -> material B=254 != 255.
    _terrain("terrain domain resize keeps exactly one alpha weighting (half-alpha literal)",
             literal_image(512, 512, (0, 0, 128, 128)), (0, 0, 512, 512), (255, 255, 255), False,
             ((0, 0), (100, 200), (511, 511)), (127, 127, 255, 255),
             "expected (127,127,255,255) everywhere")


def t_terrain_mosaic_order():
    # 512x512 source with 4 distinct opaque quadrants (A TL, B TR, C BL, D BR)
    # downscaled to the 256x256 material; P = [C, flipX(C); flipY(C), flipXY(C)].
    # Sampled 63px inside each material quadrant, far beyond LANCZOS support.
    pm = Image.new("RGBA", (512, 512))
    data = []
    for y in range(512):
        for x in range(512):
            if y < 256:
                data.append((200, 50, 50, 255) if x < 256 else (50, 200, 50, 255))
            else:
                data.append((50, 50, 200, 255) if x < 256 else (200, 200, 50, 255))
    pm.putdata(data)
    if not hasattr(cq, "terrain_reference"):
        check("terrain mosaic quadrant drawing order", False, "checker is missing terrain_reference()")
        return
    q = cq.terrain_reference(pm, (0, 0, 512, 512), (0, 0, 0), False)
    got = (q.getpixel((64, 64)), q.getpixel((320, 64)), q.getpixel((64, 320)), q.getpixel((320, 320)))
    want = ((200, 50, 50, 255), (50, 200, 50, 255), (50, 50, 200, 255), (200, 200, 50, 255))
    check("terrain mosaic: P quadrants are [C, flipX(C); flipY(C), flipXY(C)]",
          got == want, f"got {got}")


def t_torus_roll_literal():
    im = Image.new("RGBA", (2, 2))
    im.putdata([(10, 0, 0, 255), (0, 20, 0, 255), (0, 0, 30, 255), (40, 40, 40, 255)])
    got = list(cq.torus_roll(im, 1, 0).getdata())
    want = [(0, 20, 0, 255), (10, 0, 0, 255), (40, 40, 40, 255), (0, 0, 30, 255)]
    check("torus_roll shifts content by (sx, sy) modulo n", got == want, f"got {got}")


# --- C-mode frame_anchor_xy schema gap ----------------------------------------

def t_c_anchor_schema():
    ck = cq.Checker(Path("/nonexistent-source"), Path("/nonexistent-assets"), "snow")
    method = "premult-pad-resize-lanczos"

    def fails_for(sampling, mode, a):
        ck.results = []
        ck.check_declared_transform("t_key", sampling, mode, 0.5, (1.0, 2.0), g=None, a=a)
        return [r["assertion"] for r in ck.results if not r["ok"]]

    check("C mode: frame_anchor_xy null passes all transform assertions",
          fails_for({"mode": "C", "scale": 0.5, "translate_xy": [1.0, 2.0],
                     "frame_anchor_xy": None, "method": method}, "C", None) == [])
    missing = fails_for({"mode": "C", "scale": 0.5, "translate_xy": [1.0, 2.0],
                         "method": method}, "C", None)
    check("C mode: missing frame_anchor_xy is rejected",
          any("frame_anchor_xy is present and null" in x for x in missing), str(missing))
    nonnull = fails_for({"mode": "C", "scale": 0.5, "translate_xy": [1.0, 2.0],
                         "frame_anchor_xy": [32, 32], "method": method}, "C", None)
    check("C mode: non-null frame_anchor_xy is rejected",
          any("frame_anchor_xy is present and null" in x for x in nonnull), str(nonnull))
    check("F mode: correct frame_anchor_xy still passes",
          fails_for({"mode": "F", "scale": 0.5, "translate_xy": [1.0, 2.0],
                     "frame_anchor_xy": [96, 136], "method": method}, "F", (96, 136)) == [])
    fbad = fails_for({"mode": "F", "scale": 0.5, "translate_xy": [1.0, 2.0],
                      "frame_anchor_xy": [96, 136], "method": method}, "F", (96, 137))
    check("F mode: wrong frame_anchor_xy still fails",
          any("frame_anchor_xy equals spec A" in x for x in fbad), str(fbad))


TESTS = (
    t_half_alpha_literal,
    t_fractional_interior_literal,
    t_fractional_padded_invariants,
    t_padded_far_pixel,
    t_terrain_transparent_base,
    t_terrain_opaque_uniform,
    t_terrain_half_alpha_discriminator,
    t_terrain_mosaic_order,
    t_torus_roll_literal,
    t_c_anchor_schema,
)


def main():
    for test in TESTS:
        try:
            test()
        except Exception as exc:  # a crashing test is a failing test
            check(f"{test.__name__} runs without crashing", False, repr(exc))
    failed = RESULTS.count(False)
    print(f"\ncheck-nli-sampling: {len(RESULTS) - failed}/{len(RESULTS)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
