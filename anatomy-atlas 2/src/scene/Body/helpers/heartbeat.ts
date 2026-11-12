/** Kalp ve solunum ritmi (tüm katmanlar aynı saatten okur → senkron). */
export const BPM = 72;
export const BREATHS_PER_MIN = 15;

/** Canlı yaşamsal değerler: egzersiz kaydırıcısı (effort) nabzı ve nefesi hızlandırır. */
export const vitals = { effort: 0, bpm: BPM, rpm: BREATHS_PER_MIN, beatCycle: 0, breathCycle: 0 };

/** Karede bir kez çağrılır: hedef değerlere yumuşakça yaklaşır ve fazları ilerletir. */
export function tickVitals(dt: number, effort: number): void {
  vitals.effort += (effort - vitals.effort) * Math.min(1, dt * 2);
  const bpm = BPM + vitals.effort * 105;
  const rpm = BREATHS_PER_MIN + vitals.effort * 27;
  vitals.bpm += (bpm - vitals.bpm) * Math.min(1, dt * 1.6);
  vitals.rpm += (rpm - vitals.rpm) * Math.min(1, dt * 1.6);
  vitals.beatCycle += (dt * vitals.bpm) / 60;
  vitals.breathCycle += (dt * vitals.rpm) / 60;
}

const gauss = (x: number, c: number, w: number): number => Math.exp(-((x - c) * (x - c)) / (2 * w * w));

/** "Lub-dub" zarfı, 0..1 (zaman parametresi eski API uyumu için; faz vitals'tan okunur). */
export function beatEnvelope(_t?: number): number {
  const p = ((vitals.beatCycle % 1) + 1) % 1;
  return Math.min(1, gauss(p, 0.08, 0.035) + 0.6 * gauss(p, 0.3, 0.04));
}

/** Nefes fazı, 0..1 (0 = verilmiş, 1 = tam alınmış), yumuşak sinüs. */
export function breathPhase(_t?: number): number {
  return 0.5 - 0.5 * Math.cos(vitals.breathCycle * Math.PI * 2);
}
