"""
Z-Anatomy 'Regions of human body' FBX -> skin.glb (opak, düzgün gölgelenmiş tek parça vücut yüzeyi).
Kullanım: blender --background --python tools/build_skin.py -- <Regions.fbx> <calib.json> <out.glb> [preview.png]
calib.json, build_models.py'nin yazdığı dosyadır (iskeletle aynı hizalama matrisi).
"""
import bpy, bmesh, sys, json, mathutils, os

argv = sys.argv[sys.argv.index('--') + 1:]
FBX, CALIB, OUT = argv[0], argv[1], argv[2]
PREVIEW = argv[3] if len(argv) > 3 else None
M = mathutils.Matrix(json.load(open(CALIB))['M'])

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.fbx(filepath=FBX, use_anim=False, ignore_leaf_bones=True)
bpy.context.view_layer.update()

keep = []
for o in list(bpy.data.objects):
    if o.type != 'MESH':
        continue
    if o.name.startswith(('Cross Section', 'Cube', 'Pubic hairs')) or len(o.data.polygons) <= 8:
        continue
    keep.append(o)
for o in keep:
    if o.data.users > 1:
        o.data = o.data.copy()
    mw = o.matrix_world.copy()
    o.parent = None
    o.data.transform(mw)
    o.matrix_world = mathutils.Matrix.Identity(4)
# genital yamalarını sil, kapladıkları alanı (x,z) kaydet; boşluk sonra temiz bir ızgarayla doldurulur
URO_BOX = None
for o in list(keep):
    if o.name.startswith('Urogenital region'):
        xs = [v.co.x for v in o.data.vertices]; zs = [v.co.z for v in o.data.vertices]
        box = (min(xs), max(xs), min(zs), max(zs))
        URO_BOX = box if URO_BOX is None else (min(URO_BOX[0], box[0]), max(URO_BOX[1], box[1]),
                                                min(URO_BOX[2], box[2]), max(URO_BOX[3], box[3]))
        keep.remove(o)
        bpy.data.objects.remove(o, do_unlink=True)
print('[skin] genital kutu:', URO_BOX)
keepset = set(keep)
for o in list(bpy.data.objects):
    if o not in keepset:
        bpy.data.objects.remove(o, do_unlink=True)

bpy.ops.object.select_all(action='DESELECT')
for o in keep:
    o.select_set(True)
bpy.context.view_layer.objects.active = keep[0]
bpy.ops.object.join()
body = bpy.context.view_layer.objects.active
body.name = 'skin'
body.data.name = 'skin'
body.data.transform(M)
print('[skin] poligon', len(body.data.polygons), 'yamalar', len(keep))

# dikişleri kapat, iç/dış yönünü düzelt
bm = bmesh.new(); bm.from_mesh(body.data)
# boşluğu, çevre cildin yüzey yüksekliğinden (kd-ağacı) üretilmiş temiz bir ızgarayla doldur
from mathutils import kdtree
if URO_BOX:
    m = 0.008
    x0, x1, z0, z1 = URO_BOX[0] - m, URO_BOX[1] + m, URO_BOX[2] - m, URO_BOX[3] + m
    skin_pts = [v for v in bm.verts if v.co.y < -0.01 and abs(v.co.x) < 0.16 and 0.58 < v.co.z < 1.0
                and not (x0 < v.co.x < x1 and z0 < v.co.z < z1)]
    kd = kdtree.KDTree(len(skin_pts))
    for i, v in enumerate(skin_pts):
        kd.insert((v.co.x, 0.0, v.co.z), i)
    kd.balance()
    N = 28
    grid = []
    for iz in range(N + 1):
        row = []
        for ix in range(N + 1):
            x = x0 + (x1 - x0) * ix / N; z = z0 + (z1 - z0) * iz / N
            hits = kd.find_n((x, 0.0, z), 14)
            w = [1.0 / (d + 4e-3) for _, _, d in hits]
            y = sum(skin_pts[i].co.y * wi for (_, i, _), wi in zip(hits, w)) / sum(w)
            row.append(bm.verts.new((x, y + 0.003, z)))
        grid.append(row)
    for iz in range(N):
        for ix in range(N):
            bm.faces.new((grid[iz][ix], grid[iz][ix + 1], grid[iz + 1][ix + 1], grid[iz + 1][ix]))
    gv = [v for r in grid for v in r]
    inner = [grid[iz][ix] for iz in range(2, N - 1) for ix in range(2, N - 1)]
    for _ in range(25):
        bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=False, use_axis_y=True, use_axis_z=False)
    print('[skin] ızgara dolduruldu:', len(gv), 'köşe; referans:', len(skin_pts))

bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0015)
# dejenere yüzleri / kopuk köşeleri temizle (aksi halde NaN normal -> siyah lekeler)
bmesh.ops.dissolve_degenerate(bm, dist=1e-5, edges=bm.edges)
bad = [f for f in bm.faces if f.calc_area() < 1e-9]
bmesh.ops.delete(bm, geom=bad, context='FACES')
loose = [v for v in bm.verts if not v.link_faces]
bmesh.ops.delete(bm, geom=loose, context='VERTS')
print('[skin] silinen dejenere yüz:', len(bad), 'kopuk köşe:', len(loose))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

bm.to_mesh(body.data); bm.free()
for p in body.data.polygons:
    p.use_smooth = True

# yumuşatma: Subsurf (keskin yama köşelerini yuvarlar) + hafif Smooth düzeltme
sub = body.modifiers.new('sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 1
sm = body.modifiers.new('smooth', 'CORRECTIVE_SMOOTH'); sm.factor = 0.6; sm.iterations = 8
bpy.context.view_layer.objects.active = body
for m in list(body.modifiers):
    bpy.ops.object.modifier_apply(modifier=m.name)
import numpy as _np
_co = _np.empty(len(body.data.vertices) * 3, dtype=_np.float32); body.data.vertices.foreach_get('co', _co)
print('[skin] NaN köşe:', int(_np.isnan(_co).sum()))
body.data.calc_loop_triangles()
_ar = [t.area for t in body.data.loop_triangles]
print('[skin] sıfır alanlı üçgen:', sum(1 for a in _ar if a < 1e-12))
dec = body.modifiers.new('dec', 'DECIMATE'); dec.decimate_type = 'COLLAPSE'; dec.ratio = float(os.environ.get('SKIN_RATIO', '0.34'))
bpy.ops.object.modifier_apply(modifier=dec.name)
print('[skin] son üçgen ~', sum(len(p.vertices) - 2 for p in body.data.polygons))
v = [body.matrix_world @ mathutils.Vector(c) for c in body.bound_box]
print('[skin] bbox', [round(min(p[i] for p in v), 3) for i in range(3)], [round(max(p[i] for p in v), 3) for i in range(3)])

bpy.ops.object.select_all(action='DESELECT'); body.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_yup=True,
                          export_materials='NONE', export_normals=True, export_apply=False)
print('[skin] yazıldı', OUT, round(os.path.getsize(OUT) / 1e6, 1), 'MB')

if PREVIEW:
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'SINGLE'
    sc.display.shading.single_color = (0.85, 0.65, 0.55)
    sc.render.resolution_x, sc.render.resolution_y = 700, 1000
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.0
    for name, loc, rot in [('front', (0, -4, 0.9), (1.5708, 0, 0)), ('side', (4, 0, 0.9), (1.5708, 0, 1.5708))]:
        cam.location = loc; cam.rotation_euler = rot
        sc.render.filepath = PREVIEW.replace('.png', f'_{name}.png'); bpy.ops.render.render(write_still=True)
