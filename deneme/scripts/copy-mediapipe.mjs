// Copies the MediaPipe wasm files into public/ so we don't depend on a CDN.
import { cpSync } from 'node:fs';

cpSync('node_modules/@mediapipe/tasks-vision/wasm', 'public/mediapipe-wasm', { recursive: true });
