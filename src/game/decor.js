// Décors autour du chantier (personnalisation) : ciel, sol, arbres et éléments lointains.
import * as THREE from 'three';

const M = {};
const mat = (color, opt = {}) => { const k = `${color}|${opt.emissive || ''}`; return M[k] || (M[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...opt })); };
const rnd = (a) => { const x = Math.sin(a * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const mesh = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };

// Arbres de chaque décor (x, z : position ; s : taille ; i : graine)
function conifer(g, s, i, snow = false) {
  g.add(mesh(new THREE.CylinderGeometry(0.15 * s, 0.22 * s, 1.2 * s, 6), mat(0x7A5230), 0, 0.6 * s, 0));
  const leaf = mat(snow ? 0x2F5E3A : rnd(i) > 0.5 ? 0x3F8F3A : 0x58A845);
  for (let k = 0; k < 2; k++) {
    g.add(mesh(new THREE.ConeGeometry((1.2 - k * 0.35) * s, 1.6 * s, 7), leaf, 0, (1.6 + k * 0.9) * s, 0));
    if (snow) g.add(mesh(new THREE.ConeGeometry((0.6 - k * 0.18) * s, 0.7 * s, 7), mat(0xF7FAFC), 0, (2.05 + k * 0.9) * s, 0));
  }
}
function leafy(g, s, i, colors) {
  g.add(mesh(new THREE.CylinderGeometry(0.15 * s, 0.22 * s, 1.4 * s, 6), mat(0x6E4A2C), 0, 0.7 * s, 0));
  for (let k = 0; k < 3; k++) g.add(mesh(new THREE.IcosahedronGeometry((0.9 - k * 0.15) * s, 0), mat(colors[(i + k) % colors.length]), (k - 1) * 0.5 * s, (1.8 + (k % 2) * 0.4) * s, (rnd(i + k) - 0.5) * 0.5 * s));
}
function palm(g, s, i) {
  for (let k = 0; k < 6; k++) g.add(mesh(new THREE.CylinderGeometry((0.17 - k * 0.012) * s, (0.19 - k * 0.012) * s, 0.55 * s, 7), mat(k % 2 ? 0x9C7A55 : 0x8C6B48), k * 0.06 * s, (0.27 + k * 0.53) * s, 0));
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, f = mesh(new THREE.BoxGeometry(1.6 * s, 0.05, 0.38 * s), mat(k % 2 ? 0x3F8F3A : 0x58A845), (0.36 + Math.cos(a) * 0.7) * s, 3.25 * s, Math.sin(a) * 0.7 * s); f.rotation.set(0, -a, -0.35); g.add(f); }
}
function building(g, s, i) {
  const h = 4 + rnd(i) * 9, w = 3 + rnd(i * 3) * 2.5, d = 3 + rnd(i * 5) * 2;
  const c = [0xC9B79C, 0xB86B4A, 0xE6E2D8, 0x8E9AA6, 0xD9A47A][i % 5];
  g.add(mesh(new THREE.BoxGeometry(w, h, d), mat(c), 0, h / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(w + 0.2, 0.25, d + 0.2), mat(0x5B6168), 0, h + 0.12, 0));
  const win = mat(0xFFE9A8, { emissive: 0x6B5A20, emissiveIntensity: 0.4 });
  for (let y = 1.2; y < h - 0.6; y += 1.5) for (let x = -w / 2 + 0.7; x < w / 2 - 0.4; x += 1.1) for (const sd of [1, -1]) g.add(mesh(new THREE.BoxGeometry(0.55, 0.75, 0.05), win, x, y, sd * (d / 2 + 0.02)));
}

export const DECORS = {
  prairie: { sky: 0x8FCFF5, ground: 0x7CC35A, hemiGround: 0x6B8E4E, plot: 0xB08A5B, road: 0x4B4F55, tree: (g, s, i) => conifer(g, s, i) },
  mer: { sky: 0x79D2F2, ground: 0xEAD7A0, hemiGround: 0xC8B27A, plot: 0xCDB27E, road: 0x6B6F75, tree: (g, s, i) => palm(g, s * 0.9, i), far: 'mer' },
  montagne: { sky: 0xBFD9EE, ground: 0xEEF3F7, hemiGround: 0xB8C4CF, plot: 0x9C8468, road: 0x5A5F66, tree: (g, s, i) => conifer(g, s * 1.1, i, true), far: 'montagnes' },
  automne: { sky: 0xF4D6A8, ground: 0xA69A4C, hemiGround: 0x8A6E3A, plot: 0x9E7448, road: 0x4B4F55, tree: (g, s, i) => leafy(g, s, i, [0xD9822B, 0xC0392B, 0xE8B23A, 0xA0522D]) },
  ville: { sky: 0xA9C4D8, ground: 0x9A9EA3, hemiGround: 0x7A7E84, plot: 0xA88B66, road: 0x3E4248, tree: (g, s, i) => building(g, s, i), city: true },
};

// Construit le décor autour d'une maison (emprise plan.w × plan.d, route en roadZ)
export function buildDecor(kind, plan, roadZ) {
  const D = DECORS[kind] || DECORS.prairie, g = new THREE.Group(), P = plan.plot;
  const n = D.city ? 18 : 26;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(i) * 0.2, r = P * 0.75 + (D.city ? 7 : 4) + rnd(i * 3) * 10;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(z - roadZ) < (D.city ? 6 : 3.5) || (z > 0 && Math.abs(x) < P * 0.6) || (Math.abs(x) < plan.w / 2 + 2.5 && Math.abs(z) < plan.d / 2 + 2.5)) continue;
    const t = new THREE.Group(); D.tree(t, 0.8 + rnd(i * 7) * 0.6, i); t.position.set(x, 0, z);
    if (D.city) t.lookAt(0, 0, 0);
    g.add(t);
  }
  // Éléments lointains, derrière la route
  if (D.far === 'mer') {
    const sea = mesh(new THREE.PlaneGeometry(400, 120), mat(0x2E9BD6, { roughness: 0.2, emissive: 0x0B3F6A, emissiveIntensity: 0.2 }), 0, 0.05, roadZ - 70);
    sea.rotation.x = -Math.PI / 2; g.add(sea);
    for (let k = 0; k < 5; k++) { const u = new THREE.Group(); u.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 6), mat(0xF7F7F2), 0, 1, 0)); u.add(mesh(new THREE.ConeGeometry(1.1, 0.5, 8), mat([0xE5383B, 0x2F6FD1, 0xFFD23F][k % 3]), 0, 2, 0)); u.position.set(-20 + k * 10 + rnd(k) * 3, 0, roadZ - 6 - rnd(k * 2) * 3); g.add(u); }
  }
  if (D.far === 'montagnes') for (let k = 0; k < 7; k++) {
    const h = 18 + rnd(k) * 14, x = -60 + k * 20 + rnd(k * 3) * 6, z = roadZ - 40 - rnd(k * 5) * 15;
    g.add(mesh(new THREE.ConeGeometry(h * 0.8, h, 6), mat(0x8A939C), x, h / 2, z));
    g.add(mesh(new THREE.ConeGeometry(h * 0.3, h * 0.38, 6), mat(0xF7FAFC), x, h * 0.81, z));
  }
  if (D.city) for (let k = 0; k < 8; k++) {
    const l = new THREE.Group(); l.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 3, 6), mat(0x2E3338), 0, 1.5, 0)); l.add(mesh(new THREE.SphereGeometry(0.2, 8, 6), mat(0xFFF2B0, { emissive: 0xFFD36B, emissiveIntensity: 0.9 }), 0, 3.1, 0));
    l.position.set(-28 + k * 8, 0, roadZ + 2.6); g.add(l);
  }
  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; } });
  return g;
}
