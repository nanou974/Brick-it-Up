// Scène 3D de Brick'it Up : terrain, maison qui se construit, camion de livraison, palette, ouvriers.
import * as THREE from 'three';
import { makeItem } from './items3d.js';
import { DECORS, buildDecor } from './decor.js';

const rnd = (a) => { const x = Math.sin(a * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------- Matériaux partagés (décor, camion, ouvriers) ----------
const M = {};
function mat(key, color, opt = {}) {
  if (!M[key]) M[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opt });
  return M[key];
}
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
function shadows(o, cast = true, receive = true) { o.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = receive; } }); return o; }

// Camion de livraison : modèle et couleur choisis dans la boutique (skin) ;
// plus grand, plus chargé et avec un gyrophare aux paliers de l'amélioration « Camion » (tier)
export function makeTruck(tier, skin = { model: 'plateau', color: 0xF2A900 }) {
  const g = new THREE.Group(), k = 1 + 0.12 * tier, col = mat(`cab-${skin.color}`, skin.color);
  const chrome = mat('chrome', 0xD8DDE3, { metalness: 0.7, roughness: 0.25 }), glass = mat('vitre', 0x8FD3F4);
  const us = skin.model === 'americain', cabX = us ? 1.2 * k : 1.6 * k;
  const cab = box(1.4, us ? 1.6 : 1.3, 1.6, col); cab.position.set(cabX, us ? 1.1 : 0.95, 0); g.add(cab);
  const win = box(0.05, 0.5, 1.3, glass); win.position.set(cabX + 0.71, us ? 1.5 : 1.25, 0); g.add(win);
  if (us) {
    // Américain : long capot, calandre chromée, cheminées d'échappement
    const hood = box(1.3, 0.8, 1.4, col); hood.position.set(cabX + 1.3, 0.85, 0); g.add(hood);
    const grill = box(0.08, 0.7, 1.2, chrome); grill.position.set(cabX + 1.97, 0.85, 0); g.add(grill);
    for (const z of [-0.85, 0.85]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8), chrome); st.position.set(cabX - 0.75, 1.5, z); g.add(st); }
  }
  const chassis = box((us ? 5.2 : 4) * k, 0.25, 1.2, mat('chassis', 0x2A2D31)); chassis.position.set(us ? 0.4 : 0.1, 0.35, 0); g.add(chassis);
  const bedX = -0.4 * k - (us ? 0.6 : 0);
  if (skin.model === 'benne') {
    // Benne : caisse ouverte de la couleur du camion
    const bm = col, L = 2.6 * k;
    const floor = box(L, 0.15, 1.7, mat('plateau', 0x5A5F66)); floor.position.set(bedX, 0.6, 0); g.add(floor);
    for (const z of [-0.8, 0.8]) { const side = box(L, 0.7, 0.1, bm); side.position.set(bedX, 1.0, z); g.add(side); }
    const back = box(0.1, 0.7, 1.7, bm); back.position.set(bedX - L / 2, 1.0, 0); g.add(back);
    const front = box(0.1, 0.9, 1.7, bm); front.position.set(bedX + L / 2, 1.1, 0); g.add(front);
  } else { const bed = box(2.6 * k, 0.25, 1.7, mat('plateau', 0x5A5F66)); bed.position.set(bedX, 0.55, 0); g.add(bed); }
  for (const x of [cabX, -0.6 * k - (us ? 0.6 : 0), ...(tier >= 3 || us ? [-1.4 * k - (us ? 0.6 : 0)] : [])]) for (const z of [-0.8, 0.8]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12), mat('pneu', 0x1E1F22)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.36, z); g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 8), us ? chrome : mat('jante', 0xB9BDC1)); hub.rotation.x = Math.PI / 2; hub.position.set(x, 0.36, z); g.add(hub);
  }
  // Chargement : palettes de parpaings, de plus en plus nombreuses
  const n = 1 + tier;
  for (let i = 0; i < n; i++) {
    const p = box(0.7, 0.45, 0.7, mat('parpaing', 0x9AA0A6)); p.position.set(bedX + (i - (n - 1) / 2) * 0.75 * Math.min(1, 3 / n) * k, 0.9, (i % 2 ? 0.3 : -0.3) * (n > 3 ? 1 : 0)); g.add(p);
  }
  if (tier >= 5) { const gyro = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8), mat('gyro', 0xFF8A00, { emissive: 0xFF6A00, emissiveIntensity: 1 })); gyro.position.set(cabX, us ? 1.98 : 1.7, 0); g.add(gyro); }
  return shadows(g);
}

// Ouvrier : tenue choisie dans la boutique (gilet et casque). Jambes et bras articulés pour marcher et porter.
function makeWorker(i, outfit = { vest: 0xFF8A1F, hat: 0xFFD23F }) {
  const g = new THREE.Group();
  const vest = mat(`gilet-${outfit.vest}`, outfit.vest), skin = mat(`peau${i % 3}`, [0xF1C7A3, 0xC68E62, 0x8D5A3B][i % 3]), jean = mat('jean', 0x2F4C7A);
  const limb = (w, h, m, x, y) => { const piv = new THREE.Group(); piv.position.set(x, y, 0); const b = box(w, h, w, m); b.position.y = -h / 2; piv.add(b); g.add(piv); return piv; };
  const legL = limb(0.14, 0.45, jean, -0.09, 0.45), legR = limb(0.14, 0.45, jean, 0.09, 0.45);
  const body = box(0.4, 0.45, 0.26, vest); body.position.y = 0.68; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), skin); head.position.y = 1.05; g.add(head);
  const hat = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(`casque-${outfit.hat}`, outfit.hat)); hat.position.y = 1.1; g.add(hat);
  const armR = limb(0.1, 0.4, vest, 0.26, 0.88), armL = limb(0.1, 0.4, vest, -0.26, 0.88);
  // Élément porté (caché tant que l'ouvrier ne porte rien)
  const carry = box(0.42, 0.24, 0.3, mat('porte', 0x9AA0A6)); carry.position.set(0, 0.95, 0.32); carry.visible = false; g.add(carry);
  Object.assign(g.userData, { legL, legR, armL, armR, arm: armR, carry, body });
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
    this.hemi = new THREE.HemisphereLight(0xDDEEFF, 0x6B8E4E, 1.1); this.scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xFFF1D6, 2.2);
    sun.position.set(14, 22, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 });
    this.scene.add(sun, sun.target);

    // Herbe, route et arbres
    const grass = this.grass = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x7CC35A, roughness: 0.9, flatShading: true })); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; this.scene.add(grass);
    this.road = new THREE.Mesh(new THREE.PlaneGeometry(300, 4.2), new THREE.MeshStandardMaterial({ color: 0x4B4F55, roughness: 0.9 })); this.road.rotation.x = -Math.PI / 2; this.road.receiveShadow = true; this.scene.add(this.road);
    this.decor = new THREE.Group(); this.scene.add(this.decor);
    this.plotMesh = null; this.houseGroup = new THREE.Group(); this.scene.add(this.houseGroup);
    this.falling = []; this.dust = []; this.meshes = [];
    this.truck = null; this.truckTier = -1; this.truckAnim = null;
    this.skin = { truck: { model: 'plateau', color: 0xF2A900 }, worker: { vest: 0xFF8A1F, hat: 0xFFD23F }, decor: 'prairie' };
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
    for (const w of this.workers) { w.userData.job = null; this.workerGroup.remove(w); }
    this.workers = [];
    for (const m of this.meshes) if (m) this.houseGroup.remove(m);
    this.meshes = []; this.falling = [];
    if (this.plotMesh) this.scene.remove(this.plotMesh);
    const P = plan.plot;
    // Terrain : l'emprise de la maison et de ses abords, avec une marge
    this.plotMesh = new THREE.Mesh(new THREE.BoxGeometry(plan.w + 3, 0.06, plan.d + 3), new THREE.MeshStandardMaterial({ color: 0xB08A5B, roughness: 0.95, flatShading: true })); this.plotMesh.position.set(0, 0.01, 0); this.plotMesh.receiveShadow = true; this.scene.add(this.plotMesh);
    // Route derrière la maison : on voit le camion arriver au-dessus du chantier
    this.roadZ = -plan.d / 2 - 1.5 - 2.4; this.road.position.set(0, 0.02, this.roadZ);
    // Décor autour du terrain (déterministe), selon le décor choisi
    this.decor.clear(); this.decor.add(buildDecor(this.skin.decor, plan, this.roadZ)); this.applyDecorColors();
    for (let i = 0; i < game.s.placed; i++) this.addItem(i, false);
    this.palletPos = new THREE.Vector3(-plan.w / 2 - 0.2, 0, -plan.d / 2 - 0.6);
    this.pallet.position.copy(this.palletPos);
    this.camDist = 9 + Math.max(plan.w, plan.d * 1.1) * 1.3 + plan.ridgeY * 0.7;
    this.sun.shadow.camera.left = this.sun.shadow.camera.bottom = -P * 0.8; this.sun.shadow.camera.right = this.sun.shadow.camera.top = P * 0.8; this.sun.shadow.camera.updateProjectionMatrix();
    this.updateGhost(game);
  }

  addItem(index, animate) {
    if (this.meshes[index]) return this.meshes[index];
    const it = this.items[index], m = shadows(makeItem(it));
    m.position.set(it.x, it.y, it.z);
    this.houseGroup.add(m); this.meshes[index] = m;
    if (animate) { m.position.y = it.y + 4.5; this.falling.push({ m, y: it.y, t: 0, it }); }
    return m;
  }

  // Contour transparent de l'élément suivant, pour voir où il va se poser
  updateGhost(game) {
    if (this.ghost) { this.houseGroup.remove(this.ghost); this.ghost = null; }
    if (game.done) return;
    const it = this.items[game.s.placed], g = makeItem(it);
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

  // ---------- Personnalisation ----------
  applyDecorColors() {
    const D = DECORS[this.skin.decor] || DECORS.prairie;
    this.scene.background.setHex(D.sky); this.scene.fog.color.setHex(D.sky);
    this.grass.material.color.setHex(D.ground); this.hemi.groundColor.setHex(D.hemiGround);
    this.road.material.color.setHex(D.road); if (this.plotMesh) this.plotMesh.material.color.setHex(D.plot);
  }
  setSkins(sk, game) {
    const changed = { truck: sk.truck !== this.skin.truck, worker: sk.worker !== this.skin.worker, decor: sk.decor !== this.skin.decor };
    Object.assign(this.skin, sk);
    if (changed.truck && this.truck) this.setTruck(this.truckTier, true);
    if (changed.worker && this.plan) { const n = this.workers.length; this.setWorkers(0); this.setWorkers(n); }
    if (changed.decor && this.plan) { this.decor.clear(); this.decor.add(buildDecor(this.skin.decor, this.plan, this.roadZ)); this.applyDecorColors(); }
  }

  // Ouvriers visibles autour du chantier (8 au maximum)
  setWorkers(n) {
    const want = Math.min(8, n);
    // Un ouvrier qui avait un aller-retour en cours le termine tout de suite (élément posé)
    while (this.workers.length > want) { const w = this.workers.pop(); this.finishJob(w); this.workerGroup.remove(w); }
    while (this.workers.length < want) {
      const i = this.workers.length, w = makeWorker(i, this.skin.worker), P = this.plan.plot;
      const a = Math.PI * 0.08 + i * 0.75, r = Math.max(this.plan.w, this.plan.d) * 0.5 + 1.3;
      w.position.set(Math.cos(a) * r * 1.1, 0, Math.sin(a) * r * 0.75 + 0.6); w.lookAt(0, 0, 0);
      Object.assign(w.userData, { hop: 0, home: w.position.clone(), path: [], job: null, pause: 0, phase: i });
      this.workerGroup.add(w); this.workers.push(w);
    }
  }
  workerHop() { if (this.workers.length) { const w = this.workers[Math.floor(Math.random() * this.workers.length)]; w.userData.hop = 1; } }

  // ---------- Aller-retour d'un ouvrier : palette → élément → retour à son poste ----------
  // L'élément n'apparaît sur la maison qu'à l'arrivée de l'ouvrier ; onDone (bruit, gain) est appelé à ce moment-là.
  // Sans ouvrier libre (ils sont tous en route), l'élément est posé directement.
  workerJob(index, onDone, tripTime) {
    const w = this.workers.find(x => !x.userData.job);
    const it = this.items[index];
    if (!w || !it) { this.addItem(index, true); onDone(); return; }
    const pal = this.palletPos.clone().add(new THREE.Vector3(0.3, 0, 1.0));
    let dx = it.x, dz = it.z; const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    const drop = new THREE.Vector3(it.x + dx * 0.9, 0, it.z + dz * 0.9);
    const u = w.userData, dist = w.position.distanceTo(pal) + pal.distanceTo(drop);
    u.job = { index, onDone, color: it.color || [0x9AA0A6, 0xC8553D, 0xA4703F, 0xB5512F, 0xF7F7F2, 0x62B04B][it.stage] };
    u.speed = Math.max(2.4, dist / Math.max(0.6, tripTime - 0.3));
    u.path = [{ p: pal, act: 'take' }, { p: drop, act: 'drop' }, { p: u.home.clone(), act: 'home' }];
    u.pause = 0;
  }
  finishJob(w) {
    const u = w.userData; if (!u.job) return;
    const j = u.job; u.job = null; u.carry.visible = false; u.path = [];
    if (!this.meshes[j.index] && this.items[j.index]) this.addItem(j.index, true);
    j.onDone();
  }
  busy() { return this.workers.some(w => w.userData.job); }
  updateWorkers(dt) {
    for (const w of this.workers) {
      const u = w.userData;
      u.hop = Math.max(0, u.hop - dt * 3);
      if (u.pause > 0) { u.pause -= dt; continue; }
      const step = u.path[0];
      if (!step) {
        // À son poste : il tape avec son marteau
        w.position.y = Math.sin(u.hop * Math.PI) * 0.35;
        u.armR.rotation.x = -0.4 + Math.sin(this.time * 9 + u.phase) * 0.6; u.armL.rotation.x = 0; u.legL.rotation.x = u.legR.rotation.x = 0;
        continue;
      }
      // Marche vers l'étape suivante
      const to = step.p, d = Math.hypot(to.x - w.position.x, to.z - w.position.z), sp = step.act === 'home' ? Math.min(u.speed, 3.2) : u.speed;
      if (d > 0.05) {
        const k = Math.min(1, (sp * dt) / d);
        w.position.x += (to.x - w.position.x) * k; w.position.z += (to.z - w.position.z) * k;
        w.rotation.y = Math.atan2(to.x - w.position.x, to.z - w.position.z) || w.rotation.y;
        u.phase += dt * sp * 4.2;
        const sw = Math.sin(u.phase) * 0.7;
        u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
        w.position.y = Math.abs(Math.sin(u.phase)) * 0.06;
        if (u.carry.visible) { u.armL.rotation.x = u.armR.rotation.x = -1.2; } else { u.armL.rotation.x = -sw * 0.8; u.armR.rotation.x = sw * 0.8; }
        continue;
      }
      // Arrivé : prend l'élément à la palette, le dépose sur la maison, ou retourne à son poste
      u.path.shift(); u.legL.rotation.x = u.legR.rotation.x = 0; w.position.y = 0;
      if (step.act === 'take') { u.carry.material = mat(`porte-${u.job.color}`, u.job.color); u.carry.visible = true; u.pause = 0.15; }
      else if (step.act === 'drop') { u.pause = 0.1; u.hop = 1; const j = u.job; u.job = null; u.carry.visible = false; if (!this.meshes[j.index] && this.items[j.index]) this.addItem(j.index, true); j.onDone(); }
      else w.lookAt(0, 0, 0);
    }
  }

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

  setTruck(tier, force = false) {
    if (tier === this.truckTier && !force) return;
    const pos = this.truck ? this.truck.position.clone() : null;
    if (this.truck) this.scene.remove(this.truck);
    this.truck = makeTruck(tier, this.skin.truck); this.truckTier = tier; this.scene.add(this.truck);
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
    this.updateWorkers(dt);
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
