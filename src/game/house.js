// Génère la liste ordonnée des éléments à poser pour une maison (données pures, sans Three.js).
// Repère : x = largeur, z = profondeur (façade avant vers +z), y = hauteur. 1 unité = 1 case.
// Une maison = un volume principal + des ailes ou annexes ; chaque volume a ses murs, ses ouvertures et son toit.
// Chaque élément : { stage, kind, x, y, z, ry, rx, sx, sy, sz, color, ... } ; la scène 3D sait dessiner chaque « kind ».
import { STAGES } from './rules.js';

const COURSE = 0.5;            // hauteur d'un rang de briques
const CPF = 4;                 // rangs par étage (un étage = 2 unités)
const THICK = 0.4;             // épaisseur des murs
const FOUND_H = 0.5;           // hauteur des fondations
const st = (key) => STAGES.findIndex(s => s.key === key);
const S = { fond: st('fond'), murs: st('murs'), charp: st('charp'), toit: st('toit'), menu: st('menu'), fini: st('fini') };

// Couleur éclaircie (k > 0) ou assombrie (k < 0)
export function shade(hex, k) {
  let r = hex >> 16 & 255, g = hex >> 8 & 255, b = hex & 255;
  const f = (c) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}
let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// Teintes des matériaux de mur
const TINTS = { brique: [-0.06, 0, 0.05], pierre: [-0.12, -0.04, 0.04, 0.1], bois: [-0.08, 0, 0.06], crepi: [-0.015, 0, 0.015] };
const tintOf = (mat, color, n) => shade(color, TINTS[mat][n % TINTS[mat].length]);

// ---------- Un volume (dans son propre repère, puis placé dans la maison) ----------
function wallCells(w, d, omit) {
  const cells = [], zf = d / 2 - THICK / 2, xs = w / 2 - THICK / 2;
  const sideN = d - 1, sideLen = (d - THICK * 2) / sideN;
  if (!omit.includes('front')) for (let i = 0; i < w; i++) cells.push({ side: 'front', i, x: -w / 2 + 0.5 + i, z: zf, len: 1, ry: 0 });
  if (!omit.includes('right')) for (let j = 0; j < sideN; j++) cells.push({ side: 'right', i: j, x: xs, z: d / 2 - THICK - (j + 0.5) * sideLen, len: sideLen, ry: Math.PI / 2 });
  if (!omit.includes('back')) for (let i = w - 1; i >= 0; i--) cells.push({ side: 'back', i, x: -w / 2 + 0.5 + i, z: -zf, len: 1, ry: 0 });
  if (!omit.includes('left')) for (let j = sideN - 1; j >= 0; j--) cells.push({ side: 'left', i: j, x: -xs, z: d / 2 - THICK - (j + 0.5) * sideLen, len: sideLen, ry: Math.PI / 2 });
  return cells;
}

// Ouvertures : { side, cells: [i…], floor, kind, c0, c1 (rangs dans l'étage) }
function openings(v) {
  const { w, d, floors, omit } = v, list = [];
  const doorKind = v.door === undefined ? 'porte' : v.door;
  let doorCells = [];
  if (doorKind && !omit.includes('front')) {
    const wide = doorKind !== 'porte', c = Math.floor(w / 2);
    doorCells = wide ? [c - 1, c] : [c];
    list.push({ side: 'front', cells: doorCells, floor: 0, kind: doorKind, c0: 0, c1: doorKind === 'porte-grange' ? 3 : 2 });
  }
  const win = v.win || 'std';
  if (win === 'none') return list;
  const kind = win === 'baie' ? 'baie' : 'fenetre';
  const near = (i, f) => f === 0 && doorCells.some(c => Math.abs(c - i) <= 1);
  for (let f = 0; f < floors; f++) {
    for (const side of ['front', 'back']) {
      if (omit.includes(side)) continue;
      if (kind === 'baie') {
        for (let i = 1; i + 1 <= w - 2; i += 3) if (!near(i, f) && !near(i + 1, f)) list.push({ side, cells: [i, i + 1], floor: f, kind, c0: f === 0 ? 0 : 1, c1: 2 });
        continue;
      }
      const step = win === 'few' ? 3 : win === 'many' ? 2 : 2;
      for (let i = 1; i <= w - 2; i++) {
        if (near(i, f)) continue;
        const ok = win === 'many' ? i % 2 === 1 || (w - 1 - i) % 2 === 1 : win === 'few' ? i % step === 1 : i % 2 === 1 || (w - 1 - i) % 2 === 1;
        if (ok && !(side === 'back' && win !== 'many' && i % 2 === 0)) list.push({ side, cells: [i], floor: f, kind, c0: 1, c1: 2 });
      }
    }
    const sideN = d - 1;
    if (sideN >= 2) for (const side of ['left', 'right']) {
      if (omit.includes(side)) continue;
      for (let j = 0; j < sideN; j++) {
        const ok = sideN <= 3 ? j === Math.floor(sideN / 2) : j % 2 === 1 && j < sideN - 1;
        if (ok && (win !== 'few' || j === Math.floor(sideN / 2))) list.push({ side, cells: [j], floor: f, kind: 'fenetre', c0: 1, c1: 2 });
      }
    }
  }
  return list;
}

// Toit : géométrie commune (hauteur, débord) selon le type
function roofGeom(v, wallTop) {
  const t = v.roof.type, half = v.d / 2, k = v.roof.k || 1;
  if (t === 'flat' || t === 'crenel') return { t, rise: 0, over: 0, half, wallTop, ridgeY: wallTop + 0.6, eaveY: wallTop };
  const rise = (t === 'steep' ? 0.8 * v.d : t === 'shed' ? 0.3 * v.d + 0.3 : 0.35 * v.d + 0.3) * k;
  const over = t === 'steep' ? 0.6 : 0.35;
  if (t === 'shed') return { t, rise, over, half, wallTop, ridgeY: wallTop + rise, eaveY: wallTop - over * rise / v.d };
  return { t, rise, over, half, wallTop, ridgeY: wallTop + rise + 0.08, eaveY: wallTop - over * rise / half };
}

function buildVolume(v, H) {
  const out = { fond: [], murs: [], charp: [], toit: [], menu: [], fini: [] };
  const { w, d, floors } = v, omit = v.omit || [];
  const cells = wallCells(w, d, omit);
  const wall = v.wall || H.wall, base = v.base === undefined ? H.base : v.base;

  // Fondations : parpaings sur le tracé des murs, puis la dalle
  for (const c of cells) out.fond.push({ kind: 'parpaing', x: c.x, y: FOUND_H / 2, z: c.z, sx: c.len * 0.98, sy: FOUND_H * 0.96, sz: THICK + 0.1, ry: c.ry });
  const iw = w - THICK * 2, id = d - THICK * 2, nx = Math.ceil(iw / 2.2), nz = Math.ceil(id / 2.2);
  for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
    const tw = iw / nx, td = id / nz;
    out.fond.push({ kind: 'dalle', x: -iw / 2 + (a + 0.5) * tw, y: FOUND_H * 0.45, z: -id / 2 + (b + 0.5) * td, sx: tw * 0.97, sy: FOUND_H * 0.9, sz: td * 0.97, ry: 0 });
  }

  // Murs : rang par rang, en laissant la place des ouvertures
  const ops = openings({ ...v, omit });
  const holeAt = (c, course) => {
    const f = Math.floor(course / CPF), k = course % CPF;
    return ops.some(o => o.side === c.side && o.floor === f && o.cells.includes(c.i) && k >= o.c0 && k <= o.c1);
  };
  const nCourses = floors * CPF; let n = 0;
  for (let course = 0; course < nCourses; course++) for (const c of cells) {
    if (holeAt(c, course)) continue;
    const m = base && course < base.courses ? base : wall;
    out.murs.push({ kind: 'brique', mat: m.mat, x: c.x, y: FOUND_H + (course + 0.5) * COURSE, z: c.z, sx: c.len * 0.97, sy: COURSE * 0.92, sz: THICK, ry: c.ry, color: tintOf(m.mat, m.color, n++ + (m.mat === 'pierre' ? Math.floor(rnd() * 3) : 0)) });
  }
  const wallTop = FOUND_H + nCourses * COURSE;
  const R = roofGeom(v, wallTop), half = R.half, roofColor = v.roof.color;
  const gableColor = shade(wall.color, -0.03);

  // Pignons (murs triangulaires sous le toit) et rehausse du mur arrière pour le toit à une pente
  if (R.t === 'gable' || R.t === 'steep') for (const s of [1, -1]) {
    if (omit.includes(s > 0 ? 'right' : 'left')) continue;
    out.murs.push({ kind: 'pignon', shape: 'iso', x: s * (w / 2 - THICK / 2), y: wallTop, z: 0, half: half - 0.05, rise: R.rise, sz: THICK, ry: 0, color: gableColor, mat: wall.mat });
  }
  if (R.t === 'shed') {
    for (const s of [1, -1]) if (!omit.includes(s > 0 ? 'right' : 'left'))
      out.murs.push({ kind: 'pignon', shape: 'shed', x: s * (w / 2 - THICK / 2), y: wallTop, z: 0, half: half - 0.05, rise: R.rise, sz: THICK, ry: 0, color: gableColor, mat: wall.mat });
    if (!omit.includes('back')) out.murs.push({ kind: 'brique', mat: wall.mat, x: 0, y: wallTop + R.rise / 2, z: -(d / 2 - THICK / 2), sx: w - 0.05, sy: R.rise, sz: THICK, ry: 0, color: gableColor });
  }

  // ---------- Charpente et toiture ----------
  const tile = (x, y, z, sx, sz, rx, ry, row, color = roofColor) => out.toit.push({ kind: 'tuile', x, y, z, sx, sy: 0.12, sz, rx, ry, row, color });
  if (R.t === 'gable' || R.t === 'steep') {
    for (let i = 0; i <= w; i++) {
      const x = Math.max(-w / 2 + 0.15, Math.min(w / 2 - 0.15, -w / 2 + i));
      out.charp.push({ kind: 'ferme', x, y: wallTop, z: 0, half: half + R.over, rise: R.rise + R.over * R.rise / half, drop: R.over * R.rise / half, ry: 0 });
    }
    const len = Math.hypot(half + R.over, R.ridgeY - R.eaveY), ang = Math.atan2(R.ridgeY - R.eaveY, half + R.over);
    const rows = Math.max(2, Math.round(len / 1.1)), cols = w, colW = (w + 2 * R.over) / cols;
    for (let r = 0; r < rows; r++) for (const s of [1, -1]) {
      const t = (r + 0.5) / rows, z = s * (half + R.over) * (1 - t), y = R.eaveY + (R.ridgeY - R.eaveY) * t + 0.06;
      for (let c = 0; c < cols; c++) tile(-w / 2 - R.over + (c + 0.5) * colW, y, z, colW * 0.98, len / rows * 1.04, s * ang, 0, r);
    }
    for (let c = 0; c < Math.ceil((w + 2 * R.over) / 2); c++) {
      const seg = (w + 2 * R.over) / Math.ceil((w + 2 * R.over) / 2);
      out.toit.push({ kind: 'faitage', x: -w / 2 - R.over + (c + 0.5) * seg, y: R.ridgeY + 0.1, z: 0, sx: seg * 0.99, ry: 0, color: shade(roofColor, -0.25) });
    }
  } else if (R.t === 'hip') {
    // Toit à 4 pans : faîtage raccourci, arêtiers en diagonale, pans avant/arrière en trapèze et pans de côté en triangle
    const ridgeHalf = Math.max(0, w / 2 - half), slopeRun = half + R.over;
    for (let x = -ridgeHalf; x <= ridgeHalf + 1e-6; x += Math.max(1, ridgeHalf || 1))
      out.charp.push({ kind: 'ferme', x, y: wallTop, z: 0, half: half + R.over, rise: R.rise + R.over * R.rise / half, drop: R.over * R.rise / half, ry: 0 });
    for (const sx of [1, -1]) for (const sz of [1, -1])
      out.charp.push({ kind: 'beam', x: 0, y: 0, z: 0, p0: [sx * (w / 2 + R.over), R.eaveY, sz * (half + R.over)], p1: [sx * ridgeHalf, R.ridgeY - 0.08, 0], ry: 0 });
    const len = Math.hypot(slopeRun, R.ridgeY - R.eaveY), ang = Math.atan2(R.ridgeY - R.eaveY, slopeRun), rows = Math.max(2, Math.round(len / 1.1));
    for (let r = 0; r < rows; r++) {
      const t = (r + 0.5) / rows, y = R.eaveY + (R.ridgeY - R.eaveY) * t + 0.06, inset = slopeRun * t;
      // avant / arrière : largeur qui diminue en montant
      const wr = w + 2 * R.over - 2 * inset, colsF = Math.max(1, Math.round(wr));
      for (const s of [1, -1]) for (let c = 0; c < colsF; c++) tile(-wr / 2 + (c + 0.5) * wr / colsF, y, s * slopeRun * (1 - t), wr / colsF * 0.98, len / rows * 1.04, s * ang, 0, r);
      // côtés : triangles
      const dr = (d + 2 * R.over) * (1 - t), colsS = Math.max(1, Math.round(dr));
      for (const s of [1, -1]) for (let c = 0; c < colsS; c++) {
        const zc = -dr / 2 + (c + 0.5) * dr / colsS;
        tile(s * (ridgeHalf + slopeRun * (1 - t)), y, zc, dr / colsS * 0.98, len / rows * 1.04, ang, s * Math.PI / 2, r);
      }
    }
    if (ridgeHalf > 0) out.toit.push({ kind: 'faitage', x: 0, y: R.ridgeY + 0.1, z: 0, sx: ridgeHalf * 2 + 0.3, ry: 0, color: shade(roofColor, -0.25) });
  } else if (R.t === 'shed') {
    const hiZ = -(half + R.over * 0.4), loZ = half + R.over, hiY = wallTop + R.rise + R.over * 0.4 * R.rise / d, loY = R.eaveY;
    for (let i = 0; i <= w; i++) {
      const x = Math.max(-w / 2 + 0.15, Math.min(w / 2 - 0.15, -w / 2 + i));
      out.charp.push({ kind: 'beam', x, y: 0, z: 0, p0: [0, loY - 0.1, loZ], p1: [0, hiY - 0.1, hiZ], ry: 0 });
    }
    const len = Math.hypot(loZ - hiZ, hiY - loY), ang = Math.atan2(hiY - loY, loZ - hiZ), rows = Math.max(2, Math.round(len / 1.1)), cols = w, colW = (w + 2 * R.over) / cols;
    for (let r = 0; r < rows; r++) {
      const t = (r + 0.5) / rows, z = loZ + (hiZ - loZ) * t, y = loY + (hiY - loY) * t + 0.06;
      for (let c = 0; c < cols; c++) tile(-w / 2 - R.over + (c + 0.5) * colW, y, z, colW * 0.98, len / rows * 1.04, ang, 0, r);
    }
  } else {
    // Toit plat (ou terrasse crénelée) : solives, dalle de toit, acrotère (et créneaux)
    for (let i = 0; i <= w; i++) {
      const x = Math.max(-w / 2 + 0.3, Math.min(w / 2 - 0.3, -w / 2 + i));
      out.charp.push({ kind: 'solive', x, y: wallTop + 0.1, z: 0, sx: 0.16, sy: 0.2, sz: d - 0.3, ry: 0 });
    }
    const nx2 = Math.ceil(w / 2), nz2 = Math.ceil(d / 2);
    for (let a = 0; a < nx2; a++) for (let b = 0; b < nz2; b++) {
      const tw = w / nx2, td = d / nz2;
      out.toit.push({ kind: 'toit-plat', x: -w / 2 + (a + 0.5) * tw, y: wallTop + 0.3, z: -d / 2 + (b + 0.5) * td, sx: tw, sy: 0.2, sz: td, ry: 0, color: roofColor });
    }
    const parapet = (x, z, len, ry) => out.toit.push({ kind: 'acrotere', x, y: wallTop + 0.62, z, sx: len, sy: 0.45, sz: THICK, ry, color: shade(wall.color, -0.05), mat: wall.mat });
    for (const s of [1, -1]) {
      if (!omit.includes(s > 0 ? 'front' : 'back')) for (let a = 0; a < nx2; a++) parapet(-w / 2 + (a + 0.5) * w / nx2, s * (d / 2 - THICK / 2), w / nx2, 0);
      if (!omit.includes(s > 0 ? 'right' : 'left')) for (let b = 0; b < nz2; b++) parapet(s * (w / 2 - THICK / 2), -d / 2 + (b + 0.5) * d / nz2, d / nz2, Math.PI / 2);
    }
    if (R.t === 'crenel') {
      for (let i = 0; i < w; i += 2) for (const s of [1, -1]) out.toit.push({ kind: 'merlon', x: -w / 2 + 0.5 + i, y: wallTop + 1.1, z: s * (d / 2 - THICK / 2), sx: 0.8, sy: 0.55, sz: THICK + 0.05, ry: 0, color: shade(wall.color, -0.02) });
      for (let j = 1; j < d - 1; j += 2) for (const s of [1, -1]) out.toit.push({ kind: 'merlon', x: s * (w / 2 - THICK / 2), y: wallTop + 1.1, z: -d / 2 + 0.5 + j, sx: 0.8, sy: 0.55, sz: THICK + 0.05, ry: Math.PI / 2, color: shade(wall.color, -0.02) });
    }
  }

  // ---------- Menuiseries ----------
  const cellOf = (side, i) => cells.find(c => c.side === side && c.i === i);
  const outward = (side) => side === 'front' ? [0, 1] : side === 'back' ? [0, -1] : side === 'right' ? [1, 0] : [-1, 0];
  const shutter = v.shutter === undefined ? H.shutter : v.shutter;
  for (const o of ops.sort((a, b) => (a.kind.startsWith('porte')) - (b.kind.startsWith('porte')) || a.floor - b.floor)) {
    const cs = o.cells.map(i => cellOf(o.side, i)).filter(Boolean); if (!cs.length) continue;
    const [ox, oz] = outward(o.side), baseY = FOUND_H + o.floor * CPF * COURSE;
    const x = cs.reduce((s, c) => s + c.x, 0) / cs.length, z = cs.reduce((s, c) => s + c.z, 0) / cs.length;
    const hgt = (o.c1 - o.c0 + 1) * COURSE, y0 = baseY + o.c0 * COURSE;
    out.menu.push({ kind: o.kind, x: x + ox * 0.02, y: y0 + hgt / 2, z: z + oz * 0.02, sx: cs.reduce((s, c) => s + c.len, 0) * 0.97, sy: hgt, sz: THICK + 0.04, out: [ox, oz], shutter: o.kind === 'fenetre' ? shutter : null, color: wall.color });
  }
  return { out, wallTop, R, ops, cells };
}

// Place un élément du repère d'un volume dans le repère de la maison (rotation de 90° possible)
function place(it, v) {
  const r = v.rot ? 1 : 0, c = { ...it };
  const tr = (x, z) => r ? [z, -x] : [x, z];
  [c.x, c.z] = tr(it.x, it.z); c.x += v.x || 0; c.z += v.z || 0;
  c.ry = (it.ry || 0) + (r ? Math.PI / 2 : 0);
  if (it.out) { const [ox, oz] = tr(it.out[0], it.out[1]); c.out = [ox, oz]; }
  if (it.p0) { const a = tr(it.p0[0], it.p0[2]), b = tr(it.p1[0], it.p1[2]); c.p0 = [a[0], it.p0[1], a[1]]; c.p1 = [b[0], it.p1[1], b[1]]; c.ry = 0; }
  return c;
}

// ---------- Finitions de la maison (positions calculées à partir du volume principal m) ----------
function features(H, m, M) {
  const items = [], f = (kind, x, y, z, extra = {}) => items.push({ kind, x, y, z, ry: 0, ...extra });
  const w = m.w, d = m.d, half = d / 2, R = M.R, wallTop = M.wallTop;
  const doorX = -w / 2 + 0.5 + Math.floor(w / 2), front = half;
  const roofYAt = (z) => R.t === 'flat' || R.t === 'crenel' ? wallTop + 0.4 : R.t === 'shed' ? wallTop + R.rise * (half - z) / d : wallTop + R.rise * (1 - Math.abs(z) / half);
  const chimney = (x, color = 0x8C5A44) => { const z = -half * 0.45; f('cheminee', x, roofYAt(z) - 0.5, z, { color }); };
  const bushes = (n) => { const pts = [[-1, 1], [1, 1], [-1, -1], [1, -1]]; for (let k = 0; k < n; k++) f('massif', pts[k][0] * (w / 2 + 0.7), 0, pts[k][1] * (half + 0.5)); };
  for (const name of H.feats) {
    switch (name) {
      case 'chemin': for (let k = 0; k < 3; k++) f('dallage', doorX, 0.03, front + 0.7 + k * 0.85); break;
      case 'allee': for (let k = 0; k < 5; k++) f('dallage', doorX, 0.03, front + 0.7 + k * 0.85, { big: true }); break;
      case 'allee-garage': for (let k = 0; k < 4; k++) f('dallage', w / 2 + 2, 0.03, front + 0.8 + k * 0.9, { big: true, wide: 2.6 }); break;
      case 'massifs2': bushes(2); break;
      case 'massifs4': bushes(4); break;
      case 'boite': f('boite', doorX + 1.4, 0, front + 2.6); break;
      case 'boites3': for (let k = 0; k < 3; k++) f('boite', doorX + 1.2 + k * 0.45, 0, front + 2.6, { small: true }); break;
      case 'lampe': f('lampe', doorX - 1.4, 0, front + 2.6); break;
      case 'lampe2': f('lampe', doorX - 1.6, 0, front + 2.6); f('lampe', doorX + 1.6, 0, front + 2.6); break;
      case 'cheminee': chimney(w / 2 - 1); break;
      case 'cheminee2': chimney(w / 2 - 1); chimney(-w / 2 + 1); break;
      case 'cheminee-pierre': chimney(w / 2 - 1.2, 0x9C968C); break;
      case 'auvent': f('auvent', doorX, FOUND_H + 3 * COURSE + 0.25, front + 0.45, { aw: 1.8 }); break;
      case 'cloture': for (let k = -3; k <= 3; k++) if (k !== 0) f('cloture', doorX + k * 1.5, 0, front + 3.4, { len: 1.5 }); break;
      case 'terrasse': for (let k = 0; k < 3; k++) f('terrasse', -w / 2 + 1.5 + k * 1.1, 0.08, front + 1.2, { tw: 1.05, td: 2 }); break;
      case 'terrasse-cote': for (let k = 0; k < 3; k++) f('terrasse', -w / 2 - 1.5, 0.08, -half + 1.1 + k * 1.1, { tw: 2.4, td: 1.05 }); break;
      case 'buches': f('buches', w / 2 + 0.9, 0, -half + 0.8); break;
      case 'sapins': for (const [x, z] of [[-w / 2 - 2.2, -half + 0.5], [w / 2 + 2.4, 0.5], [-w / 2 - 2.6, half + 1.8]]) f('sapin', x, 0, z); break;
      case 'pommier': f('arbre-fruit', w / 2 + 2.6, 0, front + 1.6, { fruit: 0xE5383B }); break;
      case 'oliviers': f('olivier', -w / 2 - 2.4, 0, front + 1.2); f('olivier', -w / 2 - 2.2, 0, -half + 0.4); break;
      case 'lavande': for (let k = 0; k < 4; k++) f('lavande', doorX - 2.6 + k * 0.9, 0, front + 2.8); break;
      case 'pergola': f('pergola', -w / 2 + 1.8, 0, front + 1.6, { pw: 3, pd: 2.2 }); break;
      case 'puits': f('puits', -w / 2 - 2.2, 0, front + 2.4); break;
      case 'barque': f('barque', w / 2 + 2.2, 0, front + 1.8); break;
      case 'filet': f('filet', -w / 2 - 1.9, 0, front + 1.2); break;
      case 'haie': for (let k = -2; k <= 2; k++) if (k !== 0) f('haie', doorX + k * 1.6, 0, front + 3.2, { len: 1.5 }); break;
      case 'piscine': f('piscine', 0, 0, front + 4.4, { pw: Math.min(6, w - 2), pd: 2.6 }); break;
      case 'palmiers': f('palmier', -w / 2 - 1.6, 0, front + 3.6); f('palmier', w / 2 + 1.6, 0, front + 4.6); break;
      case 'transats': f('transat', w / 2 - 1.2, 0, front + 6.4); f('transat', w / 2 - 2.4, 0, front + 6.4); break;
      case 'foin': f('foin', -w / 2 - 1.6, 0, front + 1.6); f('foin', -w / 2 - 1.6, 0, front + 2.9); f('foin', -w / 2 - 1.6, 0.95, front + 2.25); break;
      case 'balcon': f('balcon', doorX, FOUND_H + CPF * COURSE + 0.05, front + 0.45, { bw: 2.2 }); break;
      case 'balcon-large': f('balcon', 0, FOUND_H + CPF * COURSE + 0.05, front + 0.55, { bw: w - 0.6, bd: 1.1 }); break;
      case 'balcons-etages': for (let fl = 1; fl < m.floors; fl++) for (const x of [-w / 4, w / 4]) f('balcon', x, FOUND_H + fl * CPF * COURSE + 0.05, front + 0.45, { bw: 1.8 }); break;
      case 'bow': f('bow', doorX, FOUND_H + CPF * COURSE + 0.8, front + 0.35, { bw: 2 }); break;
      case 'porche': f('porche', doorX, 0, front + 0.95, { pw: 3.2, pd: 1.7, ph: FOUND_H + 2 * CPF * COURSE - 0.2, color: shade(H.wall.color, 0.15) }); break;
      case 'tourelle': f('tour', w / 2 + 0.05, 0, front + 0.05, { th: wallTop + 1.4, r: 0.75, color: shade(H.wall.color, -0.04), roof: R.t === 'flat' ? 0x45505E : H.roof.color }); break;
      case 'tours': for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) f('tour', sx * (w / 2 + 0.1), 0, sz * (half + 0.1), { th: wallTop + 1.8, r: 1.0, color: shade(H.wall.color, -0.05), roof: 0x34495E, crenel: true }); break;
      case 'drapeaux': for (const [sx, sz] of [[-1, 1], [1, 1]]) f('drapeau', sx * (w / 2 + 0.1), wallTop + 3.6, sz * (half + 0.1), { color: sx > 0 ? 0x2F6FD1 : 0xE5383B }); break;
      case 'douves': for (const [x, z, a, b] of [[0, front + 2.2, w + 6, 1.6], [0, -half - 2.2, w + 6, 1.6], [w / 2 + 2.2, 0, 1.6, d + 2.8], [-w / 2 - 2.2, 0, 1.6, d + 2.8]]) f('douves', x, 0, z, { dw: a, dd: b }); break;
      case 'pontlevis': f('pontlevis', doorX, 0, front + 2.2); break;
      case 'grille': f('grille', doorX, 0, front + 3.2, { gw: 3 }); for (const s of [-1, 1]) for (let k = 1; k <= 3; k++) f('cloture', doorX + s * (1.5 + k * 1.5 - 0.75), 0, front + 3.2, { len: 1.5, iron: true }); break;
      case 'panneaux':
        if (R.t === 'flat') for (let k = 0; k < Math.max(2, Math.floor(w / 2.5)); k++) f('panneau', -w / 2 + 1.5 + k * 2.4, wallTop + 0.45, -0.4, { flat: true });
        else for (let k = 0; k < 2; k++) f('panneau', -1.1 + k * 2.2, roofYAt(half * 0.5) + 0.12, half * 0.5, { rx: Math.atan2(R.rise, half) });
        break;
      case 'antennes': f('antenne', w / 2 - 1.2, wallTop + 0.4, -half + 1.2); break;
      case 'veranda': f('veranda', -w / 2 - 1.5, 0, 0.2, { vw: 3, vd: Math.min(4, d - 0.6), vh: 2.3 }); break;
      case 'colombages': {
        const top = wallTop;
        f('colombage', 0, FOUND_H, front + 0.03, { cw: w, ch: top - FOUND_H, ry: 0 });
        f('colombage', 0, FOUND_H, -front - 0.03, { cw: w, ch: top - FOUND_H, ry: Math.PI });
        f('colombage', w / 2 + 0.03, FOUND_H, 0, { cw: d, ch: top - FOUND_H, ry: Math.PI / 2 });
        f('colombage', -w / 2 - 0.03, FOUND_H, 0, { cw: d, ch: top - FOUND_H, ry: -Math.PI / 2 });
        break;
      }
      default:
        if (name.startsWith('lucarnes')) {
          const n = +name.slice(8) || 2, t = 0.38, z = (half + R.over) * (1 - t) - 0.15, y = R.eaveY + (R.ridgeY - R.eaveY) * t;
          for (let k = 0; k < n; k++) f('lucarne', -w / 2 + (k + 0.5) * w / n, y, z, { color: shade(H.wall.color, 0.05), roof: H.roof.color });
        }
    }
  }
  return items;
}

export function buildHouse(H) {
  seed = 1 + (H.index || 0) * 101 + (H.lap || 0) * 7;
  const main = { w: H.w, d: H.d, floors: H.floors, roof: H.roof, win: H.win, x: 0, z: 0, omit: [] };
  const vols = [main, ...(H.wings ? H.wings(main) : []).map(v => ({ roof: H.roof, ...v, omit: v.omit || [] }))];
  const stages = { fond: [], murs: [], charp: [], toit: [], menu: [], fini: [] };
  let M = null, ridgeY = 0;
  for (const v of vols) {
    const r = buildVolume(v, H);
    if (!M) M = r;
    ridgeY = Math.max(ridgeY, r.R.ridgeY);
    for (const k in stages) for (const it of r.out[k]) stages[k].push(place(it, v));
  }
  stages.fini.push(...features(H, main, M));
  const items = [];
  for (const k of ['fond', 'murs', 'charp', 'toit', 'menu', 'fini']) for (const it of stages[k]) items.push({ ...it, stage: S[k] });
  // Emprise : on recentre la maison (avec ses abords) sur l'origine
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const it of items) { x0 = Math.min(x0, it.x); x1 = Math.max(x1, it.x); z0 = Math.min(z0, it.z); z1 = Math.max(z1, it.z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  for (const it of items) { it.x -= cx; it.z -= cz; }
  const W = x1 - x0 + 2, D = z1 - z0 + 2;
  return { items, wallTop: M.wallTop, rise: M.R.rise, half: H.d / 2, w: W, d: D, ridgeY: ridgeY + (H.feats.includes('tours') ? 2 : 0), plot: Math.max(W, D) + 4 };
}

// Nombre d'éléments par étape (pour l'interface et la simulation)
export function stageCounts(items) {
  const c = STAGES.map(() => 0); for (const it of items) c[it.stage]++; return c;
}

// ---------- Version simplifiée pour la ville ----------
// Une maison terminée reste dans la ville : on fusionne les briques d'un même rang (et les parpaings,
// les tuiles d'une même rangée) en longs blocs. Même allure de loin, beaucoup moins d'objets à dessiner.
export function coarsen(items) {
  const MERGE = new Set(['brique', 'parpaing', 'tuile', 'acrotere', 'toit-plat']);
  const out = [], groups = new Map();
  const r2 = (v) => Math.round((v || 0) * 100) / 100;
  for (const it of items) {
    if (!MERGE.has(it.kind) || it.kind === 'brique' && it.sy > 0.6) { out.push(it); continue; }
    const alongX = Math.abs(Math.sin(it.ry || 0)) < 0.5; // pièce orientée le long de x (sinon le long de z)
    const key = [it.kind, it.mat || '', r2(it.y), alongX ? 'x' : 'z', r2(alongX ? it.z : it.x), r2(it.rx), r2(it.ry), r2(it.sy), r2(it.sz), it.row ?? ''].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  for (const list of groups.values()) {
    const alongX = Math.abs(Math.sin(list[0].ry || 0)) < 0.5, pos = (it) => alongX ? it.x : it.z;
    list.sort((a, b) => pos(a) - pos(b));
    let cur = null;
    const flush = () => { if (!cur) return; const c = (cur.a + cur.b) / 2; out.push({ ...cur.it, sx: cur.b - cur.a, ...(alongX ? { x: c } : { z: c }) }); cur = null; };
    for (const it of list) {
      const a = pos(it) - it.sx / 2, b = pos(it) + it.sx / 2;
      if (cur && a - cur.b < 0.12) cur.b = Math.max(cur.b, b);
      else { flush(); cur = { a, b, it }; }
    }
    flush();
  }
  return out;
}
