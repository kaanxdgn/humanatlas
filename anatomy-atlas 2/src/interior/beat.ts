/** Tüm iç sahnenin paylaştığı ritim: kalp atışı, nefes, yavaş (sfinkter) döngü. */
export const beat = { t: 0, sys: false, dia: false, pulse: 0, breath: 0, slow: 0 };

const T = 1.15;

export function updateBeat(dt: number): void {
  beat.t += dt;
  const p = (beat.t % T) / T;
  beat.sys = p < 0.36;
  beat.dia = p > 0.42;
  beat.pulse = p < 0.36 ? Math.sin((p / 0.36) * Math.PI) : 0;
  beat.breath = Math.sin(beat.t * 0.85);
  beat.slow = Math.sin(beat.t * 0.5);
}

export function phaseOpen(phase: 'sys' | 'dia' | 'slow'): number {
  if (phase === 'sys') return beat.sys ? 1 : 0;
  if (phase === 'dia') return beat.dia ? 1 : 0;
  return beat.slow > 0.15 ? 1 : 0;
}
