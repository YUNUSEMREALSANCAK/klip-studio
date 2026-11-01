// Integrated loudness (ITU-R BS.1770-4 / EBU R128) and loudness normalization.
// Instagram, TikTok and YouTube play videos at about -14 LUFS; a mix normalized there keeps its dynamics
// instead of being turned down (or up) by the platform.

export const SOCIAL_LOUDNESS = -14; // LUFS
const CEILING_DB = -1.5; // sample-peak ceiling, leaves room for codec overshoot

type Biquad = [b0: number, b1: number, b2: number, a1: number, a2: number];

// K-weighting: a high shelf (head effect) followed by a high-pass (RLB curve), for any sample rate.
function kWeighting(sampleRate: number): Biquad[] {
  let k = Math.tan((Math.PI * 1681.974450955533) / sampleRate);
  const q1 = 0.7071752369554196;
  const vh = Math.pow(10, 3.999843853973347 / 20);
  const vb = Math.pow(vh, 0.4996667741545416);
  let a0 = 1 + k / q1 + k * k;
  const shelf: Biquad = [
    (vh + (vb * k) / q1 + k * k) / a0,
    (2 * (k * k - vh)) / a0,
    (vh - (vb * k) / q1 + k * k) / a0,
    (2 * (k * k - 1)) / a0,
    (1 - k / q1 + k * k) / a0,
  ];
  k = Math.tan((Math.PI * 38.13547087602444) / sampleRate);
  const q2 = 0.5003270373238773;
  a0 = 1 + k / q2 + k * k;
  const highPass: Biquad = [1, -2, 1, (2 * (k * k - 1)) / a0, (1 - k / q2 + k * k) / a0];
  return [shelf, highPass];
}

function filter(input: Float32Array, [b0, b1, b2, a1, a2]: Biquad): Float32Array {
  const out = new Float32Array(input.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    out[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  return out;
}

const toLufs = (power: number) => -0.691 + 10 * Math.log10(power);

// Gated integrated loudness in LUFS; -Infinity for silence. Channels are weighted equally (mono/stereo).
export function integratedLoudness(channels: Float32Array[], sampleRate: number): number {
  const weighted = channels.map((data) => kWeighting(sampleRate).reduce(filter, data));
  const block = Math.round(0.4 * sampleRate);
  const step = Math.round(0.1 * sampleRate);
  const length = weighted[0]?.length ?? 0;
  const powers: number[] = [];
  for (let start = 0; start + block <= length; start += step) {
    let power = 0;
    for (const data of weighted) {
      let sum = 0;
      for (let i = start; i < start + block; i++) sum += data[i] * data[i];
      power += sum / block;
    }
    powers.push(power);
  }
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const absolute = powers.filter((p) => toLufs(p) > -70);
  if (!absolute.length) return -Infinity;
  const relativeGate = toLufs(mean(absolute)) - 10;
  const gated = absolute.filter((p) => toLufs(p) > relativeGate);
  return toLufs(mean(gated));
}

// Gain each sample may take so no channel exceeds the ceiling, with a 5 ms look-ahead and a smooth release.
function limiterGain(channels: Float32Array[], sampleRate: number, ceiling: number): Float32Array {
  const length = channels[0].length;
  const need = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let peak = 0;
    for (const data of channels) peak = Math.max(peak, Math.abs(data[i]));
    need[i] = peak > ceiling ? ceiling / peak : 1;
  }
  const window = Math.max(1, Math.round(0.005 * sampleRate));
  // Minimum over the next `window` samples (monotonic deque), then a box average: the gain is already
  // down when the peak arrives and never jumps.
  const ahead = new Float32Array(length);
  const deque: number[] = [];
  for (let i = length - 1; i >= 0; i--) {
    while (deque.length && need[deque[deque.length - 1]] >= need[i]) deque.pop();
    deque.push(i);
    while (deque[0] > i + window) deque.shift();
    ahead[i] = need[deque[0]];
  }
  const gain = new Float32Array(length);
  let sum = window; // the samples before the start count as unity gain
  const release = 1 - Math.exp(-1 / (0.08 * sampleRate));
  let level = 1;
  for (let i = 0; i < length; i++) {
    sum += ahead[i] - (i >= window ? ahead[i - window] : 1);
    const target = sum / window;
    level = target < level ? target : level + (target - level) * release;
    gain[i] = level;
  }
  return gain;
}

// Brings the audio to the target loudness in place, limiting peaks to the ceiling. Returns the applied gain in dB.
export function normalizeLoudness(channels: Float32Array[], sampleRate: number, target = SOCIAL_LOUDNESS, ceilingDb = CEILING_DB): number {
  const loudness = integratedLoudness(channels, sampleRate);
  if (!Number.isFinite(loudness)) return 0;
  const gainDb = target - loudness;
  const gain = Math.pow(10, gainDb / 20);
  for (const data of channels) for (let i = 0; i < data.length; i++) data[i] *= gain;
  const limit = limiterGain(channels, sampleRate, Math.pow(10, ceilingDb / 20));
  for (const data of channels) for (let i = 0; i < data.length; i++) data[i] *= limit[i];
  return gainDb;
}
