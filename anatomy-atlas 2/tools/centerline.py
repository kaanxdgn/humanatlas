"""Kapalı lümen yüzeylerinden (hava yolu, mide) merkez hattı çıkarır (voksel + mesafe dönüşümü + en düşük maliyetli yol).
Kullanım: python3 tools/centerline.py <glb> <config.json> <out.json>
config: {"parts": [...adlar...], "start": [x,y,z] | "top:<part>", "end": [x,y,z] | "far:<part>", "res": 0.08}
"""
import sys, json, struct, numpy as np
from scipy import ndimage as ndi
from skimage.graph import route_through_array

def load_glb(path):
    b = open(path, 'rb').read()
    jl, _ = struct.unpack_from('<II', b, 12)
    js = json.loads(b[20:20 + jl])
    off = 20 + jl + 8
    bin_ = b[off:]
    def acc(i):
        a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']]
        ct = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a['componentType']]
        n = {'SCALAR': 1, 'VEC3': 3}[a['type']]
        o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        return np.frombuffer(bin_, dtype=ct, count=a['count'] * n, offset=o).reshape(-1, n) if n > 1 else np.frombuffer(bin_, dtype=ct, count=a['count'], offset=o)
    parts = {}
    for node in js['nodes']:
        if 'mesh' not in node: continue
        m = js['meshes'][node['mesh']]
        V, T = [], []; base = 0
        for p in m['primitives']:
            v = acc(p['attributes']['POSITION']).astype(np.float64); t = acc(p['indices']).reshape(-1, 3).astype(np.int64)
            V.append(v); T.append(t + base); base += len(v)
        parts[node.get('name', m.get('name'))] = (np.vstack(V), np.vstack(T))
    return parts

def raster(V, T, res, org, shape, grid):
    # üçgenleri yoğun örnekleyerek yüzey vokselleri
    for t in T:
        a, b, c = V[t[0]], V[t[1]], V[t[2]]
        n = int(max(np.linalg.norm(b - a), np.linalg.norm(c - a), np.linalg.norm(c - b)) / (res * 0.5)) + 2
        u = np.linspace(0, 1, n)
        uu, vv = np.meshgrid(u, u); m = uu + vv <= 1
        pts = a + np.outer(uu[m], b - a) + np.outer(vv[m], c - a)
        idx = np.floor((pts - org) / res).astype(int)
        grid[idx[:, 0], idx[:, 1], idx[:, 2]] = True

def main():
    glb, cfgp, outp = sys.argv[1:4]
    cfg = json.load(open(cfgp)); res = cfg.get('res', 0.08)
    parts = load_glb(glb)
    sel = [parts[n] for n in cfg['parts']]
    allv = np.vstack([v for v, _ in sel])
    org = allv.min(0) - 1.0; shape = tuple(np.ceil((allv.max(0) + 1.0 - org) / res).astype(int))
    print('grid', shape)
    surf = np.zeros(shape, bool)
    for V, T in sel: raster(V, T, res, org, shape, surf)
    surf = ndi.binary_dilation(surf, iterations=cfg.get('dil', 3))
    outside = ndi.binary_fill_holes(surf)
    # uçları açık tüpler için: her eksende 2B kesitlerde delik doldur, birleşimini al
    for ax in range(3):
        f = np.zeros_like(surf)
        for i in range(shape[ax]):
            sl = [slice(None)] * 3; sl[ax] = i; sl = tuple(sl)
            f[sl] = ndi.binary_fill_holes(surf[sl])
        outside |= f
    inside = outside & ~surf
    print('inside voxels', inside.sum())
    dt = ndi.distance_transform_edt(inside)
    def pt(spec):
        if isinstance(spec, list): p = np.array(spec)
        else:
            kind, name = spec.split(':'); v = parts[name][0]
            if kind == 'top': p = v[np.argsort(-v[:, 1])[:50]].mean(0)
            else:
                p = v[np.argsort(-np.linalg.norm(v - startp, axis=1))[:50]].mean(0)
        i = np.floor((p - org) / res).astype(int)
        # en yakın iç vokselin en derinine kay
        r = 12
        sl = tuple(slice(max(0, i[k] - r), i[k] + r + 1) for k in range(3))
        sub = dt[sl]; j = np.unravel_index(np.argmax(sub), sub.shape)
        return tuple(sl[k].start + j[k] for k in range(3))
    startp = np.array(cfg['start']) if isinstance(cfg['start'], list) else parts[cfg['start'].split(':')[1]][0][np.argsort(-parts[cfg['start'].split(':')[1]][0][:, 1])[:50]].mean(0)
    s = pt(cfg['start']); e = pt(cfg['end'])
    cost = np.where(inside, 1.0 / (dt + 0.3) ** 3, 1e4)
    path, c = route_through_array(cost, s, e, fully_connected=True, geometric=True)
    P = org + (np.array(path) + 0.5) * res
    # düzgünleştir + yeniden örnekle
    k = 9
    ker = np.ones(k) / k
    Ps = np.stack([np.convolve(np.pad(P[:, a], (k // 2, k // 2), mode='edge'), ker, mode='valid') for a in range(3)], 1)
    seg = np.linalg.norm(np.diff(Ps, axis=0), axis=1); cum = np.concatenate([[0], np.cumsum(seg)])
    step = cfg.get('step', 0.5); ds = np.arange(0, cum[-1], step)
    R = np.stack([np.interp(ds, cum, Ps[:, a]) for a in range(3)], 1)
    from scipy.spatial import cKDTree
    tree = cKDTree(allv)
    rad = tree.query(R)[0]  # en yakın duvara uzaklık (ışık ölçeği için)
    json.dump({'length': float(cum[-1]), 'points': R.round(2).tolist(), 'radius': rad.round(2).tolist()}, open(outp, 'w'))
    print('length', cum[-1], 'n', len(R), 'radius min/max', rad.min(), rad.max())

main()
