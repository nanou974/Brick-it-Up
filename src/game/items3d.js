// Dessin 3D de chaque élément de maison (« kind » produit par house.js). Formes simples, style low-poly.
import * as THREE from 'three';

const M = {};
// Matériau partagé par couleur (et options) : peu de matériaux différents → rendu rapide
export function mat(color, opt = {}, key = '') {
  const k = `${color}|${key}|${opt.transparent ? 't' : ''}|${opt.emissive || ''}|${opt.roughness ?? ''}`;
  if (!M[k]) M[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opt });
  return M[k];
}
const G = {};
const boxG = (w, h, d) => { const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`; return G[k] || (G[k] = new THREE.BoxGeometry(w, h, d)); };
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const b = new THREE.Mesh(boxG(w, h, d), m); b.position.set(x, y, z); return b; };
const cyl = (r1, r2, h, n, m, x = 0, y = 0, z = 0) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, n), m); c.position.set(x, y, z); return c; };
const shade = (hex, k) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return c.getHex(); };
const rnd = (a) => { const x = Math.sin(a * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const WOOD = 0xA4703F, DARKWOOD = 0x5A3A22, WHITE = 0xF7F7F2, METAL = 0x2E3338, GLASS = 0x8FD3F4, LEAF = 0x4E9A3E, LEAF2 = 0x62B04B;
const glassM = () => mat(GLASS, { roughness: 0.15, metalness: 0.1, emissive: 0x1C4C6A, emissiveIntensity: 0.25 }, 'verre');
const glassT = () => mat(0xBFE8FA, { transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false }, 'verreT');

// Poutre entre deux points (repère local de l'élément)
function beam(a, b, t, m) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  const g = new THREE.Mesh(boxG(t, t, L), m); g.position.copy(A).add(B).multiplyScalar(0.5); g.lookAt(B); return g;
}

export function makeItem(it) {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ'; // d'abord l'inclinaison (rx), puis l'orientation (ry)
  const c = it.color;
  switch (it.kind) {
    // ---------- Voirie (rues de la ville) ----------
    case 'route': { // tronçon de rue : chaussée, bordures, trottoirs, pointillés au centre
      const L = it.len, asph = mat(0x45494F, { roughness: 0.95 }), side = mat(0xC9C4B8), curb = mat(0xE6E2D8);
      g.add(box(L, 0.08, 4.4, asph, 0, 0.04, 0));
      for (const s2 of [-1, 1]) { g.add(box(L, 0.16, 0.18, curb, 0, 0.08, s2 * 2.29)); g.add(box(L, 0.14, 1.12, side, 0, 0.07, s2 * 2.94)); }
      for (let k = 0; k < 2; k++) g.add(box(L * 0.22, 0.012, 0.13, mat(0xF2F2EC), -L / 4 + k * L / 2, 0.086, 0));
      break;
    }
    case 'chemin-terre': { // côté de rue pas encore goudronné : terre battue et ornières
      const dirt = mat(0xA8875E, { roughness: 1 }), dark = mat(0x8E6F4A, { roughness: 1 });
      if (it.square) { g.add(box(it.len, 0.04, it.len, dirt, 0, 0.02, 0)); break; }
      g.add(box(it.len, 0.04, 4.8, dirt, 0, 0.02, 0));
      for (const z of [-0.9, 0.9]) g.add(box(it.len, 0.015, 0.45, dark, 0, 0.045, z));
      for (let k = 0; k < 4; k++) g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.18 + (k % 2) * 0.1, 0), mat(0x9AA0A6)).translateX(-it.len / 2 + 2 + k * it.len / 4).translateZ(k % 2 ? 2.1 : -2.2).translateY(0.08));
      break;
    }
    case 'carrefour': { // carrefour : chaussée, coins de trottoir, passages piétons
      g.add(box(7, 0.08, 7, mat(0x45494F, { roughness: 0.95 }), 0, 0.04, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(1.3, 0.14, 1.3, mat(0xC9C4B8), sx * 2.85, 0.07, sz * 2.85));
      const white = mat(0xF2F2EC);
      for (let k = 0; k < 5; k++) for (const s2 of [-1, 1]) {
        g.add(box(0.36, 0.012, 1.1, white, -1.6 + k * 0.8, 0.086, s2 * 2.9));
        g.add(box(1.1, 0.012, 0.36, white, s2 * 2.9, 0.086, -1.6 + k * 0.8));
      }
      break;
    }
    case 'reverbere': {
      g.add(cyl(0.07, 0.1, 3.4, 8, mat(0x2E3338), 0, 1.7, 0));
      g.add(box(0.9, 0.08, 0.08, mat(0x2E3338), -0.4, 3.35, 0));
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat(0xFFF2B0, { emissive: 0xFFD36B, emissiveIntensity: 0.9 })); l.position.set(-0.8, 3.2, 0); g.add(l);
      break;
    }
    case 'arbre-rue': {
      g.add(box(1, 0.05, 1, mat(0x5B4A3A), 0, 0.15, 0));
      g.add(cyl(0.12, 0.16, 1.6, 6, mat(0x7A5230), 0, 0.8, 0));
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 - k * 0.12, 0), mat(k % 2 ? LEAF : LEAF2)); b.position.set((k - 1) * 0.35, 2 + (k % 2) * 0.35, (rnd(k + it.x) - 0.5) * 0.4); g.add(b); }
      break;
    }
    // ---------- Place centrale ----------
    case 'place': {
      const W = it.size;
      g.add(box(W, 0.1, W, mat(0xD8CBB0), 0, 0.05, 0));
      for (let k = -2; k <= 2; k++) { g.add(box(W, 0.012, 0.25, mat(0xC2B396), 0, 0.106, k * W / 5)); g.add(box(0.25, 0.012, W, mat(0xC2B396), k * W / 5, 0.106, 0)); }
      // fontaine
      g.add(cyl(3.2, 3.4, 0.6, 24, mat(0xB9B2A3), 0, 0.3, 0)); g.add(cyl(2.8, 2.8, 0.1, 24, mat(0x3FB6E8, { roughness: 0.1, emissive: 0x0B4F7A, emissiveIntensity: 0.3 }), 0, 0.58, 0));
      g.add(cyl(0.35, 0.5, 1.6, 10, mat(0xB9B2A3), 0, 1.2, 0)); g.add(cyl(1.1, 0.8, 0.3, 14, mat(0xB9B2A3), 0, 2.05, 0)); g.add(cyl(0.9, 0.9, 0.05, 14, mat(0x3FB6E8, { roughness: 0.1, emissive: 0x0B4F7A, emissiveIntensity: 0.3 }), 0, 2.2, 0));
      g.add(cyl(0.12, 0.2, 0.8, 8, mat(0xBFE8FA, { transparent: true, opacity: 0.6 }), 0, 2.6, 0));
      // bancs, massifs et arbres aux quatre coins
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const bx = sx * W * 0.3, bz = sz * W * 0.3;
        for (const k of [0, 1]) { const bench = new THREE.Group(); bench.add(box(1.6, 0.08, 0.5, mat(WOOD), 0, 0.45, 0)); bench.add(box(1.6, 0.4, 0.08, mat(WOOD), 0, 0.7, -0.22)); for (const e of [-0.65, 0.65]) bench.add(box(0.08, 0.45, 0.45, mat(METAL), e, 0.22, 0)); bench.position.set(bx + (k ? 0 : sx * 2.4), 0, bz + (k ? sz * 2.4 : 0)); bench.rotation.y = k ? (sz > 0 ? Math.PI : 0) : (sx > 0 ? -Math.PI / 2 : Math.PI / 2); g.add(bench); }
        g.add(cyl(1.2, 1.2, 0.35, 12, mat(0x8A6E4B), bx * 1.35, 0.18, bz * 1.35));
        for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), mat([LEAF, 0xF25C78, 0xFFD23F, LEAF2, 0xFFFFFF][k])); f.position.set(bx * 1.35 + (rnd(k) - 0.5) * 1.4, 0.5, bz * 1.35 + (rnd(k * 3) - 0.5) * 1.4); g.add(f); }
        const tr = new THREE.Group(); tr.add(cyl(0.18, 0.25, 2.2, 6, mat(0x7A5230), 0, 1.1, 0));
        for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 - k * 0.2, 0), mat(k % 2 ? LEAF : LEAF2)); b.position.set((k - 1) * 0.6, 2.8 + (k % 2) * 0.5, 0); tr.add(b); }
        tr.position.set(sx * W * 0.42, 0, sz * W * 0.42); g.add(tr);
      }
      break;
    }
    // ---------- Gros œuvre ----------
    case 'parpaing':
      g.add(box(it.sx, it.sy, it.sz, mat(0x9AA0A6)));
      for (const s of [-1, 1]) g.add(box(it.sx * 0.28, 0.02, it.sz * 0.45, mat(0x4A4F55), s * it.sx * 0.22, it.sy / 2 + 0.001, 0));
      break;
    case 'dalle': g.add(box(it.sx, it.sy, it.sz, mat(0xB9BDC1))); break;
    case 'brique': {
      g.add(box(it.sx, it.sy, it.sz, mat(c)));
      if (it.mat === 'bois') for (const s of [1, -1]) g.add(box(it.sx, 0.03, 0.01, mat(shade(c, -0.12)), 0, 0, s * (it.sz / 2 + 0.004)));
      break;
    }
    case 'pignon': {
      const sh = new THREE.Shape();
      // (après la rotation, x = +half de la forme se retrouve à l'arrière : le côté haut du toit à une pente)
      if (it.shape === 'shed') { sh.moveTo(-it.half, 0); sh.lineTo(it.half, 0); sh.lineTo(it.half, it.rise); }
      else { sh.moveTo(-it.half, 0); sh.lineTo(it.half, 0); sh.lineTo(0, it.rise); }
      sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: it.sz, bevelEnabled: false }); geo.translate(0, 0, -it.sz / 2);
      const m = new THREE.Mesh(geo, mat(c)); m.rotation.y = Math.PI / 2; g.add(m);
      break;
    }
    // ---------- Charpente ----------
    case 'ferme': {
      const wood = mat(WOOD), len = Math.hypot(it.half, it.rise);
      for (const s of [1, -1]) { const b = box(0.14, 0.16, len, wood, 0, -it.drop + it.rise / 2, s * it.half / 2); b.rotation.x = s * Math.atan2(it.rise, it.half); g.add(b); }
      g.add(box(0.12, 0.14, it.half * 1.6, wood, 0, 0.05, 0));
      g.add(box(0.1, it.rise * 0.8, 0.1, wood, 0, it.rise * 0.4 - it.drop * 0.5, 0));
      break;
    }
    case 'beam': g.add(beam(it.p0, it.p1, 0.15, mat(WOOD))); g.rotation.y = 0; return g;
    case 'solive': g.add(box(it.sx, it.sy, it.sz, mat(WOOD))); break;
    // ---------- Toiture ----------
    case 'tuile': {
      const m = mat(it.row % 2 ? shade(c, 0.035) : c, { roughness: 0.75 });
      g.add(box(it.sx, it.sy, it.sz, m)); g.add(box(it.sx, 0.06, 0.08, m, 0, -0.06, it.sz / 2));
      g.rotation.x = it.rx || 0;
      break;
    }
    case 'faitage': { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, it.sx, 6), mat(c)); b.rotation.z = Math.PI / 2; g.add(b); break; }
    case 'toit-plat': g.add(box(it.sx * 0.995, it.sy, it.sz * 0.995, mat(c, { roughness: 1 }))); break;
    case 'acrotere': g.add(box(it.sx * 0.99, it.sy, it.sz, mat(c))); g.add(box(it.sx * 0.99, 0.06, it.sz + 0.08, mat(shade(c, -0.1)), 0, it.sy / 2, 0)); break;
    case 'merlon': g.add(box(it.sx, it.sy, it.sz, mat(c))); break;
    // ---------- Menuiseries ----------
    case 'fenetre': case 'porte': case 'baie': case 'porte-garage': case 'porte-grange': {
      const frame = mat(it.kind === 'porte-grange' ? DARKWOOD : WHITE), fw = it.sx, fh = it.sy, t = 0.08, front = it.sz / 2;
      if (it.kind === 'porte') {
        g.add(box(fw * 0.86, fh * 0.94, 0.08, mat(0x7A4A2B), 0, -fh * 0.03, front - 0.02));
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0xE8C14A, { metalness: 0.6, roughness: 0.3 })); knob.position.set(fw * 0.3, -fh * 0.05, front + 0.04); g.add(knob);
        for (const y of [0.25, -0.2]) g.add(box(fw * 0.6, fh * 0.28, 0.03, mat(0x6A3E22), 0, y * fh, front + 0.03));
      } else if (it.kind === 'porte-garage') {
        g.add(box(fw * 0.94, fh * 0.94, 0.06, mat(0xDADDE2), 0, -fh * 0.03, front - 0.02));
        for (let k = 1; k < 5; k++) g.add(box(fw * 0.92, 0.03, 0.02, mat(0xA9AEB5), 0, -fh / 2 + k * fh / 5, front + 0.02));
      } else if (it.kind === 'porte-grange') {
        const wd = mat(0x8C5A32);
        for (const s of [-1, 1]) {
          g.add(box(fw * 0.46, fh * 0.95, 0.08, wd, s * fw * 0.24, 0, front - 0.02));
          g.add(beam([s * fw * 0.04, -fh * 0.4, front + 0.04], [s * fw * 0.44, fh * 0.4, front + 0.04], 0.08, mat(DARKWOOD)));
        }
      } else {
        const big = it.kind === 'baie';
        g.add(box(fw * (big ? 0.9 : 0.8), fh * (big ? 0.9 : 0.8), 0.04, glassM(), 0, 0, front - 0.05));
        g.add(box(0.05, fh * 0.85, 0.05, big ? mat(METAL) : frame, 0, 0, front - 0.02));
        if (!big) g.add(box(fw * 1.05, 0.06, 0.18, frame, 0, -fh / 2 - 0.03, front + 0.03));
        if (it.shutter != null) for (const s of [-1, 1]) g.add(box(fw * 0.4, fh * 0.95, 0.04, mat(it.shutter), s * (fw / 2 + fw * 0.2), 0, front + 0.03));
      }
      const fm = it.kind === 'baie' ? mat(METAL) : frame;
      for (const [w, h, x, y] of [[fw, t, 0, fh / 2 - t / 2], [fw, t, 0, -fh / 2 + t / 2], [t, fh, -fw / 2 + t / 2, 0], [t, fh, fw / 2 - t / 2, 0]]) g.add(box(w, h, it.sz, fm, x, y, 0));
      const [ox, oz] = it.out; g.rotation.y = Math.atan2(ox, oz);
      return g;
    }
    // ---------- Finitions ----------
    case 'cheminee': g.add(box(0.6, 1.8, 0.6, mat(c || 0x8C5A44), 0, 0.9, 0)); g.add(box(0.75, 0.12, 0.75, mat(0x5B5B5B), 0, 1.82, 0)); break;
    case 'dallage': g.add(box(it.wide || (it.big ? 1.1 : 0.8), 0.06, it.big ? 0.75 : 0.6, mat(0xCFC6B6))); break;
    case 'massif':
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + rnd(it.x + k) * 0.15, 0), mat(k % 2 ? LEAF : LEAF2)); b.position.set((k - 1) * 0.35, 0.3, (rnd(k + it.z) - 0.5) * 0.3); g.add(b); }
      for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), mat([0xF25C78, 0xFFD23F, 0xFFFFFF][k % 3])); f.position.set((rnd(k * 3 + it.x) - 0.5), 0.55 + rnd(k) * 0.15, (rnd(k * 7 + it.z) - 0.5) * 0.5); g.add(f); }
      break;
    case 'haie': g.add(box(it.len * 0.95, 0.8, 0.55, mat(0x3F7F36), 0, 0.4, 0)); break;
    case 'lavande': for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), mat(k % 2 ? 0x8A6FC0 : 0x9C82D4)); b.position.set((k - 1) * 0.25, 0.22, 0); g.add(b); } break;
    case 'boite': { const s = it.small ? 0.7 : 1; g.add(box(0.08, 0.9 * s, 0.08, mat(WOOD), 0, 0.45 * s, 0)); g.add(box(0.3, 0.25, 0.45 * s, mat(0x2F6FD1), 0, 0.9 * s + 0.1, 0)); g.add(box(0.04, 0.18, 0.06, mat(0xE5383B), 0.17, 0.9 * s + 0.22, -0.1)); break; }
    case 'lampe': g.add(cyl(0.05, 0.07, 2, 8, mat(METAL), 0, 1, 0)); { const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0xFFF2B0, { emissive: 0xFFD36B, emissiveIntensity: 0.9 })); l.position.y = 2.1; g.add(l); } break;
    case 'auvent': {
      const m = mat(0x7A4A2B); const r = box(it.aw, 0.08, 0.9, m, 0, 0, 0); r.rotation.x = 0.35; g.add(r);
      for (const s of [-1, 1]) g.add(beam([s * it.aw * 0.4, -0.45, -0.4], [s * it.aw * 0.4, 0, 0.35], 0.06, mat(DARKWOOD)));
      break;
    }
    case 'cloture': {
      const m = it.iron ? mat(0x22262B) : mat(WHITE);
      for (const s of [-1, 1]) g.add(box(0.1, 1, 0.1, m, s * it.len / 2 * 0.95, 0.5, 0));
      for (const y of [0.35, 0.75]) g.add(box(it.len, 0.07, 0.05, m, 0, y, 0));
      for (let k = 1; k < 5; k++) g.add(box(0.06, 0.9, 0.04, m, -it.len / 2 + k * it.len / 5, 0.45, 0));
      break;
    }
    case 'terrasse': for (let k = 0; k < 4; k++) g.add(box(it.tw, 0.08, it.td / 4 * 0.92, mat(k % 2 ? 0xB98252 : 0xA9744A), 0, 0, -it.td / 2 + (k + 0.5) * it.td / 4)); break;
    case 'buches': for (let k = 0; k < 6; k++) { const b = cyl(0.13, 0.13, 0.9, 7, mat(k % 2 ? 0x8C5A32 : 0x9E6A3D), 0, 0.14 + Math.floor(k / 3) * 0.25, (k % 3 - 1) * 0.27 + (k >= 3 ? 0.13 : 0)); b.rotation.x = Math.PI / 2; b.rotation.z = Math.PI / 2; g.add(b); } break;
    case 'sapin': g.add(cyl(0.15, 0.22, 1, 6, mat(0x7A5230), 0, 0.5, 0)); for (let k = 0; k < 3; k++) { const cn = new THREE.Mesh(new THREE.ConeGeometry(1.1 - k * 0.3, 1.3, 7), mat(0x2F6E3A)); cn.position.y = 1.3 + k * 0.75; g.add(cn); } break;
    case 'arbre-fruit': case 'olivier': {
      const ol = it.kind === 'olivier';
      g.add(cyl(0.13, 0.2, 1.3, 6, mat(ol ? 0x8A7F70 : 0x7A5230), 0, 0.65, 0));
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 - k * 0.1, 0), mat(ol ? 0x8FA383 : 0x4E9A3E)); b.position.set((k - 1) * 0.45, 1.6 + (k % 2) * 0.3, (rnd(k) - 0.5) * 0.4); g.add(b); }
      if (it.fruit) for (let k = 0; k < 6; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), mat(it.fruit)); f.position.set((rnd(k) - 0.5) * 1.6, 1.5 + rnd(k * 2) * 0.6, 0.5 + rnd(k * 5) * 0.2); g.add(f); }
      break;
    }
    case 'palmier': {
      for (let k = 0; k < 6; k++) { const s = cyl(0.17 - k * 0.012, 0.19 - k * 0.012, 0.55, 7, mat(k % 2 ? 0x9C7A55 : 0x8C6B48), k * 0.06, 0.27 + k * 0.53, 0); g.add(s); }
      for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, fr = box(1.6, 0.05, 0.38, mat(k % 2 ? 0x3F8F3A : 0x58A845)); fr.position.set(0.36 + Math.cos(a) * 0.7, 3.25, Math.sin(a) * 0.7); fr.rotation.set(0, -a, -0.35); g.add(fr); }
      break;
    }
    case 'pergola': {
      const wd = mat(WOOD);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.14, 2.3, 0.14, wd, sx * it.pw / 2, 1.15, sz * it.pd / 2));
      for (let k = 0; k < 5; k++) g.add(box(0.1, 0.16, it.pd + 0.4, wd, -it.pw / 2 + k * it.pw / 4, 2.35, 0));
      for (let k = 0; k < 7; k++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), mat(k % 2 ? LEAF : 0x6DB548)); l.position.set((rnd(k) - 0.5) * it.pw, 2.5, (rnd(k * 3) - 0.5) * it.pd); g.add(l); }
      break;
    }
    case 'puits': {
      g.add(cyl(0.65, 0.7, 0.8, 10, mat(0x9C968C), 0, 0.4, 0)); g.add(cyl(0.5, 0.5, 0.05, 10, mat(0x2A5B7A), 0, 0.79, 0));
      for (const s of [-1, 1]) g.add(box(0.1, 1.3, 0.1, mat(DARKWOOD), s * 0.55, 1.4, 0));
      const r1 = box(1.5, 0.06, 0.6, mat(0x8E3B2E), 0, 2.1, 0.25); r1.rotation.x = 0.6; g.add(r1);
      const r2 = box(1.5, 0.06, 0.6, mat(0x8E3B2E), 0, 2.1, -0.25); r2.rotation.x = -0.6; g.add(r2);
      g.add(box(0.2, 0.22, 0.2, mat(WOOD), 0, 1.35, 0));
      break;
    }
    case 'barque': {
      const hull = mat(0x2F6FD1), in_ = mat(0xF2E6CF);
      g.add(box(2.4, 0.35, 0.9, hull, 0, 0.25, 0)); g.add(box(2.2, 0.06, 0.75, in_, 0, 0.4, 0));
      for (const s of [-1, 1]) { const p = box(0.5, 0.35, 0.6, hull, s * 1.3, 0.3, 0); p.rotation.y = Math.PI / 4; g.add(p); }
      const oar = box(2, 0.05, 0.1, mat(WOOD), 0, 0.5, 0.2); oar.rotation.y = 0.3; g.add(oar);
      g.rotation.y = 0.4; return g;
    }
    case 'filet': {
      for (const s of [-1, 1]) g.add(box(0.1, 1.8, 0.1, mat(DARKWOOD), s * 0.9, 0.9, 0));
      g.add(box(1.9, 0.08, 0.08, mat(DARKWOOD), 0, 1.75, 0));
      g.add(box(1.7, 1.3, 0.04, mat(0x6B7B5C, { transparent: true, opacity: 0.7 }), 0, 1.05, 0));
      for (let k = 0; k < 3; k++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), mat(0xF2A900)); fl.position.set(-0.6 + k * 0.6, 0.45, 0.05); g.add(fl); }
      break;
    }
    case 'foin': { const b = cyl(0.5, 0.5, 0.9, 12, mat(0xE2C46A), 0, 0.5, 0); b.rotation.z = Math.PI / 2; g.add(b); break; }
    case 'piscine':
      g.add(box(it.pw + 0.5, 0.12, it.pd + 0.5, mat(0xF1EDE4), 0, 0.06, 0));
      g.add(box(it.pw, 0.13, it.pd, mat(0x3FB6E8, { roughness: 0.1, emissive: 0x0B4F7A, emissiveIntensity: 0.3 }), 0, 0.07, 0));
      break;
    case 'transat': { g.add(box(0.6, 0.12, 1.5, mat(WHITE), 0, 0.3, 0)); const b = box(0.6, 0.1, 0.7, mat(0x2F8F9D), 0, 0.55, -0.6); b.rotation.x = 0.6; g.add(b); for (const s of [-1, 1]) g.add(box(0.06, 0.3, 0.06, mat(METAL), s * 0.25, 0.15, 0.5)); break; }
    case 'balcon': {
      const bd = it.bd || 0.9;
      g.add(box(it.bw, 0.12, bd, mat(0xB9BDC1), 0, 0, 0));
      const n = Math.max(4, Math.round(it.bw * 3));
      for (let k = 0; k <= n; k++) g.add(box(0.05, 0.5, 0.05, mat(METAL), -it.bw / 2 + k * it.bw / n, 0.3, bd / 2 - 0.03));
      g.add(box(it.bw, 0.06, 0.06, mat(METAL), 0, 0.56, bd / 2 - 0.03));
      break;
    }
    case 'bow': {
      g.add(box(it.bw, 1.4, 0.7, mat(WHITE), 0, 0, 0));
      for (const [x, w] of [[0, it.bw * 0.86]]) g.add(box(w, 1.1, 0.04, glassM(), x, 0, 0.36));
      g.add(box(it.bw + 0.2, 0.12, 0.85, mat(0x3E4652), 0, 0.75, 0)); g.add(box(it.bw + 0.1, 0.1, 0.8, mat(WHITE), 0, -0.75, 0));
      break;
    }
    case 'porche': {
      const col = mat(WHITE);
      for (const sx of [-1, 1]) for (const sz of [1]) { g.add(cyl(0.16, 0.18, it.ph, 10, col, sx * (it.pw / 2 - 0.25), it.ph / 2, sz * (it.pd / 2 - 0.25))); }
      for (const sx of [-1, 1]) g.add(cyl(0.16, 0.18, it.ph, 10, col, sx * (it.pw / 2 - 0.9), it.ph / 2, it.pd / 2 - 0.25));
      g.add(box(it.pw, 0.25, it.pd, mat(c), 0, it.ph + 0.12, 0));
      const sh = new THREE.Shape(); sh.moveTo(-it.pw / 2, 0); sh.lineTo(it.pw / 2, 0); sh.lineTo(0, 0.7); sh.closePath();
      const tri = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }), mat(c)); tri.position.set(0, it.ph + 0.25, it.pd / 2 - 0.2); g.add(tri);
      g.add(box(it.pw + 0.2, 0.12, it.pd + 0.2, mat(0xCFC6B6), 0, 0.06, 0));
      break;
    }
    case 'tour': {
      g.add(cyl(it.r, it.r + 0.05, it.th, 12, mat(c), 0, it.th / 2, 0));
      if (it.crenel) { g.add(cyl(it.r + 0.15, it.r + 0.15, 0.3, 12, mat(c), 0, it.th + 0.15, 0)); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.add(box(0.35, 0.4, 0.3, mat(c), Math.cos(a) * (it.r + 0.05), it.th + 0.5, Math.sin(a) * (it.r + 0.05))); } }
      const cone = new THREE.Mesh(new THREE.ConeGeometry(it.r + 0.3, it.r * 2.2, 12), mat(it.roof)); cone.position.y = it.th + (it.crenel ? 0.3 : 0) + it.r * 1.1; g.add(cone);
      for (let k = 0; k < 3; k++) g.add(box(0.3, 0.55, 0.06, glassM(), 0, it.th * (0.3 + k * 0.22), it.r + 0.02));
      break;
    }
    case 'drapeau': g.add(cyl(0.04, 0.04, 2, 6, mat(METAL), 0, 1, 0)); g.add(box(0.8, 0.5, 0.03, mat(c), 0.42, 1.7, 0)); break;
    case 'douves': g.add(box(it.dw, 0.1, it.dd, mat(0x3F8FC8, { roughness: 0.15, emissive: 0x0B3F6A, emissiveIntensity: 0.25 }), 0, 0.03, 0)); break;
    case 'pontlevis': {
      const p = box(1.8, 0.14, 3, mat(0x8C5A32), 0, 0.35, 0); p.rotation.x = -0.12; g.add(p);
      for (let k = 0; k < 5; k++) { const l = box(1.82, 0.02, 0.05, mat(DARKWOOD), 0, 0.43 - k * 0.06 * 0.6, -1.2 + k * 0.6); l.rotation.x = -0.12; g.add(l); }
      for (const s of [-1, 1]) g.add(beam([s * 0.85, 0.5, 1.4], [s * 0.85, 2.6, -1.3], 0.05, mat(METAL)));
      break;
    }
    case 'grille': {
      for (const s of [-1, 1]) { g.add(box(0.5, 2, 0.5, mat(0xD8CFC0), s * (it.gw / 2 + 0.25), 1, 0)); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(0xD8CFC0)); ball.position.set(s * (it.gw / 2 + 0.25), 2.15, 0); g.add(ball); }
      for (let k = 0; k <= 10; k++) g.add(box(0.05, 1.6 + Math.sin(k / 10 * Math.PI) * 0.4, 0.05, mat(0x22262B), -it.gw / 2 + k * it.gw / 10, 0.8 + Math.sin(k / 10 * Math.PI) * 0.2, 0));
      g.add(box(it.gw, 0.06, 0.06, mat(0x22262B), 0, 0.3, 0));
      break;
    }
    case 'panneau': {
      const p = box(1.9, 0.06, 1.1, mat(0x1E3A6E, { roughness: 0.3, metalness: 0.4 }));
      if (it.flat) { p.position.y = 0.35; p.rotation.x = -0.45; g.add(p); g.add(box(0.06, 0.5, 0.06, mat(METAL), 0, 0.15, -0.4)); }
      else { g.add(p); g.rotation.x = it.rx || 0; }
      for (let k = 1; k < 4; k++) { const l = box(0.02, 0.07, 1.1, mat(0xB8C4D6), -0.95 + k * 0.475, 0, 0); l.position.copy(p.position); l.position.x = -0.95 + k * 0.475; l.rotation.copy(p.rotation); g.add(l); }
      break;
    }
    case 'antenne': g.add(cyl(0.04, 0.04, 1.6, 6, mat(METAL), 0, 0.8, 0)); for (let k = 0; k < 3; k++) g.add(box(0.9 - k * 0.2, 0.04, 0.04, mat(METAL), 0, 1.1 + k * 0.22, 0)); { const d = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xE8E8E8)); d.rotation.x = -Math.PI / 2.5; d.position.set(0.8, 0.6, 0); g.add(d); } break;
    case 'veranda': {
      const fr = mat(WHITE), gl = glassT();
      g.add(box(it.vw, 0.15, it.vd, mat(0xCFC6B6), 0, 0.08, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.1, it.vh, 0.1, fr, sx * it.vw / 2, it.vh / 2, sz * it.vd / 2));
      g.add(box(it.vw, 0.1, it.vd, fr, 0, it.vh, 0));
      g.add(box(0.03, it.vh - 0.2, it.vd, gl, -it.vw / 2, it.vh / 2, 0));
      for (const s of [-1, 1]) g.add(box(it.vw, it.vh - 0.2, 0.03, gl, 0, it.vh / 2, s * it.vd / 2));
      g.add(box(it.vw, 0.04, it.vd, gl, 0, it.vh + 0.08, 0));
      for (let k = 1; k < 3; k++) g.add(box(0.06, it.vh, 0.06, fr, -it.vw / 2, it.vh / 2, -it.vd / 2 + k * it.vd / 3));
      { const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), mat(LEAF)); plant.position.set(0, 0.45, 0); g.add(plant); }
      break;
    }
    // ---------- Bâtiments publics ----------
    case 'vitrine': {
      g.add(box(it.vw, it.vh, 0.06, glassM(), 0, 0, 0));
      g.add(box(it.vw + 0.16, 0.12, 0.12, mat(DARKWOOD), 0, -it.vh / 2 - 0.06, 0.02)); g.add(box(it.vw + 0.16, 0.1, 0.1, mat(DARKWOOD), 0, it.vh / 2 + 0.05, 0.02));
      for (const sx of [-1, 0, 1]) g.add(box(0.08, it.vh, 0.1, mat(DARKWOOD), sx * it.vw / 2, 0, 0.02));
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.45, 3, 6), mat(0xD9A44A)); b.rotation.z = Math.PI / 2 - 0.3 + k * 0.3; b.position.set(-0.4 + k * 0.4, -it.vh / 2 + 0.25, -0.08); g.add(b); }
      break;
    }
    case 'store': { // store rayé
      const n = Math.max(4, Math.round(it.aw / 0.5)), sw = it.aw / n;
      for (let k = 0; k < n; k++) { const b = box(sw, 0.06, 1.1, mat(k % 2 ? it.c2 : it.c1), -it.aw / 2 + (k + 0.5) * sw, 0, 0); b.rotation.x = 0.38; g.add(b); }
      for (let k = 0; k < n; k++) g.add(box(sw, 0.22, 0.04, mat(k % 2 ? it.c2 : it.c1), -it.aw / 2 + (k + 0.5) * sw, -0.32, 0.53));
      break;
    }
    case 'enseigne': {
      const eh = it.eh || 0.6, W = it.ew;
      g.add(box(W, eh, 0.1, mat(c), 0, 0, 0)); g.add(box(W + 0.12, eh + 0.12, 0.06, mat(shade(c, -0.18)), 0, 0, -0.03));
      const fg = 0.06;
      if (it.motif === 'pain') {
        for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.55, 3, 8), mat(0xE8B04A)); b.rotation.z = Math.PI / 2; b.position.set(-0.9 + k * 0.9, 0, fg); g.add(b); }
      } else if (it.motif === 'poste') {
        g.add(box(0.9, 0.42, 0.04, mat(0x2F4FA8), -W / 2 + 0.7, 0, fg)); g.add(beam([-W / 2 + 0.3, 0.18, fg + 0.02], [-W / 2 + 0.7, -0.03, fg + 0.02], 0.05, mat(0xFFE27A))); g.add(beam([-W / 2 + 0.7, -0.03, fg + 0.02], [-W / 2 + 1.1, 0.18, fg + 0.02], 0.05, mat(0xFFE27A)));
        for (let k = 0; k < 4; k++) g.add(box(0.32, 0.36, 0.04, mat(0x2F4FA8), -W / 2 + 1.6 + k * 0.45, 0, fg));
      } else {
        const lw = it.motif === 'super' ? 0.5 : 0.35, n = Math.floor((W - 0.6) / (lw + 0.12));
        for (let k = 0; k < n; k++) g.add(box(lw, eh * 0.55, 0.04, mat(WHITE), -W / 2 + 0.3 + lw / 2 + k * (lw + 0.12), 0, fg));
      }
      break;
    }
    case 'table-cafe': {
      g.add(cyl(0.45, 0.45, 0.06, 12, mat(WHITE), 0, 0.75, 0)); g.add(cyl(0.04, 0.04, 0.75, 6, mat(METAL), 0, 0.37, 0));
      for (const a of [0, Math.PI]) { const ch = new THREE.Group(); ch.add(box(0.4, 0.05, 0.4, mat(METAL), 0, 0.45, 0)); ch.add(box(0.4, 0.45, 0.05, mat(METAL), 0, 0.68, -0.2)); ch.position.set(Math.sin(a) * 0.75, 0, Math.cos(a) * 0.75); ch.rotation.y = a + Math.PI; g.add(ch); }
      g.add(cyl(0.03, 0.03, 2.3, 6, mat(WHITE), 0, 1.15, 0));
      const p = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.55, 8), mat(c)); p.position.y = 2.35; g.add(p);
      break;
    }
    case 'boite-poste': {
      g.add(box(0.12, 0.7, 0.12, mat(METAL), 0, 0.35, 0));
      g.add(box(0.6, 0.75, 0.45, mat(0xFFC531), 0, 1.05, 0)); { const t = cyl(0.3, 0.3, 0.45, 12, mat(0xFFC531), 0, 1.42, 0); t.rotation.x = Math.PI / 2; g.add(t); }
      g.add(box(0.36, 0.05, 0.04, mat(METAL), 0, 1.3, 0.24)); g.add(box(0.3, 0.2, 0.02, mat(0x2F4FA8), 0, 0.95, 0.235));
      break;
    }
    case 'vehicule': { // véhicule dans l'axe x : fourgon, voiture, camion de pompiers, ambulance
      const T = it.type, dark = mat(0x23272C), wheel = (x, z, r = 0.32) => { const w = cyl(r, r, 0.24, 12, dark, x, r, z); w.rotation.x = Math.PI / 2; g.add(w); };
      if (T === 'voiture') {
        g.add(box(2.6, 0.55, 1.3, mat(c), 0, 0.55, 0)); g.add(box(1.4, 0.5, 1.15, mat(c), -0.1, 1.07, 0));
        g.add(box(1.25, 0.38, 1.18, glassM(), -0.1, 1.07, 0));
        for (const x of [-0.85, 0.85]) for (const z of [-0.62, 0.62]) wheel(x, z, 0.28);
      } else if (T === 'pompier') {
        g.add(box(4.6, 1.3, 1.7, mat(c), -0.4, 1.05, 0)); g.add(box(1.4, 1.5, 1.7, mat(c), 2.4, 1.15, 0));
        g.add(box(0.06, 0.6, 1.5, glassM(), 3.11, 1.45, 0)); g.add(box(4.4, 0.08, 1.2, mat(0xBFC4C9), -0.5, 1.75, 0));
        for (let k = 0; k < 5; k++) g.add(box(0.06, 0.06, 0.9, mat(0xDADDE0), -2.2 + k * 0.7, 1.95, 0));
        for (const z of [-0.4, 0.4]) g.add(box(3.6, 0.06, 0.06, mat(0xDADDE0), -0.8, 1.95, z));
        g.add(box(0.5, 0.15, 0.3, mat(0x2F6FD1, { emissive: 0x1C4CC0, emissiveIntensity: 0.6 }), 2.4, 1.98, 0));
        g.add(box(4.6, 0.1, 1.72, mat(WHITE), -0.4, 0.75, 0));
        for (const x of [-2, -0.8, 2.2]) for (const z of [-0.8, 0.8]) wheel(x, z, 0.4);
      } else {
        const amb = T === 'ambulance';
        g.add(box(3.2, 1.5, 1.6, mat(c), -0.3, 1.1, 0)); g.add(box(1.1, 1.1, 1.6, mat(c), 1.85, 0.9, 0));
        g.add(box(0.06, 0.5, 1.4, glassM(), 2.41, 1.15, 0));
        if (amb) {
          g.add(box(3.2, 0.25, 1.62, mat(0x2E9E4F), -0.3, 0.95, 0));
          for (const z of [-0.81, 0.81]) { g.add(box(0.6, 0.18, 0.02, mat(0x2E9E4F), -0.4, 1.45, z)); g.add(box(0.18, 0.6, 0.02, mat(0x2E9E4F), -0.4, 1.45, z)); }
          g.add(box(0.5, 0.15, 0.3, mat(0x2F6FD1, { emissive: 0x1C4CC0, emissiveIntensity: 0.6 }), 1.0, 1.92, 0));
        } else for (const z of [-0.81, 0.81]) g.add(box(1.4, 0.35, 0.02, mat(0x2F4FA8), -0.3, 1.2, z));
        for (const x of [-1.2, 1.5]) for (const z of [-0.72, 0.72]) wheel(x, z);
      }
      break;
    }
    case 'horloge': { // petit fronton avec horloge
      const m = mat(c);
      for (const s of [-1, 1]) { const b = box(1.5, 0.3, 0.5, m, s * 0.55, 0.55, 0); b.rotation.z = -s * 0.6; g.add(b); }
      g.add(box(1.9, 0.9, 0.45, m, 0, 0.3, -0.02));
      const face = cyl(0.42, 0.42, 0.06, 20, mat(WHITE), 0, 0.5, 0.25); face.rotation.x = Math.PI / 2; g.add(face);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.05, 6, 20), mat(0x22262B)); ring.position.set(0, 0.5, 0.27); g.add(ring);
      g.add(box(0.05, 0.3, 0.03, mat(0x22262B), 0, 0.62, 0.3)); { const h = box(0.04, 0.22, 0.03, mat(0x22262B), 0.08, 0.46, 0.3); h.rotation.z = -2.1; g.add(h); }
      break;
    }
    case 'cour': {
      g.add(box(it.cw, 0.04, it.cd, mat(0x7E848B, { roughness: 1 })));
      const white = mat(0xF2F2EC), yel = mat(0xFFD23F);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 4, 24), white); ring.rotation.x = Math.PI / 2; ring.position.y = 0.03; g.add(ring);
      g.add(box(0.08, 0.012, it.cd * 0.95, white, 0, 0.025, 0));
      for (let k = 0; k < 6; k++) g.add(box(0.6, 0.012, 0.6, k % 2 ? yel : white, -it.cw / 2 + 2.4 + [0, 0, 0.35, -0.35, 0.35, -0.35][k], 0.025, -it.cd / 2 + 0.6 + [0, 1, 2, 2, 3, 3][k] * 0.75));
      break;
    }
    case 'panier': {
      g.add(cyl(0.07, 0.09, 3, 8, mat(0x3E4248), 0, 1.5, -0.35));
      g.add(box(1.1, 0.75, 0.06, mat(WHITE), 0, 3, -0.3)); g.add(box(0.45, 0.32, 0.07, mat(0xE5383B), 0, 2.88, -0.29));
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 14), mat(0xF2730C)); r.rotation.x = Math.PI / 2; r.position.set(0, 2.72, -0.02); g.add(r);
      break;
    }
    case 'porte-rouge': {
      g.add(box(it.pw, it.ph, 0.08, mat(0xD62828)));
      for (let k = 1; k < 4; k++) g.add(box(it.pw * 0.96, 0.04, 0.1, mat(0xA51E1E), 0, -it.ph / 2 + k * it.ph / 4, 0));
      for (let k = 0; k < 3; k++) g.add(box(it.pw * 0.25, 0.25, 0.1, glassM(), -it.pw * 0.3 + k * it.pw * 0.3, it.ph * 0.3, 0));
      g.add(box(it.pw + 0.2, 0.12, 0.14, mat(WHITE), 0, it.ph / 2 + 0.06, 0));
      break;
    }
    case 'colonnade': { // portique : colonnes, entablement, fronton avec horloge
      const m = mat(c), W = it.cw, Hh = it.ch, n = 4;
      g.add(box(W + 0.6, 0.25, 2, m, 0, 0.12, -0.2));
      for (let k = 0; k < n; k++) { const x = -W / 2 + 0.3 + k * (W - 0.6) / (n - 1); g.add(cyl(0.22, 0.26, Hh - 0.6, 10, mat(WHITE), x, (Hh - 0.6) / 2 + 0.25, 0.3)); g.add(box(0.6, 0.15, 0.6, mat(WHITE), x, Hh - 0.28, 0.3)); }
      g.add(box(W + 0.4, 0.45, 2.1, m, 0, Hh, -0.2));
      for (const s of [-1, 1]) { const b = box(W / 2 + 0.6, 0.2, 2.1, mat(it.roof), s * W / 4, Hh + 0.62, -0.2); b.rotation.z = -s * 0.32; g.add(b); }
      { const tri = new THREE.Shape(); tri.moveTo(-W / 2, 0); tri.lineTo(W / 2, 0); tri.lineTo(0, W * 0.16); tri.lineTo(-W / 2, 0); const tg = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.2, bevelEnabled: false }), m); tg.position.set(0, Hh + 0.22, 0.6); g.add(tg); }
      const face = cyl(0.32, 0.32, 0.05, 18, mat(WHITE), 0, Hh + 0.55, 0.83); face.rotation.x = Math.PI / 2; g.add(face);
      g.add(box(0.04, 0.24, 0.03, mat(0x22262B), 0, Hh + 0.63, 0.87)); { const h = box(0.04, 0.18, 0.03, mat(0x22262B), 0.06, Hh + 0.52, 0.87); h.rotation.z = -2.1; g.add(h); }
      break;
    }
    case 'marches': for (let k = 0; k < 3; k++) g.add(box(it.mw - k * 0.3, 0.15, 0.5, mat(0xD6D2C4), 0, 0.075 + k * 0.15, -k * 0.4)); break;
    case 'mat-drapeau': {
      g.add(cyl(0.05, 0.06, 5.6, 8, mat(0xDADDE0), 0, 2.8, 0)); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(0xE8C24A)).translateY(5.65));
      if (it.flag === 'fr') [0x2F4FA8, WHITE, 0xE5383B].forEach((col, k) => g.add(box(0.4, 0.8, 0.03, mat(col), 0.25 + k * 0.4, 5.1, 0)));
      else { g.add(box(1.2, 0.8, 0.03, mat(0x23409A), 0.65, 5.1, 0)); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.add(box(0.07, 0.07, 0.04, mat(0xFFD23F), 0.65 + Math.cos(a) * 0.24, 5.1 + Math.sin(a) * 0.24, 0)); } }
      break;
    }
    case 'fleche': { // flèche du clocher et croix
      const cn = new THREE.Mesh(new THREE.ConeGeometry(it.r * 1.05, it.h, 8), mat(c)); cn.rotation.y = Math.PI / 8; cn.position.y = it.h / 2; g.add(cn);
      g.add(box(it.r * 2.1, 0.3, it.r * 2.1, mat(0xB8B2A6), 0, 0.1, 0));
      g.add(box(0.1, 1, 0.1, mat(0xE8C24A), 0, it.h + 0.45, 0)); g.add(box(0.55, 0.1, 0.1, mat(0xE8C24A), 0, it.h + 0.65, 0));
      break;
    }
    case 'vitrail': {
      const cols = [0xE5383B, 0x2F6FD1, 0xFFD23F, 0x2E9E4F, 0x7B4FD1], gl = (col) => mat(col, { emissive: col, emissiveIntensity: 0.25, roughness: 0.3 });
      for (let k = 0; k < 6; k++) g.add(box(0.25, 0.42, 0.05, gl(cols[k % 5]), (k % 2 - 0.5) * 0.27, -0.55 + Math.floor(k / 2) * 0.45, 0));
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 12, 1, false, 0, Math.PI), gl(0x2F6FD1)); top.rotation.set(Math.PI / 2, 0, -Math.PI / 2); top.position.set(0, 0.36, 0); g.add(top);
      g.add(box(0.7, 0.1, 0.1, mat(0xD6D2C4), 0, -0.82, 0.02));
      break;
    }
    case 'rosace': {
      const cols = [0xE5383B, 0x2F6FD1, 0xFFD23F, 0x2E9E4F, 0x7B4FD1, 0xF2730C];
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 6, 24), mat(0xD6D2C4)); g.add(ring);
      for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 6, 1, false, k * Math.PI / 3, Math.PI / 3), mat(cols[k], { emissive: cols[k], emissiveIntensity: 0.25 })); s.rotation.x = Math.PI / 2; g.add(s); }
      { const m2 = cyl(0.22, 0.22, 0.07, 12, mat(0xFFD23F, { emissive: 0xFFD23F, emissiveIntensity: 0.3 }), 0, 0, 0.01); m2.rotation.x = Math.PI / 2; g.add(m2); }
      break;
    }
    case 'if': g.add(cyl(0.12, 0.15, 0.5, 6, mat(0x7A5230), 0, 0.25, 0)); { const cn = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 8), mat(0x2F5E3A)); cn.position.y = 1.7; g.add(cn); } break;
    case 'quai': { // quai couvert : dalle, poteaux, marquise
      g.add(box(it.qw, 0.5, it.qd, mat(0xBDB6A8), 0, 0.25, 0)); g.add(box(it.qw, 0.04, 0.25, mat(0xFFD23F), 0, 0.52, it.qd / 2 - 0.2));
      const n = Math.max(3, Math.round(it.qw / 3.5));
      for (let k = 0; k < n; k++) g.add(cyl(0.08, 0.08, 2.8, 8, mat(0x2F6E52), -it.qw / 2 + 1 + k * (it.qw - 2) / (n - 1), 1.9, 0));
      { const r = box(it.qw + 0.4, 0.1, it.qd + 0.4, mat(0x2F6E52), 0, 3.35, 0.1); r.rotation.x = -0.08; g.add(r); }
      { const r = box(it.qw + 0.2, 0.06, it.qd * 0.6, glassT(), 0, 3.42, 0.2); r.rotation.x = -0.08; g.add(r); }
      break;
    }
    case 'rails': {
      g.add(box(it.rw, 0.2, 2.6, mat(0x8A847A, { roughness: 1 }), 0, 0.1, 0));
      for (let k = 0; k < Math.floor(it.rw / 0.8); k++) g.add(box(0.25, 0.08, 2, mat(0x6E4A2C), -it.rw / 2 + 0.4 + k * 0.8, 0.24, 0));
      for (const z of [-0.72, 0.72]) g.add(box(it.rw, 0.12, 0.1, mat(0x9EA4AA, { metalness: 0.4 }), 0, 0.33, z));
      break;
    }
    case 'train': { // locomotive et deux voitures, dans l'axe x
      const car = (x, col, loco) => {
        g.add(box(loco ? 3.6 : 4.2, 1.9, 1.9, mat(col), x, 1.35, 0)); g.add(box(loco ? 3.6 : 4.2, 0.18, 2, mat(0x5B6168), x, 2.36, 0));
        g.add(box(loco ? 3.6 : 4.2, 0.18, 1.94, mat(WHITE), x, 1.1, 0));
        if (!loco) for (let k = 0; k < 4; k++) for (const z of [-0.96, 0.96]) g.add(box(0.7, 0.55, 0.04, glassM(), x - 1.5 + k * 1, 1.7, z));
        else { for (const z of [-0.96, 0.96]) g.add(box(0.9, 0.6, 0.04, glassM(), x + 1, 1.75, z)); g.add(box(0.06, 0.6, 1.4, glassM(), x + 1.82, 1.75, 0)); }
        for (const dx of [-1.3, 1.3]) for (const z of [-0.75, 0.75]) { const w = cyl(0.32, 0.32, 0.15, 12, mat(0x23272C), x + dx, 0.32, z); w.rotation.x = Math.PI / 2; g.add(w); }
      };
      car(4.6, 0xE5383B, true); car(0.2, 0x2F6FD1); car(-4.3, 0x2F6FD1);
      break;
    }
    case 'banc': g.add(box(1.4, 0.08, 0.45, mat(WOOD), 0, 0, 0)); g.add(box(1.4, 0.35, 0.06, mat(WOOD), 0, 0.22, -0.2)); for (const s of [-1, 1]) g.add(box(0.06, 0.45, 0.4, mat(METAL), s * 0.6, -0.2, 0)); break;
    case 'parking': {
      g.add(box(it.pw, 0.04, it.pd, mat(0x4B4F55, { roughness: 1 })));
      const white = mat(0xF2F2EC), n = Math.floor(it.pw / 2.6);
      for (let k = 0; k <= n; k++) g.add(box(0.08, 0.012, 2.4, white, -it.pw / 2 + 0.2 + k * (it.pw - 0.4) / n, 0.025, -it.pd / 2 + 1.5));
      for (let k = 0; k <= n; k++) g.add(box(0.08, 0.012, 2.4, white, -it.pw / 2 + 0.2 + k * (it.pw - 0.4) / n, 0.025, it.pd / 2 - 1.5));
      break;
    }
    case 'chariots': for (let k = 0; k < 4; k++) {
      const x = k * 0.32, m2 = mat(0xB8BEC4, { metalness: 0.3 });
      g.add(box(0.5, 0.42, 0.04, m2, x, 0.75, -0.35)); g.add(box(0.5, 0.42, 0.04, m2, x, 0.75, 0.3)); g.add(box(0.04, 0.42, 0.65, m2, x - 0.25, 0.75, 0)); g.add(box(0.04, 0.42, 0.65, m2, x + 0.25, 0.75, 0));
      g.add(box(0.5, 0.05, 0.08, mat(0xE5383B), x, 1.05, 0.42)); for (const z of [-0.3, 0.3]) g.add(cyl(0.06, 0.06, 0.05, 8, mat(0x23272C), x, 0.06, z).rotateZ(Math.PI / 2));
      g.add(box(0.04, 0.5, 0.04, m2, x, 0.3, 0));
    } break;
    case 'croix-verte': {
      const gr = mat(0x2E9E4F, { emissive: 0x1E8A3F, emissiveIntensity: 0.6 });
      g.add(box(1.6, 1.6, 0.12, mat(WHITE), 0, 0, -0.04)); g.add(box(1.2, 0.4, 0.12, gr)); g.add(box(0.4, 1.2, 0.12, gr));
      for (const s of [-1, 1]) g.add(box(0.08, 1.4, 0.08, mat(METAL), s * 0.6, -1.4, -0.1));
      break;
    }
    case 'helipad': {
      g.add(cyl(it.r, it.r, 0.05, 24, mat(0x4B4F55))); { const r = new THREE.Mesh(new THREE.TorusGeometry(it.r * 0.82, 0.06, 4, 28), mat(0xFFD23F)); r.rotation.x = Math.PI / 2; r.position.y = 0.04; g.add(r); }
      const wm = mat(WHITE); g.add(box(0.18, 0.02, 1.4, wm, -0.45, 0.04, 0)); g.add(box(0.18, 0.02, 1.4, wm, 0.45, 0.04, 0)); g.add(box(0.75, 0.02, 0.18, wm, 0, 0.04, 0));
      break;
    }
    case 'shed': { // toit en dents de scie : pan incliné et verrière verticale (côté verrière vers -z avant rotation)
      const hh = 1.5, sl = Math.hypot(it.sd, hh), a = Math.atan2(hh, it.sd);
      const p = box(it.sw, 0.12, sl, mat(0x5B6168), 0, hh / 2, 0); p.rotation.x = a; g.add(p);
      g.add(box(it.sw, hh, 0.06, glassM(), 0, hh / 2, -it.sd / 2));
      for (let k = 1; k < Math.floor(it.sw / 1.5); k++) g.add(box(0.08, hh, 0.1, mat(0x3E4248), -it.sw / 2 + k * 1.5, hh / 2, -it.sd / 2));
      for (const s of [-1, 1]) { const tri = new THREE.Shape(); tri.moveTo(-it.sd / 2, 0); tri.lineTo(it.sd / 2, 0); tri.lineTo(-it.sd / 2, hh); const tg = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.1, bevelEnabled: false }), mat(0x8E9196)); tg.rotation.y = -Math.PI / 2; tg.position.set(s * it.sw / 2 + (s > 0 ? 0.1 : 0), 0, 0); g.add(tg); }
      break;
    }
    case 'cheminee-usine': {
      g.add(cyl(0.55, 0.85, it.h, 12, mat(0xA0452B), 0, it.h / 2, 0));
      for (let k = 1; k < 4; k++) g.add(cyl(0.6 + 0.06 * (4 - k), 0.6 + 0.06 * (4 - k), 0.18, 12, mat(0xE8E2D6), 0, it.h * k / 4 + 0.6, 0));
      g.add(cyl(0.7, 0.62, 0.35, 12, mat(0x3E4248), 0, it.h, 0));
      for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + k * 0.22, 0), mat(0xDADDE0, { transparent: true, opacity: 0.85 - k * 0.15 })); p.position.set(0.3 + k * 0.45, it.h + 0.7 + k * 0.6, -k * 0.2); g.add(p); }
      break;
    }
    case 'citerne': {
      for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) g.add(box(0.12, 2.4, 0.12, mat(METAL), x, 1.2, z));
      g.add(cyl(1.25, 1.25, 2, 14, mat(0xDADDE0, { metalness: 0.3 }), 0, 3.4, 0)); { const d = new THREE.Mesh(new THREE.SphereGeometry(1.25, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xDADDE0, { metalness: 0.3 })); d.position.y = 4.4; d.scale.y = 0.4; g.add(d); }
      g.add(box(2.6, 0.3, 0.04, mat(0x2F6FD1), 0, 3.4, 1.26));
      break;
    }
    case 'palette-stock': for (let k = 0; k < it.n; k++) { g.add(box(1.1, 0.14, 1.1, mat(WOOD), 0, 0.07 + k * 0.62, 0)); g.add(box(0.95, 0.45, 0.95, mat(k % 2 ? 0xC8A06A : 0xB48C58), 0, 0.37 + k * 0.62, 0)); } break;
    case 'lucarne': {
      const wm = mat(c);
      g.add(box(1.0, 1.0, 1.3, wm, 0, 0.35, -0.3));
      g.add(box(0.6, 0.6, 0.04, glassM(), 0, 0.4, 0.37)); g.add(box(0.75, 0.08, 0.06, mat(WHITE), 0, 0.08, 0.38));
      for (const s of [-1, 1]) { const r = box(0.8, 0.08, 1.5, mat(it.roof), s * 0.3, 1.02, -0.25); r.rotation.z = -s * 0.75; g.add(r); }
      break;
    }
    case 'colombage': {
      const wd = mat(0x4A2E1C), W = it.cw, Hh = it.ch, n = Math.max(2, Math.round(W / 1.3));
      g.add(box(W + 0.1, 0.12, 0.06, wd, 0, 0.06, 0)); g.add(box(W + 0.1, 0.12, 0.06, wd, 0, Hh - 0.06, 0));
      for (let k = 0; k <= n; k++) g.add(box(0.12, Hh, 0.06, wd, -W / 2 + k * W / n, Hh / 2, 0));
      for (let k = 0; k < n; k += 2) g.add(beam([-W / 2 + k * W / n, 0.1, 0], [-W / 2 + (k + 1) * W / n, Hh - 0.1, 0], 0.1, wd));
      g.rotation.y = it.ry; return g;
    }
  }
  if (it.rx && it.kind !== 'panneau' && it.kind !== 'tuile') g.rotation.x = it.rx;
  g.rotation.y = it.ry || 0;
  return g;
}
