"""
Z-Anatomy FBX dosyalarını atlasın beklediği 5 GLB'ye çevirir.

Çalıştırma (Blender 3.6+ / 4.x):
  blender --background --python tools/build_models.py -- <fbx_klasörü> <çıktı_klasörü>

Üretilen dosyalar: skeleton.glb muscles.glb organs.glb vascular.glb nervous.glb
  + calib.json (ölçek/yön ayarı) + landmarks.json (yapı sınırları, eklem konumları)

Lisans: Z-Anatomy / BodyParts3D verisi CC BY-SA 4.0'dır (atıf + aynı lisansla paylaşım).
"""
import bpy, sys, os, json, time, math, mathutils
import numpy as np
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import z_anatomy_rules as R

argv = sys.argv[sys.argv.index('--') + 1:]
FBX_DIR, OUT_DIR = argv[0], argv[1]
os.makedirs(OUT_DIR, exist_ok=True)

# Kaynak başına üçgen bütçesi (sınıf: bütçe). Tüm kaynak üçgenleri bu bütçeye sığacak şekilde sadeleştirilir.
BUDGET = {
    ('skeleton', 'all'): 210_000,
    ('muscles', 'all'): 230_000,
    ('viscera', 'all'): 100_000,
    ('lymph', 'all'): 12_000,
    ('vascular', 'all'): 130_000,
    ('nervous', 'brain'): 90_000,
    ('nervous', 'nerve'): 70_000,
}
BRAIN_IDS = {'frontal-lobe', 'parietal-lobe', 'temporal-lobe', 'occipital-lobe', 'cerebellum', 'brainstem'}
BRAIN_ORGAN_CAP = 35_000
HEIGHT = 1.765   # kafatası tepesi (m) — layout.ts ile uyumlu
T8_Y = 0.085     # T8 omuru, Blender +Y (= glTF −Z) üzerinde

log = lambda *a: print('[build]', *a, flush=True)


def tri_count(obj):
    me = obj.data
    me.calc_loop_triangles()
    return len(me.loop_triangles)


def world_bbox(obj, M=None):
    pts = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
    if M is not None:
        pts = [M @ p for p in pts]
    mn = mathutils.Vector((min(p[i] for p in pts) for i in range(3)))
    mx = mathutils.Vector((max(p[i] for p in pts) for i in range(3)))
    return mn, mx


def to_gltf(v):  # Blender (x,y,z) -> glTF/three (x, z, -y)
    return [round(v[0], 4), round(v[2], 4), round(-v[1], 4)]


def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for _ in range(2):
        bpy.data.orphans_purge(do_recursive=True)


def import_fbx(path):
    t = time.time()
    bpy.ops.import_scene.fbx(filepath=path, use_anim=False, ignore_leaf_bones=True)
    log('içe aktarıldı', os.path.basename(path), f'{time.time() - t:.0f}s', 'nesne:', len(bpy.data.objects))


def bake_world(o):
    """Üst-alt ilişkisini ve dünya dönüşümünü mesh verisine işler (nesne birim matrise döner)."""
    if o.data.users > 1:
        o.data = o.data.copy()
    mw = o.matrix_world.copy()
    o.parent = None
    o.data.transform(mw)
    o.matrix_world = mathutils.Matrix.Identity(4)


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    out = bpy.context.view_layer.objects.active
    out.name = name
    out.data.name = name
    return out


def decimate(obj, ratio):
    if ratio >= 0.999 or tri_count(obj) < 300:
        return
    ratio = max(ratio, 0.03)
    mod = obj.modifiers.new('dec', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = ratio
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)


# ───────── Kalibrasyon (iskeletten) ─────────

def calibrate(groups):
    """Yön, ölçek ve konum dönüşümünü (Matrix) hesaplar."""
    def bb(ids):
        mn = mathutils.Vector((1e9,) * 3); mx = mathutils.Vector((-1e9,) * 3)
        for i in ids:
            for o, _side in groups.get(('skeleton', i), []):
                a, b = world_bbox(o)
                mn = mathutils.Vector((min(mn[k], a[k]) for k in range(3)))
                mx = mathutils.Vector((max(mx[k], b[k]) for k in range(3)))
        return mn, mx

    s_mn, s_mx = bb(['sternum'])
    t_mn, t_mx = bb(['thoracic-spine'])
    ster_y = (s_mn.y + s_mx.y) / 2
    spine_y = (t_mn.y + t_mx.y) / 2
    rot = mathutils.Matrix.Identity(4)
    if ster_y > spine_y:  # ön yüz +Y ise 180° döndür (ön yüz -Y olmalı → glTF +Z)
        rot = mathutils.Matrix.Rotation(math.pi, 4, 'Z')
        log('yön: ön yüz +Y bulundu, Z etrafında 180° döndürülecek')
    else:
        log('yön: ön yüz zaten -Y')

    # sol/sağ denetimi (döndürmeden sonra anatomik sol +X olmalı)
    lx = [(rot @ ((o.matrix_world @ mathutils.Vector(o.bound_box[0])))).x for o, sd in groups.get(('skeleton', 'femur'), []) if sd == 'l']
    rx = [(rot @ ((o.matrix_world @ mathutils.Vector(o.bound_box[0])))).x for o, sd in groups.get(('skeleton', 'femur'), []) if sd == 'r']
    log('sol femur x', lx, 'sağ femur x', rx, '(sol > sağ olmalı)')

    f_mn, _ = bb(['foot-bones'])
    _, k_mx = bb(['skull'])
    height = k_mx.z - f_mn.z
    s = HEIGHT / height
    log(f'boy {height:.3f} m -> ölçek {s:.4f}')

    scale = mathutils.Matrix.Scale(s, 4)
    t8 = None
    for i in ['thoracic-spine']:
        for o, _ in groups.get(('skeleton', i), []):
            if o.name.lower().startswith('vertebra t8'):
                a, b = world_bbox(o)
                t8 = (a + b) / 2
    if t8 is None:
        t8 = mathutils.Vector(((t_mn.x + t_mx.x) / 2, spine_y, (t_mn.z + t_mx.z) / 2))
    t8p = scale @ rot @ t8
    floor_z = s * f_mn.z
    M = mathutils.Matrix.Translation((-t8p.x, T8_Y - t8p.y, -floor_z)) @ scale @ rot
    return M, {'rotZ180': ster_y > spine_y, 'scale': s, 'height_raw': height, 'M': [list(r) for r in M]}


# ───────── Ana akış ─────────
M = None
store = defaultdict(dict)   # target -> id -> {'co','tri','tint'}  (düz numpy dizileri; Blender nesnesi tutulmaz)
landmarks = {'bbox': {}, 'sides': {}}
order = os.environ.get('ONLY', ','.join(['SkeletalSystem100.fbx', 'MuscularSystem100.fbx', 'VisceralSystem100.fbx',
         'LymphoidOrgans100.fbx', 'CardioVascular41.fbx', 'NervousSystem100.fbx'])).split(',')


def capture(obj):
    me = obj.data
    me.calc_loop_triangles()
    co = np.empty(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get('co', co)
    tri = np.empty(len(me.loop_triangles) * 3, dtype=np.int32)
    me.loop_triangles.foreach_get('vertices', tri)
    return co, tri


def build_object(name, co, tri, tint):
    me = bpy.data.meshes.new(name)
    nv, nt = len(co) // 3, len(tri) // 3
    me.vertices.add(nv)
    me.vertices.foreach_set('co', co)
    me.loops.add(nt * 3)
    me.loops.foreach_set('vertex_index', tri)
    me.polygons.add(nt)
    me.polygons.foreach_set('loop_start', np.arange(0, nt * 3, 3, dtype=np.int32))
    me.polygons.foreach_set('loop_total', np.full(nt, 3, dtype=np.int32))
    me.polygons.foreach_set('use_smooth', np.ones(nt, dtype=bool))
    me.update(calc_edges=True)
    me.validate()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob['tint'] = tint
    ob['atlasId'] = name
    return ob


for fn in order:
    path = os.path.join(FBX_DIR, fn)
    if not os.path.exists(path):
        log('ATLANDI (dosya yok):', fn)
        continue
    source = R.SOURCES[fn]
    clear_scene()
    import_fbx(path)

    groups = defaultdict(list)   # (target,id) -> [(obj, side)]
    tints = {}
    n_keep = n_drop = 0
    for o in list(bpy.data.objects):
        if o.type != 'MESH':
            continue
        c = R.classify(source, o.name)
        if not c:
            n_drop += 1
            continue
        _base, side, _kind = R.parse_name(o.name)
        target, id_, tint = c
        groups[(target, id_)].append((o, side))
        tints[(target, id_)] = tint
        n_keep += 1
    log(f'{source}: tutulan {n_keep}, atılan {n_drop}, grup {len(groups)}')

    if source == 'skeleton':
        M, calib = calibrate(groups)
        json.dump(calib, open(os.path.join(OUT_DIR, 'calib.json'), 'w'), indent=2)
    if M is None:
        raise RuntimeError('İlk kaynak iskelet olmalı (kalibrasyon).')

    # yan bazlı sınırlar (eklem konumları için)
    for (target, id_), items in groups.items():
        for o, side in items:
            if side:
                mn, mx = world_bbox(o, M)
                a, b = to_gltf(mn), to_gltf(mx)
                cur = landmarks['sides'].setdefault(id_, {}).get(side)
                if cur:
                    a = [min(cur[0][k], a[k]) for k in range(3)]
                    b = [max(cur[1][k], b[k]) for k in range(3)]
                landmarks['sides'][id_][side] = [a, b]

    # dünya dönüşümünü, üst nesneler silinmeden ÖNCE mesh verisine işle
    bpy.context.view_layer.update()
    for items in groups.values():
        for o, _ in items:
            bake_world(o)

    # tutulmayan nesneleri sil
    keep = {o for items in groups.values() for o, _ in items}
    for o in list(bpy.data.objects):
        if o not in keep:
            bpy.data.objects.remove(o, do_unlink=True)

    def klass(id_):
        if source == 'nervous':
            return 'brain' if id_ in BRAIN_IDS else 'nerve'
        return 'all'
    totals = defaultdict(int)
    for (target, id_), items in groups.items():
        for o, _ in items:
            totals[klass(id_)] += tri_count(o)
    ratios = {k: min(1.0, BUDGET[(source, k)] / max(v, 1)) for k, v in totals.items()}
    log(f'{source}: üçgen {dict(totals)} -> oran {({k: round(r, 3) for k, r in ratios.items()})}')

    for (target, id_), items in list(groups.items()):
        objs = [o for o, _ in items]
        joined = join(objs, id_)
        decimate(joined, ratios[klass(id_)])
        joined.data.transform(M)
        mn, mx = world_bbox(joined)
        landmarks['bbox'][id_] = [to_gltf(mn), to_gltf(mx)]
        co, tri = capture(joined)
        store[target][id_] = {'co': co, 'tri': tri, 'tint': tints[(target, id_)]}
        log(f'  {target:9s} {id_:20s} tri={len(tri) // 3:7d}')
        bpy.data.objects.remove(joined, do_unlink=True)
    bpy.data.orphans_purge(do_recursive=True)

# ───────── Dışa aktarım ─────────
def export_target(target, filename):
    items = store.get(target, {})
    if target == 'organs' and 'brain' not in items:
        lobes = [store['nervous'][i] for i in BRAIN_IDS if i in store.get('nervous', {})]
        if lobes:
            cos, tris, off = [], [], 0
            for l in lobes:
                cos.append(l['co']); tris.append(l['tri'] + off); off += len(l['co']) // 3
            tmp = build_object('brain', np.concatenate(cos), np.concatenate(tris), '#e6b3b0')
            decimate(tmp, min(1.0, BRAIN_ORGAN_CAP / max(tri_count(tmp), 1)))
            co, tri = capture(tmp)
            bpy.data.objects.remove(tmp, do_unlink=True)
            items['brain'] = {'co': co, 'tri': tri, 'tint': '#e6b3b0'}
            mn = [float(np.min(co[k::3])) for k in range(3)]; mx = [float(np.max(co[k::3])) for k in range(3)]
            landmarks['bbox']['brain'] = [to_gltf(mn), to_gltf(mx)]
    if not items:
        log('boş hedef, atlandı:', target)
        return
    clear_scene()
    objs = [build_object(i, d['co'], d['tri'], d['tint']) for i, d in items.items()]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    out = os.path.join(OUT_DIR, filename)
    bpy.ops.export_scene.gltf(
        filepath=out, export_format='GLB', use_selection=True, export_yup=True,
        export_apply=False, export_materials='NONE', export_extras=True,
        export_cameras=False, export_lights=False, export_animations=False,
    )
    log(f'YAZILDI {filename}: {os.path.getsize(out) / 1e6:.1f} MB, {len(objs)} nesne,',
        sum(len(d['tri']) // 3 for d in items.values()), 'üçgen')


for tgt, fname in [('skeleton', 'skeleton.glb'), ('muscles', 'muscles.glb'), ('organs', 'organs.glb'),
                   ('vascular', 'vascular.glb'), ('nervous', 'nervous.glb')]:
    export_target(tgt, fname)

json.dump(landmarks, open(os.path.join(OUT_DIR, 'landmarks.json'), 'w'), indent=1)
log('BİTTİ')
