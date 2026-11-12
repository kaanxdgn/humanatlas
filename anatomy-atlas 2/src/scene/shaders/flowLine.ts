import { AdditiveBlending, Color, NormalBlending, ShaderMaterial, type IUniform } from 'three';

/**
 * Damar/sinir tüpleri için akan ışık shader'ı.
 * Beklenen geometri: uv.x tüp boyunca 0→1 (profileTube / TubeGeometry böyle üretir).
 *  - uDraw : "draw-on" ilerlemesi (0..1), tüp uzunluğu boyunca çizilir
 *  - uBeat : kalp atışı zarfı (0..1), damarlarda nabız parlaması
 *  - uHover/uDim : seçim ve odak durumu
 */
export type FlowUniforms = {
  uTime: IUniform<number>;
  uColor: IUniform<Color>;
  uColor2: IUniform<Color>;
  uSpeed: IUniform<number>;
  uDensity: IUniform<number>;
  uPhase: IUniform<number>;
  uBase: IUniform<number>;
  uGlow: IUniform<number>;
  uBeat: IUniform<number>;
  uBeatGain: IUniform<number>;
  uOpacity: IUniform<number>;
  uDraw: IUniform<number>;
  uHover: IUniform<number>;
  uDim: IUniform<number>;
};

export interface FlowOptions {
  color: string;
  /** Akan darbenin vurgu rengi */
  color2: string;
  speed?: number;
  /** Tüp boyunca görünen darbe sayısı */
  density?: number;
  phase?: number;
  base?: number;
  glow?: number;
  beatGain?: number;
  additive?: boolean;
}

const VERT = /* glsl */ `
  varying float vU;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vU = uv.x;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform float uSpeed;
  uniform float uDensity;
  uniform float uPhase;
  uniform float uBase;
  uniform float uGlow;
  uniform float uBeat;
  uniform float uBeatGain;
  uniform float uOpacity;
  uniform float uDraw;
  uniform float uHover;
  uniform float uDim;
  varying float vU;
  varying vec3 vN;
  varying vec3 vV;

  void main() {
    if (vU > uDraw) discard;

    // Akış yönünde (u artan) ilerleyen kuyruklu darbe: önde parlak, arkada sönük
    float x = fract(vU * uDensity - uTime * uSpeed + uPhase);
    float pulse = pow(x, 8.0);

    // Draw-on ucundaki parlak kenar
    float drawEdge = uDraw < 0.999 ? smoothstep(uDraw - 0.05, uDraw, vU) : 0.0;

    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
    float intensity = uBase * (0.55 + fres * 0.9)
                    + pulse * uGlow
                    + uBeat * uBeatGain * uBase
                    + drawEdge * 2.0
                    + uHover * 0.9;
    intensity *= (1.0 - 0.8 * uDim);

    vec3 col = mix(uColor, uColor2, clamp(pulse + drawEdge, 0.0, 1.0));
    float alpha = uOpacity * (1.0 - 0.85 * uDim) * clamp(0.35 + fres * 0.8 + pulse + drawEdge, 0.0, 1.0);

    gl_FragColor = vec4(col * intensity, alpha);
    #include <colorspace_fragment>
  }
`;

export function createFlowMaterial(opts: FlowOptions): {
  material: ShaderMaterial;
  uniforms: FlowUniforms;
} {
  const uniforms: FlowUniforms = {
    uTime: { value: 0 },
    uColor: { value: new Color(opts.color) },
    uColor2: { value: new Color(opts.color2) },
    uSpeed: { value: opts.speed ?? 0.35 },
    uDensity: { value: opts.density ?? 3 },
    uPhase: { value: opts.phase ?? 0 },
    uBase: { value: opts.base ?? 0.7 },
    uGlow: { value: opts.glow ?? 2.4 },
    uBeat: { value: 0 },
    uBeatGain: { value: opts.beatGain ?? 0 },
    uOpacity: { value: 1 },
    uDraw: { value: 0 },
    uHover: { value: 0 },
    uDim: { value: 0 },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: opts.additive ? AdditiveBlending : NormalBlending,
  });
  return { material, uniforms };
}
