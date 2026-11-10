// Scène 3D de Brick'it Up : terrain, maison qui se construit, camion de livraison, palette, ouvriers.
import * as THREE from 'three';

const rnd = (a) => { const x = Math.sin(a * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------- Matériaux partagés ----------
const M = {};
function mat(key, color, opt = {}) {
  if (!M[key]) M[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opt });
  return M[key];
}
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const shade = (hex, k) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return c; };
function shadows(o, cast = true, receive = true) { o.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = receive; } }); return o; }

// ---------- Fabrication d'un élément de la maison ----------
export function makeItem(it, house) {
  const g = new THREE.Group();
  switch (it.kind) {
    case 'parpaing': {
      g.add(box(it.sx, it.sy, it.sz, mat('parpaing', 0x9AA0A6)));
      for (const s of [-1, 1]) { const h = box(it.sx * 0.28, 0.02, it.sz * 0.45, mat('trou', 0x4A4F55)); h.position.set(s * it.sx * 0.22, it.sy / 2 + 0.001, 0); g.add(h); }
      break;
    }
    case 'dalle': g.add(box(it.sx, it.sy, it.sz, mat('dalle', 0xB9BDC1))); break;
    case 'brique': {
      const key = `brique-${house.wall}-${it.tint}`;
      if (!M[key]) M[key] = new THREE.MeshStandardMaterial({ color: shade(house.wall, [-0.03, 0, 0.03][it.tint]), roughness: 0.9, flatShading: true });
      g.add(box(it.sx, it.sy, it.sz, M[key]));
      break;
    }
    case 'pignon': {
      const sh = new THREE.Shape(); sh.moveTo(-it.half, 0); sh.lineTo(it.half, 0); sh.lineTo(0, it.rise); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: it.sz, bevelEnabled: false }); geo.translate(0, 0, -it.sz / 2);
      const m = new THREE.Mesh(geo, mat(`pignon-${house.wall}`, shade(house.wall, -0.02))); m.rotation.y = Math.PI / 2; g.add(m);
      break;
    }
    case 'ferme': {
      const wood = mat('bois', 0xA4703F), len = Math.hypot(it.half, it.rise);
      for (const s of [1, -1]) {
        const b = box(0.14, 0.16, len, wood);
        b.position.set(0, -it.drop + it.rise / 2, s * it.half / 2);
        b.rotation.x = s * Math.atan2(it.rise, it.half); g.add(b);
      }
      const tie = box(0.12, 0.14, it.half * 1.6, wood); tie.position.y = 0.05; g.add(tie);
      const king = box(0.1, it.rise * 0.8, 0.1, wood); king.position.y = it.rise * 0.4 - it.drop * 0.5; g.add(king);
      break;
    }
    case 'tuile': {
      const key = `tuile-${house.roof}-${it.row % 2}`;
      if (!M[key]) M[key] = new THREE.MeshStandardMaterial({ color: shade(house.roof, it.row % 2 ? 0.035 : 0), roughness: 0.75, flatShading: true });
      const t = box(it.sx, it.sy, it.sz, M[key]); g.add(t);
      const lip = box(it.sx, 0.06, 0.08, M[key]); lip.position.set(0, -0.06, it.sz / 2 * Math.sign(it.rx || 1)); g.add(lip);
      g.rotation.x = it.rx;
      break;
    }
    case 'fenetre': case 'porte': {
      const frame = mat('cadre', 0xF7F7F2), fw = it.sx, fh = it.sy, t = 0.08;
      const inner = new THREE.Group(); g.add(inner);
      if (it.kind === 'porte') {
        const door = box(fw * 0.86, fh * 0.94, 0.08, mat('porte', 0x7A4A2B)); door.position.set(0, -fh * 0.03, it.sz / 2 - 0.02); inner.add(door);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat('poignee', 0xE8C14A, { metalness: 0.6, roughness: 0.3 })); knob.position.set(fw * 0.3, -fh * 0.05, it.sz / 2 + 0.04); inner.add(knob);
        for (const y of [0.25, -0.2]) { const p = box(fw * 0.6, fh * 0.28, 0.03, mat('porte2', 0x6A3E22)); p.position.set(0, y * fh, it.sz / 2 + 0.03); inner.add(p); }
      } else {
        const glass = box(fw * 0.8, fh * 0.8, 0.04, mat('vitre', 0x8FD3F4, { roughness: 0.15, metalness: 0.1, emissive: 0x1C4C6A, emissiveIntensity: 0.25 })); glass.position.z = it.sz / 2 - 0.05; inner.add(glass);
        const bar = box(0.05, fh * 0.8, 0.05, frame); bar.position.z = it.sz / 2 - 0.02; inner.add(bar);
        const sill = box(fw * 1.05, 0.06, 0.18, frame); sill.position.set(0, -fh / 2 - 0.03, it.sz / 2 + 0.03); inner.add(sill);
        for (const s of [-1, 1]) { const sh = box(fw * 0.4, fh * 0.95, 0.04, mat(`volet-${house.roof}`, shade(house.roof, 0.12))); sh.position.set(s * (fw / 2 + fw * 0.2), 0, it.sz / 2 + 0.03); inner.add(sh); }
      }
      for (const [w, h, x, y] of [[fw, t, 0, fh / 2 - t / 2], [fw, t, 0, -fh / 2 + t / 2], [t, fh, -fw / 2 + t / 2, 0], [t, fh, fw / 2 - t / 2, 0]]) {
        const b = box(w, h, it.sz, frame); b.position.set(x, y, 0); inner.add(b);
      }
      // L'élément est orienté vers l'extérieur du mur
      const [ox, oz] = it.out; g.rotation.y = Math.atan2(ox, oz);
      return g;
    }
    case 'cheminee': {
      const b = box(0.6, 1.6, 0.6, mat('chem', 0x8C5A44)); b.position.y = 0.8; g.add(b);
      const cap = box(0.75, 0.12, 0.75, mat('chemcap', 0x5B5B5B)); cap.position.y = 1.62; g.add(cap);
      return g;
    }
    case 'dallage': { const s = box(0.8, 0.06, 0.6, mat('dallage', 0xCFC6B6)); g.add(s); return g; }
    case 'massif': {
      const leaf = mat('feuille', 0x4E9A3E), leaf2 = mat('feuille2', 0x62B04B);
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + rnd(it.x + k) * 0.15, 0), k % 2 ? leaf : leaf2); b.position.set((k - 1) * 0.35, 0.3, (rnd(k + it.z) - 0.5) * 0.3); g.add(b); }
      for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), mat(`fleur${k % 3}`, [0xF25C78, 0xFFD23F, 0xFFFFFF][k % 3])); f.position.set((rnd(k * 3 + it.x) - 0.5) * 1, 0.55 + rnd(k) * 0.15, (rnd(k * 7 + it.z) - 0.5) * 0.5); g.add(f); }
      return g;
    }
    case 'boite': {
      const p = box(0.08, 0.9, 0.08, mat('bois', 0xA4703F)); p.position.y = 0.45; g.add(p);
      const b = box(0.3, 0.25, 0.45, mat('boite', 0x2F6FD1)); b.position.y = 1; g.add(b);
      const f = box(0.04, 0.18, 0.06, mat('drapeau', 0xE5383B)); f.position.set(0.17, 1.12, -0.1); g.add(f);
      return g;
    }
    case 'lampe': {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2, 8), mat('metal', 0x2E3338)); p.position.y = 1; g.add(p);
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat('ampoule', 0xFFF2B0, { emissive: 0xFFD36B, emissiveIntensity: 0.9 })); l.position.y = 2.1; g.add(l);
      return g;
    }
    case 'piscine': {
      const rim = box(it.pw + 0.5, 0.12, it.pd + 0.5, mat('margelle', 0xF1EDE4)); rim.position.y = 0.06; g.add(rim);
      const w = box(it.pw, 0.13, it.pd, mat('eau', 0x3FB6E8, { roughness: 0.1, emissive: 0x0B4F7A, emissiveIntensity: 0.3 })); w.position.y = 0.07; g.add(w);
      return g;
    }
    case 'tour': {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, it.th, 10), mat(`tour-${house.wall}`, shade(house.wall, -0.04))); t.position.y = it.th / 2; g.add(t);
      const c = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.6, 10), mat(`toit-${house.roof}`, house.roof)); c.position.y = it.th + 0.8; g.add(c);
      return g;
    }
    case 'balcon': {
      const s = box(it.bw, 0.12, 0.9, mat('dalle', 0xB9BDC1)); g.add(s);
      for (let k = 0; k <= 6; k++) { const b = box(0.05, 0.5, 0.05, mat('metal', 0x2E3338)); b.position.set(-it.bw / 2 + k * it.bw / 6, 0.3, 0.42); g.add(b); }
      const r = box(it.bw, 0.06, 0.06, mat('metal', 0x2E3338)); r.position.set(0, 0.56, 0.42); g.add(r);
      return g;
    }
  }
  g.rotation.y = it.ry || 0;
  return g;
}

// ---------- Décor fixe ----------
function tree(x, z, s) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.22 * s, 1.2 * s, 6), mat('tronc', 0x7A5230)); trunk.position.y = 0.6 * s; g.add(trunk);
  const leaf = mat(rnd(x * z) > 0.5 ? 'arbre' : 'arbre2', rnd(x * z) > 0.5 ? 0x3F8F3A : 0x58A845);
  for (let k = 0; k < 2; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.2 - k * 0.35) * s, 1.6 * s, 7), leaf); c.position.y = (1.6 + k * 0.9) * s; g.add(c); }
  g.position.set(x, 0, z); return shadows(g, true, false);
}

// Camion de livraison : plus grand et plus chargé à chaque palier de l'amélioration « Camion »
export function makeTruck(tier) {
  const g = new THREE.Group(), k = 1 + 0.12 * tier;
  const colors = [0xF2A900, 0xE5383B, 0x2F6FD1, 0x2BA84A, 0x7B4FD1, 0x14171C];
  const cab = box(1.4, 1.3, 1.6, mat(`cab${tier}`, colors[Math.min(tier, 5)])); cab.position.set(1.6 * k, 0.95, 0); g.add(cab);
  const win = box(0.05, 0.5, 1.3, mat('vitre', 0x8FD3F4)); win.position.set(1.6 * k + 0.71, 1.25, 0); g.add(win);
  const bed = box(2.6 * k, 0.25, 1.7, mat('plateau', 0x5A5F66)); bed.position.set(-0.4 * k, 0.55, 0); g.add(bed);
  const chassis = box(4 * k, 0.25, 1.2, mat('chassis', 0x2A2D31)); chassis.position.set(0.1, 0.35, 0); g.add(chassis);
  for (const x of [1.6 * k, -0.6 * k, ...(tier >= 3 ? [-1.4 * k] : [])]) for (const z of [-0.8, 0.8]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12), mat('pneu', 0x1E1F22)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.36, z); g.add(w);
  }
  // Chargement : palettes de parpaings, de plus en plus nombreuses
  const n = 1 + tier;
  for (let i = 0; i < n; i++) {
    const p = box(0.7, 0.45, 0.7, mat('parpaing', 0x9AA0A6)); p.position.set(-0.4 * k + (i - (n - 1) / 2) * 0.75 * Math.min(1, 3 / n) * k, 0.9, (i % 2 ? 0.3 : -0.3) * (n > 3 ? 1 : 0)); g.add(p);
  }
  if (tier >= 5) { const gyro = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8), mat('gyro', 0xFF8A00, { emissive: 0xFF6A00, emissiveIntensity: 1 })); gyro.position.set(1.6 * k, 1.7, 0); g.add(gyro); }
  return shadows(g);
}

function makeWorker(i) {
  const g = new THREE.Group();
  const vest = mat('gilet', 0xFF8A1F), skin = mat(`peau${i % 3}`, [0xF1C7A3, 0xC68E62, 0x8D5A3B][i % 3]);
  const legs = box(0.32, 0.45, 0.2, mat('jean', 0x2F4C7A)); legs.position.y = 0.23; g.add(legs);
  const body = box(0.4, 0.45, 0.26, vest); body.position.y = 0.68; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), skin); head.position.y = 1.05; g.add(head);
  const hat = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('casque', 0xFFD23F)); hat.position.y = 1.1; g.add(hat);
  const arm = box(0.1, 0.4, 0.1, vest); arm.position.set(0.26, 0.7, 0); g.add(arm); g.userData.arm = arm;
  return shadows(g);
}

// ---------- Scène ----------
export class Site {
  constructor(canvas) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8FCFF5);
    this.scene.fog = new THREE.Fog(0x8FCFF5, 45, 110);
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 300);
    this.scene.add(new THREE.HemisphereLight(0xDDEEFF, 0x6B8E4E, 1.1));
    const sun = this.sun = new THREE.DirectionalLight(0xFFF1D6, 2.2);
    sun.position.set(14, 22, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 });
    this.scene.add(sun, sun.target);

    // Herbe, route et arbres
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), mat('herbe', 0x7CC35A)); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; this.scene.add(grass);
    this.road = new THREE.Mesh(new THREE.PlaneGeometry(300, 4.2), mat('route', 0x4B4F55)); this.road.rotation.x = -Math.PI / 2; this.road.receiveShadow = true; this.scene.add(this.road);
    this.decor = new THREE.Group(); this.scene.add(this.decor);
    this.plotMesh = null; this.houseGroup = new THREE.Group(); this.scene.add(this.houseGroup);
    this.falling = []; this.dust = []; this.meshes = [];
    this.truck = null; this.truckTier = -1; this.truckAnim = null;
    this.workers = []; this.workerGroup = new THREE.Group(); this.scene.add(this.workerGroup);
    this.pallet = new THREE.Group(); this.scene.add(this.pallet);
    this.ghost = null;
    this.orbit = 0; this.orbitTarget = 0; this.drag = null; this.time = 0;
    this.setupDrag(canvas);
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
    // Le chantier est affiché dans le haut de l'écran : le bas est occupé par le bouton de pose et les cartes
    this.camera.setViewOffset(w, h, 0, h * 0.13, w, h); this.camera.updateProjectionMatrix();
  }

  // Glisser horizontalement pour tourner autour du chantier
  setupDrag(canvas) {
    canvas.addEventListener('pointerdown', e => { this.drag = { x: e.clientX, o: this.orbitTarget }; });
    addEventListener('pointermove', e => { if (this.drag) this.orbitTarget = this.drag.o - (e.clientX - this.drag.x) * 0.008; });
    addEventListener('pointerup', () => { this.drag = null; });
  }

  // Prépare le chantier d'une nouvelle maison (et repose les éléments déjà posés)
  setHouse(game) {
    const { plan, house } = game;
    this.plan = plan; this.house = house; this.items = plan.items;
    for (const m of this.meshes) this.houseGroup.remove(m);
    this.meshes = []; this.falling = [];
    if (this.plotMesh) this.scene.remove(this.plotMesh);
    const P = plan.plot;
    this.plotMesh = new THREE.Mesh(new THREE.BoxGeometry(P, 0.06, P * 0.85), mat('terre', 0xB08A5B)); this.plotMesh.position.set(0, 0.01, 0.6); this.plotMesh.receiveShadow = true; this.scene.add(this.plotMesh);
    // Route derrière la maison : on voit le camion arriver au-dessus du chantier
    this.roadZ = 0.6 - P * 0.425 - 2.4; this.road.position.set(0, 0.02, this.roadZ);
    // Arbres autour du terrain (déterministes)
    this.decor.clear();
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rnd(i) * 0.2, r = P * 0.75 + 4 + rnd(i * 3) * 10;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(z - this.roadZ) < 3.5 || (z > 0 && Math.abs(x) < P * 0.6)) continue;
      this.decor.add(tree(x, z, 0.8 + rnd(i * 7) * 0.6));
    }
    for (let i = 0; i < game.s.placed; i++) this.addItem(i, false);
    this.palletPos = new THREE.Vector3(-plan.w / 2 - 2.4, 0, -plan.d / 2 - 1.2);
    this.pallet.position.copy(this.palletPos);
    this.camDist = 12 + Math.max(plan.w, plan.d) * 1.45 + plan.wallTop * 0.9;
    this.sun.shadow.camera.left = this.sun.shadow.camera.bottom = -P * 0.8; this.sun.shadow.camera.right = this.sun.shadow.camera.top = P * 0.8; this.sun.shadow.camera.updateProjectionMatrix();
    this.updateGhost(game);
  }

  addItem(index, animate) {
    const it = this.items[index], m = shadows(makeItem(it, this.house));
    m.position.set(it.x, it.y, it.z);
    this.houseGroup.add(m); this.meshes[index] = m;
    if (animate) { m.position.y = it.y + 4.5; this.falling.push({ m, y: it.y, t: 0, it }); }
    return m;
  }

  // Contour transparent de l'élément suivant, pour voir où il va se poser
  updateGhost(game) {
    if (this.ghost) { this.houseGroup.remove(this.ghost); this.ghost = null; }
    if (game.done) return;
    const it = this.items[game.s.placed], g = makeItem(it, this.house);
    const gm = mat('fantome', 0x6FD3FF, { transparent: true, opacity: 0.35, depthWrite: false, emissive: 0x2E9BD6, emissiveIntensity: 0.6 });
    g.traverse(c => { if (c.isMesh) c.material = gm; });
    g.position.set(it.x, it.y, it.z); g.scale.multiplyScalar(1.02);
    this.ghost = g; this.houseGroup.add(g);
  }

  puff(x, y, z, n = 6, color = 0xE8DDCB) {
    const m = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.8, flatShading: true, depthWrite: false });
    for (let i = 0; i < n; i++) {
      const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + Math.random() * 0.12, 0), m);
      const a = Math.random() * Math.PI * 2; p.position.set(x, y, z);
      p.userData.v = new THREE.Vector3(Math.cos(a) * 1.5, 0.6 + Math.random(), Math.sin(a) * 1.5);
      this.scene.add(p); this.dust.push({ p, t: 0, m });
    }
  }

  // Ouvriers visibles autour du chantier (8 au maximum)
  setWorkers(n) {
    const want = Math.min(8, n);
    while (this.workers.length < want) {
      const i = this.workers.length, w = makeWorker(i), P = this.plan.plot;
      const a = Math.PI * 0.08 + i * 0.75, r = Math.max(this.plan.w, this.plan.d) * 0.5 + 1.3;
      w.position.set(Math.cos(a) * r * 1.1, 0, Math.sin(a) * r * 0.75 + 0.6); w.lookAt(0, 0, 0);
      w.userData.hop = 0; this.workerGroup.add(w); this.workers.push(w);
    }
    while (this.workers.length > want) this.workerGroup.remove(this.workers.pop());
  }
  workerHop() { if (this.workers.length) { const w = this.workers[Math.floor(Math.random() * this.workers.length)]; w.userData.hop = 1; } }

  // Palette près de la route : montre le stock en attente
  setStock(n, cap) {
    this.pallet.clear();
    const base = box(1.5, 0.15, 1.2, mat('palette', 0xC8A06A)); base.position.y = 0.08; this.pallet.add(shadows(base));
    const shown = Math.min(n, 18);
    for (let i = 0; i < shown; i++) {
      const b = box(0.42, 0.22, 0.32, mat('parpaing', 0x9AA0A6));
      b.position.set(-0.5 + (i % 3) * 0.5, 0.28 + Math.floor(i / 9) * 0.24, -0.38 + (Math.floor(i / 3) % 3) * 0.38); this.pallet.add(shadows(b));
    }
  }

  setTruck(tier) {
    if (tier === this.truckTier) return;
    const pos = this.truck ? this.truck.position.clone() : null;
    if (this.truck) this.scene.remove(this.truck);
    this.truck = makeTruck(tier); this.truckTier = tier; this.scene.add(this.truck);
    this.truck.position.copy(pos || new THREE.Vector3(-60, 0, 0));
    this.truck.position.z = this.roadZ ?? 10;
  }
  // Livraison : le camion arrive, s'arrête devant la palette et repart (ou reste garé si les livraisons s'enchaînent)
  // Entre deux livraisons, le camion avance sur la route au rythme du minuteur : on le voit approcher
  // (et chaque tape sur l'écran le fait avancer d'un coup). À la livraison, il marque l'arrêt puis repart.
  deliver(interval) {
    if (!this.truck || interval < 2.5) return;
    this.truckAnim = { t: 0 };
  }
  // Tape sur l'écran : petit coup d'accélérateur (fumée à l'échappement, le camion se cabre)
  rushTruck() {
    if (!this.truck) return;
    const p = this.truck.position; this.puff(p.x + 2.2, 0.5, p.z + 0.5, 3, 0x9AA0A6);
    this.truckKick = 1;
  }

  update(dt, game) {
    this.time += dt;
    // Éléments qui tombent à leur place, avec un petit rebond et de la poussière
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i]; f.t += dt;
      const k = Math.min(1, f.t / 0.32);
      f.m.position.y = f.y + 4.5 * (1 - k * k);
      if (k >= 1) {
        const b = Math.max(0, 0.16 - (f.t - 0.32) * 0.8);
        f.m.scale.set(1 + b * 0.5, 1 - b, 1 + b * 0.5);
        if (!f.landed) { f.landed = true; this.puff(f.it.x, f.y - 0.1, f.it.z, 5); }
        if (f.t > 0.55) { f.m.scale.set(1, 1, 1); f.m.position.y = f.y; this.falling.splice(i, 1); }
      }
    }
    for (let i = this.dust.length - 1; i >= 0; i--) {
      const d = this.dust[i]; d.t += dt; d.p.position.addScaledVector(d.p.userData.v, dt); d.p.userData.v.multiplyScalar(0.92);
      d.p.scale.setScalar(1 + d.t * 2); d.m.opacity = Math.max(0, 0.8 - d.t * 1.4);
      if (d.t > 0.6) { this.scene.remove(d.p); d.p.geometry.dispose(); this.dust.splice(i, 1); }
    }
    if (this.ghost) { const s = 1.02 + Math.sin(this.time * 5) * 0.015; this.ghost.scale.setScalar(s); }
    // Ouvriers : petits sauts quand ils posent, bras qui tapent
    for (const w of this.workers) {
      w.userData.hop = Math.max(0, w.userData.hop - dt * 3);
      w.position.y = Math.sin(w.userData.hop * Math.PI) * 0.35;
      w.userData.arm.rotation.x = Math.sin(this.time * 9 + w.id) * 0.6;
    }
    // Camion
    if (this.truck) {
      const tz = this.roadZ, stopX = this.palletPos.x + 1.6;
      this.truck.position.z = tz;
      const p = game.p, s = game.s, a = this.truckAnim;
      const full = s.stock >= Math.min(p.cap, game.remaining) || game.done;
      let x;
      if (p.delivery < 2.5 || (full && !a)) x = stopX;                 // livraisons en continu ou entrepôt plein : garé
      else if (a) {                                                      // arrêt devant la palette, puis départ
        a.t += dt;
        x = a.t < 0.45 ? stopX : THREE.MathUtils.lerp(stopX, -50, Math.pow((a.t - 0.45) / 0.9, 2));
        if (a.t > 1.35) this.truckAnim = null;
      } else {                                                           // approche au rythme du minuteur
        // il entre vite dans le champ, puis avance pas à pas vers la palette
        // (il arrive par la droite, la palette est à gauche : tout le trajet reste à l'écran)
        const k = Math.min(1, s.deliveryT / p.delivery), edge = this.plan.w / 2 + 5;
        x = k < 0.08 ? THREE.MathUtils.lerp(50, edge, k / 0.08) : THREE.MathUtils.lerp(edge, stopX, (k - 0.08) / 0.92);
      }
      // Lissage (sauf quand il réapparaît au loin à droite)
      const cur = this.truck.position.x;
      this.truck.position.x = x > cur + 20 ? x : cur + (x - cur) * Math.min(1, dt * 10);
      this.truck.rotation.y = Math.PI; // il roule vers la gauche
      this.truckSpeed = Math.abs(this.truck.position.x - cur) / Math.max(dt, 1e-3); // pour le bruit du moteur
      this.truckKick = Math.max(0, (this.truckKick || 0) - dt * 5);
      this.truck.rotation.z = this.truckKick * 0.06;
    }
    // Caméra : tourne doucement autour du chantier, monte avec la construction
    if (!this.drag) this.orbitTarget += (Math.sin(this.time * 0.12) * 0.35 - this.orbitTarget) * dt * 0.05;
    this.orbit += (this.orbitTarget - this.orbit) * Math.min(1, dt * 6);
    const done = game.items.length ? game.s.placed / game.items.length : 0;
    const ty = 0.8 + this.plan.ridgeY * 0.45 * done, D = this.camDist;
    this.camera.position.set(Math.sin(this.orbit) * D, ty + D * 0.48, Math.cos(this.orbit) * D + 1.2);
    this.camera.lookAt(0, ty, 0.8);
    this.renderer.render(this.scene, this.camera);
  }
}
