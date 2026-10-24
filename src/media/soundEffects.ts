import { encodeWav } from './audio';

// Sound effects synthesized with Web Audio: no sample files and no licensing questions.

export type SoundEffect = 'whoosh' | 'pop' | 'ding' | 'click' | 'riser' | 'boom' | 'shutter';

export const SOUND_EFFECTS: { id: SoundEffect; label: string; duration: number }[] = [
  { id: 'whoosh', label: 'Whoosh', duration: 0.8 },
  { id: 'pop', label: 'Pop', duration: 0.2 },
  { id: 'ding', label: 'Ding', duration: 1.5 },
  { id: 'click', label: 'Click', duration: 0.08 },
  { id: 'riser', label: 'Riser', duration: 2 },
  { id: 'boom', label: 'Boom', duration: 1.6 },
  { id: 'shutter', label: 'Camera shutter', duration: 0.3 },
];

const RATE = 48000;

function noise(context: OfflineAudioContext, seconds: number) {
  const buffer = context.createBuffer(1, Math.ceil(seconds * RATE), RATE);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const node = context.createBufferSource();
  node.buffer = buffer;
  return node;
}

function envelope(context: OfflineAudioContext, points: [number, number][]) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(points[0][1], points[0][0]);
  for (const [time, value] of points.slice(1)) gain.gain.linearRampToValueAtTime(value, time);
  return gain;
}

function tone(context: OfflineAudioContext, type: OscillatorType, from: number, to: number, seconds: number) {
  const osc = new OscillatorNode(context, { type, frequency: from });
  osc.frequency.exponentialRampToValueAtTime(to, seconds);
  return osc;
}

const BUILD: Record<SoundEffect, (c: OfflineAudioContext, out: AudioNode) => void> = {
  whoosh: (c, out) => {
    const src = noise(c, 0.8);
    const filter = new BiquadFilterNode(c, { type: 'bandpass', frequency: 300, Q: 1.2 });
    filter.frequency.exponentialRampToValueAtTime(3000, 0.4);
    filter.frequency.exponentialRampToValueAtTime(500, 0.8);
    src
      .connect(filter)
      .connect(
        envelope(c, [
          [0, 0],
          [0.4, 0.9],
          [0.8, 0],
        ]),
      )
      .connect(out);
    src.start();
  },
  pop: (c, out) => {
    const osc = tone(c, 'sine', 700, 120, 0.12);
    osc
      .connect(
        envelope(c, [
          [0, 0.9],
          [0.15, 0],
        ]),
      )
      .connect(out);
    osc.start();
    osc.stop(0.2);
  },
  ding: (c, out) => {
    for (const [frequency, level] of [
      [1320, 0.5],
      [2640, 0.15],
      [3960, 0.06],
    ]) {
      const osc = new OscillatorNode(c, { frequency });
      const gain = c.createGain();
      gain.gain.setValueAtTime(level, 0);
      gain.gain.exponentialRampToValueAtTime(0.001, 1.5);
      osc.connect(gain).connect(out);
      osc.start();
    }
  },
  click: (c, out) => {
    const src = noise(c, 0.08);
    src
      .connect(new BiquadFilterNode(c, { type: 'highpass', frequency: 2000 }))
      .connect(
        envelope(c, [
          [0, 1],
          [0.03, 0],
        ]),
      )
      .connect(out);
    src.start();
  },
  riser: (c, out) => {
    const osc = tone(c, 'sawtooth', 150, 1200, 2);
    const filter = new BiquadFilterNode(c, { type: 'lowpass', frequency: 400 });
    filter.frequency.exponentialRampToValueAtTime(6000, 2);
    osc
      .connect(filter)
      .connect(
        envelope(c, [
          [0, 0],
          [1.9, 0.35],
          [2, 0],
        ]),
      )
      .connect(out);
    osc.start();
  },
  boom: (c, out) => {
    const osc = tone(c, 'sine', 90, 32, 1.4);
    osc
      .connect(
        envelope(c, [
          [0, 1],
          [1.6, 0],
        ]),
      )
      .connect(out);
    osc.start();
    const rumble = noise(c, 1.6);
    rumble
      .connect(new BiquadFilterNode(c, { type: 'lowpass', frequency: 180 }))
      .connect(
        envelope(c, [
          [0, 0.8],
          [1.2, 0],
        ]),
      )
      .connect(out);
    rumble.start();
  },
  shutter: (c, out) => {
    for (const at of [0, 0.09]) {
      const src = noise(c, 0.06);
      src
        .connect(new BiquadFilterNode(c, { type: 'bandpass', frequency: 2500, Q: 0.8 }))
        .connect(
          envelope(c, [
            [at, 0],
            [at + 0.003, 0.9],
            [at + 0.05, 0],
          ]),
        )
        .connect(out);
      src.start(at);
    }
  },
};

export async function synthesizeSoundEffect(id: SoundEffect): Promise<Blob> {
  const { duration } = SOUND_EFFECTS.find((s) => s.id === id)!;
  const context = new OfflineAudioContext(1, Math.ceil(duration * RATE), RATE);
  const master = new GainNode(context, { gain: 0.8 });
  master.connect(context.destination);
  BUILD[id](context, master);
  const buffer = await context.startRendering();
  return encodeWav(buffer.getChannelData(0), RATE);
}
