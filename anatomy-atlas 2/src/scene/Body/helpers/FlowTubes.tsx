import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { BufferGeometry } from 'three';
import { clamp } from '@/utils/math';
import { createFlowMaterial, type FlowOptions } from '../../shaders/flowLine';
import { useBodyShared } from './bodyContext';
import type { NetKind, NetPath } from './createNetwork';
import { curveFrom, mergeAll, profileTube, taper } from './geometry';
import { beatEnvelope } from './heartbeat';
import { createVisual, stepVisual, type LayerDrive } from './useAnatomyVisual';

/** Akış shader'ı ayarları (phase grup başına otomatik verilir). */
export type FlowStyle = Omit<FlowOptions, 'phase'>;

interface Group {
  key: string;
  id: string;
  geometry: BufferGeometry;
  /** Kalın, görünmez tıklama gövdesi (ince damarlar kolay seçilsin) */
  proxy: BufferGeometry;
  kind: NetKind;
  phase: number;
  /** Draw-on gecikmesi (0..0.35) */
  delay: number;
}

function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/** Yolları id+tür bazında birleştirir: bir grup = bir draw call (+ bir proxy). */
function buildGroups(paths: readonly NetPath[]): Group[] {
  const map = new Map<string, { id: string; kind: NetKind; geos: BufferGeometry[]; proxies: BufferGeometry[] }>();
  for (const p of paths) {
    const curve = curveFrom(p.points);
    const len = curve.getLength();
    const thick = Math.max(p.r0, p.r1);
    const geo = profileTube(curve, taper(p.r0, p.r1), {
      tubularSegments: clamp(Math.round(len * 220), 10, 260),
      radialSegments: thick > 0.004 ? 8 : 5,
      capLength: 0.02,
    });
    const proxy = profileTube(curve, () => Math.max(thick * 2.2, 0.0055), {
      tubularSegments: clamp(Math.round(len * 40), 4, 60),
      radialSegments: 4,
      capLength: 0,
    });
    const key = `${p.id}|${p.kind}`;
    const entry = map.get(key) ?? { id: p.id, kind: p.kind, geos: [], proxies: [] };
    entry.geos.push(geo);
    entry.proxies.push(proxy);
    map.set(key, entry);
  }
  const out: Group[] = [];
  map.forEach((e, key) => {
    const geometry = mergeAll(e.geos);
    const proxy = mergeAll(e.proxies);
    e.geos.forEach((g) => g.dispose());
    e.proxies.forEach((g) => g.dispose());
    out.push({ key, id: e.id, kind: e.kind, geometry, proxy, phase: hash01(key), delay: hash01(`${key}#d`) * 0.35 });
  });
  return out;
}

interface FlowGroupProps {
  group: Group;
  drive: LayerDrive;
  style: FlowStyle;
  drawOn: boolean;
  beat: boolean;
  renderOrder: number;
}

function FlowGroup({ group, drive, style, drawOn, beat, renderOrder }: FlowGroupProps) {
  const shared = useBodyShared();
  const vis = useMemo(createVisual, []);
  const { material, uniforms } = useMemo(
    () => createFlowMaterial({ ...style, phase: group.phase }),
    [style, group.phase],
  );
  const userData = useMemo(() => ({ anatomyId: group.id }), [group.id]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }, dt) => {
    if (drive.opacity < 0.004) return;
    stepVisual(vis, group.id, shared, Math.min(dt, 0.05));
    const t = clock.elapsedTime;
    uniforms.uTime.value = t;
    uniforms.uBeat.value = beat ? beatEnvelope(t) : 0;
    uniforms.uOpacity.value = drive.opacity * (1 - vis.hide);
    uniforms.uDraw.value = drawOn ? clamp((drive.reveal - group.delay) / (1 - group.delay), 0, 1) : 1;
    uniforms.uHover.value = vis.hover + vis.sel * 0.6;
    uniforms.uDim.value = vis.dim;
  });

  return (
    <>
      <mesh geometry={group.geometry} material={material} userData={userData} renderOrder={renderOrder} />
      <mesh geometry={group.proxy} userData={userData}>
        {/* Hiçbir şey çizmez ama raycast'e yakalanır */}
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
    </>
  );
}

export interface FlowTubesProps {
  drive: LayerDrive;
  paths: readonly NetPath[];
  /** Tür başına shader ayarları; kararlı (module düzeyi) bir fonksiyon verin */
  styleFor: (kind: NetKind) => FlowStyle;
  /** Katman girişinde yol boyunca çizilerek belirsin */
  drawOn?: boolean;
  /** Kalp atışı zarfıyla nabız parlaması */
  beat?: boolean;
  renderOrder?: number;
}

/** Damar/sinir yollarını akan ışık shader'ıyla çizer. */
export default function FlowTubes({ drive, paths, styleFor, drawOn = true, beat = false, renderOrder = 10 }: FlowTubesProps) {
  const groups = useMemo(() => buildGroups(paths), [paths]);
  const styles = useMemo<Record<NetKind, FlowStyle>>(
    () => ({ artery: styleFor('artery'), vein: styleFor('vein'), nerve: styleFor('nerve') }),
    [styleFor],
  );

  useEffect(
    () => () => {
      groups.forEach((g) => {
        g.geometry.dispose();
        g.proxy.dispose();
      });
    },
    [groups],
  );

  return (
    <>
      {groups.map((g) => (
        <FlowGroup
          key={g.key}
          group={g}
          drive={drive}
          style={styles[g.kind]}
          drawOn={drawOn}
          beat={beat}
          renderOrder={renderOrder}
        />
      ))}
    </>
  );
}
