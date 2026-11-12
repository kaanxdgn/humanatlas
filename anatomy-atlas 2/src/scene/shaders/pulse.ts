import { Color, type IUniform, type MeshPhysicalMaterial } from 'three';

export interface PulseUniforms {
  uPTime: IUniform<number>;
  uPColor: IUniform<Color>;
  uPAmt: IUniform<number>;
  uPBeat: IUniform<number>;
}

export interface PulseOptions {
  color: string;
  /** Darbelerin dolaşım hızı */
  speed?: number;
  /** Parlama gücü */
  amount?: number;
  /** Bant sıklığı (m başına) */
  freq?: number;
  /** +1: yukarı doğru, -1: aşağı doğru akar */
  dir?: 1 | -1;
}

/**
 * Hazır bir PBR malzemeye, mesh üzerinde dünya konumuna bağlı akan ışık darbeleri ekler.
 * Önceden bağlı onBeforeCompile (ör. dissolve) korunur. Kan akışı / sinir sinyali için.
 */
export function applyPulse(material: MeshPhysicalMaterial, opt: PulseOptions): PulseUniforms {
  const u: PulseUniforms = {
    uPTime: { value: 0 },
    uPColor: { value: new Color(opt.color) },
    uPAmt: { value: opt.amount ?? 1.4 },
    uPBeat: { value: 0 },
  };
  const speed = (opt.speed ?? 1.2) * (opt.dir ?? 1) * -1;
  const freq = opt.freq ?? 7;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vPW;
uniform float uPTime; uniform vec3 uPColor; uniform float uPAmt; uniform float uPBeat;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        {
          float ph = dot(vPW, vec3(0.35, 1.0, 0.25)) * ${freq.toFixed(2)} + uPTime * ${speed.toFixed(3)};
          float band = pow(0.5 + 0.5 * sin(ph * 6.2831853), 5.0);
          float band2 = pow(0.5 + 0.5 * sin(ph * 3.7 + 1.3), 8.0) * 0.5;
          totalEmissiveRadiance += uPColor * (band + band2) * uPAmt * (1.0 + uPBeat * 1.6);
        }`,
      );
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}|pulse${freq}${speed}`;
  material.needsUpdate = true;
  return u;
}
