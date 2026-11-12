import { Color, DoubleSide, FrontSide, ShaderMaterial, type IUniform } from 'three';
import {
  DISSOLVE_FRAG_DECL,
  DISSOLVE_VERT_DECL,
  createDissolveUniforms,
  dissolveVertAssign,
  type DissolveUniforms,
} from './dissolve';

export type FresnelUniforms = DissolveUniforms & {
  uColor: IUniform<Color>;
  uRimColor: IUniform<Color>;
  uPower: IUniform<number>;
  uFill: IUniform<number>;
  uOpacity: IUniform<number>;
  uHover: IUniform<number>;
  uTime: IUniform<number>;
};

export interface FresnelOptions {
  color?: string;
  rim?: string;
  power?: number;
  /** Kenar dışındaki yüzeyin taban saydamlığı */
  fill?: number;
  doubleSide?: boolean;
}

const VERT = /* glsl */ `
  ${DISSOLVE_VERT_DECL}
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    ${dissolveVertAssign('position')}
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${DISSOLVE_FRAG_DECL}
  uniform vec3 uColor;
  uniform vec3 uRimColor;
  uniform float uPower;
  uniform float uFill;
  uniform float uOpacity;
  uniform float uHover;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vV;

  void main() {
    float dd = dissolveField();
    if (dd < 0.0) discard;
    float edge = 1.0 - smoothstep(0.0, 0.045, dd);

    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
    float lines = 0.5 + 0.5 * sin(vDWorld.y * 220.0 - uTime * 0.8);   // hologram çizgileri
    float band = smoothstep(0.96, 1.0, sin(vDWorld.y * 6.0 - uTime * 0.35)); // yavaş süzülen ışık bandı

    vec3 col = mix(uColor, uRimColor, fres) * (0.7 + fres);
    col += uRimColor * (band * 0.35 + uHover * 0.45);
    col += uDissEdge * edge * 2.0;

    float a = (uFill + fres * 0.85 + lines * 0.04 * fres + band * 0.12 + uHover * 0.12) * uOpacity;
    a = clamp(a + edge * 0.9 * uOpacity, 0.0, 1.0);

    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

/** Cilt / cam gövde için fresnel + hologram çizgili ShaderMaterial. */
export function createFresnelMaterial(opts: FresnelOptions = {}): {
  material: ShaderMaterial;
  uniforms: FresnelUniforms;
} {
  const uniforms: FresnelUniforms = {
    ...createDissolveUniforms(opts.rim ?? '#8AB4FF'),
    uColor: { value: new Color(opts.color ?? '#10203a') },
    uRimColor: { value: new Color(opts.rim ?? '#8AB4FF') },
    uPower: { value: opts.power ?? 2.4 },
    uFill: { value: opts.fill ?? 0.05 },
    uOpacity: { value: 1 },
    uHover: { value: 0 },
    uTime: { value: 0 },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    side: opts.doubleSide ? DoubleSide : FrontSide,
  });
  return { material, uniforms };
}
