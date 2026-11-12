"""Elle verilen yol noktalarını gerçek mesh köşelerine göre lümenin ortasına doğru iter.
Kullanım: python3 tools/refine_path.py <glb> <waypoints.json> <out.json> [max_shift]
"""
import sys, json, numpy as np
from scipy.spatial import cKDTree
from scipy.interpolate import CubicSpline
exec(open(__file__.replace('refine_path.py', 'centerline.py')).read().split('def raster')[0])

glb, wp, outp = sys.argv[1:4]
shift = float(sys.argv[4]) if len(sys.argv) > 4 else 0.9
parts = load_glb(glb)
V = np.vstack([v for v, _ in parts.values()])
tree = cKDTree(V)
P = np.array(json.load(open(wp)), float)
P0 = P.copy()
rng = np.random.default_rng(1)

def clear(p): return tree.query(p)[0]

for it in range(160):
    for i in range(len(P)):
        best, bs = P[i], clear(P[i]) - 0.15 * np.linalg.norm(P[i] - P0[i])
        for _ in range(14):
            c = P[i] + rng.normal(0, 0.18, 3)
            if np.linalg.norm(c - P0[i]) > shift: continue
            s = clear(c) - 0.15 * np.linalg.norm(c - P0[i])
            # komşularla düzgünlük
            if 0 < i < len(P) - 1: s -= 0.25 * np.linalg.norm(c - (P[i - 1] + P[i + 1]) / 2)
            if s > bs: best, bs = c, s
        P[i] = best

# yoğun örnekle
seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
t = np.concatenate([[0], np.cumsum(seg)])
cs = CubicSpline(t, P)
ds = np.arange(0, t[-1], 0.4)
R = cs(ds)
cl = np.array([clear(p) for p in R])
json.dump({'waypoints': P.round(2).tolist(), 'clearance': [round(float(x), 2) for x in cl[::2]]}, open(outp, 'w'))
print('clearance min/mean', cl.min().round(2), cl.mean().round(2))
print('waypoint clearances', [round(float(clear(p)), 2) for p in P])
