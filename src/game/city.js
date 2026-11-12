// Plan de la ville de Brick'it Up (données pures, sans Three.js).
// Chaque construction terminée reste sur sa parcelle ; les parcelles s'enroulent en spirale autour d'une place centrale.
// Les rues courent entre les parcelles ; chaque nouvelle parcelle construit d'abord les rues qui la bordent
// et qui n'existent pas encore (étape « Voirie ») : rue arrière (pour le camion), côtés, puis rue de devant.

export const LOT = 32;      // côté d'une parcelle, rue comprise (en cases)
export const STREET = 7;    // largeur d'une rue : chaussée de 4,4 + trottoirs
export const TILES = 3;     // tronçons de chaussée par côté de parcelle

// Parcelle n° k (k = niveau − 1) : cases en spirale autour de la place (0, 0), en commençant juste derrière elle,
// face à la place. Anneau 1 : (0,-1), (1,-1), (1,0), (1,1), (0,1), (-1,1), (-1,0), (-1,-1), puis anneau 2, etc.
const cache = [];
export function lotCell(k) {
  while (cache.length <= k) {
    const r = cache.length === 0 ? 1 : null;
    if (r) { for (let ring = 1; cache.length <= k + 64; ring++) ringCells(ring).forEach(c => cache.push(c)); }
    else for (let ring = Math.max(...cache.map(c => Math.max(Math.abs(c.i), Math.abs(c.j)))) + 1; cache.length <= k + 64; ring++) ringCells(ring).forEach(c => cache.push(c));
  }
  return cache[k];
}
function ringCells(r) {
  const cells = [];
  // départ au milieu du côté « arrière » (j = -r), puis sens des aiguilles d'une montre vu du dessus
  for (let i = 0; i <= r; i++) cells.push({ i, j: -r });
  for (let j = -r + 1; j <= r; j++) cells.push({ i: r, j });
  for (let i = r - 1; i >= -r; i--) cells.push({ i, j: r });
  for (let j = r - 1; j >= -r; j--) cells.push({ i: -r, j });
  for (let i = -r + 1; i < 0; i++) cells.push({ i, j: -r });
  return cells;
}
export function lotCenter(k) { const c = lotCell(k); return { x: c.i * LOT, z: c.j * LOT }; }

// Rues bordant une parcelle : segments h (le long de x) et v (le long de z), et les 4 carrefours.
// Ordre de construction : arrière (le camion arrive par là), gauche, droite, devant.
function lotStreets(k) {
  const { i, j } = lotCell(k);
  return {
    segs: [`h:${i}:${j}`, `v:${i}:${j}`, `v:${i + 1}:${j}`, `h:${i}:${j + 1}`],
    corners: [`x:${i}:${j}`, `x:${i + 1}:${j}`, `x:${i}:${j + 1}`, `x:${i + 1}:${j + 1}`],
  };
}
// Rues déjà construites avant la parcelle k
export function builtBefore(k) {
  const set = new Set();
  for (let n = 0; n < k; n++) { const s = lotStreets(n); s.segs.forEach(x => set.add(x)); s.corners.forEach(x => set.add(x)); }
  return set;
}

// Éléments de l'étape « Voirie » de la parcelle k, dans le repère de la parcelle (centre de la parcelle = origine)
export function voirieItems(k, stage) {
  const c = lotCenter(k), done = builtBefore(k), s = lotStreets(k), items = [];
  const L = LOT, seg = (L - STREET) / TILES;
  const add = (it) => items.push({ stage, ...it, x: it.x - c.x, z: it.z - c.z });
  for (const id of s.segs) {
    if (done.has(id)) continue;
    const [kind, a, b] = id.split(':'), A = +a, B = +b;
    if (kind === 'h') { // rue le long de x, à z = (B − ½)·L, entre x = (A − ½)·L et (A + ½)·L
      const z = (B - 0.5) * L, x0 = (A - 0.5) * L + STREET / 2;
      for (let t = 0; t < TILES; t++) add({ kind: 'route', x: x0 + (t + 0.5) * seg, y: 0, z, len: seg, ry: 0 });
      add({ kind: 'reverbere', x: x0 + seg * 1.5, y: 0, z: z + STREET / 2 - 0.7, ry: 0 });
      add({ kind: 'arbre-rue', x: x0 + seg * 0.5, y: 0, z: z - STREET / 2 + 0.7, ry: 0 });
    } else {            // rue le long de z, à x = (A − ½)·L
      const x = (A - 0.5) * L, z0 = (B - 0.5) * L + STREET / 2;
      for (let t = 0; t < TILES; t++) add({ kind: 'route', x, y: 0, z: z0 + (t + 0.5) * seg, len: seg, ry: Math.PI / 2 });
      add({ kind: 'reverbere', x: x + STREET / 2 - 0.7, y: 0, z: z0 + seg * 1.5, ry: 0 });
      add({ kind: 'arbre-rue', x: x - STREET / 2 + 0.7, y: 0, z: z0 + seg * 2.5, ry: 0 });
    }
  }
  for (const id of s.corners) {
    if (done.has(id)) continue;
    const [, a, b] = id.split(':');
    add({ kind: 'carrefour', x: (+a - 0.5) * L, y: 0, z: (+b - 0.5) * L, ry: 0 });
  }
  return items;
}

// Emprise de la ville (parcelles 0 … n−1 et la place) dans le repère du monde
export function cityBounds(n) {
  let x0 = -LOT / 2, x1 = LOT / 2, z0 = -LOT / 2, z1 = LOT / 2;
  for (let k = 0; k < n; k++) { const c = lotCenter(k); x0 = Math.min(x0, c.x - LOT / 2); x1 = Math.max(x1, c.x + LOT / 2); z0 = Math.min(z0, c.z - LOT / 2); z1 = Math.max(z1, c.z + LOT / 2); }
  return { x0: x0 - STREET / 2, x1: x1 + STREET / 2, z0: z0 - STREET / 2, z1: z1 + STREET / 2 };
}
