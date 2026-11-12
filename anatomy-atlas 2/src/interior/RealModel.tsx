import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { beat } from './beat';
import type { RealDef } from './types';

const NOISE = /* glsl */ `
float h31(vec3 p){ p = fract(p*0.3183099 + vec3(0.1,0.2,0.3)); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i+vec3(0,0,0)),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x), f.y), f.z);
}
float fbm3(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*n3(p); p*=2.07; a*=0.5; } return s; }
float rg(vec3 p){ return 1.0 - abs(fbm3(p) * 2.0 - 1.0); }
`;

const cache = new Map<string, THREE.MeshPhysicalMaterial>();

/** Islak, hafif kabarık mukoza: dünya konumundan türetilen prosedürel bump + renk beneklenmesi. */
function wetMaterial(hex: string, fold = 0): THREE.MeshPhysicalMaterial {
  const key = `${hex}|${fold}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = new THREE.Color(hex);
  const m = new THREE.MeshPhysicalMaterial({
    color: c,
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.32,
    side: THREE.DoubleSide,
    emissive: c.clone().multiplyScalar(0.16),
  });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWP;\n${NOISE}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float mott = fbm3(vWP * 1.1);
        diffuseColor.rgb *= 1.0 - ${fold.toFixed(2)} * 0.4 * (1.0 - rg(vWP * 0.8));
        diffuseColor.rgb *= 0.86 + 0.28 * mott;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.18, 0.86, 0.86), smoothstep(0.5, 0.85, fbm3(vWP * 0.45 + 7.0)) * 0.6);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          vec3 p0 = vWP * 7.0;
          float e = 0.35;
          float f0 = fbm3(p0) + 0.6 * (1.0 - abs(n3(p0 * 0.6 + 3.0) * 2.0 - 1.0));
          vec3 g = vec3(
            fbm3(p0 + vec3(e, 0.0, 0.0)) + 0.6 * (1.0 - abs(n3((p0 + vec3(e,0.0,0.0)) * 0.6 + 3.0) * 2.0 - 1.0)) - f0,
            fbm3(p0 + vec3(0.0, e, 0.0)) + 0.6 * (1.0 - abs(n3((p0 + vec3(0.0,e,0.0)) * 0.6 + 3.0) * 2.0 - 1.0)) - f0,
            fbm3(p0 + vec3(0.0, 0.0, e)) + 0.6 * (1.0 - abs(n3((p0 + vec3(0.0,0.0,e)) * 0.6 + 3.0) * 2.0 - 1.0)) - f0
          ) / e;
          vec3 gv = mat3(viewMatrix) * g;
          normal = normalize(normal - 0.13 * (gv - dot(gv, normal) * normal));
          if (${fold.toFixed(2)} > 0.0) {
            vec3 q = vWP * 0.8;
            float e2 = 0.25;
            float r0 = rg(q);
            vec3 g2 = vec3(rg(q + vec3(e2, 0.0, 0.0)) - r0, rg(q + vec3(0.0, e2, 0.0)) - r0, rg(q + vec3(0.0, 0.0, e2)) - r0) / e2;
            vec3 gv2 = mat3(viewMatrix) * g2;
            normal = normalize(normal - ${fold.toFixed(2)} * (gv2 - dot(gv2, normal) * normal));
          }
        }`,
      );
  };
  m.customProgramCacheKey = () => `atlas-wet-v2-${fold}`;
  cache.set(key, m);
  return m;
}

export function RealModel({ real }: { real: RealDef }) {
  const gltf = useGLTF(real.url);
  const { root, squeezed } = useMemo(() => {
    const root = gltf.scene.clone(true);
    const squeezed: { mesh: THREE.Mesh; c: THREE.Vector3 }[] = [];
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = wetMaterial(real.color(mesh.name), real.fold?.(mesh.name) ?? 0);
      mesh.frustumCulled = false;
      if (real.squeeze?.test(mesh.name)) {
        mesh.geometry.computeBoundingBox();
        squeezed.push({ mesh, c: mesh.geometry.boundingBox!.getCenter(new THREE.Vector3()) });
      }
    });
    return { root, squeezed };
  }, [gltf, real]);

  useFrame(() => {
    const s = 1 - 0.05 * beat.pulse;
    for (const { mesh, c } of squeezed) {
      mesh.scale.setScalar(s);
      mesh.position.copy(c).multiplyScalar(1 - s);
    }
  });

  return <primitive object={root} />;
}
