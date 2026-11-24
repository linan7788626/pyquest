"""Build one original cutaway room in the courtyard's rounded clay style."""

from math import cos, pi, sin, tau
from pathlib import Path
from random import Random
import sys

import bmesh
import bpy

ART = Path(__file__).resolve().parent
sys.path.insert(0, str(ART))
from build_courtyard import blender, box, clay, export_groups, rail, spindle

PORTAL_X = -.28
PORTAL_EDGES = (-1.19, .63)


def solid(name, vertices, faces, material, radius):
    data = bpy.data.meshes.new(name)
    data.from_pydata([blender(vertex) for vertex in vertices], [], faces)
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(data)
    bm.free()
    result = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(result)
    result.data.materials.append(material)
    if radius:
        bevel = result.modifiers.new("Rounded clay edge", "BEVEL")
        bevel.width = radius
        bevel.segments = 4
        normals = result.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
        normals.keep_sharp = True
    return result


def prism(name, profile, locate, depth, material, radius=.025):
    vertices = [locate(u,v,w) for w in (-depth/2,depth/2) for u,v in profile]
    count = len(profile)
    faces = [tuple(range(count)), tuple(range(count,2*count))]
    for index in range(count):
        other = (index + 1) % count
        faces.append((index,other,other+count,index+count))
    return solid(name, vertices, faces, material, radius)


def arch(width, shoulder, rise, bottom):
    profile = [(-width/2,bottom),(width/2,bottom)]
    profile += [(width*cos(i*pi/20)/2,shoulder+rise*sin(i*pi/20)) for i in range(21)]
    return profile


def floor_and_walls(palette, observatory=False):
    p = palette
    ground_x, ground_z = 10.40, 9.16
    box("Deep slate room base",(0,-.269,.03),(ground_x,.50,ground_z),p["base"],.16)
    box("Rounded warm skirt",(0,-.096,.035),(10.24,.245,9.01),p["mortar"],.082)
    random = Random(28)
    for row in range(9):
        for column in range(10):
            shade = random.choices(("floor","floor_warm","floor_pale"), (6,2,2))[0]
            box("Tumbled limestone paver",(column-.5*9,-.034,row-4),(0.983,.128,.983),p[shade],.043)

    profile = [(-4.14,2.34),(-3.14,2.34),(-2.78,2.28),(-2.50,2.14),(-2.29,1.87),
               (-2.09,1.51),(-1.86,1.11),(-1.59,.78),(-1.30,.58),(-.92,.48),(4.48,.48)]
    for side in (-1,1):
        x = side*4.72
        locate = lambda q,y,w: (x+w,y,q)
        body_top = [(z,y-.045) for z,y in profile]
        body = [(profile[0][0],.055),(profile[-1][0],.055),*reversed(body_top)]
        cap = [(z,y-.13) for z,y in profile]+list(reversed(profile))
        prism("Solid sidewall with descending profile",body,locate,.56,p["stone"],.062)
        prism("Rounded slate cap following the cutaway",cap,locate,.63,p["slate"],.036)
        box("Continuous recessed sidewall footing",(x,.100,.16),(.675,.200,8.60),p["stone_dark"],.055)
        box("Inside wall foot molding",(side*4.438,.175,.15),(.16,.18,8.63),p["mortar"],.052)
        for i in range(8):
            # Low visible stone course along the front wing and beneath the descending side.
            z = -3.62+i*1.01
            box("Rounded sidewall masonry course",(side*4.455,.31,z),(.162,.225,.97),
                p["stone_light"] if i in (1,4,7) else p["stone"],.048)
        box("Near low wall return",(side*2.965,.236,4.29),(4.146,.38,.50),p["stone"],.093)
        box("Near continuous slate coping",(side*2.965,.448,4.29),(4.182,.15,.57),p["slate"],.059)
        box("Near plinth joins side footing",(side*2.977,.065,4.35),(4.139,.20,.63),p["stone_dark"],.061)
        box("Rounded threshold jamb",(side*.914,.243,4.29),(.255,.52,.64),p["stone_light"],.075)

    if observatory:
        left, right = PORTAL_EDGES
        for lower, upper in ((-5.0, left), (right, 5.0)):
            box("Back wall beside the observation doorway",((lower+upper)/2,1.19,-3.94),
                (upper-lower,2.36,.68),p["mortar"],.11)
        box("Solid lintel above the arch",(PORTAL_X,2.286,-3.91),(1.95,.21,.72),p["mortar"],.041)
    else:
        box("Back wall solid core",(0,1.19,-3.94),(10.0,2.36,.68),p["mortar"],.11)
    box("Back wall rounded slate crown",(0,2.38,-3.94),(10.07,.237,.81),p["slate"],.078)
    for i in range(5):
        shift = .50 if i%2 else 0
        for j in range(11):
            x = -4.96+j*.99+shift
            low, high = max(-4.80,x-.47),min(4.80,x+.47)
            pieces = [(low,high)]
            if observatory:
                left, right = PORTAL_EDGES
                pieces = [(low,min(high,left)),(max(low,right),high)]
            for begin, end in pieces:
                if end-begin > .08:
                    shade = ("stone","stone","stone_light","stone")[ (j+2*i+(j//3))%4 ]
                    box("Hand-rounded back masonry",((begin+end)/2,.252+i*.433,-3.575),
                        (end-begin,.409,.148),p[shade],.058)
    box("Floor-level threshold",(0,.022,4.22),(1.79,.142,.62),p["slate_light"],.061)
    box("Smooth entrance apron",(0,-.098,4.66),(1.91,.205,.45),p["stone_light"],.060)


def window_and_portal(p, observatory=False):
    def at(x,z):
        return lambda u,v,w: (x+u,v,z+w)

    if observatory:
        observatory_portal(p, at)
    else:
        portal = at(PORTAL_X,-3.48)
        prism("One framed arch of dressed stone",arch(1.91,1.43,.64,.028),portal,.223,p["stone_light"],.047)
        prism("Recess around the woven blue portal",arch(1.49,1.35,.54,.055),at(PORTAL_X,-3.346),.111,p["base"],.032)
        for i in range(5):
            u = (i-2)*.248
            rise = .460*max(.0,1-((abs(u)+.12)/.66)**2)**.5
            board = [(-.119,.094),(.119,.094),(.119,1.32+rise),(-.119,1.32+rise)]
            prism("Rounded portal plank",board,at(PORTAL_X+u,-3.265),.102,
                  p["blue_light"] if i in (1,3) else p["blue"],.035)
        for y in (.28,1.30):
            box("Honey portal binding",(PORTAL_X,y,-3.181),(1.31,.094,.085),p["wood_light"],.033)
        spindle("Brass portal pull",(PORTAL_X+.2,.83,-3.129),(.078,.115,.078),p["brass"])

    for x in (-3.25,3.32):
        prism("Deep curved window surround",arch(1.11,1.83,.39,1.18),at(x,-3.459),.19,p["wood_light"],.048)
        prism("Cool blue glazing",arch(.882,1.82,.30,1.285),at(x,-3.34),.070,p["glass"],.020)
        box("Thin center window mullion",(x,1.70,-3.287),(.067,.84,.082),p["wood_light"],.023)
        box("Thin cross window mullion",(x,1.738,-3.284),(.89,.071,.087),p["wood_light"],.022)
        box("Rounded window sill",(x,1.183,-3.313),(1.25,.16,.34),p["stone_light"],.051)

    for x in (-1.8,1.70):
        box("Dark sconce wall plate",(x,1.626,-3.425),(.272,.34,.105),p["wood_dark"],.055)
        rail("Wall light dowel",(x,1.78,-3.43),(x,1.78,-3.15),.09,.09,p["wood_light"],.031)
        box("Warm lantern glass",(x,1.554,-3.149),(.235,.277,.202),p["light"],.040)
        for y in (1.409,1.71):
            box("Lantern rounded iron rim",(x,y,-3.151),(.274,.091,.232),p["iron"],.032)
        for dx in (-.111,.111):
            box("Lantern thin support",(x+dx,1.545,-3.045),(.032,.218,.030),p["iron"],.011)


def observatory_portal(p, at):
    outer = arch(2.23,1.69,.66,.03)[2:]
    inner = arch(1.64,1.69,.46,.03)[2:]
    # Stitch the jambs around a single open arch, from the left foot to the right foot.
    ring = [(1.115,.03)] + outer + [(-1.115,.03),(-.82,.03)] + list(reversed(inner)) + [(.82,.03)]
    prism("Open rounded sandstone arch",ring,at(PORTAL_X,-3.73),.88,p["stone_light"],.039)
    box("Flush observation portal sill",(PORTAL_X,-.024,-3.83),(1.69,.108,.95),p["slate_light"],.038)

    prism("Blue observation gate leaf",arch(1.58,1.67,.43,.039),at(PORTAL_X,-3.435),.096,
          p["gate_blue"],.034)
    for dx in (-.53,-.27,0,.27,.53):
        rise = .38*max(0,1-((abs(dx)+.124)/.755)**2)**.5
        board = [(-.125,.075),(.125,.075),(.125,1.65+rise),(-.125,1.65+rise)]
        prism("Inset blue panel",board,at(PORTAL_X+dx,-3.365),.085,
              p["gate_inset"],.033)
    for y in (.30,1.44):
        box("Rounded oak gate crossbar",(PORTAL_X,y,-3.309),(1.48,.084,.105),p["gate_wood"],.032)
    spindle("Brass observation gate pull",(PORTAL_X+.48,.86,-3.26),(.073,.094,.073),p["gate_brass"])


def observatory_contents(p):
    center = PORTAL_X
    box("Observation deck slate foundation",(center,-.269,-5.74),(3.89,.50,3.34),p["base"],.145)
    box("Observation deck limestone lip",(center,-.085,-5.73),(3.77,.224,3.28),p["mortar"],.082)
    for row in range(3):
        for column in range(4):
            key = ("floor","floor_pale","floor","floor_warm")[(row+column)%4]
            box("Alcove limestone floor",(center+(column-1.5)*.91,-.034,-4.56-row*.91),
                (.899,.128,.92),p[key],.038)
    box("North continuation of the portal sill",(center,-.024,-4.29),(1.68,.108,.36),p["slate_light"],.038)
    for side in (-1,1):
        x = center+side*1.79
        box("Observation deck wall foot",(x,.12,-5.70),(.40,.244,3.09),p["stone_dark"],.062)
        box("Observation deck parapet",(x,.36,-5.72),(.327,.42,3.12),p["stone"],.056)
        box("Slate coping roundover",(x,.59,-5.72),(.385,.164,3.16),p["slate"],.051)
        box("Rounded wall pier",(x,.46,-6.93),(.53,.88,.55),p["stone_light"],.082)
        box("Slate pier cap",(x,.92,-6.93),(.57,.145,.61),p["slate"],.043)
    box("Observation deck back wall foot",(center,.091,-7.13),(3.92,.193,.405),p["stone_dark"],.063)
    box("Low tumbled back parapet",(center,.305,-7.13),(3.92,.36,.345),p["stone_light"],.072)
    box("Slate back parapet coping",(center,.526,-7.13),(3.94,.151,.403),p["slate"],.052)

    # The star chart sits on an unobstructed lectern behind the gate.
    box("Chart lectern rounded foot",(center,.145,-6.40),(1.22,.246,.74),p["wood_dark"],.080)
    box("Chart lectern body",(center,.420,-6.40),(1.08,.54,.66),p["wood"],.091)
    box("Chart lectern gold moulding",(center,.696,-6.40),(1.24,.144,.80),p["wood_light"],.062)
    box("Folio calfskin backing",(center,.795,-6.40),(1.09,.085,.708),p["chart_binding"],.037)
    box("Blue plate printed on the parchment",(center,.845,-6.40),(.97,.038,.572),p["chart_field"],.029)
    # Match the collectible's Orion outline to the classroom diagram.
    stars = [(0,-.216),(-.269,-.148),(.206,-.141),(-.137,.020),(-.025,-.003),(.104,-.038),
             (-.22,.213),(.252,.176)]
    for i, (x,z) in enumerate(stars):
        size = .035 if i in (1,3,4,5,7) else .023
        spindle("Star on the observation chart",(center+x,.875,-6.40+z),(size,size,.015),p["chart_ink"])
    for a,b in ((1,0),(0,2),(1,3),(2,5),(3,4),(4,5),(3,6),(5,7),(6,7)):
        x,z = stars[a]
        next_x,next_z = stars[b]
        rail("Constellation inlay",(center+x,.865,-6.40+z),(center+next_x,.865,-6.40+next_z),
             .012,.011,p["chart_ink"],.004)

    # A tiny brass refractor sets the destination apart from the study furniture.
    tripod_head = (center+.96,.94,-6.86)
    for dx,dz in ((-.25,-.19),(.29,-.05),(-.08,.30)):
        rail("Refractor tripod",tripod_head,(tripod_head[0]+dx,.07,tripod_head[2]+dz),
             .071,.068,p["wood_dark"],.018)
    rail("Rounded brass telescope tube",(center+.86,1.00,-6.75),(center+1.42,1.43,-6.94),
         .196,.184,p["brass"],.059)
    spindle("Tinted refractor glass",(center+1.428,1.436,-6.943),(.097,.095,.054),p["glass"],
            direction=(.56,.43,-.19))


def observatory_instrument(p):
    x, z = 2.47, -2.52
    box("Photometer dark beveled foot",(x,1.112,z),(.54,.082,.51),p["wood_dark"],.035)
    box("Photometer brass casing",(x,1.253,z),(.43,.235,.40),p["brass"],.062)
    box("Photometer blue enamel face",(x,1.31,z+.13),(.38,.172,.18),p["blue_dark"],.045)
    spindle("Photometer optical window",(x,1.436,z+.035),(.132,.127,.092),p["instrument_glass"])
    for dx in (-.115,0,.115):
        spindle("Photometer contact on the face",(x+dx,1.28,z+.234),(.024,.027,.021),p["light"])


def rugs_and_furniture(p):
    box("Rounded runner edging",(0,.066,.565),(2.235,.086,3.62),p["blue_dark"],.043)
    box("Muted deep-blue runner field",(0,.099,.565),(2.067,.041,3.48),p["blue"],.018)
    for x in (-.96,.96):
        box("Sewn runner trim",(x,.119,.565),(.034,.020,3.32),p["brass"],.011)
    for z in (-1.17,2.30):
        for column in range(12):
            x = (column-5.50)*.16
            box("Short fine runner fringe",(x,.070,z),(.057,.028,.105),p["floor_pale"],.010)
    star = [(0,-.38),(.09,-.09),(.281,0),(.09,.09),(0,.38),(-.09,.09),(-.281,0),(-.09,-.09)]
    prism("Shared compass motif in the runner",star,lambda x,z,w:(x,.125+w,.63+z),.015,p["brass"],.009)

    book_x, book_z = -3.03, -2.95
    box("Shallow oak bookcase back",(book_x,.571,book_z-.29),(1.69,1.08,.14),p["wood_dark"],.057)
    for x in (book_x-.78,book_x+.78):
        box("Rounded bookcase stile",(x,.604,book_z),(.17,1.15,.66),p["wood"],.054)
    for y in (.149,.64,1.154):
        box("Wide bookcase shelf edge",(book_x,y,book_z),(1.77,.137,.767),p["wood_light"],.048)
    for row,y in enumerate((.230,.723)):
        for index,(height, key) in enumerate(((.28,"blue"),(.31,"cedar"),(.24,"blue_dark"),
                                            (.36,"green"),(.25,"floor_warm"),(.29,"cedar"))):
            x = book_x-.61+index*.205+row*.036
            box("Cloth-bound book spine",(x,y+height/2,book_z+.026),(.168,height,.364),p[key],.029)
            box("Thin book spine band",(x,y+.072,book_z+.209),(.165,.026,.020),p["brass"],.009)

    desk_x,desk_z = 2.4,-2.57
    for dx in (-.79,.79):
        for dz in (-.37,.37):
            box("Chamfered desk leg",(desk_x+dx,.450,desk_z+dz),(.168,.845,.170),p["wood"],.049)
    box("Table underframe",(desk_x,.806,desk_z),(1.91,.21,.918),p["wood_dark"],.057)
    box("Drawer with rounded oak face",(desk_x,.800,desk_z+.478),(.75,.153,.131),p["wood"],.036)
    spindle("Single brass drawer pull",(desk_x,.800,desk_z+.552),(.058,.034,.032),p["brass"])
    box("Wide softly rolled desk top",(desk_x,.981,desk_z),(2.08,.189,1.11),p["wood_light"],.072)
    box("Book cover",(desk_x-.35,1.103,desk_z+.09),(.51,.067,.383),p["blue_dark"],.032)
    box("Stack of cream book pages",(desk_x-.35,1.144,desk_z+.09),(.451,.055,.343),p["floor_pale"],.022)
    box("Upper book cover",(desk_x-.35,1.185,desk_z+.09),(.51,.045,.383),p["blue"],.024)
    spindle("Glazed desk jug",(desk_x+.58,1.286,desk_z-.08),(.146,.144,.226),p["cedar"])
    spindle("Desk jug rolled rim",(desk_x+.58,1.462,desk_z-.08),(.094,.094,.037),p["cedar"])

    chest_x,chest_z = 3.35,-.69
    box("Rounded field chest base",(chest_x,.29,chest_z),(1.08,.51,.72),p["wood"],.077)
    side_profile = [(-.36,.51),(.36,.51)]+[(.36*cos(i*pi/18),.53+.21*sin(i*pi/18)) for i in range(19)]
    prism("Arched chest upper shell",side_profile,lambda z,y,x:(chest_x+x,y,chest_z+z),
          1.10,p["wood_light"],.028)
    for x in (chest_x-.40,chest_x+.40):
        box("Dark chest corner band",(x,.313,chest_z+.357),(.15,.51,.062),p["wood_dark"],.023)
        for y in (.206,.438):
            spindle("Chest brass rivet",(x,y,chest_z+.398),(.025,.020,.025),p["brass"])
    box("Chest lock escutcheon",(chest_x,.532,chest_z+.365),(.178,.211,.065),p["brass"],.032)
    box("Key recess",(chest_x,.537,chest_z+.408),(.033,.064,.025),p["wood_dark"],.014)


def main(observatory=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    palette = {key: clay("Room_"+key,color,rough,metal,glow)
               for key,color,rough,metal,glow in [
        ("floor","BFA278",.85,0,0), ("floor_pale","C5B28B",.87,0,0),
        ("floor_warm","C2A886",.87,0,0), ("mortar","9F8864",.89,0,0),
        ("stone","C1A781",.81,0,0), ("stone_light","CAB48A",.81,0,0),
        ("stone_dark","756B5A",.86,0,0), ("base","495B64",.86,0,0),
        ("slate","586480",.80,0,0), ("slate_light","879BAB",.81,0,0),
        ("wood_dark","5E3B2A",.79,0,0), ("wood","8D5B35",.76,0,0),
        ("wood_light","AA753F",.73,0,0), ("brass","D0A24F",.59,.14,0),
        ("blue","213D83",.71,0,0), ("blue_dark","1B305F",.81,0,0),
        ("blue_light","284E96",.64,0,0), ("glass","6193AC",.51,0,.13),
        ("light","FFCA75",.51,0,.42), ("iron","4D4443",.81,.13,0),
        ("cedar","A95E49",.80,0,0), ("green","657748",.83,0,0),
    ]}
    if observatory:
        # Unique material groups keep movable and replaceable props separate in the compact GLB.
        palette.update({key: clay(name,color,rough,metal,glow)
                        for key,name,color,rough,metal,glow in [
            ("gate_blue","Gate_Surface","213D83",.67,0,0),
            ("gate_inset","Gate_Inlay","355AA2",.69,0,0),
            ("gate_wood","Gate_Binding","AA753F",.73,0,0),
            ("gate_brass","Gate_Latch","D0A24F",.53,.14,0),
            ("chart_binding","Chart_Binding","F1CE84",.78,0,0),
            ("chart_field","Chart_Field","233E72",.76,0,0),
            ("chart_ink","Chart_Ink","E9CE86",.60,0,.17),
            ("instrument_glass","Observatory_Lens","775148",.38,.04,0),
        ]})
    floor_and_walls(palette, observatory)
    window_and_portal(palette, observatory)
    rugs_and_furniture(palette)
    if observatory:
        observatory_contents(palette)
        observatory_instrument(palette)
    target = "observatory-room" if observatory else "room-study"
    bpy.ops.wm.save_as_mainfile(filepath=str(ART / f"{target}.blend"))
    export_groups(ART.parent / f"{target}.glb")
    print(f"ROOM_STUDY_EXPORTED {target}", flush=True)


if __name__ == "__main__":
    main("--observatory" in sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else False)
