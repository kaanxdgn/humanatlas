import { vitals } from '@/scene/Body/helpers/heartbeat';

/** Web Audio ile sentezlenen kalp atışı ve nefes sesi (dosya gerekmez). */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let raf = 0;
let lastBeat = -1;
let lastBreath = -1;

function thump(at: number, freq: number, gain: number): void {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, at);
  o.frequency.exponentialRampToValueAtTime(freq * 0.5, at + 0.14);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
  o.connect(g).connect(master);
  o.start(at);
  o.stop(at + 0.2);
}

function breath(at: number, dur: number): void {
  if (!ctx || !master) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(500, at);
  f.frequency.linearRampToValueAtTime(900, at + dur * 0.5);
  f.frequency.linearRampToValueAtTime(450, at + dur);
  f.Q.value = 0.6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(0.1, at + dur * 0.45);
  g.gain.linearRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(master);
  src.start(at);
}

function loop(): void {
  if (!ctx) return;
  const b = Math.floor(vitals.beatCycle);
  if (lastBeat < 0) lastBeat = b;
  if (b !== lastBeat) {
    lastBeat = b;
    const t = ctx.currentTime + 0.02;
    const gap = (60 / vitals.bpm) * 0.28;
    thump(t, 62, 0.9);
    thump(t + gap, 50, 0.55);
  }
  const r = Math.floor(vitals.breathCycle);
  if (lastBreath < 0) lastBreath = r;
  if (r !== lastBreath) {
    lastBreath = r;
    breath(ctx.currentTime + 0.02, Math.max(0.9, (60 / vitals.rpm) * 0.9));
  }
  raf = requestAnimationFrame(loop);
}

export function setSoundOn(on: boolean): void {
  if (on) {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    void ctx.resume();
    lastBeat = -1;
    lastBreath = -1;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  } else {
    cancelAnimationFrame(raf);
    if (ctx) void ctx.suspend();
  }
}
