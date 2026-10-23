import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages gibi alt yolda yayınlarken BASE_PATH ile ayarlanır (ör. /klip-studio/).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  worker: { format: 'es' },
  // Tembel yüklenen SDK'yı baştan hazırla; aksi hâlde ilk kullanımda dev sunucusu sayfayı yeniler.
  optimizeDeps: { exclude: ['@huggingface/transformers', '@shiguredo/rnnoise-wasm'], include: ['@anthropic-ai/sdk'] },
  test: { include: ['tests/unit/**/*.test.ts'] },
});
