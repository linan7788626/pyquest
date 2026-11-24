"""Build the courtyard's original sculpted oak from the user's Tree_Large reference.

Run with Blender in background mode. Design coordinates use Y up and +Z toward
camera. The editable .blend and the self-contained GLB use meters.
"""
import math
from pathlib import Path

import bpy
from mathutils import Euler
from mathutils import Vector

ART = Path(__file__).resolve().parent
TAU = math.tau


def coord(p):
    x, y, z = p
    return x, -z, y


def material(name, color, roughness):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1.0)
    result.use_nodes = True
    principled = result.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (*color, 1.0)
    principled.inputs["Roughness"].default_value = roughness
    return result


def mesh(name, verts, faces, surface):
    data = bpy.data.meshes.new(name)
    data.from_pydata([coord(v) for v in verts], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(surface)
    for face in data.polygons:
        face.use_smooth = True
    return obj


def make_active(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def sweep(name, points, radii, surface, phase=0.0):
    """Tapered branch or root with flutes and a continuous bent centerline."""
    path = [Vector(p) for p in points]
    sides = 18
    verts = []
    for i, (p, radius) in enumerate(zip(path, radii)):
        tangent = (path[min(i+1, len(path)-1)] - path[max(i-1, 0)]).normalized()
        across = tangent.cross(Vector((0, 0, 1))).normalized()
        up = tangent.cross(across)
        for j in range(sides):
            theta = j * TAU / sides
            ripple = 1.0 + .13 * math.cos(5 * theta + phase + i * .31)
            v = p + radius * ripple * (math.cos(theta) * across + math.sin(theta) * up)
            # Root undersides stay within the grass surface.
            verts.append((v.x, max(-.10, v.y), v.z))
    end = (len(path) - 1) * sides
    faces = [tuple(reversed(range(sides))), tuple(end + j for j in range(sides))]
    for start in range(0, end, sides):
        for j in range(sides):
            k = (j + 1) % sides
            faces.append((start+j, start+k, start+sides+k, start+sides+j))
    return mesh(name, verts, faces, surface)


def canopy_lobe(name, center, radii, phase, surface):
    """A smoothly scalloped silhouette with soft, modeled leaf group ridges."""
    n, bands = 52, 28
    cx, cy, cz = center
    rx, ry, rz = radii
    verts = [(cx, cy + ry, cz)]
    for b in range(1, bands):
        theta = math.pi * b / bands
        radial = math.sin(theta)
        for j in range(n):
            phi = TAU * j / n
            waves = 1.0 + .045 * math.cos(5 * phi + 2 * theta + phase)
            waves += .036 * math.sin(8 * phi - 2 * theta + phase)
            waves += .060 * math.sin(3 * phi + 3 * theta + phase)
            r = radial * waves
            verts.append((cx + rx*r*math.cos(phi),
                          cy + ry*(math.cos(theta) + .095*radial*math.sin(4*phi+phase)),
                          cz + rz*r*math.sin(phi)))
    verts.append((cx, cy - ry, cz))
    faces = [(0, 1 + (j+1) % n, 1 + j) for j in range(n)]
    for b in range(bands - 2):
        start = 1 + b*n
        for j in range(n):
            k = (j+1) % n
            faces.append((start+j, start+k, start+n+k, start+n+j))
    end = 1 + (bands-2)*n
    faces.extend((end+j, end+(j+1)%n, len(verts)-1) for j in range(n))
    obj = mesh(name, verts, faces, surface)
    # Color is painted into vertices so the canopy has shape in every camera view.
    attr = obj.data.color_attributes.new(name="Canopy gradient", type="FLOAT_COLOR", domain="POINT")
    for i, (x, y, z) in enumerate(verts):
        t = max(0., min(1., (y - cy + .42*ry)/(1.42*ry)))
        t = t*t*(3-2*t)
        canopy_height = max(0., min(1., (y-2.45)/3.6))
        # The painted reference pairs deep cyan leaf shadows with yellow-green tips.
        dark = (.003, .045, .094)
        tip = canopy_height * canopy_height
        light = (
            .101 + .159 * canopy_height + .090 * tip,
            .277 + .153 * canopy_height + .100 * tip,
            .021 + .016 * canopy_height + .010 * tip,
        )
        drift = .91 + .07*math.sin(phase*1.4) + .02*math.sin(x*4.2 + z*2.3)*t
        attr.data[i].color = (*(drift*(a+(b-a)*t) for a,b in zip(dark,light)), 1.)
    return obj


def leaf_spray(name, p, width, height, length, angle, surface):
    # A broad, rounded almond adds leaf character on the lit side only.
    obj = canopy_lobe(name, (0, 0, 0), (width, height, length), angle, surface)
    leaf_color = obj.data.color_attributes["Canopy gradient"]
    for i, vert in enumerate(obj.data.vertices):
        t = max(0., min(1., (vert.co.z + height)/(2*height)))
        leaf_color.data[i].color = (.112+.145*t, .253+.144*t, .017+.021*t, 1.)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Euler((.70, 0., 0.)).to_quaternion() @ Euler((0., 0., -angle)).to_quaternion()
    obj.location = coord(p)
    return obj


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bark = material("courtyard_bark", (.252, .102, .043), .83)
    foliage = material("courtyard_canopy", (1., 1., 1.), .81)
    shader = foliage.node_tree.nodes.get("Principled BSDF")
    colors = foliage.node_tree.nodes.new("ShaderNodeVertexColor")
    colors.layer_name = "Canopy gradient"
    foliage.node_tree.links.new(colors.outputs["Color"], shader.inputs["Base Color"])

    wood = [sweep("Trunk", [(0,.0,0),(.01,.25,0),(.08,.67,.02),(.07,1.10,.03),
                           (-.09,1.67,.02),(-.11,2.15,-.04),(.06,2.72,-.12),(.28,3.18,-.31),(.18,3.91,-.32)],
                  [.69,.63,.48,.43,.42,.37,.33,.24,.12], bark)]
    for angle in [.13, 1.29, 2.38, 3.48, 4.40, 5.36]:
        x, z = math.cos(angle), math.sin(angle)
        wood.append(sweep("Root",[(x*.18,.60,z*.18),(x*.47,.30,z*.47),(x*.78,.13,z*.78),
                                  (x*1.13,.065,z*1.13),(x*1.42,.02,z*1.42)],
                          [.27,.27,.21,.13,.035],bark,angle))
    branches = [
        ([(.02,1.39,.02),(-.30,1.84,.08),(-.74,2.23,.26),(-1.20,2.53,.26),(-1.52,3.10,.15)], [.33,.28,.23,.17,.09]),
        ([(-.05,1.68,0),(.42,2.04,.06),(.83,2.42,.02),(1.32,2.85,-.12),(1.58,3.45,-.22)], [.30,.25,.21,.15,.075]),
        ([(-.02,2.16,-.04),(-.17,2.55,.40),(-.42,2.93,.84),(-.61,3.55,.97)],[.25,.20,.16,.06]),
        ([(.02,2.19,-.09),(.06,2.66,-.68),(.54,3.15,-.88),(.88,3.80,-1.02)], [.24,.21,.14,.06]),
        ([(-.70,2.19,.22),(-1.01,2.45,.55),(-1.37,2.91,.75)],[.17,.13,.058]),
    ]
    for i,(points,radii) in enumerate(branches):
        wood.append(sweep("Forked Branch",points,radii,bark,i*.93))
    make_active(wood[0])
    for part in wood: part.select_set(True)
    bpy.ops.object.join()
    trunk = bpy.context.object
    trunk.name = "Courtyard trunk"
    trunk.data.remesh_voxel_size = .042
    bpy.ops.object.voxel_remesh()
    trunk.data.materials.clear()
    trunk.data.materials.append(bark)
    smooth = trunk.modifiers.new("Rounded joins", "SMOOTH")
    smooth.factor = .68
    smooth.iterations = 7
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    for face in trunk.data.polygons: face.use_smooth = True

    canopy = bpy.data.objects.new("Canopy", None)
    bpy.context.collection.objects.link(canopy)
    lobes = [
        ((-1.31,3.42,.22),(1.18,.94,1.03)), ((1.30,3.52,.12),(1.01,.95,1.09)),
        ((-.61,3.47,1.12),(1.04,.81,.86)), ((.72,3.60,1.02),(.85,.77,.84)),
        ((.75,3.93,-.95),(1.13,.95,1.05)), ((-.73,3.93,-.91),(1.15,.94,1.13)),
        ((-.94,4.45,-.08),(1.04,1.06,1.02)), ((.91,4.46,-.19),(1.12,.98,1.01)),
        ((-.04,4.40,.64),(1.09,1.06,.99)), ((.06,5.13,-.45),(1.08,1.02,1.10)),
    ]
    for i,(center,radii) in enumerate(lobes):
        canopy_lobe(f"Crown lobe {i+1:02}",center,radii,i*1.31,foliage).parent=canopy
    # Low relief rosettes on selected front lobes, placed tangent to the silhouette.
    accent_groups = [(0,-.15,.43),(2,-.17,.33),(3,.08,.44),(6,-.16,.45),
                     (7,.17,.38),(8,.18,.44),(9,.02,.40)]
    for i, (lobe, dx, dy) in enumerate(accent_groups):
        (x,y,z),(rx,ry,rz) = lobes[lobe]
        center = (x+dx, y+dy*ry, z+rz*.86)
        for j in range(5):
            angle = j * TAU / 5 + i*.73
            p=(center[0]+.14*math.sin(angle), center[1]+.13*math.cos(angle), center[2]-.06*math.cos(angle))
            leaf_spray(f"Rounded leaf accent {i+1:02}.{j+1}",p,.125,.057,.24,angle,foliage).parent=canopy

    bpy.ops.wm.save_as_mainfile(filepath=str(ART / "courtyard-tree.blend"))
    canopy_parts = list(canopy.children)
    make_active(canopy_parts[0])
    for part in canopy_parts: part.select_set(True)
    bpy.ops.object.join()
    bpy.context.object.name = "Courtyard canopy"
    bpy.ops.export_scene.gltf(filepath=str(ART.parent / "courtyard-tree.glb"), export_format="GLB", export_apply=True, export_vertex_color="ACTIVE")
    print("COURTYARD_TREE_READY", flush=True)


if __name__ == "__main__":
    main()
