import { useEffect, useMemo } from 'react';
import type { Mesh, MeshPhysicalMaterial, Object3D } from 'three';
import { useAtlasStore } from '@/store/useAtlasStore';
import { PATHOLOGIES } from '@/data/stories';
import AnatomyMesh from './helpers/AnatomyMesh';
import LayerSource from './helpers/LayerSource';
import { createOrgans } from './helpers/createOrgan';
import { beatEnvelope, breathPhase } from './helpers/heartbeat';
import { useLayerDrive, type LayerDrive, type VisualState } from './helpers/useAnatomyVisual';
import { useStaggeredDrives } from './helpers/useStaggeredDrive';

interface Look {
  color: string;
  emissive: string;
  ei?: number;
  opacity?: number;
  roughness?: number;
  clearcoat?: number;
}

const LOOK: Record<string, Look> = {
  brain: { color: '#e6b3b0', emissive: '#ff9aa0', ei: 0.06, roughness: 0.5, clearcoat: 0.5 },
  heart: { color: '#c0262d', emissive: '#ff2a3a', ei: 0.16, roughness: 0.38, clearcoat: 0.65 },
  lungs: { color: '#e8a1a8', emissive: '#ff9aa8', ei: 0.07, opacity: 0.9, roughness: 0.55, clearcoat: 0.3 },
  liver: { color: '#8a3a2a', emissive: '#ff6a3a', ei: 0.05, roughness: 0.42, clearcoat: 0.55 },
  stomach: { color: '#d9857a', emissive: '#ff8a7a', ei: 0.06, roughness: 0.45, clearcoat: 0.5 },
  pancreas: { color: '#e0b25a', emissive: '#ffcc66', ei: 0.06 },
  spleen: { color: '#7a2a4a', emissive: '#ff4a8a', ei: 0.06, roughness: 0.45, clearcoat: 0.5 },
  kidneys: { color: '#9a3a3a', emissive: '#ff5a4a', ei: 0.06, roughness: 0.4, clearcoat: 0.55 },
  'small-intestine': { color: '#e8a58a', emissive: '#ffb08a', ei: 0.06, roughness: 0.4, clearcoat: 0.55 },
  'large-intestine': { color: '#c9785a', emissive: '#ff9a6a', ei: 0.06, roughness: 0.5 },
  bladder: { color: '#e6c26a', emissive: '#ffd666', ei: 0.07, opacity: 0.85, roughness: 0.3, clearcoat: 0.7 },
  diaphragm: { color: '#b05048', emissive: '#ff6a5a', ei: 0.04, opacity: 0.8 },
  thyroid: { color: '#d96a6a', emissive: '#ff7a7a', ei: 0.08 },
  esophagus: { color: '#d98a7a', emissive: '#ff9a8a', ei: 0.05 },
  trachea: { color: '#cfe0f0', emissive: '#9fd8ff', ei: 0.06, roughness: 0.4, clearcoat: 0.5 },
};

const TINTS: Record<string, string> = Object.fromEntries(PATHOLOGIES.map((p) => [p.organ, p.tint]));

const FALLBACK_LOOK: Look = { color: '#d98a7a', emissive: '#ffb84d' };

/** Sırayla belirme gecikmeleri (0..0.5): üstten alta, sistem sistem */
const DELAY: Record<string, number> = {
  brain: 0,
  thyroid: 0.03,
  trachea: 0.06,
  esophagus: 0.09,
  lungs: 0.12,
  heart: 0.18,
  diaphragm: 0.24,
  liver: 0.28,
  stomach: 0.32,
  spleen: 0.35,
  pancreas: 0.38,
  kidneys: 0.41,
  'small-intestine': 0.45,
  'large-intestine': 0.48,
  bladder: 0.5,
};

type FrameFn = (obj: Object3D, t: number, v: VisualState) => void;

/** Hareket azaltma tercihinde animasyon genliği düşer. */
const motion = (): number => (useAtlasStore.getState().reducedMotion ? 0.25 : 1);

/** Kalp: lub-dub ölçek atışı + emissive nabzı (kendi orijini etrafında). */
const heartFrame: FrameFn = (obj, t) => {
  const e = beatEnvelope(t) * motion();
  obj.scale.setScalar(1 + 0.075 * e);
  const m = (obj as Mesh).material as MeshPhysicalMaterial;
  m.emissiveIntensity += 0.6 * e;
};

/** Akciğerler: dakikada 15 nefes; tabanı geniş, tepesi dar genişleme. */
const lungsFrame: FrameFn = (obj, t) => {
  const b = breathPhase(t) * motion();
  obj.scale.set(1 + 0.03 * b, 1 + 0.05 * b, 1 + 0.045 * b);
};

/** Diyafram: nefes alırken aşağı iner ve düzleşir. */
const diaphragmFrame =
  (baseY: number): FrameFn =>
  (obj, t) => {
    const b = breathPhase(t) * motion();
    obj.position.y = baseY - 0.014 * b;
    obj.scale.y = 1 - 0.3 * b;
  };

function ProceduralOrgans({ drive }: { drive: LayerDrive }) {
  const organs = useMemo(() => createOrgans(), []);
  const delays = useMemo(() => organs.map((o) => DELAY[o.id] ?? 0), [organs]);
  const drives = useStaggeredDrives(drive, delays);

  useEffect(() => () => organs.forEach((o) => o.geometry.dispose()), [organs]);

  return (
    <>
      {organs.map((o, i) => {
        const look = LOOK[o.id] ?? FALLBACK_LOOK;
        const onFrame: FrameFn | undefined =
          o.id === 'heart'
            ? heartFrame
            : o.id === 'lungs'
              ? lungsFrame
              : o.id === 'diaphragm'
                ? diaphragmFrame(o.position[1])
                : undefined;
        return (
          <AnatomyMesh
            key={o.id}
            id={o.id}
            layer="organs"
            drive={drives[i]}
            geometry={o.geometry}
            position={o.position}
            color={look.color}
            emissive={look.emissive}
            emissiveIntensity={look.ei ?? 0.05}
            opacity={look.opacity ?? 1}
            roughness={look.roughness ?? 0.5}
            clearcoat={look.clearcoat ?? 0.4}
            doubleSide={o.doubleSide}
            onFrame={onFrame}
          />
        );
      })}
    </>
  );
}

export default function OrgansLayer() {
  const drive = useLayerDrive('organs');
  return (
    <LayerSource file="organs" drive={drive} glb={{ color: '#c98a7c', emissive: '#c98a7c', looks: LOOK, tints: TINTS }}>
      <ProceduralOrgans drive={drive} />
    </LayerSource>
  );
}
