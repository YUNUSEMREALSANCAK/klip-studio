import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Set via BASE_PATH when serving from a subpath such as GitHub Pages (e.g. /klip-studio/).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  worker: { format: 'es' },
  // Pre-bundle the lazily loaded SDK; otherwise the dev server reloads the page on first use.
  optimizeDeps: { exclude: ['@huggingface/transformers', '@shiguredo/rnnoise-wasm'], include: ['@anthropic-ai/sdk'] },
  test: { include: ['tests/unit/**/*.test.ts'] },
});
