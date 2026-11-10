// Génère la liste ordonnée des éléments à poser pour une maison (données pures, sans Three.js).
// Repère : x = largeur, z = profondeur (façade avant vers +z), y = hauteur. 1 unité = 1 case.
// Chaque élément : { stage, kind, x, y, z, sx, sy, sz, ry, rx, color, ... }
import { STAGES } from './rules.js';

const COURSE = 0.5;            // hauteur d'un rang de briques
const COURSES_PER_FLOOR = 4;   // un étage = 4 rangs = 2 unités
const THICK = 0.4;             // épaisseur des murs
const FOUND_H = 0.5;           // hauteur des fondations
const st = (key) => STAGES.findIndex(s => s.key === key);

// Cases d'un rang de mur, dans l'ordre de pose : façade (gauche → droite), côté droit, arrière, côté gauche
function wallCells(w, d) {
  const cells = [], zf = d / 2 - THICK / 2, xs = w / 2 - THICK / 2;
  const sideN = d - 1, sideLen = (d - THICK * 2) / sideN;
  for (let i = 0; i < w; i++) cells.push({ side: 'front', i, x: -w / 2 + 0.5 + i, z: zf, len: 1, ry: 0 });
  for (let j = 0; j < sideN; j++) cells.push({ side: 'right', i: j, x: xs, z: d / 2 - THICK - (j + 0.5) * sideLen, len: sideLen, ry: Math.PI / 2 });
  for (let i = w - 1; i >= 0; i--) cells.push({ side: 'back', i, x: -w / 2 + 0.5 + i, z: -zf, len: 1, ry: 0 });
  for (let j = sideN - 1; j >= 0; j--) cells.push({ side: 'left', i: j, x: -xs, z: d / 2 - THICK - (j + 0.5) * sideLen, len: sideLen, ry: Math.PI / 2 });
  return cells;
}

// Ouvertures : porte (rez-de-chaussée, 3 rangs) et fenêtres (rangs 1 et 2 de chaque étage)
function openings(h) {
  const { w, d, floors } = h, door = Math.floor(w / 2), list = [];
  const alt = (i, n) => i % 2 === 1 || (n - 1 - i) % 2 === 1;
  for (let f = 0; f < floors; f++) {
    for (let i = 1; i <= w - 2; i++) {
      if (f === 0 && Math.abs(i - door) <= 1) continue;
      if (alt(i, w)) list.push({ side: 'front', i, floor: f, kind: 'fenetre' });
    }
    for (let i = 1; i <= w - 2; i++) if (i % 2 === 1) list.push({ side: 'back', i, floor: f, kind: 'fenetre' });
    const sideN = d - 1;
    if (sideN >= 2) for (const side of ['left', 'right']) {
      for (let j = 0; j < sideN; j++) if (sideN <= 3 ? j === Math.floor(sideN / 2) : j % 2 === 1 && j < sideN - 1) list.push({ side, i: j, floor: f, kind: 'fenetre' });
    }
  }
  list.push({ side: 'front', i: door, floor: 0, kind: 'porte' });
  return list;
}

export function buildHouse(h) {
  const items = [], { w, d, floors } = h;
  const cells = wallCells(w, d);
  const brickTint = (k) => k % 3; // petite variation de teinte, gérée au rendu

  // ---------- Fondations : parpaings sur le tracé des murs, puis la dalle ----------
  for (const c of cells) items.push({ stage: st('fond'), kind: 'parpaing', x: c.x, y: FOUND_H / 2, z: c.z, sx: c.len * 0.98, sy: FOUND_H * 0.96, sz: THICK + 0.1, ry: c.ry });
  const iw = w - THICK * 2, id = d - THICK * 2, nx = Math.ceil(iw / 2), nz = Math.ceil(id / 2);
  for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
    const tw = iw / nx, td = id / nz;
    items.push({ stage: st('fond'), kind: 'dalle', x: -iw / 2 + (a + 0.5) * tw, y: FOUND_H * 0.45, z: -id / 2 + (b + 0.5) * td, sx: tw * 0.97, sy: FOUND_H * 0.9, sz: td * 0.97, ry: 0 });
  }

  // ---------- Murs : rang par rang, en laissant la place des portes et fenêtres ----------
  const ops = openings(h);
  const holeAt = (c, course) => {
    const f = Math.floor(course / COURSES_PER_FLOOR), k = course % COURSES_PER_FLOOR;
    return ops.find(o => o.side === c.side && o.i === c.i && o.floor === f && (o.kind === 'porte' ? k <= 2 : k === 1 || k === 2));
  };
  const nCourses = floors * COURSES_PER_FLOOR;
  let n = 0;
  for (let course = 0; course < nCourses; course++) {
    for (const c of cells) {
      if (holeAt(c, course)) continue;
      items.push({ stage: st('murs'), kind: 'brique', x: c.x, y: FOUND_H + (course + 0.5) * COURSE, z: c.z, sx: c.len * 0.97, sy: COURSE * 0.92, sz: THICK, ry: c.ry, tint: brickTint(n++) });
    }
  }
  const wallTop = FOUND_H + nCourses * COURSE;
  const half = d / 2, rise = 0.35 * d + 0.3, over = 0.35;
  // Pignons : les deux triangles de mur sous le toit, côtés gauche et droit
  for (const s of [1, -1]) items.push({ stage: st('murs'), kind: 'pignon', x: s * (w / 2 - THICK / 2), y: wallTop, z: 0, half: half - 0.05, rise, sz: THICK, ry: 0 });

  // ---------- Charpente : une ferme (triangle de poutres) par case ----------
  const nR = w + 1;
  for (let i = 0; i < nR; i++) {
    const x = Math.max(-w / 2 + 0.15, Math.min(w / 2 - 0.15, -w / 2 + i * (w / (nR - 1))));
    items.push({ stage: st('charp'), kind: 'ferme', x, y: wallTop, z: 0, half: half + over, rise: rise + over * rise / half, drop: over * rise / half });
  }

  // ---------- Toiture : rangées de tuiles du bas vers le faîtage, versant avant puis arrière ----------
  const rows = Math.max(2, Math.round(d / 2));
  const eaveY = wallTop - over * rise / half, ridgeY = wallTop + rise + 0.08;
  const cols = w, colW = (w + 2 * over) / cols;
  const slopeLen = Math.hypot(half + over, ridgeY - eaveY), ang = Math.atan2(ridgeY - eaveY, half + over);
  for (let r = 0; r < rows; r++) {
    for (const s of [1, -1]) {
      const t = (r + 0.5) / rows;
      const z = s * (half + over) * (1 - t), y = eaveY + (ridgeY - eaveY) * t + 0.06;
      for (let c = 0; c < cols; c++) {
        const x = -w / 2 - over + (c + 0.5) * colW;
        items.push({ stage: st('toit'), kind: 'tuile', x, y, z, sx: colW * 0.98, sy: 0.12, sz: slopeLen / rows * 1.04, rx: s * ang, ry: 0, row: r });
      }
    }
  }

  // ---------- Menuiseries : fenêtres puis porte d'entrée ----------
  const cellOf = (o) => cells.find(c => c.side === o.side && c.i === o.i);
  const outward = (c) => c.side === 'front' ? [0, 1] : c.side === 'back' ? [0, -1] : c.side === 'right' ? [1, 0] : [-1, 0];
  for (const o of ops.sort((a, b) => (a.kind === 'porte') - (b.kind === 'porte') || a.floor - b.floor)) {
    const c = cellOf(o); if (!c) continue;
    const [ox, oz] = outward(c), base = FOUND_H + o.floor * COURSES_PER_FLOOR * COURSE;
    const hgt = o.kind === 'porte' ? 3 * COURSE : 2 * COURSE, y0 = o.kind === 'porte' ? base : base + COURSE;
    items.push({ stage: st('menu'), kind: o.kind, x: c.x + ox * 0.02, y: y0 + hgt / 2, z: c.z + oz * 0.02, sx: c.len * 0.97, sy: hgt, sz: THICK + 0.04, ry: c.ry, out: [ox, oz] });
  }

  // ---------- Finitions : cheminée, allée, massifs, boîte aux lettres, lampadaire… ----------
  const fin = (kind, x, y, z, extra = {}) => items.push({ stage: st('fini'), kind, x, y, z, ry: 0, ...extra });
  fin('cheminee', w / 2 - 1, wallTop + rise * 0.45, -half * 0.45);
  const door = Math.floor(w / 2), doorX = -w / 2 + 0.5 + door;
  for (let k = 0; k < 3; k++) fin('dallage', doorX, 0.03, half + 0.7 + k * 0.85);
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) fin('massif', sx * (w / 2 + 0.6), 0, sz * (half + 0.5));
  fin('boite', doorX + 1.3, 0, half + 2.5);
  fin('lampe', doorX - 1.3, 0, half + 2.5);
  if (h.pool) fin('piscine', 0, 0, half + 4.5, { pw: Math.min(6, w - 2), pd: 2.6 });
  if (h.towers) for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) fin('tour', sx * (w / 2 + 0.1), 0, sz * (half + 0.1), { th: wallTop + 1.2 });
  if (floors >= 2) fin('balcon', doorX, FOUND_H + COURSES_PER_FLOOR * COURSE + 0.05, half + 0.45, { bw: 2.2 });

  return { items, wallTop, rise, half, w, d, ridgeY, plot: Math.max(w, d) + (h.pool ? 10 : 7) };
}

// Nombre d'éléments par étape (pour l'interface et la simulation)
export function stageCounts(items) {
  const c = STAGES.map(() => 0); for (const it of items) c[it.stage]++; return c;
}
