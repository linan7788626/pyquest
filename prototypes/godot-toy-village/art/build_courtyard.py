"""Build the cottage's detached courtyard layer and export its Godot GLB.

Coordinates use Godot Y-up and positive Z toward the front of the yard.
Soft Fantasy Wooden_Fence, Lantern_Pillar and Flowers_Pink inform the shapes.
"""
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

ART = Path(__file__).resolve().parent
GARDEN_FLOOR = 0.03
RANDOM = random.Random(27)


def srgb_to_linear(value):
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def clay(name, rgb, roughness=0.76, metallic=0.0, glow=0.0):
    color = tuple(srgb_to_linear(c / 255) for c in bytes.fromhex(rgb)) + (1.0,)
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if glow:
        bsdf.inputs["Emission Color"].default_value = color
        bsdf.inputs["Emission Strength"].default_value = glow
    return material


def blender(point):
    x, y, z = point
    return (x, -z, y)


def finish(name, material, bevel=0):
    model = bpy.context.object
    model.name = name
    model.data.materials.append(material)
    if bevel:
        rounded = model.modifiers.new("Soft edge", "BEVEL")
        rounded.width = bevel
        rounded.segments = 4
        weighted = model.modifiers.new("Weighted face normals", "WEIGHTED_NORMAL")
        weighted.keep_sharp = True
    return model


def box(name, point, size, material, bevel):
    bpy.ops.mesh.primitive_cube_add(size=1, location=blender(point))
    model = bpy.context.object
    model.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(name, material, bevel)


def spindle(name, point, size, material, *, direction=None):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=16, ring_count=10, radius=1, location=blender(point))
    model = finish(name, material)
    model.scale = size  # local Z is the long axis
    if direction:
        model.rotation_euler = Vector(blender(direction)).to_track_quat("Z", "Y").to_euler()
    for face in model.data.polygons:
        face.use_smooth = True
    return model


def tapered(name, point, lower, upper, height, material, bevel=0.04, sides=4):
    bpy.ops.mesh.primitive_cone_add(
        vertices=sides, radius1=lower, radius2=upper, depth=height,
        location=blender(point), rotation=(0, 0, math.pi / 4 if sides == 4 else 0))
    return finish(name, material, bevel)


def rail(name, start, end, width, depth, material, bevel=0.05):
    a, b = Vector(start), Vector(end)
    across = b - a
    model = box(name, (a + b) / 2, (across.length, width, depth), material, bevel)
    # All rails point along an axis or within the X/Y plane.
    model.rotation_euler = Vector(blender(across)).to_track_quat("X", "Z").to_euler()
    return model


def build_fence(palette):
    timber, cap, strap = (palette[key] for key in ("timber", "cap", "iron"))
    posts = [(-7.27, 2.90), (-7.27, 4.37), (-7.27, 5.85),
             (-6.04, 5.85), (-4.80, 5.85), (-3.57, 5.85)]
    for index, (x, z) in enumerate(posts):
        terminal = index in (0, 2, len(posts) - 1)
        post_width = 0.33 if terminal else 0.27
        base = GARDEN_FLOOR + 0.09
        box("Rounded post plinth", (x, base, z), (post_width + .07, .18, post_width + .07), cap, .045)
        box("Warm timber post", (x, .55, z), (post_width, 1.04, post_width), timber, .067)
        box("Polished post cap", (x, 1.04, z), (post_width + .025, .13, post_width + .025), cap, .046)
        if terminal:
            box("Dark collar", (x, .81, z), (post_width + .045, .13, post_width + .045), strap, .048)
            for offset in (-.075, .075):
                spindle("Collar rivet", (x + offset, .81, z + post_width / 2 + .024),
                        (.025, .025, .018), palette["gold"], direction=(0, 0, 1))
    for (x0, z0), (x1, z1) in zip(posts, posts[1:]):
        for height, tilt in ((.72, .022), (.39, -.015)):
            rail("Rounded split rail", (x0, height, z0), (x1, height + tilt, z1),
                 .19, .132, timber, .052)


def build_lantern(palette):
    x, z = 2.85, 4.55
    box("Pale stone foot", (x, .13, z), (.75, .20, .75), palette["stone"], .07)
    tapered("Stone pedestal shoulder", (x, .31, z), .43, .31, .25, palette["stone"])
    box("Spread stone cap", (x, .47, z), (.54, .14, .54), palette["stone_light"], .044)
    box("Lantern post", (x, 1.00, z), (.22, 1.15, .25), palette["timber"], .052)
    tapered("Carved post finial", (x, 1.62, z), .21, .035, .22, palette["cap"])
    box("Hanging lamp arm", (x + .26, 1.43, z), (.72, .16, .20), palette["cap"], .049)
    rail("Angled lamp brace", (x, 1.04, z), (x + .42, 1.42, z),
         .13, .15, palette["timber"], .033)
    lamp_x = x + .61
    box("Lantern bracket", (lamp_x, 1.34, z), (.11, .17, .12), palette["iron"], .03)
    tapered("Beveled lantern lid", (lamp_x, 1.235, z), .38, .16, .19, palette["iron"], .04)
    tapered("Warm inset lantern panes", (lamp_x, .982, z), .20, .285, .34,
            palette["amber"], .024)
    for x_sign, z_sign in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        center = (lamp_x + x_sign * .162, .980, z + z_sign * .162)
        box("Dark lantern post", center, (.043, .339, .043), palette["iron"], .009)
    tapered("Heavy lantern base", (lamp_x, .789, z), .245, .30, .11, palette["iron"], .025)
    spindle("Lantern drop finial", (lamp_x, .71, z), (.066, .066, .064), palette["gold"])


def flower(x, z, height, palette, petal):
    stalk = (x + .035, GARDEN_FLOOR + height, z - .025)
    leaf_base = (x, GARDEN_FLOOR + height * .35, z)
    for direction in ((-.125, .125, .078), (.095, .094, -.10)):
        leaf_center = tuple(a + b * .55 for a, b in zip(leaf_base, direction))
        spindle("Soft pointed leaf", leaf_center, (.053, .026, .128), palette["leaf"],
                direction=direction)
    spindle("Flower stalk", (x + .017, GARDEN_FLOOR + height * .52, z - .012),
            (.023, .023, height * .57), palette["leaf_dark"], direction=(.06, 1, -.045))
    # Tilt petals toward the playable camera, so buds remain legible from the front.
    center = Vector(stalk)
    for index in range(5):
        angle = math.tau * index / 5
        direction = Vector((math.cos(angle), math.sin(angle) * .46, math.sin(angle) * .89))
        spindle("Rounded petal", center + direction * .071, (.044, .025, .072),
                petal, direction=direction)
    spindle("Flower center", center + Vector((0, .028, .022)),
            (.045, .048, .026), palette["flower_center"], direction=(0, .88, .47))


def planting_bed(x, z, scale, palette, flower_count):
    # Three welded-looking leaf groups make each plant bed read as a mass from above.
    for dx, dz, spread in ((-.30, -.13, 1), (.20, .10, .93), (.36, -.19, .69)):
        rotation = RANDOM.uniform(0, math.tau)
        center = (x + dx * scale, GARDEN_FLOOR + .102 * scale, z + dz * scale)
        for fan in range(5):
            yaw = rotation + fan * math.tau / 5
            spread_x, spread_z = math.cos(yaw), math.sin(yaw)
            leaf_position = (center[0] + spread_x * .12 * scale, center[1] + .05 * scale,
                             center[2] + spread_z * .12 * scale)
            spindle("Soft broad foliage", leaf_position, (.091 * scale, .050 * scale, .185 * scale),
                    palette["leaf_light" if fan % 3 == 0 else "leaf"],
                    direction=(spread_x, .45 + .12 * (fan % 2), spread_z))
        spindle("Ground cover base", center, (.24 * scale, .20 * scale, .15 * scale),
                palette["leaf_dark"])
    for index in range(flower_count):
        dx = (-.30, -.065, .23, .39)[index] * scale
        dz = (-.12, .07, -.01, -.175)[index] * scale
        flower(x + dx, z + dz, RANDOM.uniform(.26, .45) * scale, palette,
               palette["petal" if index < 2 else "cream"])


def build_garden(palette):
    for position in [(-6.76, 5.37, .90, 4), (-3.85, 5.41, .73, 3),
                     (-6.84, 2.69, .74, 0), (3.21, 4.84, 1.0, 4),
                     (4.79, 2.18, 1.25, 4), (5.42, 2.45, .74, 0)]:
        planting_bed(*position[:3], palette, position[3])
    for x, z, radius in [(-6.18, 5.31, .21), (-3.48, 5.46, .17),
                         (3.88, 4.66, .20), (5.82, 2.22, .28), (6.04, 2.46, .14)]:
        spindle("Small rounded garden stone", (x, GARDEN_FLOOR + radius * .31, z),
                (radius, radius * .73, radius * .54), palette["stone_light"])


def export_groups(path=ART.parent / "courtyard-study.glb"):
    by_material = {}
    for model in tuple(bpy.context.scene.objects):
        by_material.setdefault(model.data.materials[0], []).append(model)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.convert(target="MESH")
    for material, models in by_material.items():
        bpy.ops.object.select_all(action="DESELECT")
        for model in models:
            model.select_set(True)
        bpy.context.view_layer.objects.active = models[0]
        if len(models) > 1:
            bpy.ops.object.join()
        models[0].name = material.name
    bpy.ops.export_scene.gltf(filepath=str(path),
                              export_format="GLB", export_apply=True,
                              export_cameras=False, export_lights=False)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    palette = {
        key: clay("Yard_" + key, color, rough, metal, glow)
        for key, color, rough, metal, glow in [
            ("timber", "8F5D35", .78, 0, 0), ("cap", "AD753B", .71, 0, 0),
            ("iron", "484D51", .57, .16, 0), ("gold", "B39157", .65, .20, 0),
            ("stone", "908777", .86, 0, 0), ("stone_light", "A8A28B", .82, 0, 0),
            ("amber", "F2BE63", .46, .0, .32), ("leaf_dark", "275C3F", .82, 0, 0),
            ("leaf", "58871F", .74, 0, 0), ("leaf_light", "83A92E", .70, 0, 0),
            ("petal", "D8759B", .69, 0, 0), ("cream", "F3E1B6", .75, 0, 0),
            ("flower_center", "CB9B46", .76, 0, 0),
        ]
    }
    build_fence(palette)
    build_lantern(palette)
    build_garden(palette)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(ART / "courtyard-study.blend"))
    export_groups()
    print("COURTYARD_EXPORTED", len(bpy.context.scene.objects), "material groups")


if __name__ == "__main__":
    main()
