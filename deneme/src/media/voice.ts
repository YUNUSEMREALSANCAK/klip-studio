import { sourceSpan } from '../core/timeline';
import type { Asset, MediaClip } from '../core/types';
import { decodeAssetAudio, encodeWav } from './audio';
import { timeStretch } from './timeStretch';

// Voice changer: renders a clip's audio through an effect into a new WAV, like CapCut's voice effects.

export type VoicePreset = 'chipmunk' | 'deep' | 'robot' | 'echo' | 'telephone' | 'monster' | 'megaphone' | 'radio' | 'cave';

export const VOICE_PRESETS: { id: VoicePreset; label: string }[] = [
  { id: 'chipmunk', label: 'Chipmunk' },
  { id: 'deep', label: 'Deep' },
  { id: 'robot', label: 'Robot' },
  { id: 'echo', label: 'Echo' },
  { id: 'telephone', label: 'Telephone' },
  { id: 'monster', label: 'Monster' },
  { id: 'megaphone', label: 'Megaphone' },
  { id: 'radio', label: 'Radio' },
  { id: 'cave', label: 'Cave' },
];

const RATE = 48000;
const PITCH: Partial<Record<VoicePreset, number>> = { chipmunk: 2 ** (7 / 12), deep: 2 ** (-5 / 12), monster: 2 ** (-9 / 12) };
// Speaker-like band limits
const BANDS: Partial<Record<VoicePreset, [number, number]>> = { telephone: [400, 3200], megaphone: [600, 3500], radio: [300, 4500] };

// The clip's source range as a mono buffer at 48 kHz.
async function clipAudio(clip: MediaClip, asset: Asset): Promise<AudioBuffer> {
  const source = await decodeAssetAudio(asset);
  const length = Math.max(1, Math.round(sourceSpan(clip) * RATE));
  const context = new OfflineAudioContext(1, length, RATE);
  const node = context.createBufferSource();
  node.buffer = source;
  node.connect(context.destination);
  node.start(0, clip.in, sourceSpan(clip));
  return context.startRendering();
}

// Pitch shift without changing duration: stretch by the factor (WSOLA), then play it back that much faster.
async function shiftPitch(buffer: AudioBuffer, factor: number): Promise<AudioBuffer> {
  const stretched = timeStretch(buffer, 1 / factor);
  const context = new OfflineAudioContext(1, buffer.length, RATE);
  const node = context.createBufferSource();
  node.buffer = stretched;
  node.playbackRate.value = factor;
  node.connect(context.destination);
  node.start();
  return context.startRendering();
}

async function bandPass(buffer: AudioBuffer, low: number, high: number): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(1, buffer.length, RATE);
  const node = context.createBufferSource();
  node.buffer = buffer;
  const highpass = new BiquadFilterNode(context, { type: 'highpass', frequency: low, Q: 0.9 });
  const lowpass = new BiquadFilterNode(context, { type: 'lowpass', frequency: high, Q: 0.9 });
  node.connect(highpass).connect(lowpass).connect(context.destination);
  node.start();
  return context.startRendering();
}

// A large room: the voice convolved with a decaying noise burst (a synthetic impulse response).
async function reverb(buffer: AudioBuffer, seconds: number, wet: number): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(1, buffer.length, RATE);
  const impulse = context.createBuffer(1, Math.round(seconds * RATE), RATE);
  const data = impulse.getChannelData(0);
  let seed = 7;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 1073741823.5 - 1) * Math.pow(1 - i / data.length, 3);
  }
  const node = context.createBufferSource();
  node.buffer = buffer;
  const convolver = new ConvolverNode(context, { buffer: impulse });
  node.connect(new GainNode(context, { gain: 1 - wet })).connect(context.destination);
  node
    .connect(convolver)
    .connect(new GainNode(context, { gain: wet }))
    .connect(context.destination);
  node.start();
  return context.startRendering();
}

export async function changeVoice(clip: MediaClip, asset: Asset, preset: VoicePreset): Promise<Blob> {
  let buffer = await clipAudio(clip, asset);
  const pitch = PITCH[preset];
  if (pitch) buffer = await shiftPitch(buffer, pitch);
  const band = BANDS[preset];
  if (band) buffer = await bandPass(buffer, band[0], band[1]);
  if (preset === 'cave') buffer = await reverb(buffer, 2.4, 0.45);
  const samples = buffer.getChannelData(0).slice();

  if (preset === 'robot') {
    // Ring modulation at 50 Hz gives the metallic, flat tone.
    for (let i = 0; i < samples.length; i++) samples[i] *= 0.6 + 0.8 * Math.sin((2 * Math.PI * 50 * i) / RATE);
  } else if (preset === 'echo') {
    const delay = Math.round(0.22 * RATE);
    for (let i = delay; i < samples.length; i++) samples[i] += samples[i - delay] * 0.45;
  } else if (preset === 'telephone') {
    for (let i = 0; i < samples.length; i++) samples[i] = Math.tanh(samples[i] * 2.5) * 0.6;
  } else if (preset === 'megaphone') {
    for (let i = 0; i < samples.length; i++) samples[i] = Math.tanh(samples[i] * 6) * 0.5;
  } else if (preset === 'radio') {
    // Soft saturation plus a little static
    let seed = 11;
    for (let i = 0; i < samples.length; i++) {
      seed = (seed * 16807) % 2147483647;
      samples[i] = Math.tanh(samples[i] * 1.8) * 0.7 + (seed / 1073741823.5 - 1) * 0.006;
    }
  } else if (preset === 'monster') {
    for (let i = 0; i < samples.length; i++) samples[i] = Math.tanh(samples[i] * 1.6);
  }

  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  if (peak > 0.98) for (let i = 0; i < samples.length; i++) samples[i] *= 0.98 / peak;
  return encodeWav(samples, RATE);
}
