import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages gibi alt yolda yayınlarken BASE_PATH ile ayarlanır (ör. /klip-studio/).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@huggingface/transformers', '@shiguredo/rnnoise-wasm'] },
  test: { include: ['tests/unit/**/*.test.ts'] },
});
