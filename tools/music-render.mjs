// Compose et calcule la musique d'ambiance de Brick'it Up, puis l'exporte en OGG (assets/music/theme.ogg).
// Morceau original, léger et enjoué : Do majeur, 116 BPM, structure A A B A (32 mesures, boucle parfaite).
// Marimba pour la mélodie, accords de ukulélé en contretemps (corde pincée Karplus-Strong), basse ronde,
// grosse caisse douce, claquement de doigts sur 2 et 4, shaker, et un glockenspiel qui scintille dans la partie B.
// Usage : node tools/music-render.mjs [--preview]   (nécessite ffmpeg avec libvorbis ; --preview écrit aussi un MP3)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SR = 44100, BPM = 116, STEP = 60 / BPM / 4, BAR = STEP * 16;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 12345; const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

// ---------- Harmonie ----------
const CH = {
  C: { v: [60, 64, 67, 72], b: 36 }, G: { v: [59, 62, 67, 71], b: 43 }, Am: { v: [60, 64, 69, 72], b: 45 },
  F: { v: [60, 65, 69, 72], b: 41 }, Em: { v: [59, 64, 67, 71], b: 40 }, Dm: { v: [62, 65, 69, 74], b: 38 },
};
const A_BARS = ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C'];
const B_BARS = ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'];
// Mélodie : [pas (double croche), note MIDI, durée en pas]
const A_MEL = [
  [[0, 76, 2], [2, 79, 2], [4, 81, 2], [6, 79, 4], [10, 76, 2], [12, 72, 4]],
  [[0, 74, 2], [2, 79, 2], [4, 81, 2], [6, 79, 4], [10, 74, 2], [12, 71, 4]],
  [[0, 72, 2], [2, 76, 2], [4, 81, 2], [6, 79, 2], [8, 76, 2], [10, 81, 2], [12, 79, 4]],
  [[0, 77, 3], [3, 76, 1], [4, 74, 2], [6, 72, 2], [8, 69, 4], [12, 72, 2], [14, 74, 2]],
  [[0, 76, 2], [2, 79, 2], [4, 81, 2], [6, 79, 4], [10, 76, 2], [12, 72, 4]],
  [[0, 74, 2], [2, 79, 2], [4, 81, 2], [6, 79, 4], [10, 74, 2], [12, 71, 4]],
  [[0, 81, 2], [2, 79, 2], [4, 77, 2], [6, 76, 2], [8, 74, 4], [12, 76, 2], [14, 77, 2]],
  [[0, 76, 4], [4, 74, 2], [6, 72, 6], [12, 67, 2], [14, 71, 2]],
];
const B_MEL = [
  [[0, 69, 2], [2, 72, 2], [4, 77, 4], [8, 76, 2], [10, 77, 2], [12, 81, 4]],
  [[0, 79, 4], [4, 77, 2], [6, 76, 2], [8, 74, 4], [12, 71, 4]],
  [[0, 76, 2], [2, 79, 2], [4, 83, 4], [8, 81, 2], [10, 79, 2], [12, 76, 4]],
  [[0, 81, 3], [3, 79, 1], [4, 76, 4], [8, 72, 4], [12, 76, 4]],
  [[0, 69, 2], [2, 72, 2], [4, 77, 4], [8, 76, 2], [10, 77, 2], [12, 81, 4]],
  [[0, 71, 2], [2, 74, 2], [4, 79, 4], [8, 81, 2], [10, 83, 2], [12, 86, 4]],
  [[0, 84, 4], [4, 83, 2], [6, 79, 2], [8, 76, 4], [12, 79, 4]],
  [[0, 84, 8], [12, 76, 2], [14, 79, 2]],
];
const SECTIONS = [['A', A_BARS, A_MEL], ['A', A_BARS, A_MEL], ['B', B_BARS, B_MEL], ['A', A_BARS, A_MEL]];
const NBARS = SECTIONS.length * 8, LEN = Math.round(NBARS * BAR * SR), TAIL = Math.round(2 * SR);
const L = new Float32Array(LEN + TAIL), Rr = new Float32Array(LEN + TAIL);

// Ajoute un son mono à la position t (s), avec un panoramique (-1 gauche … 1 droite)
function add(t, samples, pan = 0) {
  const i0 = Math.round(t * SR), gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < samples.length; i++) { const k = i0 + i; if (k >= L.length) break; L[k] += samples[i] * gl; Rr[k] += samples[i] * gr; }
}

// ---------- Instruments ----------
function marimba(f, dur, vol) {
  const n = Math.round((dur + 0.6) * SR), o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, env = Math.exp(-t * 5.5), atk = Math.min(1, t / 0.003);
    o[i] = vol * atk * (Math.sin(2 * Math.PI * f * t) * env + 0.32 * Math.sin(2 * Math.PI * f * 3.93 * t) * Math.exp(-t * 28) + 0.12 * Math.sin(2 * Math.PI * f * 9.2 * t) * Math.exp(-t * 60));
  }
  return o;
}
function pluck(f, dur, vol, bright = 0.5) {
  const n = Math.round((dur + 0.3) * SR), o = new Float32Array(n), P = Math.max(2, Math.round(SR / f)), buf = new Float32Array(P);
  for (let i = 0; i < P; i++) buf[i] = rand() * 2 - 1;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const k = i % P, v = buf[k], nx = buf[(k + 1) % P];
    buf[k] = (v * (0.5 + bright * 0.3) + nx * (0.5 - bright * 0.3)) * 0.994;
    const t = i / SR, gate = t < dur ? 1 : Math.exp(-(t - dur) * 30);
    prev = prev * 0.3 + v * 0.7; o[i] = prev * vol * gate;
  }
  return o;
}
function bass(f, dur, vol) {
  const n = Math.round((dur + 0.15) * SR), o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, atk = Math.min(1, t / 0.008), rel = t < dur ? 1 : Math.exp(-(t - dur) * 25);
    const ph = 2 * Math.PI * f * t, tri = (2 / Math.PI) * Math.asin(Math.sin(ph));
    o[i] = vol * atk * rel * Math.exp(-t * 1.2) * (0.75 * Math.sin(ph) + 0.35 * tri + 0.12 * Math.sin(2 * ph));
  }
  return o;
}
function kick(vol) {
  const n = Math.round(0.35 * SR), o = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, f = 50 + 90 * Math.exp(-t * 35); ph += 2 * Math.PI * f / SR; o[i] = vol * Math.sin(ph) * Math.exp(-t * 9); }
  return o;
}
function snap(vol) {
  const n = Math.round(0.16 * SR), o = new Float32Array(n); let a = 0, b = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, x = rand() * 2 - 1; a += 0.55 * (x - a); b = x - a; o[i] = vol * b * (Math.exp(-t * 45) + 0.5 * Math.exp(-Math.abs(t - 0.012) * 300)); }
  return o;
}
function shaker(vol) {
  const n = Math.round(0.07 * SR), o = new Float32Array(n); let a = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, x = rand() * 2 - 1; a += 0.8 * (x - a); o[i] = vol * (x - a) * Math.sin(Math.PI * Math.min(1, t / 0.07)) * Math.exp(-t * 30); }
  return o;
}
function glock(f, vol) {
  const n = Math.round(1.4 * SR), o = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; o[i] = vol * Math.min(1, t / 0.002) * (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 9)); }
  return o;
}

// ---------- Partition ----------
let bar = 0;
for (const [sec, bars, mel] of SECTIONS) {
  for (let b = 0; b < 8; b++, bar++) {
    const t0 = bar * BAR, ch = CH[bars[b]], swing = (s) => t0 + s * STEP + (s % 2 ? STEP * 0.12 : 0);
    // Mélodie au marimba, doublée d'un écho discret
    for (const [s, m, d] of mel[b]) {
      const lead = marimba(mtof(m), d * STEP, 0.32);
      add(swing(s), lead, 0.15); add(swing(s) + STEP * 3, lead.map(x => x * 0.22), -0.35);
    }
    // Ukulélé : accords pincés en contretemps (rasgueado léger), un accord plein sur le premier temps en partie B
    for (const s of [2, 6, 10, 14]) ch.v.forEach((m, k) => add(swing(s) + k * 0.009, pluck(mtof(m), STEP * 1.4, 0.1, 0.6), -0.3));
    if (sec === 'B') ch.v.forEach((m, k) => add(t0 + k * 0.014, pluck(mtof(m), STEP * 5, 0.09, 0.4), -0.2));
    // Basse ronde qui rebondit
    for (const [s, iv, d] of [[0, 0, 3], [6, 0, 2], [8, 7, 3], [14, 12, 2]]) add(swing(s), bass(mtof(ch.b + iv), d * STEP, 0.42), 0);
    // Percussions légères
    for (const s of sec === 'B' ? [0, 8, 10] : [0, 8]) add(t0 + s * STEP, kick(0.5), 0);
    for (const s of [4, 12]) add(swing(s), snap(0.26), 0.1);
    for (let s = 0; s < 16; s++) add(swing(s), shaker(s % 2 ? 0.055 : 0.085), 0.4);
    // Glockenspiel : arpège scintillant pendant la partie B
    if (sec === 'B') for (const [s, k] of [[0, 3], [3, 2], [6, 1], [9, 3], [12, 2]]) add(swing(s), glock(mtof(ch.v[k] + 24), 0.06), 0.45);
  }
}

// Petite réverbération (échos croisés) pour l'espace
const D1 = Math.round(0.083 * SR), D2 = Math.round(0.127 * SR);
for (let i = Math.max(D1, D2); i < L.length; i++) { L[i] += Rr[i - D2] * 0.12; Rr[i] += L[i - D1] * 0.12; }
// Boucle parfaite : la fin qui déborde (résonances) est repliée sur le début
for (let i = 0; i < TAIL; i++) { L[i] += L[LEN + i]; Rr[i] += Rr[LEN + i]; }
// Normalisation douce
let peak = 0; for (let i = 0; i < LEN; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rr[i]));
const g = 0.89 / peak;

// ---------- Export ----------
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'assets', 'music'); fs.mkdirSync(outDir, { recursive: true });
const wav = Buffer.alloc(44 + LEN * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + LEN * 4, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(LEN * 4, 40);
for (let i = 0; i < LEN; i++) {
  const sl = Math.tanh(L[i] * g * 1.1) / Math.tanh(1.1), sr = Math.tanh(Rr[i] * g * 1.1) / Math.tanh(1.1);
  wav.writeInt16LE(Math.round(sl * 32767), 44 + i * 4); wav.writeInt16LE(Math.round(sr * 32767), 46 + i * 4);
}
const tmp = path.join(fs.realpathSync('/tmp'), `bu-theme-${process.pid}.wav`); fs.writeFileSync(tmp, wav);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '4', path.join(outDir, 'theme.ogg')]);
if (process.argv.includes('--preview')) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-b:a', '160k', path.join(outDir, 'theme-preview.mp3')]);
fs.unlinkSync(tmp);
console.log(`theme.ogg : ${NBARS} mesures, ${(LEN / SR).toFixed(2)} s, ${(fs.statSync(path.join(outDir, 'theme.ogg')).size / 1024).toFixed(0)} Ko`);
