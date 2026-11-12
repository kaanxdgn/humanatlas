import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Color, DoubleSide, Mesh, MeshPhysicalMaterial } from 'three';
import { applyDissolve, createStdDissolveUniforms } from '../shaders/dissolve';
import { createFresnelMaterial } from '../shaders/fresnel';
import { useBodyShared } from './helpers/bodyContext';
import { createSkinGeometry } from './helpers/createSkin';
import { accelerateRaycast } from './helpers/bvh';
import { glbUrl, useGlbAvailability } from './helpers/glb';
import { GlbBoundary } from './helpers/LayerSource';
import { useAccentColors } from './helpers/useAccentColors';
import {
  createVisual,
  stepVisual,
  useLayerDrive,
  visualOpacity,
  type LayerDrive,
} from './helpers/useAnatomyVisual';

const SKIN_USER_DATA = { anatomyId: 'skin' } as const;
const SKIN_TONE = new Color('#d9a68b');
const GHOST_TONE = new Color('#9fb8e8');
const tmp = new Color();

/**
 * Gerçekçi cilt: public/models/skin.glb (Z-Anatomy "Regions of human body" türevi).
 * Genel Bakış'ta hafif yarı saydam, kenarları sistem renginde parlayan "hologram ten";
 * iç katmanlar açılırken seviye düştükçe soğuk, çok saydam bir siluete dönüşür.
 */
function RealisticSkin({ drive }: { drive: LayerDrive }) {
  const shared = useBodyShared();
  const { accent } = useAccentColors();
  const gltf = useGLTF(glbUrl('skin'), true);
  const vis = useMemo(createVisual, []);

  const model = useMemo(() => {
    const root = gltf.scene.clone(true);
    const uniforms = createStdDissolveUniforms();
    uniforms.uLensMask.value = 1;
    const fx = {
      uSkinRim: { value: new Color('#8AB4FF') },
      uSkinRimK: { value: 1 },
      uSkinTime: { value: 0 },
      uSkinEdgeA: { value: 0 },
    };
    const material = new MeshPhysicalMaterial({
      color: SKIN_TONE.clone(),
      roughness: 0.68,
      metalness: 0,
      emissive: new Color('#000000'),
      transparent: true,
      side: DoubleSide,
    });
    applyDissolve(material, uniforms);
    // dissolve yamasının üstüne: Fresnel kenar parıltısı + yukarı kayan ince tarama çizgileri
    const base = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer): void => {
      base.call(material, shader, renderer);
      shader.uniforms.uSkinRim = fx.uSkinRim;
      shader.uniforms.uSkinRimK = fx.uSkinRimK;
      shader.uniforms.uSkinTime = fx.uSkinTime;
      shader.uniforms.uSkinEdgeA = fx.uSkinEdgeA;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform vec3 uSkinRim;\nuniform float uSkinRimK;\nuniform float uSkinTime;\nuniform float uSkinEdgeA;',
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          float skFr = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.2);
          float skBand = smoothstep(0.90, 1.0, sin(vDWorld.y * 46.0 - uSkinTime * 1.6) * 0.5 + 0.5);
          float skSweep = smoothstep(0.0, 0.05, 1.0 - abs(fract(uSkinTime * 0.11) * 2.3 - 0.15 - vDWorld.y) * 6.0);
          totalEmissiveRadiance += uSkinRim * (skFr * 1.15 + skBand * 0.07 + skSweep * 0.35) * uSkinRimK;
          diffuseColor.a = clamp(diffuseColor.a + skFr * skFr * uSkinEdgeA, 0.0, 1.0);`,
        );
    };
    material.customProgramCacheKey = () => 'atlas-skin-holo-v1';
    material.needsUpdate = true;
    root.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      accelerateRaycast(o);
      o.material = material;
      o.userData.anatomyId = 'skin';
      o.renderOrder = 50;
      o.frustumCulled = false;
    });
    return { root, material, uniforms, fx };
  }, [gltf]);

  useEffect(() => () => model.material.dispose(), [model]);

  useFrame(({ clock }, dt) => {
    if (drive.opacity < 0.004) return;
    const { material, uniforms, fx } = model;
    stepVisual(vis, 'skin', shared, Math.min(dt, 0.05));

    const lvl = drive.opacity;
    // seviye 1 → ~%80 opak ten; düşük seviyede iç yapılar net görünsün diye neredeyse tamamen saydam,
    // yalnızca kenarlarda ince bir kontur kalır
    const ghost = 1 - Math.min(1, lvl / 0.5);
    const dimK = (1 - 0.82 * vis.dim) * (1 - vis.hide);
    const body = lvl >= 0.5 ? 0.8 * lvl : lvl * 0.35;
    const alpha = Math.min(1, body * dimK);

    material.color.copy(tmp.copy(SKIN_TONE).lerp(GHOST_TONE, ghost));
    material.emissive.copy(accent).multiplyScalar(0.02 + vis.hover * 0.22 + vis.sel * 0.18);
    material.opacity = alpha;
    material.depthWrite = alpha > 0.5;
    fx.uSkinRim.value.copy(accent);
    fx.uSkinRimK.value = (0.55 + vis.hover * 0.6) * (1 - 0.8 * ghost) + ghost * 0.25;
    fx.uSkinEdgeA.value = ghost * 0.3 * dimK;
    fx.uSkinTime.value = clock.elapsedTime;
    uniforms.uDissLevel.value = drive.reveal;
    uniforms.uDissEdge.value.copy(drive.edge);
    uniforms.uRim.value = vis.hover * 1.2 + vis.sel;
  });

  return <primitive object={model.root} />;
}

/** skin.glb yoksa eski prosedürel cam gövde. */
function ProceduralSkin({ drive }: { drive: LayerDrive }) {
  const shared = useBodyShared();
  const { accent } = useAccentColors();
  const vis = useMemo(createVisual, []);
  const geometry = useMemo(() => createSkinGeometry(), []);
  const { material, uniforms } = useMemo(
    () => createFresnelMaterial({ color: '#0d1b33', rim: '#8AB4FF', power: 2.3, fill: 0.05 }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }, dt) => {
    if (drive.opacity < 0.004) return;
    stepVisual(vis, 'skin', shared, Math.min(dt, 0.05));
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uOpacity.value = drive.opacity * (1 - 0.7 * vis.dim);
    uniforms.uDissLevel.value = drive.reveal;
    uniforms.uDissEdge.value.copy(drive.edge);
    uniforms.uRimColor.value.copy(accent);
    uniforms.uHover.value = vis.hover + vis.sel * 0.5;
  });

  return <mesh geometry={geometry} material={material} userData={SKIN_USER_DATA} renderOrder={50} />;
}

export default function SkinLayer() {
  const drive = useLayerDrive('skin');
  const state = useGlbAvailability('skin');
  if (state === 'checking') return null;
  if (state === 'no') return <ProceduralSkin drive={drive} />;
  return (
    <GlbBoundary fallback={<ProceduralSkin drive={drive} />}>
      <RealisticSkin drive={drive} />
    </GlbBoundary>
  );
}
