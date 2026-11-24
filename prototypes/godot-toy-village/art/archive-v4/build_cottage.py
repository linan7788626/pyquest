"""Simplified smooth clay cottage, preserving the Soft Fantasy house silhouette. Original volumetric mesh, design axes x/y(up)/z.
UVs are assigned per component before batching. Source blend preserves components.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
R=random.Random(103)
OUT=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
M={}
def material(name,color,rough=.8,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;M[name]=m
for name,c in [('plaster',(.76,.63,.41)),('plaster_light',(.86,.75,.54)),('oak',(.30,.14,.052)),('oak_light',(.45,.23,.075)),('oak_dark',(.13,.065,.026)),('clay',(.68,.18,.035)),('clay_light',(.82,.27,.052)),('clay_dark',(.49,.105,.025)),('clay_edge',(.90,.36,.075)),('stone',(.48,.44,.33)),('stone_light',(.66,.58,.43)),('stone_dark',(.34,.31,.25)),('ground',(.27,.36,.095)),('earth',(.24,.16,.075)),('rim',(.11,.20,.12)),('leaf',(.19,.35,.10)),('leaf_light',(.36,.48,.13)),('leaf_dark',(.07,.22,.12)),('petal',(.78,.29,.25)),('petal_white',(.94,.84,.53)),('glass',(.055,.15,.20)),('glass_light',(.12,.26,.33)),('iron',(.10,.115,.11)),('gold',(.60,.35,.10)),('soil',(.10,.067,.026))]:material(name,c,.72,.45 if name in ['iron','gold'] else 0)
def pos(p):return (p[0],-p[2],p[1])
def obj(name,verts,faces,m,bevel=0,grain='y'):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([pos(v) for v in verts],[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(M[m])
    # Authored local-space UVs. Long timber grain follows the chosen structural axis.
    uv=mesh.uv_layers.new(name='ComponentUV')
    for f in mesh.polygons:
        n=f.normal
        axis=max(range(3),key=lambda a:abs(n[a]))
        for li in f.loop_indices:
            v=verts[mesh.loops[li].vertex_index]
            if m.startswith('oak'):
                if grain=='x': u,vv=v[1]+v[2]*.3,v[0]
                elif grain=='z':u,vv=v[0]+v[1]*.3,v[2]
                else:u,vv=v[0]+v[2]*.3,v[1]
                uv.data[li].uv=(u*1.3,vv*.27)
            else:
                a,b=(v[0],v[1]) if axis==1 else ((v[0],v[2]) if axis==2 else (v[2],v[1]))
                uv.data[li].uv=(a*.55,b*.55)
    if bevel:
        b=o.modifiers.new('Hand rounded edges','BEVEL');b.width=bevel;b.segments=5
        o.modifiers.new('Weighted face normals','WEIGHTED_NORMAL')
    return o
def box(name,p,s,m,bevel=.035,grain='y'):
    x,y,z=p;w,h,d=[a/2 for a in s]
    return obj(name,[(x-w,y-h,z-d),(x+w,y-h,z-d),(x+w,y+h,z-d),(x-w,y+h,z-d),(x-w,y-h,z+d),(x+w,y-h,z+d),(x+w,y+h,z+d),(x-w,y+h,z+d)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],m,bevel,grain)
def beam(name,a,b,width,depth,m):
    # Axis-specific timbers including diagonal gable braces, as real beveled prisms.
    a,b=Vector(a),Vector(b);d=(b-a).normalized();side=d.cross(Vector((0,0,1)))
    if side.length<.1:side=d.cross(Vector((1,0,0)))
    side.normalize();normal=d.cross(side).normalized();verts=[]
    for p in [a,b]:
        for ss,nn in [(-1,-1),(1,-1),(1,1),(-1,1)]:verts.append(tuple(p+side*width*.5*ss+normal*depth*.5*nn))
    return obj(name,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],m,.035,'x' if abs(d.x)>.65 else ('z' if abs(d.z)>.65 else 'y'))
def sphere(name,p,s,m):
    # Direct UV sphere avoids per-object dependency graph operator overhead.
    verts=[];faces=[];nx=24;ny=14
    for j in range(ny+1):
        t=math.pi*j/ny
        for i in range(nx):
            a=math.tau*i/nx;verts.append((p[0]+s[0]*math.sin(t)*math.cos(a),p[1]+s[1]*math.cos(t),p[2]+s[2]*math.sin(t)*math.sin(a)))
    for j in range(ny):
        for i in range(nx):faces.append((j*nx+i,j*nx+(i+1)%nx,(j+1)*nx+(i+1)%nx,(j+1)*nx+i))
    o=obj(name,verts,faces,m)
    for f in o.data.polygons:f.use_smooth=True
    return o
def ring(name,p,r,thick,m,plane='front'):
    verts=[];faces=[];n=24;k=8
    for i in range(n):
        a=i*math.tau/n
        for j in range(k):
            t=j*math.tau/k;rr=r+thick*math.cos(t)
            q=(rr*math.cos(a),rr*math.sin(a),thick*math.sin(t)) if plane=='front' else (rr*math.cos(a),thick*math.sin(t),rr*math.sin(a))
            verts.append(tuple(p[z]+q[z] for z in range(3)))
    for i in range(n):
        for j in range(k):faces.append((i*k+j,((i+1)%n)*k+j,((i+1)%n)*k+(j+1)%k,i*k+(j+1)%k))
    o=obj(name,verts,faces,m)
    for f in o.data.polygons:f.use_smooth=True
    return o
def prism_profile(name,points,z,depth,m,bevel=.025):
    n=len(points);verts=[(x,y,z+d) for d in [-depth/2,depth/2] for x,y in points]
    return obj(name,verts,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],m,bevel)
def arch_points(cx,bottom,width,shoulder,arch_height):
    pts=[(cx-width/2,bottom),(cx+width/2,bottom)]
    for i in range(13):
        a=i*math.pi/12;pts.append((cx+math.cos(a)*width/2,shoulder+math.sin(a)*arch_height))
    return pts
# Thick cutaway earth with irregular edge rocks, small grass surface.
box('Diorama earth',(0,-.68,1),(17,1.25,14),'earth',.65)
box('Lower green plinth',(0,-1.28,1),(17.12,.18,14.12),'rim',.12)
box('Meadow terrain',(0,-.09,1),(17,.24,14),'ground',.40)
# Body and gables: front at z=1.5, back -3.3.
box('Warm lime plaster walls',(0,2.65,-.9),(6.8,3.65,4.8),'plaster',.18)
for x in [-3.4,3.4]:
    verts=[(x+d,y,z) for d in [-.09,.09] for y,z in [(4.44,-3.3),(4.44,1.5),(6.34,-.9)]]
    obj('Side plaster gable',verts,[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],'plaster_light',.025)
# One course of generous rounded clay stone footings.
for k in range(7):
    x=-3.4+(k+.5)*.97
    for z in [1.53,-3.33]:box('Rounded foundation block',(x,.43,z),(.94,.72,.49),'stone',.12)
for side in [-1,1]:
    for k in range(5):box('Rounded side footing',(side*3.38,.43,-3.3+(k+.5)*.96),(.5,.72,.93),'stone',.12)
# Structural oak frame, warm edge accents, pegs.
for x in [-3.30,-.45,3.30]:box('Facade oak upright',(x,2.6,1.63),(.23,3.2,.24),'oak',.055)
for y in [.94,4.16]:box('Facade cross timber',(0,y,1.65),(6.85,.22,.25),'oak_light',.045,'x')
for x in [-3.36,3.36]:
    box('Side corner timber',(x,2.58,-3.2),(.23,3.2,.23),'oak',.04)
    for y in [.94,3.8]:box('Side cross timber',(x,y,-.9),(.24,.2,4.8),'oak',.04,'z')
# Proper front/back pitched roof, nonuniform overlapping curved tiles.
def tile(name,x,z,base_y,w,length,slope,m,grain='z'):
    verts=[];segments=8
    for bottom in [True,False]:
        for end in [0,1]:
            for k in range(segments+1):
                u=(k/segments-.5)*2;xx=x+u*w/2
                zz=z+end*length
                yy=base_y+slope*end*length+.10*(1-u*u)+(.0 if bottom else .18)
                # Rounded rolled tip and deliberately softened side corners.
                if end==1:yy+=.025*(1-u*u)
                verts.append((xx,yy,zz))
    n=segments+1;faces=[]
    for k in range(segments):
        faces.extend([(k,k+1,n+k+1,n+k),(2*n+k,3*n+k,3*n+k+1,2*n+k+1),(k,2*n+k,2*n+k+1,k+1),(n+k,n+k+1,3*n+k+1,3*n+k)])
    faces.extend([(0,n,3*n,2*n),(n-1,2*n-1,4*n-1,3*n-1)])
    return obj(name,verts,[tuple(reversed(f)) for f in faces] if length<0 else faces,m,.055,grain)
roof_slope=.79
for side in [-1,1]:
    # Underroof is a real closed slab, supporting overhanging tile layers.
    a=-.9;end=a+side*3.5
    verts=[(-4.0,6.34,a),(4.0,6.34,a),(4.0,3.575,end),(-4.0,3.575,end),(-4,6.20,a),(4,6.20,a),(4,3.435,end),(-4,3.435,end)]
    obj('Dark roof underlay',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],'clay_dark',.04)
    # Build lowest row first, then overlapping rows toward ridge.
    for row in reversed(range(5)):
        dist=row*.68;zz=-.9+side*dist
        for col in range(9):
            xx=-4.0+(col+.5)*.89
            # Opening for an actual projecting front dormer.
            if side>0 and -.05<xx<2.05 and .30<zz<1.95:continue
            tile('Overlapping terracotta shingle',xx,zz,6.36-dist*roof_slope,.875,side*.89,-side*roof_slope,'clay')
    box('Carved eave fascia',(0,3.50,-.9+side*3.52),(8.15,.32,.29),'oak',.11,'x')
    for x in [-3.65,3.65]:beam('Outer oak roof edge',(x,6.32,-.9),(x,3.52,-.9+side*3.52),.23,.20,'oak_light')
# Curved terracotta ridge caps.
for k in range(8):
    x=-4.0+(k+.5)*1.0
    sphere('Rounded ridge cap',(x,6.46,-.9),(.53,.18,.30),'clay')
# Dormer projecting through front roof, gable aligned toward player.
box('Dormer plaster volume',(1.0,5.25,1.0),(1.65,1.30,1.6),'plaster',.055)
prism_profile('Dormer front gable',[(.175,5.65),(1.825,5.65),(1,6.42)],1.83,.16,'plaster_light')
for x in [.13,1.87]:box('Dormer vertical frame',(x,5.22,1.91),(.16,1.03,.18),'oak',.035)
box('Dormer sill',(1,4.73,1.99),(2.0,.19,.33),'oak_light',.055,'x')
for side in [-1,1]:
    # Local roof is rotated 90deg: slopes down x, ridge follows z.
    for row in range(2):
        for col in range(4):
            local=tile('Dormer miniature tile',-.84+col*.56,side*row*.55,6.46-row*.55*.82,.55,side*.67,-side*.82,'clay')
            # Geometry was built around the origin in z; rotate around the dormer ridge.
            for v in local.data.vertices:
                gx=v.co.x;gy=v.co.z;gz=-v.co.y
                v.co=pos((1+gz,gy,1.0-gx))
    beam('Dormer sloping trim',(1,6.47,2.0),(1+side*1.14,5.48,2.0),.17,.15,'oak')
for z in [.30,1.05,1.80]:sphere('Dormer ridge cap',(1,6.52,z),(.19,.13,.40),'clay')
# Arched recessed door, shaped wood planks and iron fittings.
cx=1.15
prism_profile('Door shadow recess',arch_points(cx,.73,1.85,2.64,.58),1.79,.12,'oak_dark',.045)
for i in range(3):
    xx=cx-.76+(i+.5)*1.52/3;rel=(xx-cx)/.82;top=2.65+.43*math.sqrt(max(0,1-rel*rel))
    box('Individual arched door plank',(xx,(.77+top)/2,1.90),(1.52/3-.015,top-.77,.20),'oak_light',.065)
for x in [cx-.94,cx+.94]:box('Door jamb',(x,1.77,1.94),(.22,2.12,.30),'oak_light',.065)
# Arch frame segmented voussoirs made of shaped oak, continuous silhouette.
for i in range(12):
    a0=i*math.pi/12;a1=(i+1)*math.pi/12
    points=[(cx+math.cos(a0)*r,2.64+math.sin(a0)*r*.64) for r in [.87,1.10]]+[(cx+math.cos(a1)*r,2.64+math.sin(a1)*r*.64) for r in [1.10,.87]]
    prism_profile('Carved arch surround',points,1.98,.28,'oak_light',.018)
for y in [1.15,2.26]:
    box('Forged iron door strap',(cx-.44,y,2.03),(.70,.12,.055),'iron',.025,'x')
ring('Forged iron door ring',(cx+.44,1.55,2.105),.13,.038,'iron')
# Twin small diamond door windows.
for x in [cx-.29,cx+.29]:
    prism_profile('Door diamond glazing',[(x-.12,2.54),(x,2.72),(x+.12,2.54),(x,2.36)],2.015,.035,'glass',.018)
for k in range(3):box('Worn entrance step',(cx,.15+k*.20,2.65-k*.24),(2.35-k*.12,.22,1.05-k*.13),'stone_light',.08)
# Windows: recessed arch, timber surround, subdivided blue glass, shutters and hinges.
def window(cx,cy,z,width,height,shutters=False):
    prism_profile('Window recessed shadow',arch_points(cx,cy-height/2,width+.22,cy+height*.23,.22),z,.12,'oak_dark',.035)
    prism_profile('Blue window glass',arch_points(cx,cy-height/2+.11,width-.08,cy+height*.23-.03,.16),z+.08,.07,'glass',.025)
    for xx in [cx-width/2-.02,cx+width/2+.02]:box('Window vertical frame',(xx,cy-.02,z+.15),(.16,height+.11,.22),'oak_light',.065)
    box('Window bottom sill',(cx,cy-height/2-.05,z+.19),(width+.38,.15,.36),'oak_light',.04,'x')
    box('Window mullion',(cx,cy,z+.17),(.065,height*.92,.10),'oak_light',.018)
    box('Window crossbar',(cx,cy+.04,z+.17),(width,.07,.10),'oak_light',.018,'x')
    for i in range(12):
        a0=i*math.pi/12;a1=(i+1)*math.pi/12
        points=[(cx+math.cos(a0)*(width/2+.10),cy+height*.23+math.sin(a0)*.31),(cx+math.cos(a1)*(width/2+.10),cy+height*.23+math.sin(a1)*.31),(cx+math.cos(a1)*(width/2-.02),cy+height*.23+math.sin(a1)*.19),(cx+math.cos(a0)*(width/2-.02),cy+height*.23+math.sin(a0)*.19)]
        prism_profile('Continuous curved window surround',points,z+.15,.18,'oak_light',.012)
    if shutters:
        for side in [-1,1]:
            xx=cx+side*(width/2+.37)
            box('Rounded shutter',(xx,cy,z+.09),(.43,height,.18),'oak_light',.075)
            for yy in [cy-height*.31,cy+height*.31]:
                box('Shutter iron hinge',(xx,yy,z+.17),(.51,.085,.05),'iron',.02,'x')
window(-1.88,2.33,1.85,1.12,1.43,True)
window(1.0,5.25,1.96,.72,.81)
# Side window rotated from front geometry to west wall.
start=set(bpy.data.objects)
window(0,2.35,0,1.1,1.35,True)
for o in set(bpy.data.objects)-start:
    for v in o.data.vertices:
        x,y,z=v.co.x,v.co.z,-v.co.y
        v.co=pos((-3.50-z,y,-.8+x))
# Rounded chimney with a hollow cap; three large courses.
for row in range(3):
    y=5.39+row*.55
    for x,z,w,d in [(-1.65,-2.03,.95,.23),(-1.65,-1.27,.95,.23),(-2.05,-1.65,.23,.58),(-1.25,-1.65,.23,.58)]:
        box('Rounded chimney course',(x,y,z),(w,.53,d),'stone',.075)
box('Chimney dark opening',(-1.65,6.86,-1.65),(.62,.05,.53),'oak_dark',.02)
for x,z,w,d in [(-1.65,-2.15,1.25,.22),(-1.65,-1.15,1.25,.22),(-2.18,-1.65,.22,.80),(-1.12,-1.65,.22,.80)]:box('Soft chimney coping',(x,6.96,z),(w,.25,d),'stone_light',.085)
# Planter left, bedding earth, broad rounded foliage, blossoms.
box('Window planter',(-1.88,1.34,2.0),(1.9,.38,.48),'oak',.045,'x')
box('Planter soil',(-1.88,1.54,2.0),(1.72,.07,.34),'soil',.02)
def bush(x,z,s=1,flowers=False):
    for i in range(3):
        a=i*math.tau/3;xx=x+math.cos(a)*.27*s;zz=z+math.sin(a)*.23*s
        sphere('Soft shrub foliage',(xx,.32*s,zz),(.42*s,.40*s,.36*s),'leaf')
    if flowers:
        for i in range(3):
            xx=x+R.uniform(-.35,.35)*s;zz=z+R.uniform(-.3,.3)*s;yy=.71*s
            sphere('Flower heart',(xx,yy,zz),(.045,.04,.045),'gold')
            for j in range(5):
                a=j*math.tau/5;sphere('Flower petal',(xx+math.cos(a)*.08,yy,zz+math.sin(a)*.08),(.067,.025,.052),'petal' if i%2 else 'petal_white')
for x,z,s,f in [(-3.5,1.8,.85,True),(-3.8,.8,.8,False),(3.5,1.3,1,True),(3.8,-.6,.9,False),(-4.3,3.7,.7,True),(4.6,4.3,.6,False),(-4.8,-2.8,.85,False),(-1.88,2.0,.42,True)]:bush(x,z,s,f)
# Oak bench, barrels with staves, iron hoops and rivets.
for x in [-5.3,-3.8]:
    for z in [2.8,3.35]:box('Bench foot',(x,.35,z),(.16,.70,.18),'oak',.04)
for k in range(3):box('Bench seat plank',(-4.55,.73,2.85+k*.22),(1.9,.13,.20),'oak_light',.035,'x')
for yy in [1.03,1.33]:box('Bench back slat',(-4.55,yy,2.72),(1.9,.16,.12),'oak',.035,'x')
def barrel(x,z):
    n=16;verts=[];faces=[]
    for y,r in [(0,.35),(.15,.42),(.5,.46),(.85,.42),(1,.35)]:
        for i in range(n):a=i*math.tau/n;verts.append((x+math.cos(a)*r,y,z+math.sin(a)*r))
    for j in range(4):
        for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    obj('Coopered barrel',verts,[tuple(reversed(f)) for f in faces],'oak_light',.018)
    for yy in [.16,.82]:ring('Barrel iron hoop',(x,yy,z),.415,.04,'iron','top')
    for k in range(5):box('Barrel lid plank',(x+(k-2)*.13,1.01,z),(.125,.06,.63),'oak',.015,'z')
barrel(4.2,.2);barrel(4.65,-.8)
# Five generous rounded stepping stones; restrained color variations.
for i in range(5):
    z=3.2+i*.80;x=1.15+.18*math.sin(z*.8)
    box('Round stepping stone',(x,.045,z),(1.2,.14,.66),'stone_light',.18)
for x,z,s in [(-5.6,5,.35),(4.9,3.9,.29),(-6.8,-.5,.25),(3.7,6.7,.20)]:sphere('Clay garden pebble',(x,.11,z),(s,.18,s*.7),'stone')
# Save all individually named parts, then bake and batch runtime mesh by material.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cottage-study.blend'))
objects=list(bpy.context.scene.objects)
source_count=len(objects)
print('SOURCE_COMPONENTS',source_count,flush=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.convert(target='MESH')
by={}
for o in list(bpy.context.scene.objects):by.setdefault(o.data.materials[0].name,[]).append(o)
for name,objects in by.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name='Cottage_'+name
bpy.ops.export_scene.gltf(filepath=str(OUT.parent/'cottage-study.glb'),export_format='GLB',export_apply=True)
(OUT/'cottage-study-manifest.json').write_text(json.dumps({'source_components':source_count,'runtime_material_groups':len(by),'reference':'House_Orange.png; user-requested smooth clay interpretation','axes':'x horizontal, y up, z south','uvs':'Per-component structural-axis UVs before batching','note':'Original 3D mesh, no billboard facade'},indent=2)+'\n')
print('COTTAGE_READY',flush=True)
