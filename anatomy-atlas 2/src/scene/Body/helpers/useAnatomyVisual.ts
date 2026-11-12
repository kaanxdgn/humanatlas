import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color } from 'three';
import { SYSTEM_BY_KEY, type LayerKey } from '@/data/systemsConfig';
import { useAtlasStore } from '@/store/useAtlasStore';
import { clamp, damp, easeInOutQuart } from '@/utils/math';
import { useBodyShared, type BodyShared } from './bodyContext';

/**
 * Bir katmanın görsel "sürücüsü":
 *  - opacity : katman seviyesi (hayalet/tam). Kaydırıcı ve bölüm değerleri buraya yansır.
 *  - reveal  : tarama-dissolve ilerlemesi (0..1, yumuşatılmış). Katman sahneye girerken
 *              0→1, çıkarken 1→0 gider; ara seviyeler (0.06, 0.45…) tarama yapmaz.
 *  - edge    : sistem renginde tarama kenarı / hover rim rengi.
 */
export interface LayerDrive {
  rawReveal: number;
  reveal: number;
  opacity: number;
  readonly edge: Color;
}

const REVEAL_IN_SEC = 1.5;
const REVEAL_OUT_SEC = 1.0;

export function useLayerDrive(layer: LayerKey): LayerDrive {
  const shared = useBodyShared();
  const drive = useMemo<LayerDrive>(
    () => ({ rawReveal: 0, reveal: 0, opacity: 0, edge: new Color(SYSTEM_BY_KEY[layer].accent) }),
    [layer],
  );

  useFrame((_, dt) => {
    const level = shared.levels[layer];
    const target = level > 0.02 ? 1 : 0;
    const reduced = useAtlasStore.getState().reducedMotion;
    const speed = reduced ? 1000 : 1 / (target === 1 ? REVEAL_IN_SEC : REVEAL_OUT_SEC);
    const diff = target - drive.rawReveal;
    drive.rawReveal += Math.sign(diff) * Math.min(Math.abs(diff), speed * Math.min(dt, 0.05));
    drive.reveal = easeInOutQuart(clamp(drive.rawReveal, 0, 1));
    drive.opacity = clamp(level, 0, 1);
  });

  return drive;
}

/** Tek bir yapının yumuşatılmış etkileşim durumu. */
export interface VisualState {
  /** 0..1: odak modunda ne kadar soluklaştığı */
  dim: number;
  /** 0..1: fare üzerinde */
  hover: number;
  /** 0..1: seçili / ilişkili / odak vurgusu */
  sel: number;
  /** 0..1: izolasyonda tamamen gizlenme */
  hide: number;
}

export const createVisual = (): VisualState => ({ dim: 0, hover: 0, sel: 0, hide: 0 });

/** Her karede çağrılır; store'a değil, paylaşılan mutable `emphasis`'e bakar. */
export function stepVisual(v: VisualState, id: string, shared: BodyShared, dt: number): void {
  const e = shared.emphasis;
  const isHover = e.hoveredId === id ? 1 : 0;
  const isSel = e.selectedId === id ? 1 : 0;
  const isRel = e.relatedIds.has(id) ? 1 : 0;
  const isHi = e.highlightIds.has(id) ? 1 : 0;

  const keep = e.isolate > 0.5 ? isSel : Math.max(isSel, isRel * 0.85, isHi);
  const dimTarget = e.focusAmount * (1 - keep);
  const selTarget = Math.max(isSel, isRel * 0.35, isHi * 0.5);

  v.dim = damp(v.dim, dimTarget, 6, dt);
  v.hover = damp(v.hover, isHover, 12, dt);
  v.sel = damp(v.sel, selTarget, 8, dt);
  v.hide = damp(v.hide, e.isolate * (1 - isSel), 7, dt);
}

/** Efektif opaklık: taban × katman seviyesi × odak soluklaşması. */
export const visualOpacity = (base: number, drive: LayerDrive, v: VisualState): number =>
  base * drive.opacity * (1 - 0.82 * v.dim) * (1 - v.hide);
