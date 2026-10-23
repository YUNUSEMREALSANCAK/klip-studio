// MediaPipe wasm dosyalarını public/ altına kopyalar; böylece CDN'e bağımlı kalmayız.
import { cpSync } from 'node:fs';

cpSync('node_modules/@mediapipe/tasks-vision/wasm', 'public/mediapipe-wasm', { recursive: true });
