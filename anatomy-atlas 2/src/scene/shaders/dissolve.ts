import { Color, Vector2, Vector4, type IUniform, type Material } from 'three';

/** X-ray mercek: (x, y, yarıçap[ekran yüksekliği birimi], açık=1). Tüm materyaller aynı nesneyi paylaşır. */
export const lensUniforms = {
  uLens: { value: new Vector4(0.5, 0.5, 0.17, 0) } as IUniform<Vector4>,
  uLensRes: { value: new Vector2(1, 1) } as IUniform<Vector2>,
};

/** Tarama çizgisinin geçtiği dünya-Y aralığı (beden ≈ 0 … 1.75 m). */
export const DISSOLVE_TOP = 1.95;
export const DISSOLVE_BOTTOM = -0.05;

export type DissolveUniforms = {
  /** 0 = hiç görünmez, 1 = tamamen görünür (tepeden aşağı tarama) */
  uDissLevel: IUniform<number>;
  /** Tarama kenarının parlama rengi */
  uDissEdge: IUniform<Color>;
};

/** MeshPhysicalMaterial yaması: ek olarak hover/seçim "rim" ışığı */
export type StdDissolveUniforms = DissolveUniforms & { uRim: IUniform<number>; uLensMask: IUniform<number> };

export const createDissolveUniforms = (edge = '#8AB4FF'): DissolveUniforms => ({
  uDissLevel: { value: 0 },
  uDissEdge: { value: new Color(edge) },
});

export const createStdDissolveUniforms = (edge = '#8AB4FF'): StdDissolveUniforms => ({
  ...createDissolveUniforms(edge),
  uRim: { value: 0 },
  uLensMask: { value: 0 },
});

const f = (n: number): string => n.toFixed(3);

/* ───────── Paylaşılan GLSL parçaları (ShaderMaterial'lar da kullanır) ───────── */

export const DISSOLVE_VERT_DECL = /* glsl */ `varying vec3 vDWorld;`;

/** posExpr: vertex konumunu veren ifade ("transformed" veya "position") */
export const dissolveVertAssign = (posExpr: string): string => /* glsl */ `
  vec4 dwp = vec4(${posExpr}, 1.0);
  #ifdef USE_INSTANCING
    dwp = instanceMatrix * dwp;
  #endif
  vDWorld = (modelMatrix * dwp).xyz;
`;

export const DISSOLVE_FRAG_DECL = /* glsl */ `
  uniform float uDissLevel;
  uniform vec3 uDissEdge;
  varying vec3 vDWorld;

  float dHash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float dNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 fr = fract(x);
    fr = fr * fr * (3.0 - 2.0 * fr);
    return mix(
      mix(mix(dHash(i + vec3(0,0,0)), dHash(i + vec3(1,0,0)), fr.x),
          mix(dHash(i + vec3(0,1,0)), dHash(i + vec3(1,1,0)), fr.x), fr.y),
      mix(mix(dHash(i + vec3(0,0,1)), dHash(i + vec3(1,0,1)), fr.x),
          mix(dHash(i + vec3(0,1,1)), dHash(i + vec3(1,1,1)), fr.x), fr.y),
      fr.z);
  }
  /* Tarama çizgisinin üstündeki mesafe: <0 ise piksel henüz yok. 10 = tamamen görünür. */
  float dissolveField() {
    if (uDissLevel > 0.999) return 10.0;
    if (uDissLevel < 0.001) return -1.0;
    float n = dNoise(vDWorld * 14.0);
    float scanY = mix(${f(DISSOLVE_TOP + 0.12)}, ${f(DISSOLVE_BOTTOM - 0.12)}, uDissLevel);
    return vDWorld.y - scanY + (n - 0.5) * 0.14;
  }
`;

type ShaderParams = Parameters<Material['onBeforeCompile']>[0];

/**
 * MeshStandard/Physical materyaline tarama-dissolve + rim ışığı yamar.
 * Tüm yamalı materyaller aynı program anahtarını paylaşır (tek shader derlemesi).
 */
export function applyDissolve(material: Material, u: StdDissolveUniforms): void {
  material.onBeforeCompile = (shader: ShaderParams): void => {
    shader.uniforms.uDissLevel = u.uDissLevel;
    shader.uniforms.uDissEdge = u.uDissEdge;
    shader.uniforms.uRim = u.uRim;
    shader.uniforms.uLensMask = u.uLensMask;
    shader.uniforms.uLens = lensUniforms.uLens;
    shader.uniforms.uLensRes = lensUniforms.uLensRes;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${DISSOLVE_VERT_DECL}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${dissolveVertAssign('transformed')}`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${DISSOLVE_FRAG_DECL}\nuniform float uRim;\nuniform float uLensMask;\nuniform vec4 uLens;\nuniform vec2 uLensRes;`)
      .replace(
        '#include <clipping_planes_fragment>',
        /* glsl */ `#include <clipping_planes_fragment>
        float dissD = dissolveField();
        if (dissD < 0.0) discard;
        float lensDD = 9.0;
        if (uLens.w > 0.5 && uLensMask > 0.5) {
          vec2 lsp = gl_FragCoord.xy / uLensRes;
          lensDD = length((lsp - uLens.xy) * vec2(uLensRes.x / uLensRes.y, 1.0));
          if (lensDD < uLens.z) discard;
        }
        float dissEdge = 1.0 - smoothstep(0.0, 0.045, dissD);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        totalEmissiveRadiance += uDissEdge * dissEdge * 2.2;
        if (lensDD < 8.0) totalEmissiveRadiance += vec3(0.25, 0.85, 1.0) * exp(-(lensDD - uLens.z) * 55.0) * 1.6;
        float rimF = 1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
        totalEmissiveRadiance += uDissEdge * pow(rimF, 2.4) * uRim;`,
      );
  };
  material.customProgramCacheKey = () => 'atlas-dissolve-v2';
  material.needsUpdate = true;
}
