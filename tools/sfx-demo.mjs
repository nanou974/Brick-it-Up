// Enregistre une démo des bruitages (pose de chaque matériau, camion) dans tools/out/bruitages.mp3
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = path.resolve('.');
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', f.endsWith('.js') ? 'text/javascript' : 'text/html'); r.end(d); }); }).listen(8780);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const p = await b.newPage(); await p.goto('http://localhost:8780/tools/blank.html');
const res = await p.evaluate(async () => {
  const { Sound } = await import('/src/game/audio.js');
  const SR = 44100, DUR = 26, ctx = new OfflineAudioContext(1, SR * DUR, SR);
  const s = new Sound(); s.ctx = ctx; s.out = ctx.createGain(); s.out.gain.value = 0.8; s.out.connect(ctx.destination);
  s.musicOut = ctx.createGain(); s.startEngine();
  // L'horloge d'un contexte hors ligne reste à 0 : on décale chaque son en surchargeant currentTime
  let T = 0; Object.defineProperty(ctx, 'currentTime', { get: () => T });
  const marks = [];
  const at = (t, fn, label) => { T = t; fn(); marks.push([t, label]); };
  // 1) chaque matériau, deux fois (variations)
  for (let k = 0; k < 6; k++) { at(0.3 + k * 1.6, () => s.place(k), 'pose ' + k); at(1.0 + k * 1.6, () => s.place(k), 'pose ' + k + ' bis'); }
  // 2) pose rapide (doigt maintenu) : briques toutes les 0,09 s
  for (let i = 0; i < 12; i++) at(10.2 + i * 0.09, () => s.place(1, i > 0), 'rapide');
  // 3) camion : approche, freins, déchargement, klaxon, départ, coups d'accélérateur
  const e = s.engine;
  const eng = (t, near, speed) => { T = t; const load = Math.min(1, speed / 12), f = 34 + load * 22 + e.rev * 26;
    e.o1.frequency.setValueAtTime(f, t); e.o2.frequency.setValueAtTime(f * 1.5, t); e.o3.frequency.setValueAtTime(f / 2, t); e.lfo.frequency.setValueAtTime(f / 2, t);
    e.lp.frequency.setValueAtTime(320 + load * 380 + e.rev * 500, t); e.g.gain.setValueAtTime(near * (0.05 + load * 0.05 + e.rev * 0.06), t); };
  e.g.gain.setValueAtTime(0, 0);
  for (let t = 12; t < 25.5; t += 0.05) {
    let near, speed;
    if (t < 16) { near = (t - 12) / 4; speed = 5; } else if (t < 17.5) { near = 1; speed = 0.5; } else if (t < 20) { near = Math.max(0, 1 - (t - 17.5) / 2.5); speed = 12; }
    else { near = 1; speed = 1; e.rev = Math.max(0, e.rev - 0.05 * 2.5); }
    eng(t, near, speed);
  }
  at(15.6, () => s.brake(), 'freins'); at(16.0, () => s.unload(3), 'déchargement'); at(16.6, () => s.horn(), 'klaxon');
  for (let i = 0; i < 8; i++) { T = 20.5 + i * 0.25; e.rev = Math.min(1, e.rev + 0.35); s.rush(i); }
  const buf = await ctx.startRendering(), d = buf.getChannelData(0);
  let peak = 0; for (const x of d) peak = Math.max(peak, Math.abs(x));
  const rms = (a, z) => { let q = 0; for (let i = Math.floor(a * SR); i < z * SR; i++) q += d[i] * d[i]; return Math.sqrt(q / ((z - a) * SR)).toFixed(3); };
  const seg = { parpaing: rms(0.3, 1.8), brique: rms(1.9, 3.4), poutre: rms(3.5, 5.0), tuile: rms(5.1, 6.6), fenetre: rms(6.7, 8.2), finitions: rms(8.3, 9.8), rapide: rms(10.2, 11.4), moteur: rms(13, 15), freins: rms(15.6, 16), dechargement: rms(16, 16.6), depart: rms(18, 19.5), accelerateur: rms(20.5, 22.5) };
  const ab = new ArrayBuffer(44 + d.length * 2), v = new DataView(ab), w = (o, t) => { for (let k = 0; k < t.length; k++) v.setUint8(o + k, t.charCodeAt(k)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + d.length * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, d.length * 2, true);
  const g = 0.9 / Math.max(peak, 1e-6); for (let i = 0; i < d.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i] * g)) * 32767, true);
  let str = ''; const u8 = new Uint8Array(ab); for (let k = 0; k < u8.length; k += 0x8000) str += String.fromCharCode.apply(null, u8.subarray(k, k + 0x8000));
  return { peak: peak.toFixed(2), seg, b64: btoa(str) };
});
fs.mkdirSync('tools/out', { recursive: true });
fs.writeFileSync('tools/out/bruitages.wav', Buffer.from(res.b64, 'base64'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'tools/out/bruitages.wav', '-b:a', '160k', 'tools/out/bruitages.mp3']);
console.log('crête', res.peak, res.seg);
await b.close(); srv.close();
