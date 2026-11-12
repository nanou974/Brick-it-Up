// Camion de livraison de Brick'it Up.
// Le modèle grandit avec l'amélioration « Camion » (palier = tier) :
//   0 petit utilitaire · 1 camion plateau · 2 camion avec grue · 3 trois essieux avec grue · 4 et plus semi-remorque avec grue
// La boutique choisit la carrosserie (plateau, benne, américain) et la couleur.
// Le chargement montre les éléments de l'étape en cours (bordures, parpaings, briques, poutres, tuiles, fenêtres, plantes).
// Repère : le camion roule vers +x, y vers le haut, le sol est à y = 0.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const M = {};
const mat = (key, color, opt = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true, ...opt }));
const smooth = (key, color, opt = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1, ...opt }));
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
const rbox = (w, h, d, r, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), m); o.position.set(x, y, z); return o; };
const cyl = (r1, r2, h, n, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, n), m); o.position.set(x, y, z); return o; };
const shade = (c, f) => { const col = new THREE.Color(c); return f > 0 ? col.lerp(new THREE.Color(0xffffff), f).getHex() : col.multiplyScalar(1 + f).getHex(); };

const DARK = 0x2A2D31, TIRE = 0x1E1F22, CHROME = 0xD8DDE3, GLASS = 0x8FD3F4, DECK = 0x5A5F66;

// Roue : pivot qui tourne autour de l'essieu (axe z)
function wheel(g, ud, x, z, r, rimColor) {
  const piv = new THREE.Group(); piv.position.set(x, r, z);
  const t = cyl(r, r, 0.3, 16, mat('pneu', TIRE)); t.rotation.x = Math.PI / 2; piv.add(t);
  const rim = cyl(r * 0.55, r * 0.55, 0.32, 10, smooth(`jante-${rimColor}`, rimColor, { metalness: 0.5 })); rim.rotation.x = Math.PI / 2; piv.add(rim);
  const s = Math.sign(z) || 1;
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; piv.add(box(0.06, 0.06, 0.04, mat('ecrou', 0x8A9097), Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32, s * 0.17)); }
  piv.add(box(r * 1.3, 0.05, 0.02, mat('flanc', 0x3A3D42), 0, 0, s * 0.155)); // repère : on voit la roue tourner
  g.add(piv); ud.wheels.push({ piv, r });
}

// Cabine. Avant de la cabine en xf ; renvoie l'arrière de la cabine.
function cab(g, ud, xf, color, us, tier) {
  const body = new THREE.Group(); g.add(body); ud.body = body;
  const col = smooth(`cab-${color}`, color), dark = mat('chassis', DARK), chrome = smooth('chrome', CHROME, { metalness: 0.8, roughness: 0.25 }), glass = smooth('vitre', GLASS, { roughness: 0.15, metalness: 0.2 });
  const W = 1.8, L = us ? 1.5 : 1.55, H = us ? 1.65 : 1.5, y0 = 0.6, hood = us ? 1.3 : 0;
  const xc = xf - hood - L / 2; // centre de la cabine
  body.add(rbox(L, H, W, 0.16, col, xc, y0 + H / 2, 0));
  // pare-brise, vitres latérales, pare-soleil
  body.add(box(0.06, H * 0.42, W - 0.3, glass, xc + L / 2 + 0.005, y0 + H * 0.68, 0));
  for (const s of [-1, 1]) body.add(box(L * 0.5, H * 0.36, 0.05, glass, xc + L * 0.15, y0 + H * 0.68, s * (W / 2 + 0.005)));
  body.add(box(0.3, 0.08, W - 0.1, col, xc + L / 2 + 0.1, y0 + H * 0.92, 0));
  // chauffeur (on le voit par la vitre)
  body.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), smooth('peau', 0xE0A97E)).translateX(xc + 0.1).translateY(y0 + H * 0.66).translateZ(0.35));
  body.add(new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), smooth('casquette', 0xE5383B)).translateX(xc + 0.1).translateY(y0 + H * 0.72).translateZ(0.35));
  // rétroviseurs
  for (const s of [-1, 1]) { body.add(box(0.05, 0.05, 0.25, dark, xc + L / 2 - 0.1, y0 + H * 0.75, s * (W / 2 + 0.12))); body.add(box(0.08, 0.32, 0.14, dark, xc + L / 2 - 0.1, y0 + H * 0.68, s * (W / 2 + 0.26))); }
  // marchepieds et garde-boue
  for (const s of [-1, 1]) { body.add(box(0.5, 0.08, 0.2, dark, xc + 0.1, y0 + 0.05, s * (W / 2 - 0.05))); body.add(box(0.95, 0.08, 0.36, dark, xf - (us ? 1.9 : 0.75), 0.95, s * (W / 2 - 0.12))); }
  // avant : calandre, pare-chocs, phares, clignotants
  const front = xf;
  if (us) {
    body.add(rbox(hood, 0.9, W - 0.25, 0.12, col, xf - hood / 2, y0 + 0.45, 0));
    body.add(box(0.08, 0.8, 1.1, chrome, front, y0 + 0.45, 0));
    for (let k = 0; k < 5; k++) body.add(box(0.1, 0.05, 1.0, dark, front + 0.01, y0 + 0.15 + k * 0.15, 0));
    for (const s of [-1, 1]) body.add(cyl(0.08, 0.08, 2.3, 8, chrome, xc - L / 2 + 0.05, y0 + 1.35, s * (W / 2 - 0.15))); // cheminées d'échappement
    body.add(cyl(0.05, 0.05, 0.3, 6, chrome, front - 0.4, y0 + 1.0, 0)); // ornement de capot
  } else {
    body.add(box(0.08, 0.5, 1.1, dark, front + 0.01, y0 + 0.45, 0));
    for (let k = 0; k < 3; k++) body.add(box(0.1, 0.06, 1.0, chrome, front + 0.02, y0 + 0.3 + k * 0.15, 0));
  }
  body.add(box(0.22, 0.28, W + 0.04, dark, front + 0.05, y0 + 0.02, 0)); // pare-chocs
  const hl = new THREE.MeshStandardMaterial({ color: 0xFFF6D8, emissive: 0xFFE9A8, emissiveIntensity: 0.15 }); ud.headlights = hl;
  for (const s of [-1, 1]) { body.add(box(0.06, 0.18, 0.3, hl, front + 0.04, y0 + 0.3, s * (W / 2 - 0.25))); body.add(box(0.06, 0.1, 0.12, smooth('cligno', 0xFF9F1C, { emissive: 0x6A3A00 }), front + 0.04, y0 + 0.3, s * (W / 2 - 0.05))); }
  // gyrophare, à partir du camion à 3 essieux
  if (tier >= 3) { const gy = cyl(0.13, 0.13, 0.16, 10, smooth('gyro', 0xFF8A00, { emissive: 0xFF6A00, emissiveIntensity: 1 }), xc, y0 + H + 0.08, 0); body.add(gy); ud.gyro = gy; }
  if (tier >= 1) body.add(box(0.5, 0.12, 1.2, dark, xc - 0.2, y0 + H + 0.06, 0)); // déflecteur de toit
  return xc - L / 2;
}

// Grue auxiliaire derrière la cabine : le bras pivote vers la palette pour décharger
function crane(g, ud, x, y) {
  const yel = smooth('grue', 0xFFC531), dark = mat('chassis', DARK);
  g.add(cyl(0.32, 0.38, 0.3, 10, dark, x, y + 0.15, 0));
  const yaw = new THREE.Group(); yaw.position.set(x, y + 0.3, 0); g.add(yaw);
  yaw.add(box(0.36, 1.1, 0.36, yel, 0, 0.55, 0));
  const boom = new THREE.Group(); boom.position.set(0, 1.05, 0); yaw.add(boom);
  boom.add(box(2.6, 0.22, 0.22, yel, -1.3, 0, 0)); boom.add(box(1.6, 0.15, 0.15, smooth('grue2', 0xE0A800), -2.5, 0.02, 0));
  boom.add(box(0.06, 0.06, 0.06, dark, -3.25, -0.08, 0));
  const cable = box(0.03, 1, 0.03, dark, -3.25, -0.6, 0); boom.add(cable);
  const hook = box(0.16, 0.14, 0.16, smooth('crochet', 0xE5383B), -3.25, -1.12, 0); boom.add(hook);
  boom.rotation.z = -0.12; // au repos : bras posé au-dessus du plateau
  ud.crane = { yaw, boom, cable, hook };
}

// Plateau, ridelles et feux arrière. Renvoie les emplacements de chargement.
function bed(g, ud, x0, x1, y, color, model, rows = 1) {
  const L = x0 - x1, xc = (x0 + x1) / 2, W = 1.9, dark = mat('chassis', DARK);
  const slots = [], n = Math.max(1, Math.floor((L - 0.3) / 0.9)), step = (L - 0.3) / n;
  if (model === 'benne') {
    const bm = smooth(`cab-${color}`, color);
    g.add(box(L, 0.15, W, mat('plateau', DECK), xc, y, 0));
    for (const s of [-1, 1]) { g.add(box(L, 0.8, 0.1, bm, xc, y + 0.45, s * W / 2)); for (let k = 1; k < 4; k++) g.add(box(0.06, 0.8, 0.12, mat(`cab-${color}-r`, shade(color, -0.2)), x1 + k * L / 4, y + 0.45, s * W / 2)); }
    g.add(box(0.1, 0.8, W, bm, x1, y + 0.45, 0)); g.add(box(0.1, 1.05, W, bm, x0, y + 0.55, 0));
  } else {
    g.add(box(L, 0.18, W, mat('plateau', DECK), xc, y, 0));
    for (const s of [-1, 1]) { g.add(box(L, 0.22, 0.06, smooth(`ridelle-${color}`, shade(color, -0.1)), xc, y + 0.2, s * (W / 2 - 0.03))); for (let k = 0; k <= Math.round(L / 1.2); k++) g.add(box(0.06, 0.3, 0.08, dark, x1 + 0.05 + k * (L - 0.1) / Math.round(L / 1.2), y + 0.2, s * (W / 2 - 0.03))); }
    g.add(box(0.12, 1.0, W, smooth(`ridelle-${color}`, shade(color, -0.1)), x0 - 0.06, y + 0.55, 0)); // ridelle avant (protège la cabine)
    for (let k = 0; k < 4; k++) g.add(box(0.13, 0.05, W - 0.1, dark, x0 - 0.06, y + 0.25 + k * 0.22, 0));
  }
  for (let i = 0; i < n; i++) for (let r = 0; r < rows; r++) slots.push({ x: x0 - 0.2 - (i + 0.5) * step, y: y + 0.09, z: rows > 1 ? (r - 0.5) * 0.92 : 0 });
  // feux arrière (s'allument au freinage) et plaque
  const br = new THREE.MeshStandardMaterial({ color: 0xC0262D, emissive: 0xFF2020, emissiveIntensity: 0.1 }); ud.brake.push(br);
  for (const s of [-1, 1]) g.add(box(0.06, 0.16, 0.32, br, x1 - 0.05, y - 0.22, s * (W / 2 - 0.25)));
  g.add(box(0.04, 0.16, 0.5, smooth('plaque', 0xF2F2EC), x1 - 0.05, y - 0.22, 0));
  g.add(box(0.2, 0.06, W, dark, x1 - 0.05, y - 0.38, 0)); // barre anti-encastrement
  return slots;
}

export function makeTruck(tier, skin = { model: 'plateau', color: 0xF2A900 }) {
  const g = new THREE.Group(), ud = g.userData = { wheels: [], brake: [], slots: [], tier, load: new THREE.Group() };
  const T = Math.min(4, tier), us = skin.model === 'americain', color = skin.color, dark = mat('chassis', DARK);
  const rim = us ? CHROME : 0xB9BDC1, R = T === 0 ? 0.32 : 0.4;
  if (T < 4) {
    // Porteur : cabine + plateau sur un seul châssis
    const bedL = [2.0, 2.9, 3.1, 3.8][T], front = us ? 2.4 : 1.6;
    const back = cab(g, ud, front, color, us, T);
    let x0 = back - 0.08;
    if (T >= 2) { crane(g, ud, x0 - 0.3, 0.75); x0 -= 0.65; }
    const x1 = x0 - bedL;
    g.add(box(front - x1, 0.22, 1.1, dark, (front + x1) / 2, 0.5, 0)); // châssis
    ud.slots = bed(g, ud, x0, x1, 0.95, color, skin.model);
    const axles = T === 3 ? [front - (us ? 1.9 : 0.75), x1 + 1.35, x1 + 0.5] : [front - (us ? 1.9 : 0.75), x1 + Math.min(0.9, bedL * 0.35)];
    for (const x of axles) for (const z of [-0.82, 0.82]) wheel(g, ud, x, z, R, rim);
    for (const x of axles.slice(1)) for (const s of [-1, 1]) g.add(box(1.0, 0.07, 0.38, dark, x, R * 2 + 0.08, s * 0.82)); // garde-boue arrière
    ud.exhaust = new THREE.Vector3(back - 0.1, 0.35, 0.7);
  } else {
    // Semi-remorque : tracteur + remorque à 3 essieux
    const front = us ? 3.6 : 2.8, back = cab(g, ud, front, color, us, T);
    g.add(box(front - back + 1.6, 0.22, 1.1, dark, (front + back - 1.6) / 2, 0.5, 0));
    g.add(cyl(0.45, 0.45, 0.1, 12, dark, back - 0.9, 0.95, 0)); // sellette
    for (const x of [front - (us ? 1.9 : 0.75), back - 0.6, back - 1.4]) for (const z of [-0.82, 0.82]) wheel(g, ud, x, z, R, rim);
    crane(g, ud, back - 0.4, 1.2);
    const x0 = back - 1.0, x1 = x0 - 6.4;
    g.add(box(x0 - x1, 0.25, 1.2, dark, (x0 + x1) / 2, 0.9, 0));
    ud.slots = bed(g, ud, x0, x1, 1.2, color, skin.model, 2);
    for (const x of [x1 + 2.0, x1 + 1.2, x1 + 0.4]) for (const z of [-0.82, 0.82]) wheel(g, ud, x, z, R, rim);
    for (const s of [-1, 1]) { g.add(box(0.08, 0.75, 0.08, dark, x0 - 1.4, 0.4, s * 0.55)); g.add(box(0.25, 0.05, 0.25, dark, x0 - 1.4, 0.03, s * 0.55)); } // béquilles
    ud.exhaust = new THREE.Vector3(back - 0.1, 0.35, 0.7);
  }
  g.add(ud.load);
  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return g;
}

// ---------- Chargement ----------
// Une palette de chantier, selon l'étape (clé de l'étape) et la couleur de l'élément à livrer
function pallet(key, color) {
  const g = new THREE.Group(), wood = mat('palette', 0xB48C58), strap = mat('sangle', 0xE5383B);
  g.add(box(0.8, 0.1, 0.8, wood, 0, 0.05, 0));
  const c = (k, col) => mat(`charge-${k}-${col}`, col);
  let h = 0.5;
  switch (key) {
    case 'voirie': // bordures et plots
      for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) g.add(box(0.76, 0.14, 0.32, c('bord', 0xBFC4C9), 0, 0.17 + r * 0.15, (k - 0.5) * 0.36));
      g.add(new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 8), c('plot', 0xF2730C)).translateY(0.75)); h = 0.45; break;
    case 'fond': // parpaings
      for (let r = 0; r < 2; r++) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) g.add(box(0.36, 0.22, 0.36, c('parp', 0x9AA0A6), (a - 0.5) * 0.38, 0.22 + r * 0.24, (b - 0.5) * 0.38));
      break;
    case 'murs': // briques
      for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) g.add(box(r % 2 ? 0.74 : 0.24, 0.12, r % 2 ? 0.24 : 0.74, c('brique', color || 0xC8553D), r % 2 ? 0 : (k - 1) * 0.25, 0.17 + r * 0.13, r % 2 ? (k - 1) * 0.25 : 0));
      break;
    case 'charp': // poutres (dépassent un peu)
      for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) g.add(box(1.1, 0.13, 0.2, c('bois', 0xC48A52), 0, 0.17 + r * 0.14, (k - 1) * 0.24));
      h = 0.42; break;
    case 'toit': // piles de tuiles
      for (let a = 0; a < 2; a++) for (let b = 0; b < 3; b++) g.add(box(0.36, 0.38, 0.22, c('tuile', color || 0xC9663A), (a - 0.5) * 0.38, 0.3, (b - 1) * 0.25));
      break;
    case 'menu': // fenêtres debout
      for (let k = 0; k < 3; k++) { const f = new THREE.Group(); f.add(box(0.7, 0.55, 0.06, c('cadre', 0xF7F7F2))); f.add(box(0.56, 0.42, 0.07, smooth('vitre', GLASS, { roughness: 0.15 }))); f.position.set(0, 0.4, (k - 1) * 0.22); g.add(f); }
      h = 0.7; break;
    default: // finitions : plantes en pot et carton
      g.add(box(0.36, 0.3, 0.36, c('carton', 0xC8A06A), 0.18, 0.25, 0.18));
      for (const [x, z, lc] of [[-0.2, -0.2, 0x4E9A3E], [-0.2, 0.2, 0x62B04B], [0.2, -0.2, 0xF25C78]]) { g.add(cyl(0.12, 0.09, 0.2, 8, c('pot', 0xB5652D), x, 0.2, z)); g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), c('feuille', lc)).translateX(x).translateY(0.4).translateZ(z)); }
      h = 0.45;
  }
  if (key !== 'menu' && key !== 'fini') for (const z of [-0.2, 0.2]) g.add(box(0.82, 0.03, 0.05, strap, 0, h + 0.12, z)); // sangles
  return g;
}

// Remplit le plateau : n palettes de l'étape « key » (n = 0 : camion vide)
export function setTruckLoad(truck, key, n, color) {
  const ud = truck.userData, sig = `${key}|${n}|${color}`;
  if (ud.loadSig === sig) return; ud.loadSig = sig;
  for (const c of [...ud.load.children]) ud.load.remove(c);
  const slots = ud.slots.slice(0, Math.max(0, Math.min(n, ud.slots.length)));
  for (const s of slots) { const p = pallet(key, color); p.position.set(s.x, s.y, s.z); p.traverse(c => { if (c.isMesh) c.castShadow = true; }); ud.load.add(p); }
}
export const truckSlots = (truck) => truck.userData.slots.length;
