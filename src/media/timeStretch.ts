// WSOLA time-stretch: speeds audio up or down without changing pitch.
// Gives the export the same result as the preview <video> element's preservesPitch.

const FRAME = 2048;
const HOP_OUT = FRAME / 2;
const TOLERANCE = 512;
const CORR_LENGTH = 512;
const STEP = 4; // sample stride to speed up the similarity search

const HANN = Float32Array.from({ length: FRAME }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FRAME));

// Searches for the best overlap to pick source positions for each output frame (all channels share them).
function framePositions(mono: Float32Array, rate: number, frames: number) {
  const positions = [0];
  for (let k = 1; k < frames; k++) {
    const natural = positions[k - 1] + HOP_OUT;
    const ideal = Math.round(k * HOP_OUT * rate);
    let best = ideal;
    let bestScore = -Infinity;
    for (let delta = -TOLERANCE; delta <= TOLERANCE; delta += STEP) {
      const candidate = ideal + delta;
      if (candidate < 0 || candidate + CORR_LENGTH >= mono.length || natural + CORR_LENGTH >= mono.length) continue;
      let score = 0;
      for (let n = 0; n < CORR_LENGTH; n += STEP) score += mono[natural + n] * mono[candidate + n];
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    positions.push(Math.max(0, best));
  }
  return positions;
}

export function timeStretch(buffer: AudioBuffer, rate: number): AudioBuffer {
  if (Math.abs(rate - 1) < 1e-3) return buffer;
  const outLength = Math.max(1, Math.round(buffer.length / rate));
  const frames = Math.ceil(outLength / HOP_OUT) + 1;
  const mono = buffer.getChannelData(0);
  const positions = framePositions(mono, rate, frames);
  const out = new AudioBuffer({ length: outLength, sampleRate: buffer.sampleRate, numberOfChannels: buffer.numberOfChannels });

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch);
    const output = out.getChannelData(ch);
    for (let k = 0; k < frames; k++) {
      const outStart = k * HOP_OUT;
      const inStart = positions[k];
      for (let n = 0; n < FRAME; n++) {
        const o = outStart + n;
        if (o >= outLength) break;
        output[o] += (input[inStart + n] ?? 0) * HANN[n];
      }
    }
  }
  return out;
}
