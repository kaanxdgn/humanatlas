import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Color, DoubleSide, Mesh, MeshPhysicalMaterial, type Object3D } from 'three';
import { ANATOMY_BY_ID } from '@/data/anatomyData';
import type { Vec3 } from '@/data/systemsConfig';
import { applyDissolve, createStdDissolveUniforms, type StdDissolveUniforms } from '../../shaders/dissolve';
import { applyPulse, type PulseOptions, type PulseUniforms } from '../../shaders/pulse';
import { useBodyShared } from './bodyContext';
import { PATHOLOGIES } from '@/data/stories';
import { useExtrasStore } from '@/store/useExtrasStore';
import { beatEnvelope, vitals } from './heartbeat';
import { accelerateRaycast } from './bvh';
import { createVisual, stepVisual, visualOpacity, type LayerDrive, type VisualState } from './useAnatomyVisual';

/** public/models/<file>.glb */
export const glbUrl = (file: string): string => `${import.meta.env.BASE_URL}models/${file}.glb`;

export type GlbState = 'checking' | 'yes' | 'no';

const probeCache = new Map<string, Promise<boolean>>();

/**
 * Dosya gerçekten var mı? Vite dev sunucusu eksik dosyaya index.html (200) döndürdüğü için
 * yalnızca status'a değil content-type'a da bakılır.
 */
function probe(url: string): Promise<boolean> {
  let p = probeCache.get(url);
  if (!p) {
    p = fetch(url, { method: 'HEAD' })
      .then((r) => r.ok && !(r.headers.get('content-type') ?? '').includes('text/html'))
      .catch(() => false);
    probeCache.set(url, p);
  }
  return p;
}

export function useGlbAvailability(file: string): GlbState {
  const [state, setState] = useState<GlbState>('checking');
  useEffect(() => {
    let alive = true;
    void probe(glbUrl(file)).then((ok) => {
      if (alive) setState(ok ? 'yes' : 'no');
    });
    return () => {
      alive = false;
    };
  }, [file]);
  return state;
}

/* ───────── Mesh adı → anatomi id eşlemesi ───────── */

const IDS = Object.keys(ANATOMY_BY_ID).sort((a, b) => b.length - a.length);
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function matchName(name: string): string | null {
  const n = norm(name);
  if (!n) return null;
  if (ANATOMY_BY_ID[n]) return n;
  const stripped = n.replace(/-\d+$/, '').replace(/-(l|r|left|right)$/, '');
  if (ANATOMY_BY_ID[stripped]) return stripped;
  for (const id of IDS) if (n.startsWith(`${id}-`)) return id;
  return null;
}

/** Mesh'in ya da en yakın adlı atasının normalleştirilmiş adı. */
function ownName(o: Object3D): string {
  let cur: Object3D | null = o;
  while (cur) {
    if (cur.name) return norm(cur.name);
    cur = cur.parent;
  }
  return '';
}

/** Mesh'in kendi adı, yoksa ata düğümlerinin adları üzerinden id bulur. */
function matchId(o: Object3D): string | null {
  let cur: Object3D | null = o;
  while (cur) {
    const m = matchName(cur.name);
    if (m) return m;
    cur = cur.parent;
  }
  return null;
}

interface Entry {
  id: string;
  base: number;
  material: MeshPhysicalMaterial;
  uniforms: StdDissolveUniforms;
  vis: VisualState;
  mesh: Object3D;
  pulse: PulseUniforms | null;
  baseColor: Color;
  baseEmissive: Color;
  tint: Color | null;
}

export interface GlbLook {
  color: string;
  emissive: string;
  ei?: number;
  roughness?: number;
  clearcoat?: number;
}

export interface GlbLayerProps {
  /** public/models/ altındaki dosya adı (uzantısız): skeleton, muscles, organs, vascular, nervous */
  file: string;
  drive: LayerDrive;
  color?: string;
  emissive?: string;
  /** id'ye göre organın kendi rengi/parlaklığı (varsa color/emissive'i ezer) */
  looks?: Record<string, GlbLook>;
  /** Ağ adına (düğüm adı) göre akan ışık darbeleri */
  pulses?: Record<string, PulseOptions>;
  /** X-ray mercek bu katmanı deler */
  lensMask?: boolean;
  /** Patoloji karşılaştırması: organ id → hastalıklı renk */
  tints?: Record<string, string>;
  opacity?: number;
  scale?: number;
  position?: Vec3;
}

/**
 * Harici GLB katmanı. Mesh adları anatomyData.ts id'leriyle eşleşirse (ör. "femur", "femur_L",
 * "femur.001") o mesh tıklanabilir ve vurgulanabilir olur; eşleşmeyenler yalnızca görsel kalır.
 * Beklenen birim: metre, Y yukarı, ayak tabanı y=0, beden +Z'ye bakar, anatomik sol = +X.
 */
export function GlbLayer({
  file,
  drive,
  color = '#d9d2c0',
  emissive = '#000000',
  looks,
  pulses,
  lensMask = false,
  tints,
  opacity = 1,
  scale = 1,
  position,
}: GlbLayerProps) {
  const gltf = useGLTF(glbUrl(file), true);
  const shared = useBodyShared();

  const model = useMemo(() => {
    const root = gltf.scene.clone(true);
    const list: Entry[] = [];
    root.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      accelerateRaycast(o);
      const id = matchId(o);
      if (id) o.userData.anatomyId = id;
      const uniforms = createStdDissolveUniforms();
      uniforms.uLensMask.value = lensMask ? 1 : 0;
      const nodeName = ownName(o);
      const look = (id ? looks?.[id] : undefined) ?? looks?.[nodeName];
      const pulseOpt = pulses?.[nodeName] ?? (id ? pulses?.[id] : undefined);
      const base = look?.ei ?? 0.05;
      const material = new MeshPhysicalMaterial({
        color: new Color(look?.color ?? color),
        emissive: new Color(look?.emissive ?? emissive),
        emissiveIntensity: base,
        roughness: look?.roughness ?? 0.55,
        clearcoat: look?.clearcoat ?? 0,
        transparent: true,
        side: DoubleSide,
      });
      applyDissolve(material, uniforms);
      const pulse = pulseOpt ? applyPulse(material, pulseOpt) : null;
      o.material = material;
      list.push({ id: id ?? '', base, material, uniforms, vis: createVisual(), mesh: o, pulse, baseColor: material.color.clone(), baseEmissive: material.emissive.clone(), tint: id && tints?.[id] ? new Color(tints[id]) : null });
    });
    return { root, list };
  }, [gltf, color, emissive, looks, pulses, lensMask, tints]);

  useEffect(() => () => model.list.forEach((e) => e.material.dispose()), [model]);

  useFrame(({ clock }, dt) => {
    if (drive.opacity < 0.004) return;
    const t = clock.elapsedTime;
    const step = Math.min(dt, 0.05);
    for (const e of model.list) {
      if (e.id) stepVisual(e.vis, e.id, shared, step);
      const op = visualOpacity(opacity, drive, e.vis);
      e.mesh.visible = e.vis.hide < 0.97;
      e.material.opacity = op;
      e.material.transparent = op < 0.995;
      e.material.depthWrite = op > 0.45;
      e.material.emissiveIntensity =
        e.base + e.vis.hover * 0.22 + e.vis.sel * 0.1 + (file === 'muscles' ? vitals.effort * 0.55 : 0);
      if (e.tint) {
        const p = useExtrasStore.getState().patho;
        const k = p.id && PATHOLOGIES.find((x) => x.id === p.id)?.organ === e.id ? p.amount : 0;
        e.material.color.copy(e.baseColor).lerp(e.tint, k);
        e.material.emissive.copy(e.baseEmissive).lerp(e.tint, k);
      }
      if (e.pulse) {
        e.pulse.uPTime.value = t;
        e.pulse.uPBeat.value = beatEnvelope(t);
      }
      e.uniforms.uDissLevel.value = drive.reveal;
      e.uniforms.uDissEdge.value.copy(drive.edge);
      e.uniforms.uRim.value = e.vis.hover * 0.45 + e.vis.sel * 0.2;
    }
  });

  return <primitive object={model.root} position={position} scale={scale} />;
}
