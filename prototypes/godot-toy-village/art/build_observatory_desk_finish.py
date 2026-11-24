"""Craft workstation dressing for the porch-to-desk visual pass."""

import math
from pathlib import Path
import sys

import bmesh
import bpy

ART = Path(__file__).resolve().parent
sys.path.insert(0, str(ART))
from build_courtyard import blender, box, clay, export_groups, rail, spindle


def clay_sheet(name, outline, material, thickness):
    mesh = bpy.data.meshes.new(name)
    vertices, faces = outline
    mesh.from_pydata([blender(point) for point in vertices], [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    piece = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(piece)
    piece.data.materials.append(material)
    shell = piece.modifiers.new("Rounded clay sheet edge", "SOLIDIFY")
    shell.thickness = thickness
    bevel = piece.modifiers.new("Soft edge", "BEVEL")
    bevel.width = thickness * .38
    bevel.segments = 3
    for face in mesh.polygons:
        face.use_smooth = True


def notebook(palette):
    center_x, center_z = 2.056, -2.480

    def page_point(x, z, above=0.0):
        # A slight arch at the binding keeps the spread from reading like a decal.
        curve = .025 * math.exp(-abs(x) * 15.0) + .011 * (abs(x) / .230) ** 2
        return center_x + x, 1.211 + curve + above, center_z + z

    for sign in (-1, 1):
        vertices = [page_point(sign * x, z)
                    for x in (.008, .042, .085, .135, .185, .226)
                    for z in (-.153, -.051, .051, .153)]
        faces = [(r * 4 + c, (r + 1) * 4 + c, (r + 1) * 4 + c + 1, r * 4 + c + 1)
                 for r in range(5) for c in range(3)]
        if sign < 0:
            faces = [tuple(reversed(face)) for face in faces]
        clay_sheet("Hand-shaped observing notebook spread", (vertices, faces),
                   palette["paper" if sign < 0 else "paper_light"], .008)

    # A constellation sketch and field notes use inset hand-painted-looking marks.
    pattern = [(-.184, .052), (-.131, -.068), (-.088, .001), (-.039, -.039)]
    for x, z in pattern:
        spindle("Notebook sky plot mark", page_point(x, z, .004), (.008, .008, .002), palette["ink"])
    for start, end in zip(pattern, pattern[1:]):
        rail("Notebook sky plot line", page_point(*start, .003), page_point(*end, .003),
             .005, .003, palette["ink"], .001)
    for z, end in [(-.089, .181), (-.048, .193), (-.007, .145), (.047, .188), (.089, .105)]:
        rail("Observing field note", page_point(.047, z, .004), page_point(end, z, .004),
             .007, .004, palette["ink"], .001)

    rail("Notebook leather bookmark", (2.047, 1.227, -2.344), (2.055, 1.208, -2.261),
         .026, .010, palette["leather"], .004)


def desk_tools(palette):
    # Put all objects on the clear, right-hand front corner of the existing desk.
    center_x = 3.116
    vertices = []
    for row in range(9):
        z = -2.419 + row * .0574
        for column in range(9):
            u = column / 8.0
            x = center_x + (u - .5) * .367 + .009 * math.sin(row * .55 + u * 4)
            fold = .009 * math.sin(u * 3.5 * math.pi + row * .36)
            overhang = max(0.0, (z + 2.044) / .084)
            vertices.append((x, 1.105 + fold - .124 * overhang ** 2.4, z))
    faces = [(r * 9 + c, (r + 1) * 9 + c, (r + 1) * 9 + c + 1, r * 9 + c + 1)
             for r in range(8) for c in range(8)]
    clay_sheet("Folded linen polishing cloth", (vertices, faces), palette["cloth"], .014)

    box("Rounded eyepiece resting tray", (3.043, 1.108, -2.365), (.28, .050, .165),
        palette["leather"], .022)
    origin = (3.050, 1.165, -2.368)
    rail("Spare brass eyepiece barrel", (2.961, origin[1], -2.407), (3.130, origin[1], -2.328),
         .077, .075, palette["brass"], .018)
    spindle("Spare eyepiece glass", (3.135, origin[1], -2.325), (.039, .038, .017),
            palette["glass"], direction=(.91, .0, .419))
    rail("Carved brass gauge handle", (2.728, 1.105, -2.145), (2.914, 1.115, -2.173),
         .025, .028, palette["brass"], .009)
    spindle("Gauge turned grip", (2.719, 1.100, -2.143), (.022, .023, .049), palette["leather"],
            direction=(1.0, 0.0, -.15))


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    palette = {
        name: clay(f"DeskFinish_{name}", color, roughness, metal)
        for name, color, roughness, metal in (
            ("paper", "c9aa79", .87, 0.0),
            ("paper_light", "d4bb8d", .84, 0.0),
            ("ink", "506376", .78, 0.0),
            ("cloth", "6d8994", .91, 0.0),
            ("leather", "7f5337", .71, 0.0),
            ("brass", "b08544", .51, .17),
            ("glass", "5b8c91", .37, .04),
        )
    }
    notebook(palette)
    desk_tools(palette)
    bpy.ops.wm.save_as_mainfile(filepath=str(ART / "observatory-desk-finish.blend"))
    export_groups(ART.parent / "observatory-desk-finish.glb")
    print("OBSERVATORY_DESK_FINISH_EXPORTED", flush=True)


if __name__ == "__main__":
    main()
