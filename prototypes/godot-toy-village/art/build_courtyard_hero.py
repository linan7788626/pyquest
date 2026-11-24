"""Sculpt the Soft Fantasy courtyard knight and export its joint hierarchy."""

from math import cos, pi, sin, tau
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.geometry import tessellate_polygon


ART = Path(__file__).resolve().parent


def blender(position):
    x, y, z = position
    return Vector((x, -z, y))


def move(origin, x=0, y=0, z=0):
    return origin[0] + x, origin[1] + y, origin[2] + z


def material(name, hex_color, roughness, metal=0):
    def linear(channel):
        value = channel / 255
        return value / 12.92 if value < .04045 else ((value + .055) / 1.055) ** 2.4

    color = tuple(linear(channel) for channel in bytes.fromhex(hex_color)) + (1.0,)
    result = bpy.data.materials.new(name)
    result.diffuse_color = color
    result.use_nodes = True
    surface = result.node_tree.nodes.get("Principled BSDF")
    surface.inputs["Base Color"].default_value = color
    surface.inputs["Metallic"].default_value = metal
    surface.inputs["Roughness"].default_value = roughness
    return result


def joint(name, position, parent=None):
    node = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(node)
    node.parent = parent
    parent_origin = Vector(parent["rest_origin"]) if parent else Vector((0, 0, 0))
    node.location = blender(position) - parent_origin
    node["rest_origin"] = blender(position)
    node.empty_display_size = .12
    return node


def mesh(name, parent, vertices, faces, surface, smooth=True):
    origin = Vector(parent["rest_origin"])
    geometry = bpy.data.meshes.new(name)
    geometry.from_pydata([blender(v) - origin for v in vertices], [], faces)
    geometry.update()
    obj = bpy.data.objects.new(name, geometry)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(surface)
    for poly in obj.data.polygons:
        poly.use_smooth = smooth
    return obj


def rounded(obj, width):
    bevel = obj.modifiers.new("Soft edges", "BEVEL")
    bevel.width = width
    bevel.segments = 3
    bevel.limit_method = "ANGLE"
    bevel.harden_normals = True
    normals = obj.modifiers.new("Weighted plate normals", "WEIGHTED_NORMAL")
    normals.keep_sharp = True
    return obj


def ellipsoid(name, parent, center, radii, surface):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20)
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = blender(center) - Vector(parent["rest_origin"])
    obj.scale = (radii[0], radii[2], radii[1])
    obj.data.materials.append(surface)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def tube(name, parent, points, radii, surface, closed=False):
    path = [Vector(point) for point in points]
    sides = 12
    vertices = []
    for i, (point, radius) in enumerate(zip(path, radii)):
        previous = path[(i - 1) % len(path)] if closed else path[max(0, i - 1)]
        following = path[(i + 1) % len(path)] if closed else path[min(len(path) - 1, i + 1)]
        tangent = (following - previous).normalized()
        guide = Vector((0, 1, 0)) if abs(tangent.y) < .93 else Vector((0, 0, 1))
        cross = tangent.cross(guide).normalized()
        around = tangent.cross(cross).normalized()
        for side in range(sides):
            turn = side * tau / sides
            vertices.append(point + radius * (cos(turn) * cross + sin(turn) * around))
    faces = []
    if not closed:
        faces.extend([tuple(reversed(range(sides))), tuple(range(len(vertices) - sides, len(vertices)))])
    for row in range(len(path) if closed else len(path) - 1):
        next_row = (row + 1) % len(path)
        for side in range(sides):
            other = (side + 1) % sides
            faces.append((row * sides + side, row * sides + other, next_row * sides + other, next_row * sides + side))
    return mesh(name, parent, vertices, faces, surface)


def ribbon(name, parent, outline, project, depth, surface, bevel=.018):
    # Tessellate recessed emblems and crescent tips before making a closed solid.
    polygon = [Vector((x, y, 0)) for x, y in outline]
    triangles = tessellate_polygon([polygon])
    if triangles and isinstance(triangles[0][0], Vector):
        triangles = [tuple(polygon.index(point) for point in face) for face in triangles]
    area = sum(x * outline[(i + 1) % len(outline)][1] - y * outline[(i + 1) % len(outline)][0]
               for i, (x, y) in enumerate(outline))
    if area < 0:
        triangles = [tuple(reversed(face)) for face in triangles]
    count = len(outline)
    vertices = [project(x, y, z) for z in (-depth / 2, depth / 2) for x, y in outline]
    faces = [tuple(reversed(face)) for face in triangles]
    faces.extend(tuple(i + count for i in face) for face in triangles)
    for i in range(count):
        j = (i + 1) % count
        side = (i, j, j + count, i + count)
        faces.append(side if area > 0 else tuple(reversed(side)))
    return rounded(mesh(name, parent, vertices, faces, surface), bevel)


def star_shape(width, height):
    return [(0,-height), (.20*width,-.29*height), (width,0), (.21*width,.25*height),
            (0,height), (-.21*width,.25*height), (-width,0), (-.20*width,-.29*height)]


def star(name, parent, center, width, height, surface):
    return ribbon(name, parent, star_shape(width, height), lambda u, v, w: move(center,u,v,w),
                  .038, surface, .009)


def smooth_outline(outline, corners):
    """Sample the rounded contour while keeping the two crescent tips distinct."""
    points = [Vector(point) for point in outline]
    result = []
    count = len(points)
    for i, start in enumerate(points):
        end = points[(i + 1) % count]
        tangent_start = (end - points[i - 1]) * .49 if i not in corners else Vector((0, 0))
        tangent_end = (points[(i + 2) % count] - start) * .49 if (i + 1) % count not in corners else Vector((0, 0))
        for sample in range(3):
            t = sample / 3
            t2, t3 = t*t, t*t*t
            point = (2*t3-3*t2+1)*start + (t3-2*t2+t)*tangent_start
            point += (-2*t3+3*t2)*end + (t3-t2)*tangent_end
            result.append(tuple(point))
    return result


def rings(name, parent, levels, surface, sides=48):
    """Profile from bottom to top with an independent radius and depth per ring."""
    vertices = []
    for y, radius, depth, z in levels:
        for step in range(sides):
            angle = step * tau / sides
            vertices.append((radius * sin(angle), y, z + depth * cos(angle)))
    faces = [tuple(reversed(range(sides)))]
    for level in range(len(levels) - 1):
        a = level * sides
        for side in range(sides):
            next_side = (side + 1) % sides
            faces.append((a+side, a+next_side, a+sides+next_side, a+sides+side))
    faces.append(tuple(range(len(vertices) - sides, len(vertices))))
    return mesh(name, parent, vertices, faces, surface)


def helmet(head, colors):
    cream, gold, pale, dark = (colors[key] for key in ("porcelain", "gold", "glint", "visor"))
    rings("Porcelain helm", head, [
        (1.367,.35,.29,-.026), (1.40,.405,.345,-.02), (1.48,.464,.397,-.016),
        (1.60,.505,.440,-.028), (1.74,.522,.453,-.030), (1.86,.512,.435,-.039),
        (1.98,.465,.387,-.046), (2.08,.385,.324,-.048), (2.162,.265,.225,-.046),
        (2.201,.120,.103,-.043), (2.208,.013,.012,-.042),
    ], cream)

    def visor(theta, t, offset=0):
        edge = (abs(theta) / 1.10) ** 1.4
        top = 1.805 + .085 * edge
        low = 1.385 + .148 * edge
        contour = sin(pi * t)
        return ((.488 + .058*t + .010*contour + offset) * sin(theta),
                low + (top-low)*t,
                .017 + (.422 + .063*t + .017*contour + offset) * cos(theta))

    # The rails and rim share vertices at each slit corner. An inset shell supplies depth.
    lower = [-1.10,-.879,-.727,-.532,-.277,-.133,.133,.277,.532,.727,.879,1.10]
    upper = [-1.10,-.934,-.735,-.576,-.245,-.122,.122,.245,.576,.735,.934,1.10]
    slices = [0,.08,.18,.246,.37,.52,.67,.784,.85,.94,1]
    divisions = 3
    lanes = (len(lower)-1)*divisions
    mask_vertices = []
    dark_vertices = []
    mask_faces = []
    dark_faces = []
    for height in slices:
        taper = min(1,max(0,(height-.246)/(.784-.246)))
        edges = [a+(b-a)*taper for a,b in zip(lower,upper)]
        angles = [lo+(hi-lo)*step/divisions for lo,hi in zip(edges,edges[1:]) for step in range(divisions)] + [edges[-1]]
        for angle in angles:
            mask_vertices.append(visor(angle,height,.052))
            dark_vertices.append(visor(angle,height,.005))
    for row in range(len(slices)-1):
        for column in range(lanes):
            start = row*(lanes+1)+column
            face = (start,start+1,start+lanes+2,start+lanes+1)
            dark_faces.append(face)
            if slices[row] < .246 or slices[row] >= .784 or (column//divisions)%2 == 0:
                mask_faces.append(face)
    mesh("Inset under the slits",head,dark_vertices,dark_faces,dark)
    visor_mesh = mesh("Slotted gold visor",head,mask_vertices,mask_faces,gold)
    gauge = visor_mesh.modifiers.new("Visor thickness", "SOLIDIFY")
    gauge.thickness = .030
    bevel = visor_mesh.modifiers.new("Softened slit edges", "BEVEL")
    bevel.width = .009
    bevel.segments = 3
    # Close the brow against the dome so it keeps a finished silhouette in profile.
    brow_angles = [-1.10+index*2.20/32 for index in range(33)]
    brow_outer = [visor(angle,.995,.051) for angle in brow_angles]
    brow_inner = [(.453*sin(angle),p[1]+.021,-.041+.365*cos(angle))
                  for angle,p in zip(brow_angles,brow_outer)]
    mesh("Rolled visor seat",head,brow_outer+brow_inner,
         [(i,i+1,i+34,i+33) for i in range(32)],colors["gold_shade"])
    trim = [visor(-1.09+index*2.18/32,.943,.060) for index in range(33)]
    tube("Brow rim highlight",head,trim,[.009]*len(trim),pale)
    for side in (-1, 1):
        at = (side*.496,1.731,-.015)
        ellipsoid("Side hinge shadow",head,at,(.083,.199,.183),colors["brown"])
        ellipsoid("Embossed side disk",head,move(at,x=side*.047),(.065,.170,.158),gold)
        ellipsoid("Inset side disk",head,move(at,x=side*.091),(.027,.130,.120),colors["gold_shade"])
        ribbon("Compass embossing",head,star_shape(.071,.089),
               lambda u,v,w: (at[0]+side*(.119+w),at[1]+v,at[2]-side*u),.020,pale,.007)

    moon = [(-.25,.105),(-.297,.033),(-.260,-.047),(-.181,-.112),(-.056,-.147),(.085,-.126),
            (.201,-.055),(.263,.061),(.269,.180),(.223,.283),(.154,.346),(.093,.369),
            (.118,.288),(.104,.219),(.046,.160),(-.039,.126),(-.124,.124),(-.181,.161),(-.187,.190)]
    tilt = .36
    origin = (0,2.260,-.063)
    ribbon("Sculpted crescent", head, smooth_outline(moon,{11,18}),
           lambda u,v,w: move(origin,u*cos(tilt)+w*sin(tilt),v,-u*sin(tilt)+w*cos(tilt)),
           .174, gold, .024)
    ellipsoid("Crest mount",head,(.012,2.206,-.049),(.171,.057,.127),colors["gold_shade"])


def scarf_and_cape(body, colors):
    cape = joint("Cape", (0,1.20,-.275), body)
    for index in range(3):
        points = []
        for step in range(40):
            angle = step*tau/40
            points.append(((.395-index*.042)*sin(angle), 1.279+index*.056-.101*max(0,cos(angle))+.030*sin(angle+.4*index),
                           (.267-index*.004)*cos(angle)+.020))
        tube(f"Blue scarf wrap {index+1}",body,points,[.083-index*.013]*40,
             colors[("blue_dark","blue","blue_glint")[index]],True)

    def cloth(u, t):
        x = u*(.345+.183*t+.030*sin(pi*t))+.071*t*t
        y = 1.24 - (.905 + .040*cos(4*pi*u))*t - .065*(1-abs(u))*(.5+.5*t)
        z = -.267-.210*t-.101*t*t
        z -= (.044+.048*t)*cos(3.3*pi*u+t*.84)*sin(pi*t*.85)
        return x,y,z

    rows,columns = 14,26
    verts = [cloth(j/columns*2-1,i/rows) for i in range(rows+1) for j in range(columns+1)]
    faces = []
    for row in range(rows):
        for column in range(columns):
            a = row*(columns+1)+column
            faces.append((a,a+1,a+columns+2,a+columns+1))
    cloth_object = mesh("Sculpted cloak folds",cape,verts,faces,colors["blue"])
    solidify = cloth_object.modifiers.new("Lined cloth", "SOLIDIFY")
    solidify.thickness = .055
    edges = [cloth(-1,i/rows) for i in range(rows)]
    edges.extend(cloth(j/columns*2-1,1) for j in range(columns+1))
    edges.extend(cloth(1,i/rows) for i in range(rows-1,-1,-1))
    tube("Cloak rolled edge",cape,edges,[.019]*len(edges),colors["blue_glint"])
    ellipsoid("Scarf clasp",body,(.291,1.258,.232),(.089,.086,.045),colors["gold"])


def torso(body, colors):
    ellipsoid("Padded armor base",body,(0,1.017,0),(.409,.417,.273),colors["navy"])
    ellipsoid("Gold chest border",body,(0,1.001,.109),(.363,.299,.220),colors["gold_shade"])
    ellipsoid("Ivory chest plate",body,(0,1.027,.134),(.332,.247,.218),colors["porcelain"])
    ellipsoid("Short layered breastplate",body,(0,.911,.163),(.316,.107,.181),colors["gold"])
    ellipsoid("Leather belt",body,(0,.775,.025),(.402,.082,.292),colors["brown"])
    buckle = [(-.095,0),(0,-.094),(.095,0),(0,.094)]
    ribbon("Diamond belt buckle",body,buckle,lambda u,v,w: (u,.781+v,.318+w),.058,colors["gold"],.015)
    star("Buckle inset",body,(0,.779,.359),.042,.055,colors["gold_shade"])
    outline = [(-.143,.118),(-.122,-.126),(0,-.214),(.122,-.126),(.143,.118)]
    ribbon("Gold edge of the blue tabard",body,outline,lambda u,v,w: (u,.662+v,.264+w-.12*abs(u)+.18*v),
           .075,colors["gold"],.019)
    inset = [(u*.77,v*.80) for u,v in outline]
    ribbon("Blue tabard",body,inset,lambda u,v,w: (u,.660+v,.302+w-.12*abs(u)+.18*v),.027,colors["blue"],.012)
    star("Tabard emblem",body,(0,.601,.327),.048,.054,colors["glint"])


def leg(body, side, suffix, colors):
    hip = (side*.20,.65,0)
    knee_pos = move(hip,y=-.28)
    ankle = move(knee_pos,y=-.25)
    leg = joint(f"Leg{suffix}",hip,body)
    knee = joint(f"Knee{suffix}",knee_pos,leg)
    foot = joint(f"Foot{suffix}",ankle,knee)
    ellipsoid("Quilted thigh",leg,move(hip,y=-.105),(.151,.182,.155),colors["navy"])
    ellipsoid("Gilded thigh guard",leg,move(hip,y=-.127,z=.091),(.144,.140,.083),colors["gold"])
    ellipsoid("Thigh plate inset",leg,move(hip,y=-.118,z=.115),(.114,.106,.074),colors["porcelain"])
    ellipsoid("Leather gaiter",knee,move(knee_pos,y=-.13),(.136,.180,.148),colors["brown"])
    ellipsoid("Rounded knee trim",knee,move(knee_pos,y=-.020,z=.106),(.139,.104,.079),colors["gold"])
    ellipsoid("Porcelain knee cap",knee,move(knee_pos,y=-.013,z=.139),(.107,.078,.059),colors["porcelain"])
    ellipsoid("Gold ankle guard",knee,move(knee_pos,y=-.181,z=.023),(.135,.050,.151),colors["gold_shade"])
    ellipsoid("Dark boot sole",foot,move(ankle,y=-.079,z=.061),(.150,.041,.226),colors["sole"])
    ellipsoid("Rounded riding boot",foot,move(ankle,y=-.030,z=.055),(.147,.093,.218),colors["brown"])
    ellipsoid("Brushed toe",foot,move(ankle,y=-.045,z=.166),(.128,.072,.111),colors["cognac"])
    ellipsoid("Toe strap",foot,move(ankle,y=.006,z=.110),(.138,.031,.075),colors["gold_shade"])


def shield(parent, center, colors):
    # The face turns outward enough to read in front view and in the side walk.
    angle = .52

    def face(u,v,w):
        return move(center,u*cos(angle)+w*sin(angle),v,-u*sin(angle)+w*cos(angle))

    oval = [(sin(i*tau/44)*.252,cos(i*tau/44)*.365) for i in range(44)]
    ribbon("Shield leather backing",parent,[(u*.96,v*.97) for u,v in oval],
           lambda u,v,w: face(u,v,w-.030),.095,colors["brown"],.024)
    ribbon("Gold shield rim",parent,oval,lambda u,v,w: face(u,v,w+.044),.092,colors["gold"],.023)
    ribbon("Cobalt shield face",parent,[(u*.81,v*.86) for u,v in oval],
           lambda u,v,w: face(u,v,w+.094+.035*(1-(u/.25)**2-(v/.365)**2)),.047,colors["blue"],.013)
    ribbon("Shield compass star",parent,star_shape(.116,.189),
           lambda u,v,w: face(u,v,w+.149),.031,colors["glint"],.010)
    for u,v in ((0,.319),(-.223,0),(.223,0),(0,-.319)):
        ellipsoid("Shield rim rivet",parent,face(u,v,.096),(.021,.021,.018),colors["glint"])


def sword(parent, center, colors):
    # Store a shortened blade at a comfortable walk angle with the tip beside the boot.
    angle = -.21

    def plane(u,v,w):
        return move(center,u*cos(angle)-v*sin(angle),v*cos(angle)+u*sin(angle),w)

    blade = [(-.073,-.08),(-.064,-.478),(0,-.575),(.064,-.478),(.073,-.08)]
    blade_spine = [(-.013,-.09),(0,-.534),(.013,-.09)]
    ribbon("Blunt walking sword",parent,blade,plane,.052,colors["steel"],.014)
    ribbon("Blade spine",parent,blade_spine,lambda u,v,w: plane(u,v,w+.029),.017,colors["porcelain"],.006)
    guard = [plane(x,-.074-.10*x*x,z) for x,z in [(-.126,.010),(-.075,.002),(0,0),(.075,.002),(.126,.010)]]
    tube("Sword crossguard",parent,guard,[.035,.030,.036,.030,.035],colors["gold"])
    pommel = plane(0,.134,0)
    ellipsoid("Sword pommel",parent,pommel,(.061,.049,.048),colors["gold"])


def arm(body, side, suffix, colors):
    shoulder = (side*.47,1.19,.015)
    elbow_pos = move(shoulder,y=-.225)
    arm = joint(f"Arm{suffix}",shoulder,body)
    elbow = joint(f"Elbow{suffix}",elbow_pos,arm)
    ellipsoid("Blue sleeve",arm,move(shoulder,y=-.117),(.143,.194,.161),colors["blue_dark"])
    ellipsoid("Pauldrons gold edging",arm,move(shoulder,x=side*.021,y=.003),(.195,.148,.224),colors["gold"])
    ellipsoid("Pauldrons ivory top",arm,move(shoulder,x=side*.022,y=.040),(.175,.129,.201),colors["porcelain"])
    ellipsoid("Leather wrist",elbow,move(elbow_pos,y=-.099,z=.046),(.118,.141,.122),colors["brown"])
    ellipsoid("Gold vambrace rim",elbow,move(elbow_pos,y=-.081,z=.042),(.132,.100,.131),colors["gold"])
    ellipsoid("Ivory vambrace",elbow,move(elbow_pos,y=-.067,z=.083),(.106,.079,.101),colors["porcelain"])
    hand = move(elbow_pos,x=side*.026,y=-.210,z=.091)
    ellipsoid("Gloved hand",elbow,hand,(.104,.106,.106),colors["brown"])
    ellipsoid("Glove knuckles",elbow,move(hand,z=.065),(.083,.059,.050),colors["cognac"])
    if side > 0:
        shield(elbow,move(hand,x=.085,y=.111,z=.131),colors)
    else:
        sword(elbow,move(hand,z=.020),colors)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    colors = {key: material(name, color, roughness, metal) for key,name,color,roughness,metal in [
        ("porcelain","Warm enamel","ECDBB9",.43,.12), ("gold","Honey gold","DFA132",.39,.27),
        ("glint","Polished amber edge","FBCD68",.33,.29), ("gold_shade","Amber in the shadows","AA6728",.48,.20),
        ("visor","Deep recessed visor","161C27",.93,0), ("navy","Padded indigo","293950",.78,0),
        ("blue","Royal cobalt cloth","2359A8",.75,0), ("blue_dark","Indigo cloth folds","1D4085",.81,0),
        ("blue_glint","Blue cloth edges","3B77BD",.69,0), ("brown","Warm brown leather","673B27",.74,0),
        ("cognac","Burnished leather","9A592F",.64,0), ("sole","Boot soles","422820",.88,0),
        ("steel","Soft steel","B8C9CA",.32,.43),
    ]}
    body = joint("Body",(0,0,0),joint("HeroModel",(0,0,0)))
    helmet(joint("Head",(0,1.53,0),body),colors)
    torso(body,colors)
    scarf_and_cape(body,colors)
    for side,suffix in [(-1,"L"),(1,"R")]:
        leg(body,side,suffix,colors)
        arm(body,side,suffix,colors)
    bpy.ops.wm.save_as_mainfile(filepath=str(ART / "courtyard-hero.blend"))
    bpy.ops.export_scene.gltf(filepath=str(ART.parent / "courtyard-hero.glb"),export_format="GLB",
                              export_apply=True,export_cameras=False,export_lights=False)
    print("COURTYARD_HERO_READY", flush=True)


if __name__ == "__main__":
    main()
