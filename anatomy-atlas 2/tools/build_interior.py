"""İç gezinti için gerçek Z-Anatomy geometrisini (kalp odacıkları/kapaklar, hava yolu, mide) GLB'ye aktarır.
Kullanım:
  blender --background --python tools/build_interior.py -- <CardioVascular.fbx> <Visceral.fbx> <out_dir>
Birim: 1 birim = 1 cm. Çıkış: heart.glb, airway.glb, stomach.glb, landmarks.json
"""
import bpy, sys, json, os, mathutils

cardio, visc, out = sys.argv[-3:]
SCALE = 100.0

HEART = ['left ventricle', 'right ventricle', 'left atrium', 'right atrium', 'leaflet', 'papillary muscle',
         'ascending aorta', 'aortic arch', 'pulmonary trunk', 'bifurcation of pulmonary trunk', 'superior vena cava',
         'inferior vena cava (thoracic part)', 'coronary sinus', 'thoracic aorta']
AIR = ['trachea', 'bronch']
STOM = ['stomach', 'oesophagus', 'duodenum']

def pick(names, keys, exclude=()):
    res = []
    for o in names:
        if o.type != 'MESH' or len(o.data.polygons) < 30:
            continue
        n = o.name.lower()
        if any(k in n for k in keys) and not any(x in n for x in exclude):
            res.append(o)
    return res

def export(objs, name, lm):
    for o in bpy.data.objects:
        o.select_set(False)
    # dünya matrisini geometriye işle, ölçekle
    S = mathutils.Matrix.Scale(SCALE, 4)
    allv = []
    for o in objs:
        me = o.data
        M = S @ o.matrix_world
        me.transform(M)
        o.parent = None
        o.matrix_world = mathutils.Matrix.Identity(4)
        allv += [v.co.copy() for v in me.vertices]
    c = sum(allv, mathutils.Vector()) / len(allv)
    for o in objs:
        o.data.transform(mathutils.Matrix.Translation(-c))
        for p in o.data.polygons:
            p.use_smooth = True
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    for o in objs:
        vs = [v.co for v in o.data.vertices]
        mn = [min(v[i] for v in vs) for i in range(3)]
        mx = [max(v[i] for v in vs) for i in range(3)]
        # Blender (x,y,z) -> glTF (x,z,-y)
        gmn = [mn[0], mn[2], -mx[1]]
        gmx = [mx[0], mx[2], -mn[1]]
        lm[name][o.name] = {'min': [round(x, 3) for x in gmn], 'max': [round(x, 3) for x in gmx]}
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, name + '.glb'), export_format='GLB', use_selection=True,
                              export_materials='NONE', export_apply=False, export_yup=True)
    for o in objs:
        o.select_set(False)

lm = {'heart': {}, 'airway': {}, 'stomach': {}}
os.makedirs(out, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=cardio)
export(pick(bpy.data.objects, HEART, exclude=['segmental', 'lung', 'vein of', 'artery of', 'cardiac vein', 'sinus.', 'sagittal', 'petrosal', 'cavernous', 'transverse', 'sigmoid', 'straight', 'occipital', 'intercavernous', 'branch', 'coronary artery']), 'heart', lm)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=visc)
export(pick(bpy.data.objects, AIR), 'airway', lm) if False else None
air = pick(bpy.data.objects, AIR, exclude=['mucosa'])
export(air, 'airway', lm)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=visc)
export(pick(bpy.data.objects, STOM, exclude=['mucosa', 'impression', 'bladder', 'lobe', 'pancreat']), 'stomach', lm)

json.dump(lm, open(os.path.join(out, 'landmarks.json'), 'w'), indent=1)
print('OK', {k: len(v) for k, v in lm.items()})
