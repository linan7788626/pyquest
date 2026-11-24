"""Build the removable Observatory porch detail layer in Godot world coordinates."""

from math import cos, sin, tau
from pathlib import Path
from random import Random
import sys

import bpy
from mathutils import Vector

ART = Path(__file__).resolve().parent
sys.path.insert(0, str(ART))
from build_courtyard import blender, box, clay, export_groups, finish, spindle

FLOOR = .030
RANDOM = Random(311)


def pebble(x, z, width, rise, depth, surface):
    """Smooth asymmetric river pebbles, partly seated in the earth."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=1,
                                         location=blender((x, FLOOR + rise*.19, z)))
    model = finish("Partly buried worn stone", surface)
    angle = RANDOM.uniform(0, tau)
    for vertex in model.data.vertices:
        px, pz, py = vertex.co
        variation = 1.0 + .1*sin(px*4 + angle) + .065*cos(pz*6 + angle)
        vertex.co = (width*(px + .095*py)*variation,
                     depth*(pz + .12*px)*variation,
                     rise*(py * (.94 + px*.11)))
    model.rotation_euler.z = angle
    for face in model.data.polygons:
        face.use_smooth = True


def tuft(x, z, scale, foliage):
    """A low three-to-five-leaf fan, with swept tops and subdued clay highlights."""
    spin = RANDOM.uniform(0, tau)
    directions = [(.06, .93, .21), (.78, .60, .07), (-.60, .75, .40),
                  (.31, .72, -.62), (-.87, .41, -.32)]
    for index, (u, h, w) in enumerate(directions):
        if index > 2 and scale < .69:
            break
        dx, dz = u*cos(spin) - w*sin(spin), u*sin(spin) + w*cos(spin)
        length = (.114 + .067*h) * scale * RANDOM.uniform(.86, 1.12)
        width = (.025 + .021*h) * scale
        direction = Vector((dx,h,dz)).normalized()
        center = Vector((x, FLOOR - .023, z)) + direction * (length*.75)
        spindle("Rounded fanned grass leaf", center, (width,.018*scale,length),
                foliage[index%len(foliage)], direction=direction)


def bloom(x, z, scale, palette):
    height = .145*scale
    center = Vector((x, FLOOR+height, z))
    spindle("Low wildflower stem", center-Vector((0,height*.45,0)),
            (.014*scale,.014*scale,height*.57), palette["moss"], direction=(.02,1,.11))
    for index in range(5):
        angle = tau*index/5
        direction = Vector((cos(angle), sin(angle)*.35, sin(angle)*.92))
        spindle("Ivory wildflower petal", center+direction*(.043*scale),
                (.028*scale,.013*scale,.041*scale), palette["cream"], direction=direction)
    spindle("Golden wildflower center", center+Vector((0,.012*scale,.013*scale)),
            (.023*scale,.022*scale,.014*scale), palette["pollen"], direction=(0,.85,.50))


def ground_cover(palette):
    # Hand-spaced clusters hold the corners and keep the center of the approach legible.
    spots = [(-.40,2.70,.97),(-.30,2.98,.78),(-.20,3.24,.67),(-.53,2.83,.61),
             (-.29,4.14,.87),(-.43,4.39,.62),
             (-.15,5.41,.86),(-.02,5.53,.56),(-.34,5.57,.64),(-.05,6.41,.70),
             (2.43,2.78,1.00),(2.64,2.88,.78),(2.49,3.11,.65),(2.68,3.21,.55),
             (2.17,3.75,.76),(2.49,3.94,.62),
             (2.31,4.84,.81),(2.43,4.95,.82),(2.45,5.15,.64),
             (2.36,5.99,.91),(2.58,6.11,.57),(2.24,6.60,.64),
             (-2.63,1.91,.68),(-1.28,1.87,.66),(-1.52,1.98,.53)]
    foliage = [palette["grass_deep"], palette["moss"], palette["grass"],
               palette["grass"], palette["grass_deep"]]
    for plant in spots:
        tuft(*plant, foliage)

    stones = [(-.29,2.79,.17,.075,.12,"stone"),(-.51,2.98,.10,.048,.087,"stone_pale"),
              (-.14,4.57,.073,.034,.056,"stone_pale"),(-.37,5.57,.094,.041,.066,"stone"),
              (.07,5.83,.051,.022,.048,"stone_pale"),(-.05,6.58,.105,.039,.083,"stone"),
              (2.47,2.65,.16,.080,.113,"stone"),(2.66,2.73,.105,.060,.086,"stone_pale"),
              (2.44,3.29,.075,.041,.069,"stone_pale"),(2.24,3.81,.093,.040,.065,"stone"),
              (2.42,4.84,.121,.052,.107,"stone"),(2.58,5.20,.122,.072,.105,"stone_pale"),
              (2.26,5.74,.072,.030,.050,"stone"),(2.40,6.07,.11,.048,.092,"stone_pale"),
              (2.17,6.46,.068,.026,.053,"stone"),(-1.38,1.94,.136,.056,.102,"stone")]
    for x,z,width,rise,depth,material_key in stones:
        pebble(x,z,width,rise,depth,palette[material_key])

    for x,z,scale in [(-.38,2.80,1.03),(-.50,2.91,.72),
                      (2.61,2.88,1.04),(2.71,2.87,.78),(2.74,3.05,.64),
                      (2.39,6.08,.76)]:
        bloom(x,z,scale,palette)


def doorway(palette):
    # Stays on the old door plane and leaves the walkable tread intact.
    box("Sill shadow joint", (1.15,.714,1.99), (1.92,.108,.205),
        palette["trim_dark"], .031)
    box("Rounded oak door sill", (1.15,.738,2.047), (1.85,.088,.185),
        palette["trim"], .033)
    for x in (.225,2.075):
        box("Weathered jamb base", (x,.768,2.034), (.235,.194,.180),
            palette["trim_dark"], .031)
        box("Warm jamb foot collar", (x,.817,2.082), (.245,.075,.124),
            palette["trim"], .026)
        spindle("Small dark bronze fixing", (x,.830,2.151), (.023,.023,.014),
                palette["fixing"], direction=(0,0,1))


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    palette = {key: clay("Porch_"+key,color,roughness,metal)
               for key,color,roughness,metal in [
        ("grass_deep","426B30",.86,0), ("moss","537C2B",.82,0),
        ("grass","739533",.81,0), ("stone","9E9274",.88,0),
        ("stone_pale","BAAC8C",.88,0), ("cream","F5E7C5",.79,0),
        ("pollen","D3AD5E",.74,0), ("trim_dark","654622",.72,0),
        ("trim","93643A",.70,0), ("fixing","6E5740",.57,.23),
    ]}
    ground_cover(palette)
    doorway(palette)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(ART / "observatory-porch.blend"))
    export_groups(ART.parent / "observatory-porch.glb")
    print("OBSERVATORY_PORCH_EXPORTED",len(bpy.context.scene.objects),"material groups",flush=True)


if __name__ == "__main__":
    main()
