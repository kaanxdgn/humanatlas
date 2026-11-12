import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Grid, Sparkles } from '@react-three/drei';
import { AdditiveBlending, BackSide, Color, DoubleSide, type Group } from 'three';
import { useAtlasStore, type PerfTier } from '@/store/useAtlasStore';
import { scrollState } from '@/utils/scrollState';
import { damp } from '@/utils/math';
import { useAccentColors } from './Body/helpers/useAccentColors';

/* Kamera sabitli radyal gradient: #0B1220 (merkez) → #05070D (kenar) + hafif accent parıltısı */
const DOME_VERT = /* glsl */ `
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const DOME_FRAG = /* glsl */ `
  uniform vec3 uInner;
  uniform vec3 uOuter;
  uniform vec3 uAccent;
  uniform vec3 uAccent2;
  uniform float uTime;
  uniform float uW[6];
  varying vec3 vView;

  float h21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  vec2 h22(vec2 p) { return vec2(h21(p), h21(p + 19.19)); }

  /* 0 · CİLT — yavaş akan aurora ışık lekeleri */
  vec3 skinBg(vec2 p, float t) {
    float b1 = exp(-2.2 * length(p - vec2(-1.1 + 0.35 * sin(t * 0.09), 0.3 + 0.25 * cos(t * 0.07))));
    float b2 = exp(-2.6 * length(p - vec2(1.2 + 0.3 * cos(t * 0.08), -0.15 + 0.3 * sin(t * 0.06))));
    float b3 = exp(-3.4 * length(p - vec2(0.15 * sin(t * 0.05), 1.0 + 0.15 * cos(t * 0.1))));
    return uAccent * b1 * 0.075 + uAccent2 * b2 * 0.06 + mix(uAccent, uAccent2, 0.5) * b3 * 0.045;
  }

  /* 1 · İSKELET — yukarıdan inen fildişi ışık huzmeleri + kemik kemer halkaları */
  vec3 boneBg(vec2 p, float t) {
    float s = sin(p.x * 7.5 + sin(t * 0.07) * 1.6 + p.y * 1.2) * 0.5 + 0.5;
    float shafts = pow(s, 7.0) * smoothstep(-0.5, 1.0, p.y) * (0.55 + 0.45 * sin(t * 0.22 + p.x * 3.0));
    float r = length(p - vec2(0.0, -1.5));
    float arcs = smoothstep(0.012, 0.0, abs(r - 1.55 - 0.03 * sin(t * 0.2)))
               + 0.6 * smoothstep(0.010, 0.0, abs(r - 2.25 + 0.04 * sin(t * 0.15)));
    return uAccent * shafts * 0.08 + uAccent2 * arcs * 0.05;
  }

  /* 2 · KAS — kalp atışıyla titreşen sıcak parıltı + akan kas lifleri */
  vec3 muscleBg(vec2 p, float t) {
    float ph = mod(t, 1.15);
    float beat = exp(-ph * 7.0) + 0.55 * exp(-abs(ph - 0.33) * 9.0);
    float glow = exp(-1.35 * length(p - vec2(0.0, -0.1))) * (0.03 + 0.065 * beat);
    float f = sin(p.y * 70.0 + sin(p.x * 3.4 + t * 0.25) * 3.6 + sin(p.x * 11.0 - t * 0.4) * 0.8);
    f = smoothstep(0.86, 1.0, f) * smoothstep(1.7, 0.2, length(p)) * (0.55 + 0.45 * beat);
    return uAccent * glow + uAccent2 * f * 0.05;
  }

  /* 3 · ORGANLAR — dönen kehribar nebula */
  vec3 organBg(vec2 p, float t) {
    float a = atan(p.y, p.x);
    float r = length(p);
    float n = sin(a * 3.0 + r * 5.0 - t * 0.35) * 0.5 + 0.5;
    n *= sin(a * 2.0 - r * 3.4 + t * 0.22) * 0.5 + 0.5;
    float bokeh = 0.0;
    vec2 g = p * 3.0 + vec2(t * 0.02, -t * 0.015);
    vec2 id = floor(g);
    vec2 q = fract(g) - 0.5;
    vec2 o = h22(id) - 0.5;
    bokeh = smoothstep(0.16, 0.0, length(q - o * 0.5)) * step(0.72, h21(id + 3.0));
    return mix(uAccent, uAccent2, n) * n * smoothstep(1.9, 0.1, r) * 0.10 + uAccent2 * bokeh * 0.10;
  }

  /* 4 · DOLAŞIM — kırmızı (atardamar) ve mavi (toplardamar) akan çizgiler */
  vec3 vascBg(vec2 p, float t) {
    float f1 = sin((p.x * 0.55 + p.y) * 15.0 - t * 1.7 + sin(p.x * 2.4 + t * 0.3) * 2.0) * 0.5 + 0.5;
    f1 = smoothstep(0.90, 1.0, f1);
    float f2 = sin((p.x * -0.4 + p.y) * 9.0 + t * 1.1 + sin(p.x * 1.7 - t * 0.2) * 2.3) * 0.5 + 0.5;
    f2 = smoothstep(0.92, 1.0, f2);
    float m = smoothstep(2.1, 0.2, length(p));
    float side = smoothstep(-0.9, 0.9, p.x);
    vec3 arterial = uAccent;
    vec3 venous = vec3(0.25, 0.55, 1.0);
    return mix(arterial, venous, side) * f1 * 0.065 * m + mix(venous, arterial, side) * f2 * 0.045 * m;
  }

  /* 5 · SİNİR — nöron ağı: düğümler, bağlantılar ve ilerleyen elektrik darbeleri */
  vec3 neuralBg(vec2 p, float t) {
    vec2 g = p * 2.3;
    vec2 id = floor(g);
    vec2 f = fract(g);
    float d1 = 8.0;
    float d2 = 8.0;
    float nodeId = 0.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 nb = vec2(float(i), float(j));
        vec2 pt = h22(id + nb);
        pt = 0.5 + 0.42 * sin(t * 0.30 + 6.2831 * pt);
        float d = length(nb + pt - f);
        if (d < d1) { d2 = d1; d1 = d; nodeId = h21(id + nb); }
        else if (d < d2) { d2 = d; }
      }
    }
    float edge = smoothstep(0.05, 0.0, d2 - d1) * 0.55;
    float node = smoothstep(0.11, 0.0, d1);
    float pulse = pow(0.5 + 0.5 * sin(t * 1.6 + nodeId * 40.0), 6.0);
    float travel = pow(0.5 + 0.5 * sin(t * 2.1 - (p.x + p.y) * 4.0 + nodeId * 12.0), 10.0);
    float m = smoothstep(2.2, 0.3, length(p));
    return (uAccent * edge * (0.05 + 0.10 * travel) + uAccent2 * node * (0.07 + 0.22 * pulse)) * m;
  }

  void main() {
    vec3 d = normalize(vView);
    vec2 p = d.xy * 3.4;
    float r = length(d.xy);
    vec3 col = mix(uInner, uOuter, smoothstep(0.0, 0.7, r));
    col += uAccent * 0.05 * (1.0 - smoothstep(0.0, 0.55, length(d.xy - vec2(0.0, 0.05))));
    if (uW[0] > 0.01) col += skinBg(p, uTime) * uW[0];
    if (uW[1] > 0.01) col += boneBg(p, uTime) * uW[1];
    if (uW[2] > 0.01) col += muscleBg(p, uTime) * uW[2];
    if (uW[3] > 0.01) col += organBg(p, uTime) * uW[3];
    if (uW[4] > 0.01) col += vascBg(p, uTime) * uW[4];
    if (uW[5] > 0.01) col += neuralBg(p, uTime) * uW[5];
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function BackdropDome() {
  const { accent, accent2 } = useAccentColors();
  const uniforms = useMemo(
    () => ({
      uInner: { value: new Color('#0B1220') },
      uOuter: { value: new Color('#05070D') },
      uAccent: { value: new Color('#8AB4FF') },
      uAccent2: { value: new Color('#C7D8FF') },
      uTime: { value: 0 },
      uW: { value: [1, 0, 0, 0, 0, 0] as number[] },
    }),
    [],
  );
  useFrame(({ clock }, dt) => {
    uniforms.uAccent.value.copy(accent);
    uniforms.uAccent2.value.copy(accent2);
    uniforms.uTime.value = clock.elapsedTime;
    // aktif sisteme göre arka plan modları yumuşakça çapraz geçiş yapar
    const target = SYSTEM_BG_INDEX[useAtlasStore.getState().activeSystem] ?? 0;
    const w = uniforms.uW.value;
    for (let i = 0; i < 6; i++) w[i] = damp(w[i], i === target ? 1 : 0, 2.4, Math.min(dt, 0.1));
  });
  return (
    <mesh renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[60, 32, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={DOME_VERT}
        fragmentShader={DOME_FRAG}
      />
    </mesh>
  );
}

const SYSTEM_BG_INDEX: Record<string, number> = {
  skin: 0,
  skeleton: 1,
  muscular: 2,
  organs: 3,
  vascular: 4,
  nervous: 5,
};

const HALO_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const HALO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float glow = pow(max(1.0 - r, 0.0), 2.4) * 0.5;
    float pulse = 0.5 + 0.5 * sin(uTime * 0.9);
    float ring = smoothstep(0.012, 0.0, abs(r - (0.34 + 0.02 * pulse))) * 0.55
               + smoothstep(0.008, 0.0, abs(r - 0.62)) * 0.25;
    float a = (glow + ring) * smoothstep(1.0, 0.8, r);
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/** Bedenin ayaklarının altında nefes alan hologram halka ve zemin parıltısı. */
function FloorHalo() {
  const { accent } = useAccentColors();
  const uniforms = useMemo(() => ({ uColor: { value: new Color('#8AB4FF') }, uTime: { value: 0 } }), []);
  useFrame(({ clock }) => {
    uniforms.uColor.value.copy(accent);
    uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} renderOrder={-5} frustumCulled={false}>
      <circleGeometry args={[1.5, 48]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={HALO_VERT}
        fragmentShader={HALO_FRAG}
      />
    </mesh>
  );
}

const COUNTS: Record<PerfTier, { far: number; near: number }> = {
  high: { far: 160, near: 60 },
  medium: { far: 80, near: 30 },
  low: { far: 35, near: 0 },
};

/** Arka plan: gradient kubbe, hologram zemin ızgarası ve scroll hızına tepki veren parçacıklar. */
export default function SceneEnvironment() {
  const tier = useAtlasStore((s) => s.perfTier);
  const mobile = useAtlasStore((s) => s.isMobile);
  const reduced = useAtlasStore((s) => s.reducedMotion);
  const accent = useAtlasStore((s) => s.accent);

  const far = useRef<Group>(null);
  const near = useRef<Group>(null);
  const vel = useRef(0);

  const factor = mobile ? 0.5 : 1;
  const counts = COUNTS[tier];

  /* Parallax: iki parçacık katmanı farklı hızlarda kayar ve scroll hızıyla döner */
  useFrame((_, dt) => {
    if (reduced) return;
    vel.current = damp(vel.current, scrollState.velocity, 4, dt);
    const p = scrollState.progress;
    if (far.current) {
      far.current.position.y = -p * 1.5;
      far.current.rotation.y += dt * 0.01 + vel.current * 0.0006;
    }
    if (near.current) {
      near.current.position.y = -p * 4;
      near.current.rotation.y -= dt * 0.02 + vel.current * 0.0012;
    }
  });

  return (
    <>
      <BackdropDome />
      <FloorHalo />

      <Grid
        position={[0, -0.01, 0]}
        args={[20, 20]}
        cellSize={0.25}
        cellThickness={0.6}
        cellColor="#1b2947"
        sectionSize={1}
        sectionThickness={1}
        sectionColor={accent}
        fadeDistance={9}
        fadeStrength={1.6}
        infiniteGrid
        side={DoubleSide}
      />

      <group ref={far}>
        <Sparkles
          count={Math.round(counts.far * factor)}
          scale={[9, 6, 9]}
          position={[0, 1, 0]}
          size={2.2}
          speed={reduced ? 0 : 0.25}
          opacity={0.5}
          color={accent}
          noise={0.6}
        />
      </group>

      {counts.near > 0 && (
        <group ref={near}>
          <Sparkles
            count={Math.round(counts.near * factor)}
            scale={[5, 4, 5]}
            position={[0, 1, 0]}
            size={4}
            speed={reduced ? 0 : 0.4}
            opacity={0.35}
            color="#ffffff"
            noise={1}
          />
        </group>
      )}
    </>
  );
}
