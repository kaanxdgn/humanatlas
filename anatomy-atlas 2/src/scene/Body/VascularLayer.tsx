import { useMemo } from 'react';
import FlowTubes, { type FlowStyle } from './helpers/FlowTubes';
import LayerSource from './helpers/LayerSource';
import type { GlbLook } from './helpers/glb';
import type { PulseOptions } from '../shaders/pulse';
import { createVessels, type NetKind } from './helpers/createNetwork';
import { useLayerDrive, type LayerDrive } from './helpers/useAnatomyVisual';

/** Tür başına akış stili (module düzeyinde: referans kararlı kalır). */
function styleFor(kind: NetKind): FlowStyle {
  if (kind === 'vein') {
    return {
      color: '#3D7BFF',
      color2: '#9DC0FF',
      speed: 0.3,
      density: 2.6,
      base: 0.7,
      glow: 2.2,
      beatGain: 0.5,
      additive: true,
    };
  }
  // Arterler: kalbin sistolüyle daha güçlü nabız
  return {
    color: '#FF2D55',
    color2: '#FFB0C0',
    speed: 0.6,
    density: 3.2,
    base: 0.8,
    glow: 2.8,
    beatGain: 1.4,
    additive: true,
  };
}

function ProceduralVessels({ drive }: { drive: LayerDrive }) {
  const paths = useMemo(() => createVessels(), []);
  // Geometri FlowTubes tarafından üretilir ve yine orada serbest bırakılır
  return <FlowTubes drive={drive} paths={paths} styleFor={styleFor} drawOn beat />;
}

const ART = { color: '#b3202e', emissive: '#ff2a3f', ei: 0.18, roughness: 0.4, clearcoat: 0.5 };
const VEIN = { color: '#27479a', emissive: '#3d7bff', ei: 0.14, roughness: 0.4, clearcoat: 0.5 };
const LOOKS: Record<string, GlbLook> = {
  aorta: ART,
  'other-arteries': ART,
  'carotid-arteries': ART,
  'coronary-arteries': ART,
  'pulmonary-veins': ART,
  'renal-vessels': ART,
  'femoral-vessels': ART,
  'brachial-vessels': ART,
  'pulmonary-arteries': VEIN,
  'other-veins': VEIN,
  'jugular-veins': VEIN,
  'portal-vein': VEIN,
  'vena-cava': VEIN,
};
const RED: PulseOptions = { color: '#ff5a6a', speed: 1.5, amount: 1.5, freq: 6, dir: -1 };
const BLUE: PulseOptions = { color: '#6fa0ff', speed: 0.9, amount: 1.2, freq: 5, dir: 1 };
const PULSES: Record<string, PulseOptions> = Object.fromEntries(
  Object.entries(LOOKS).map(([k, l]) => [k, l === ART ? RED : BLUE]),
);

export default function VascularLayer() {
  const drive = useLayerDrive('vascular');
  return (
    <LayerSource file="vascular" drive={drive} glb={{ color: '#c0394a', emissive: '#ff2d55', looks: LOOKS, pulses: PULSES }}>
      <ProceduralVessels drive={drive} />
    </LayerSource>
  );
}
