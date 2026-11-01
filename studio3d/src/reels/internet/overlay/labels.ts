import type {CamKey} from '../../../kit/three/camera';
import type {V3} from '../../../kit/three/util';
import {cam as dnsCam} from '../scenes/S3Dns';
import {cam as computerCam} from '../scenes/S1Computer';
import {cam as handshakeCam, STACK} from '../scenes/S4Handshake';
import {cam as packetsCam, R1, R2} from '../scenes/S5Packets';
import {cam as serverCam} from '../scenes/S6Server';

/* Post-prodüksiyon teknik etiketleri. Zamanlar seslendirmeden (sn). */

export type Label = {
  from: number;
  to: number;
  title: string;
  sub?: string;
  subAt?: number;
  /** 3D noktaya iliştirilmiş etiket: o sahnenin kamera yolu + dünya konumu */
  anchor?: {cam: CamKey[]; point: V3; side?: 'left' | 'right'};
  /** Sabit konumlu etiket (piksel, 1080x1920) */
  fixed?: {x: number; y: number};
  mono?: boolean;
};

export const LABELS: Label[] = [
  {from: 3.0, to: 4.4, title: 'URL', anchor: {cam: computerCam, point: [-1.05, 0.84, 0.07], side: 'left'}},
  {from: 4.45, to: 5.6, title: 'Enter', anchor: {cam: computerCam, point: [1.35, -1.74, 1.39], side: 'left'}},

  {from: 16.35, to: 18.3, title: 'Tarayıcı önbelleği', sub: 'Kayıt yok', subAt: 17.5, anchor: {cam: dnsCam, point: [-3.6, 2.75, -1.6], side: 'left'}},
  {from: 17.7, to: 20.5, title: 'İşletim sistemi önbelleği', sub: 'Kayıt yok', subAt: 19.0, anchor: {cam: dnsCam, point: [3.6, 2.75, -1.6], side: 'right'}},
  {from: 21.5, to: 26.4, title: 'Recursive DNS Resolver', anchor: {cam: dnsCam, point: [0, 12.6, -34], side: 'right'}},
  {from: 26.9, to: 28.1, title: 'Root DNS', anchor: {cam: dnsCam, point: [-18, 35.6, -64], side: 'right'}},
  {from: 28.05, to: 29.0, title: 'TLD DNS', sub: '.com', subAt: 28.05, anchor: {cam: dnsCam, point: [0, 27.6, -76], side: 'right'}},
  {from: 28.95, to: 31.6, title: 'Authoritative DNS', anchor: {cam: dnsCam, point: [18, 19.6, -64], side: 'left'}},
  {from: 33.1, to: 37.75, title: 'IP adresi bulundu', sub: 'fityazilim.com → 203.0.113.42', subAt: 33.3, fixed: {x: 540, y: 1480}},

  {from: 40.0, to: 45.4, title: 'HTTP/3', anchor: {cam: handshakeCam, point: [-0.85, STACK.http3[1], STACK.http3[2]], side: 'left'}},
  {from: 42.15, to: 45.4, title: 'QUIC', anchor: {cam: handshakeCam, point: [-0.85, STACK.quic[1], STACK.quic[2]], side: 'left'}},
  {from: 41.25, to: 45.4, title: 'UDP', anchor: {cam: handshakeCam, point: [-0.85, STACK.udp[1], STACK.udp[2]], side: 'left'}},
  {from: 43.6, to: 45.0, title: 'TLS 1.3', anchor: {cam: handshakeCam, point: [STACK.tlsStart[0] + 0.7, STACK.tlsStart[1], STACK.tlsStart[2]], side: 'right'}},
  {from: 45.5, to: 47.7, title: 'QUIC + TLS 1.3', sub: 'Tek gidiş-dönüşte el sıkışma', subAt: 45.8, fixed: {x: 540, y: 330}},
  {from: 48.45, to: 49.55, title: 'Bağlantı hazır', sub: 'Şifreli', subAt: 48.6, fixed: {x: 540, y: 330}},

  {from: 49.7, to: 52.2, title: 'HTTP GET', sub: 'GET /  ·  fityazilim.com', subAt: 50.2, fixed: {x: 540, y: 330}, mono: true},
  {from: 52.55, to: 56.3, title: 'IP paketleri', sub: 'Her pakette kaynak ve hedef IP', subAt: 53.4, fixed: {x: 540, y: 330}},
  {from: 56.5, to: 58.4, title: 'Router', sub: 'Routing tablosu → sonraki durak', subAt: 57.2, anchor: {cam: packetsCam, point: [R1[0], R1[1] + 2.4, R1[2]], side: 'right'}},
  {from: 59.35, to: 60.6, title: 'Router', anchor: {cam: packetsCam, point: [R2[0], R2[1] + 2.4, R2[2]], side: 'left'}},

  {from: 61.8, to: 64.5, title: 'Application Server', anchor: {cam: serverCam, point: [0, 10.2, -34], side: 'right'}},
  {from: 64.75, to: 66.7, title: 'Database', anchor: {cam: serverCam, point: [7.5, 4.0, -34], side: 'right'}},
  {from: 66.7, to: 67.9, title: 'HTTP Response', sub: '200 OK', subAt: 67.1, anchor: {cam: serverCam, point: [0, 11.0, -34], side: 'left'}},
  {from: 69.2, to: 72.2, title: 'Yanıt istemciye dönüyor', fixed: {x: 540, y: 330}},
];

/** Render aşamaları: üstte adım adım ilerleyen şerit */
export const RENDER_STEPS = [
  {title: 'Render Tree', at: 74.2},
  {title: 'Layout', at: 75.08},
  {title: 'Paint', at: 75.67},
  {title: 'Compositing', at: 76.2},
];
export const RENDER_STEPS_RANGE = [73.95, 79.0] as const;

export const CHAPTERS = [
  {n: '01', title: 'DNS', from: 14.3, to: 37.75},
  {n: '02', title: 'Bağlantı', from: 37.8, to: 49.55},
  {n: '03', title: 'İstek', from: 49.6, to: 61.7},
  {n: '04', title: 'Sunucu', from: 61.7, to: 69.15},
  {n: '05', title: 'Yanıt', from: 69.15, to: 72.3},
  {n: '06', title: 'Render', from: 72.3, to: 82.3},
];
