"""Original toy village. Blender 5.x; all geometry authored here, no downloaded assets.
Design coordinates are Godot x/y/z; converted to Blender x/-z/y before glTF export.
"""
import bpy, math, random
from pathlib import Path
from mathutils import Vector
random.seed(31)
OUT=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
M={}
def mat(name,color,metal=0,rough=.48):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    M[name]=m
for args in [('grass',(.30,.49,.22)),('rim',(.17,.30,.23)),('earth',(.29,.20,.16)),('cream',(.91,.79,.57)),('stone',(.69,.70,.59)),('path',(.79,.69,.51)),('wood',(.34,.19,.11)),('plank',(.59,.36,.17)),('gold',(.91,.58,.16),.35,.3),('roof',(.13,.31,.42)),('rooflight',(.20,.43,.51)),('leaf',(.24,.43,.18)),('leaflight',(.48,.65,.22)),('leafdark',(.13,.32,.20)),('water',(.15,.53,.62),.22,.22),('foam',(.60,.85,.79)),('window',(.98,.69,.29)),('flower',(.94,.61,.53)),('white',(.96,.91,.73)),('blue',(.12,.32,.61)),('skin',(.86,.60,.37)),('dark',(.055,.075,.08))]: mat(*args)
mat('clay',(.64,.20,.055),0,.6)
mat('claylight',(.84,.32,.08),0,.5)
mat('leafgold',(.57,.68,.15))
mat('leafteal',(.12,.32,.26))
def pos(p): return (p[0],-p[2],p[1])
def finish(o,name,p,s,material,bevel=0):
    o.name=name; o.location=pos(p); o.scale=(s[0],s[2],s[1]); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(M[material])
    if bevel:
        b=o.modifiers.new('Soft toy edges','BEVEL'); b.width=bevel; b.segments=3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
def box(name,p,s,m,bevel=.08):
    bpy.ops.mesh.primitive_cube_add(size=1); return finish(bpy.context.object,name,p,s,m,bevel)
def ball(name,p,s,m):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1)
    o=finish(bpy.context.object,name,p,s,m)
    for f in o.data.polygons:f.use_smooth=True
    return o
def cyl(name,p,r,h,m,vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h)
    o=bpy.context.object; o.name=name; o.location=pos(p); o.data.materials.append(M[m]); b=o.modifiers.new('Soft rims','BEVEL'); b.width=.035;b.segments=2
    o.modifiers.new('Normals','WEIGHTED_NORMAL'); return o
def beam(name,a,b,r,m):
    a,b=Vector(pos(a)),Vector(pos(b));d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=d.length,location=(a+b)/2)
    o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(M[m]);return o
def roof(name,x,y,z,w,d,base="roof",light="rooflight",trim="gold"):
    # Rounded gable prism, front faces south.
    verts=[(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x,y+1.65,z-d/2),(x-w/2,y,z+d/2),(x+w/2,y,z+d/2),(x,y+1.65,z+d/2)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([pos(v) for v in verts],[],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)]);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(M[base]);b=o.modifiers.new('Rounded roof','BEVEL');b.width=.10;b.segments=3;o.modifiers.new('Normals','WEIGHTED_NORMAL')
    for side in [-1,1]:
        for row in range(5):
            dx=(row+.5)*w/10; yy=y+1.65*(1-dx/(w/2))+.025
            for col in range(7):
                zz=z-d/2+(col+.5)*d/7
                t=box('Individual glazed shingle',(x+side*dx,yy,zz),(w/9,.13,d/7-.02),light if (col+row)%3==0 else base,.055)
                t.rotation_euler[1]=side*math.atan2(1.65,w/2)
    beam('Golden roof ridge',(x,y+1.7,z-d/2-.1),(x,y+1.7,z+d/2+.1),.10,trim)
def house(x,z,w=4.5,d=3.6):
    box('Stone foundation',(x,.22,z),(w+.3,.44,d+.3),'stone',.18)
    box('Plaster cottage',(x,1.8,z),(w,3.2,d),'cream',.16)
    for xx in [-w/2+.08,w/2-.08]: box('Timber corner',(x+xx,1.8,z+d/2+.04),(.18,3.25,.16),'wood',.045)
    roof('Gabled roof',x,3.5,z,w+1,d+1,'clay','claylight','wood')
    # Explicit House_Orange reference: timber framing, stone courses and front dormer.
    for yy in [.65,2.85]:box('Horizontal timber',(x,yy,z+d/2+.12),(w,.16,.16),'plank',.04)
    for side in [-1,1]:
        beam('Facade brace',(x+side*w*.44,2.7,z+d/2+.15),(x+side*w*.24,3.35,z+d/2+.15),.07,'wood')
    for k in range(6):
        box('Foundation blocks',(x-w/2+(k+.5)*w/6,.30,z+d/2+.08),(w/6-.035,.50,.24),'stone',.06)
    box('Dormer wall',(x,3.9,z+d*.27),(1.18,.95,.7),'cream',.09)
    roof('Dormer orange roof',x,4.28,z+d*.3,1.65,1.2,'clay','claylight','wood')
    box('Dormer window frame',(x,3.92,z+d*.27+.39),(.62,.73,.11),'plank',.08)
    box('Dormer blue window',(x,3.92,z+d*.27+.46),(.43,.55,.06),'roof',.04)
    box('Dormer mullion',(x,3.92,z+d*.27+.5),(.05,.55,.045),'cream',.015)
    box('Oak door',(x,1.05,z+d/2+.09),(1.05,1.9,.18),'wood',.13)
    for xx in [-.59,.59]:box('Door frame',(x+xx,1.12,z+d/2+.18),(.15,2.1,.2),'plank')
    box('Door lintel',(x,2.15,z+d/2+.15),(1.35,.18,.22),'plank')
    ball('Door knob',(x+.32,1.05,z+d/2+.24),(.08,.08,.08),'gold')
    for xx in [-1.45,1.45]:
        box('Window frame',(x+xx,1.95,z+d/2+.10),(.92,1.03,.15),'wood')
        box('Amber glass',(x+xx,1.95,z+d/2+.20),(.72,.83,.09),'window',.03)
        box('Window mullion',(x+xx,1.95,z+d/2+.27),(.07,.86,.06),'cream',.02)
        box('Window cross',(x+xx,1.95,z+d/2+.27),(.75,.07,.06),'cream',.02)
        box('Window planter',(x+xx,1.29,z+d/2+.31),(1.12,.3,.48),'plank')
        for k in range(5): ball('Planter flowers',(x+xx-.4+k*.2,1.54,z+d/2+.32),(.12,.14,.13),'flower' if k%2 else 'white')
    box('Doorstep',(x,.16,z+d/2+.55),(1.5,.3,.8),'stone')
    box('Chimney',(x+w*.27,4.25,z-.4),(.65,2,.7),'cream')
    box('Chimney cap',(x+w*.27,5.23,z-.4),(.83,.18,.86),'stone')
def leaf(name,p,length,width,angle,m):
    # Pointed folded leaf rather than a sphere. Raised midrib catches soft highlights.
    verts=[(-width,0,0),(0,.08,length*.16),(width,0,0),(0,-.02,-length*.55),(0,.02,length*.58),(0,-.06,0)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([pos(v) for v in verts],[],[(0,1,4),(1,2,4),(0,3,1),(3,2,1),(0,4,5),(4,2,5),(2,3,5),(3,0,5)]);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=pos(p);o.rotation_euler[2]=angle;o.data.materials.append(M[m]);return o

def tree(x,z,scale=1):
    # Tree_Large reference: flared roots, branching trunk, dark teal underleaves,
    # pale yellow-green rosettes above. Local seed keeps geometry reproducible.
    rng=random.Random(int((x+20)*100+(z+20)*11))
    cyl('Tree trunk',(x,1.05*scale,z),.30*scale,2.1*scale,'wood')
    for a in range(5):
        angle=a*math.tau/5
        beam('Flared root',(x,.6*scale,z),(x+math.cos(angle)*.75*scale,.10,z+math.sin(angle)*.75*scale),.14*scale,'wood')
    clusters=[(0,3.55,0,1.10),(-.92,2.75,.16,.9),(.88,2.88,.08,.95),(-.32,3.95,-.25,.78),(.1,2.7,.83,.85)]
    for dx,yy,dz,r in clusters:
        cx=x+dx*scale;cy=yy*scale;cz=z+dz*scale
        beam('Branch',(x,1.15*scale,z),(cx,cy-.3*scale,cz),.13*scale,'wood')
        ball('Canopy shadow core',(cx,cy,cz),(r*.8*scale,r*.65*scale,r*.8*scale),'leafteal')
        for row in range(4):
            elevation=-.4+row*.53
            for k in range(13):
                az=k*math.tau/13+row*.48
                rr=r*scale
                px=cx+math.cos(az)*math.cos(elevation)*rr
                py=cy+math.sin(elevation)*rr*.8
                pz=cz+math.sin(az)*math.cos(elevation)*rr
                m=['leafteal','leaf','leaflight','leafgold'][row]
                o=leaf('Layered NLI leaf',(px,py,pz),rng.uniform(.45,.65)*scale,.18*scale,az,m)
                o.rotation_euler[0]=rng.uniform(-.35,.35)
def fence(x,z,n=4):
    for i in range(n):
        xx=x+i*.9;box('Fence post',(xx,.62,z),(.18,1.25,.18),'cream');ball('Post cap',(xx,1.28,z),(.14,.10,.14),'gold')
    for yy in [.47,.94]:box('Fence rail',(x+(n-1)*.45,yy,z),((n-1)*.9,.12,.14),'plank')
def barrel(x,z):
    cyl('Barrel',(x,.5,z),.40,1,'plank')
    for yy in [.12,.84]:cyl('Barrel hoop',(x,yy,z),.42,.10,'wood')
# Diorama plinth, continuous walkable banks separated by a real river channel.
box('Floating earth base',(0,-1.05,0),(33,1.4,25),'earth',.8)
box('Lower jade rim',(0,-1.65,0),(33.5,.30,25.5),'rim',.16)
box('South grassy bank',(0,-.10,7.15),(33,.45,10.4),'grass',.30)
box('North grassy bank',(0,-.10,-6.65),(33,.45,11.4),'grass',.30)
box('River',(0,-.19,1),(32.5,.17,3.2),'water',.18)
for side in [-1,1]:
    for k in range(21):
        x=-15.7+k*1.55
        if abs(x)<1.7:continue
        ball('Riverbank stones',(x,-.02,1+side*1.55),(random.uniform(.5,.85),.25,.35),'stone')
for k in range(35):
    x=random.uniform(-15,15);z=random.uniform(-.30,2.25)
    box('Water glint',(x,-.085,z),(random.uniform(.12,.55),.015,.035),'foam',.01)
# Bridge open at start; rails prevent walking sideways into water.
for k in range(12):box('Bridge plank',(0,.20,-.65+k*.30),(2.8,.22,.27),'plank',.045)
for x in [-1.4,1.4]:
    for z in [-.8,.4,1.6,2.8]:
        box('Bridge post',(x,.6,z),(.16,1.2,.16),'wood')
        ball('Bridge finial',(x,1.22,z),(.13,.13,.13),'gold')
    for yy in [.63,1.0]:beam('Bridge rail',(x,yy,-.8),(x,yy,2.8),.055,'plank')
# Individual warm stepping stones.
for z in [-10,-9,-8,-7,-6,-5,-4,-3,-2,3.6,4.5,5.4,6.3,7.2,8.1,9,9.9]:
    for x in [-.65,.65]:
        o=box('Path paver',(x+random.uniform(-.12,.12),.15,z),(1.1,.15,.73),'path',.16);o.rotation_euler[2]=random.uniform(-.10,.10)
for side in [-1,1]:
    for k in range(7):box('Village lane',(side*(2+k*.85),.14,-3.1),(1.02,.12,1.1),'path',.17)
house(-7,-6);house(7,-6,4.6,3.8)
# Foreground workshop smaller, leaves center open.
house(-10,7.4,3.9,3.2)
for x,z,s in [(-13,-8,1.15),(-12,-2,.9),(12,-9,1.12),(13,-3,1),(-14,4,.9),(12,5,1.15),(8,10,.82),(-5,10,.75),(3,-10,.75),(-4,-10,.8)]:tree(x,z,s)
for x,z,n in [(-10,-3,4),(5,-3,5),(-14,10,4),(10,9,4)]:fence(x,z,n)
for x,z in [(-4.2,-5.8),(-4.1,-4.8),(10,-5.5),(-7.4,7.5)]:barrel(x,z)
# Well: stone ring with water, roof and winding handle.
for i in range(12):
    a=i*math.tau/12
    o=box('Well rim',(6+math.cos(a)*.95,.53,5.8+math.sin(a)*.95),(.50,.8,.40),'stone',.10);o.rotation_euler[2]=-a
cyl('Well water',(6,.25,5.8),.83,.1,'water')
for x in [4.95,7.05]:box('Well post',(x,1.6,5.8),(.17,2.8,.18),'wood')
roof('Well roof',6,3.0,5.8,3,2.2)
beam('Well spindle',(4.8,2.0,5.8),(7.2,2.0,5.8),.13,'plank')
beam('Well rope',(6,2.,5.8),(6,.8,5.8),.035,'cream')
# Rune pedestal with inlaid gold and blue crystal.
cyl('Rune pedestal',(2.9,.35,5.1),.65,.7,'stone',8)
cyl('Rune gold collar',(2.9,.72,5.1),.59,.1,'gold',8)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1)
finish(bpy.context.object,'RuneCrystal',(2.9,1.18,5.1),(.32,.55,.32),'blue')
# Destination gateway, central route closes until rune is solved.
for x in [-1.7,1.7]:
    box('Gate pier',(x,1.5,-10.3),(.65,3,.7),'cream',.12)
    box('Gate plinth',(x,.2,-10.3),(.9,.4,.95),'stone')
    ball('Gate gold finial',(x,3.15,-10.3),(.28,.28,.28),'gold')
box('Gate lintel',(0,3.1,-10.3),(4.1,.5,.85),'roof',.13)
# Garden tufts and flower clusters, deterministic placement away from routes.
for k in range(100):
    x=random.uniform(-15,15);z=random.uniform(-11,11)
    if abs(z-1)<2 or abs(x)<2 or (abs(abs(x)-7)<3 and z<-3) or (x<-7 and z>5) or (abs(x-6)<2 and abs(z-5.8)<2):continue
    for j in range(3):
        dx=random.uniform(-.22,.22);dz=random.uniform(-.22,.22)
        ball('Garden leaves',(x+dx,.18,z+dz),(.12,.24,.1),'leaflight')
        if k%3==0:ball('Wildflowers',(x+dx,.40,z+dz),(.11,.08,.11),'white' if k%2 else 'flower')
# Lamp posts.
for x,z in [(-2.2,3.5),(2.2,-2.5),(-4,-2.4),(4,-2.4)]:
    cyl('Lamp post',(x,1.0,z),.065,2,'wood')
    box('Lantern',(x,2.1,z),(.33,.48,.33),'window',.06)
    box('Lantern cap',(x,2.39,z),(.45,.12,.45),'roof')
# Save editable Blender source and runtime glTF.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'village.blend'))
# Bake modifiers, then batch the runtime mesh by material. Editable blend remains unmerged.
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.convert(target='MESH')
by_material={}
for o in list(bpy.context.scene.objects):
    if o.type=='MESH':by_material.setdefault(o.data.materials[0].name,[]).append(o)
for name,objects in by_material.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join();bpy.context.object.name='Village_'+name
bpy.ops.export_scene.gltf(filepath=str(OUT/'village.glb'),export_format='GLB',export_apply=True)
print('VILLAGE_EXPORTED',len(bpy.data.objects))
