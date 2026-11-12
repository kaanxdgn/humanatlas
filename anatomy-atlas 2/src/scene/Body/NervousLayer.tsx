import { useEffect, useMemo } from 'react';
import AnatomyMesh from './helpers/AnatomyMesh';
import FlowTubes, { type FlowStyle } from './helpers/FlowTubes';
import LayerSource from './helpers/LayerSource';
import type { GlbLook } from './helpers/glb';
import type { PulseOptions } from '../shaders/pulse';
import { createBrainParts } from './helpers/createOrgan';
import { createNerves } from './helpers/createNetwork';
import { useLayerDrive, type LayerDrive } from './helpers/useAnatomyVisual';

/** Beyin lobları: her biri ayrı renkte vurgulanır */
const LOBE_COLOR: Record<string, string> = {
  'frontal-lobe': '#8E6BFF',
  'parietal-lobe': '#3DC9F5',
  'temporal-lobe': '#FF7AA8',
  'occipital-lobe': '#FFCF5A',
  cerebellum: '#5CF0B0',
  brainstem: '#E8E2FF',
};

/** Sinyaller omurilikten uçlara doğru ilerleyen mor/camgöbeği ışık darbeleri */
function styleFor(): FlowStyle {
  return {
    color: '#B388FF',
    color2: '#4DE3FF',
    speed: 0.7,
    density: 4,
    base: 0.9,
    glow: 3.2,
    beatGain: 0,
    additive: true,
  };
}

function ProceduralNervous({ drive }: { drive: LayerDrive }) {
  const lobes = useMemo(() => createBrainParts(), []);
  const nerves = useMemo(() => createNerves(), []);

  // Loblar, beyin geometrisinin köşe tamponlarını paylaşır; yalnızca unmount'ta bırakılır
  useEffect(() => () => lobes.forEach((l) => l.geometry.dispose()), [lobes]);

  return (
    <>
      {lobes.map((l) => {
        const c = LOBE_COLOR[l.id] ?? '#B388FF';
        return (
          <AnatomyMesh
            key={l.id}
            id={l.id}
            layer="nervous"
            drive={drive}
            geometry={l.geometry}
            position={l.position}
            color={c}
            emissive={c}
            emissiveIntensity={0.35}
            opacity={0.95}
            roughness={0.45}
            clearcoat={0.5}
          />
        );
      })}
      <FlowTubes drive={drive} paths={nerves} styleFor={styleFor} drawOn beat={false} />
    </>
  );
}

const NERVE_LOOK: GlbLook = { color: '#6b4fc4', emissive: '#8f6bff', ei: 0.16, roughness: 0.42, clearcoat: 0.5 };
const SIGNAL: PulseOptions = { color: '#6ff0ff', speed: 2.2, amount: 1.9, freq: 9, dir: -1 };
const LOOKS: Record<string, GlbLook> = {
  'other-nerves': NERVE_LOOK,
  'brachial-plexus': NERVE_LOOK,
  'spinal-cord': { ...NERVE_LOOK, color: '#e9e1ff', emissive: '#b7a2ff', ei: 0.12 },
  'sciatic-nerve': NERVE_LOOK,
  'vagus-nerve': NERVE_LOOK,
  ...Object.fromEntries(
    Object.entries(LOBE_COLOR).map(([k, c]) => [k, { color: c, emissive: c, ei: 0.14, roughness: 0.45, clearcoat: 0.5 }]),
  ),
};
const PULSES: Record<string, PulseOptions> = {
  'other-nerves': SIGNAL,
  'brachial-plexus': SIGNAL,
  'spinal-cord': { ...SIGNAL, speed: 1.6, freq: 6 },
  'sciatic-nerve': SIGNAL,
  'vagus-nerve': SIGNAL,
  'frontal-lobe': { color: '#d9ccff', speed: 0.7, amount: 0.5, freq: 14, dir: 1 },
  'parietal-lobe': { color: '#bfeeff', speed: 0.8, amount: 0.5, freq: 14, dir: 1 },
  'temporal-lobe': { color: '#ffd0e0', speed: 0.6, amount: 0.5, freq: 14, dir: 1 },
  'occipital-lobe': { color: '#fff0c0', speed: 0.75, amount: 0.5, freq: 14, dir: 1 },
  cerebellum: { color: '#c8ffe8', speed: 0.7, amount: 0.5, freq: 14, dir: 1 },
};

export default function NervousLayer() {
  const drive = useLayerDrive('nervous');
  return (
    <LayerSource file="nervous" drive={drive} glb={{ color: '#B388FF', emissive: '#4DE3FF', looks: LOOKS, pulses: PULSES }}>
      <ProceduralNervous drive={drive} />
    </LayerSource>
  );
}
