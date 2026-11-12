import { lazy, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import type { Group } from 'three';
import { useExtrasStore } from '@/store/useExtrasStore';
import { breathPhase, vitals } from './helpers/heartbeat';
import { useAtlasStore } from '@/store/useAtlasStore';
import {
  FOCUS_MODES,
  LAYER_KEYS,
  SECTION_CONFIG,
  type BodyPose,
  type LayerKey,
} from '@/data/systemsConfig';
import { getAnatomyItem } from '@/data/anatomyData';
import {
  BodyContext,
  createEmphasis,
  createLayerLevels,
  type BodyShared,
  type LayerLevels,
} from './helpers/bodyContext';
import { resolvePick } from './helpers/picking';

// Katmanlar ayrı chunk'lar olarak lazy yüklenir (Canvas dışı UI hızlı açılsın)
const SkinLayer = lazy(() => import('./SkinLayer'));
const SkeletonLayer = lazy(() => import('./SkeletonLayer'));
const MuscleLayer = lazy(() => import('./MuscleLayer'));
const OrgansLayer = lazy(() => import('./OrgansLayer'));
const VascularLayer = lazy(() => import('./VascularLayer'));
const NervousLayer = lazy(() => import('./NervousLayer'));

/** Bu seviyenin altındaki katmanlar raycast olaylarını yutmaz (arkadakine geçilir). */
const PICK_MIN_LEVEL = 0.55;
const NEUTRAL_POSE: BodyPose = { rotationY: 0, scale: 1, y: 0 };

/**
 * Bir katmanı sarar:
 *  - userData.layer koyar (picking için)
 *  - seviyesi ~0 iken grubu gizler (çizim + raycast maliyeti sıfırlanır)
 */
function LayerGate({
  layer,
  levels,
  children,
}: {
  layer: LayerKey;
  levels: LayerLevels;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (g) g.visible = levels[layer] > 0.004;
  });
  return (
    <group ref={ref} userData={{ layer }} visible={false}>
      <Suspense fallback={null}>{children}</Suspense>
    </group>
  );
}

/** Tüm katmanları yöneten ana grup. */
export default function HumanBody() {
  const shared = useMemo<BodyShared>(
    () => ({ levels: createLayerLevels(), emphasis: createEmphasis() }),
    [],
  );
  const groupRef = useRef<Group>(null);

  const section = useAtlasStore((s) => s.activeSection);
  const freeExplore = useAtlasStore((s) => s.freeExplore);
  const layerOpacity = useAtlasStore((s) => s.layerOpacity);
  const selectedId = useAtlasStore((s) => s.selectedId);
  const focusMode = useAtlasStore((s) => s.focusMode);
  const reduced = useAtlasStore((s) => s.reducedMotion);
  const selectStructure = useAtlasStore((s) => s.selectStructure);
  const setHovered = useAtlasStore((s) => s.setHovered);

  const selectedItem = selectedId ? getAnatomyItem(selectedId) : undefined;
  const revealSystem = selectedItem?.system ?? null;
  const lens = useExtrasStore((s) => s.lens);
  const breathRef = useRef<Group>(null);
  useFrame(() => {
    const b = breathRef.current;
    if (!b) return;
    const k = breathPhase() * (0.004 + vitals.effort * 0.012);
    b.scale.set(1 + k * 0.8, 1 + k * 0.5, 1 + k * 1.4);
  });

  /* ── 1) Katman hedef seviyeleri ── */
  const targets = useMemo<Record<LayerKey, number>>(() => {
    const base = SECTION_CONFIG[section].layers;
    const t = {} as Record<LayerKey, number>;
    for (const key of LAYER_KEYS) {
      t[key] = freeExplore ? layerOpacity[key] : base[key] * layerOpacity[key];
    }
    // Odak modu (solunum/sindirim): organlar önde, diğerleri silik
    if (focusMode !== 'none') {
      t.organs = 1;
      t.skin = Math.min(t.skin, 0.14);
      t.skeleton = Math.min(t.skeleton, 0.1);
      t.muscular = 0;
      t.vascular = 0;
      t.nervous = 0;
    }
    // X-ray mercek: deri/kas delinir, altındaki iskelet ve organlar görünür
    if (lens && !revealSystem) {
      t.skeleton = Math.max(t.skeleton, 0.9);
      t.organs = Math.max(t.organs, 0.75);
    }
    // Seçim izolasyonu: yalnızca seçilen yapının sistemi kalır, diğer katmanlar çözülür
    if (revealSystem) {
      for (const key of LAYER_KEYS) t[key] = key === revealSystem ? Math.max(t[key], 0.95) : 0;
    }
    return t;
  }, [section, freeExplore, layerOpacity, focusMode, revealSystem, lens]);

  /* Eski katman önce çözülür (dissolve), yenisi biraz gecikmeyle "inşa edilir" */
  useEffect(() => {
    for (const key of LAYER_KEYS) {
      const to = targets[key];
      const rising = to > shared.levels[key];
      gsap.to(shared.levels, {
        [key]: to,
        duration: reduced ? 0.01 : rising ? 1.6 : 1.0,
        delay: reduced ? 0 : rising ? 0.3 : 0,
        ease: 'power3.inOut',
        overwrite: 'auto',
      });
    }
  }, [targets, shared, reduced]);

  /* ── 2) Vurgu (odak) durumu ── */
  useEffect(() => {
    const e = shared.emphasis;
    e.selectedId = selectedId;
    e.relatedIds = new Set(selectedItem?.related ?? []);
    e.highlightIds = new Set(focusMode === 'none' ? [] : FOCUS_MODES[focusMode].ids);
    const on = selectedId !== null || focusMode !== 'none';
    gsap.to(e, {
      isolate: selectedId !== null ? 1 : 0,
      duration: reduced ? 0.01 : 0.7,
      ease: 'power2.out',
      overwrite: false,
    });
    gsap.to(e, {
      focusAmount: on ? 1 : 0,
      duration: reduced ? 0.01 : 0.9,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, [shared, selectedId, selectedItem, focusMode, reduced]);

  /* ── 3) Beden duruşu: bölüme göre döner/ölçeklenir; seçim ve serbest modda nötr ── */
  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    const neutral = selectedId !== null || freeExplore || focusMode !== 'none';
    const pose = neutral ? NEUTRAL_POSE : SECTION_CONFIG[section].pose;
    const d = reduced ? 0.01 : 1.6;
    gsap.to(g.rotation, { y: pose.rotationY, duration: d, ease: 'power3.inOut', overwrite: 'auto' });
    gsap.to(g.scale, {
      x: pose.scale,
      y: pose.scale,
      z: pose.scale,
      duration: d,
      ease: 'power3.inOut',
      overwrite: 'auto',
    });
    gsap.to(g.position, { y: pose.y, duration: d, ease: 'power3.inOut', overwrite: 'auto' });
    return () => {
      gsap.killTweensOf([g.rotation, g.scale, g.position]);
    };
  }, [section, selectedId, freeExplore, focusMode, reduced]);

  /* Unmount: tüm tween'leri ve imleci temizle */
  useEffect(
    () => () => {
      gsap.killTweensOf(shared.levels);
      gsap.killTweensOf(shared.emphasis);
      document.body.style.cursor = '';
    },
    [shared],
  );

  /* ── Raycast olayları (tüm katmanlar için merkezi) ── */
  const handlePointerMove = (e: ThreeEvent<PointerEvent>): void => {
    const pick = resolvePick(e);
    if (!pick || shared.levels[pick.layer] < PICK_MIN_LEVEL) return;
    e.stopPropagation();
    if (shared.emphasis.hoveredId !== pick.id) {
      shared.emphasis.hoveredId = pick.id;
      setHovered(pick.id);
    }
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>): void => {
    const pick = resolvePick(e);
    if (!pick) return;
    if (shared.emphasis.hoveredId === pick.id) {
      shared.emphasis.hoveredId = null;
      setHovered(null);
      document.body.style.cursor = '';
    }
  };

  const handleClick = (e: ThreeEvent<MouseEvent>): void => {
    if (e.delta > 6) return; // sürükleme sonrası tıklamayı yok say
    const pick = resolvePick(e);
    if (!pick || shared.levels[pick.layer] < PICK_MIN_LEVEL) return;
    e.stopPropagation();
    if (useExtrasStore.getState().answer(pick.id)) return; // “Bul ve tıkla” oyunu açıksa cevap sayılır
    selectStructure(pick.id);
  };

  return (
    <BodyContext.Provider value={shared}>
      <group
        ref={groupRef}
        name="human-body"
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <group ref={breathRef}>
        <LayerGate layer="skin" levels={shared.levels}>
          <SkinLayer />
        </LayerGate>
        <LayerGate layer="muscular" levels={shared.levels}>
          <MuscleLayer />
        </LayerGate>
        <LayerGate layer="organs" levels={shared.levels}>
          <OrgansLayer />
        </LayerGate>
        <LayerGate layer="skeleton" levels={shared.levels}>
          <SkeletonLayer />
        </LayerGate>
        <LayerGate layer="vascular" levels={shared.levels}>
          <VascularLayer />
        </LayerGate>
        <LayerGate layer="nervous" levels={shared.levels}>
          <NervousLayer />
        </LayerGate>
        </group>
      </group>
    </BodyContext.Provider>
  );
}
