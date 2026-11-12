// Scène 3D de Brick'it Up : terrain, maison qui se construit, camion de livraison, palette, ouvriers.
import * as THREE from 'three';
import { makeItem } from './items3d.js';
import { DECORS, buildDecor } from './decor.js';
import { CityView, bake } from './city3d.js';
import { makeTruck, setTruckLoad, truckSlots } from './truck.js';
import { STAGES } from './rules.js';
import { LOT, STREET, cityBounds, lotCenter, pendingStreets } from './city.js';

const ZOOM_MIN = 0.55, ZOOM_MAX = 3.6; // 0,55 = tout près, 3,6 = vue sur la ville
const rnd = (a) => { const x = Math.sin(a * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------- Matériaux partagés (décor, camion, ouvriers) ----------
const M = {};
function mat(key, color, opt = {}) {
  if (!M[key]) M[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opt });
  return M[key];
}
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
function shadows(o, cast = true, receive = true) { o.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = receive; } }); return o; }

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
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 2000);
    this.hemi = new THREE.HemisphereLight(0xDDEEFF, 0x6B8E4E, 1.1); this.scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xFFF1D6, 2.2);
    sun.position.set(14, 22, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 });
    this.scene.add(sun, sun.target);

    // Herbe, route et arbres
    const grass = this.grass = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: 0x7CC35A, roughness: 0.9, flatShading: true })); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; this.scene.add(grass);
    this.road = new THREE.Mesh(new THREE.PlaneGeometry(300, 4.2), new THREE.MeshStandardMaterial({ color: 0x4B4F55, roughness: 0.9 })); this.road.rotation.x = -Math.PI / 2; this.road.receiveShadow = true; this.road.visible = false; this.scene.add(this.road); // remplacée par les rues de la ville
    this.city = new CityView(this.scene);
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
  // Déplace la vue de (dx, dy) pixels à l'écran : la scène suit les doigts, dans le repère de la caméra
  panBy(dx, dy) {
    const k = this.camDist * this.zoom * 0.0022, o = this.orbit;
    const right = new THREE.Vector3(Math.cos(o), 0, -Math.sin(o)), fwd = new THREE.Vector3(-Math.sin(o), 0, -Math.cos(o));
    this.panTarget.addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k);
    // On reste autour du chantier (on ne se perd pas dans le décor)
    // On reste dans la ville (on ne se perd pas dans le décor)
    const b = this.bounds, lim = b ? Math.max(b.x1 - b.x0, b.z1 - b.z0) / 2 + Math.hypot((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2) : 20;
    if (this.panTarget.length() > lim) this.panTarget.setLength(lim);
  }
  recenter() { this.panTarget.set(0, 0, 0); }
  get panned() { return this.panTarget.length() > 0.8; }

  // Glisser horizontalement pour tourner autour du chantier.
  //  - seul le doigt qui a commencé le geste compte ; un deuxième doigt annule la rotation (évite les demi-tours) ;
  //  - il faut glisser de plus de 15 px avant que la vue tourne (une tape ne la fait jamais bouger) ;
  //  - pendant une série de tapes rapides (deux appuis à moins d'une demi-seconde), la rotation est bloquée.
  setupDrag(canvas) {
    const DEAD = 15, RAPID = 500;
    let lastDown = 0;
    // Zoom : pincement à deux doigts (écarter = zoomer, rapprocher = dézoomer) ou molette de la souris
    this.zoom = 1; this.zoomTarget = 1; this.pts = new Map(); this.pinch = null;
    // Déplacement de la vue : glisser à deux doigts (ou clic droit maintenu à la souris)
    this.pan = new THREE.Vector3(); this.panTarget = new THREE.Vector3(); this.rmb = null;
    const mid = () => { const [a, b] = [...this.pts.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
    const pinchDist = () => { const [a, b] = [...this.pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    canvas.addEventListener('pointerdown', e => {
      const now = performance.now(), rapid = now - lastDown < RAPID; lastDown = now;
      this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pts.size === 2) { const m = mid(); this.pinch = { d0: pinchDist(), z0: this.zoomTarget, active: false, m0: m, last: m, panning: false }; }
      if (this.drag) { this.drag.locked = true; return; }               // deuxième doigt : pas de rotation
      this.drag = { id: e.pointerId, x: e.clientX, o: this.orbitTarget, moving: false, locked: rapid };
    });
    addEventListener('pointermove', e => {
      if (this.pts.has(e.pointerId)) this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch && this.pts.size === 2) {
        // On attend un vrai écartement (20 px) pour ne pas zoomer pendant des tapes rapides à deux pouces
        const d = pinchDist(), m = mid(), P = this.pinch;
        if (!P.active && Math.abs(d - P.d0) > 20) { P.active = true; P.d0 = d; P.z0 = this.zoomTarget; }
        if (P.active) this.zoomTarget = Math.max(ZOOM_MIN, Math.min(this.zoomMax || ZOOM_MAX, P.z0 * P.d0 / Math.max(10, d)));
        // Les deux doigts glissent ensemble : la vue se déplace (après 20 px, pour ignorer les tapes à deux pouces)
        if (!P.panning && Math.hypot(m.x - P.m0.x, m.y - P.m0.y) > 20) { P.panning = true; P.last = m; }
        if (P.panning) { this.panBy(m.x - P.last.x, m.y - P.last.y); P.last = m; }
        return;
      }
      const d = this.drag;
      if (!d || e.pointerId !== d.id || d.locked) return;
      let dx = e.clientX - d.x;
      if (!d.moving) { if (Math.abs(dx) < DEAD) return; d.moving = true; d.x += Math.sign(dx) * DEAD; dx = e.clientX - d.x; }
      this.userOrbit = true; // la vue a été tournée à la main : plus de balancement automatique
      this.orbitTarget = d.o - dx * 0.008;
    });
    const end = (e) => {
      this.pts.delete(e.pointerId); if (this.pts.size < 2) this.pinch = null;
      if (this.drag && e.pointerId === this.drag.id) this.drag = null;
    };
    addEventListener('pointerup', end); addEventListener('pointercancel', end);
    // Souris : clic droit maintenu pour déplacer la vue
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('mousedown', e => { if (e.button === 2) this.rmb = { x: e.clientX, y: e.clientY }; });
    addEventListener('mousemove', e => { if (this.rmb) { this.panBy(e.clientX - this.rmb.x, e.clientY - this.rmb.y); this.rmb = { x: e.clientX, y: e.clientY }; } });
    addEventListener('mouseup', e => { if (e.button === 2) this.rmb = null; });
    canvas.addEventListener('wheel', e => { e.preventDefault(); this.zoomTarget = Math.max(ZOOM_MIN, Math.min(this.zoomMax || ZOOM_MAX, this.zoomTarget * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
  }



  // Prépare le chantier d'une nouvelle maison (et repose les éléments déjà posés)
  // Fin de construction : les chemins de terre de la parcelle deviennent des rues (offert)
  paveRest() {
    if (!this.dirtMesh) return false;
    this.scene.remove(this.dirtMesh); this.dirtMesh.geometry.dispose(); this.dirtMesh = null;
    const items = pendingStreets(this.paveLevel - 1, true);
    this.pavedMesh = bake(items); if (!this.pavedMesh) return false;
    this.pavedMesh.scale.y = 0.01; this.scene.add(this.pavedMesh); this.paveT = 0;
    for (const it of items) if (it.kind === 'route' || it.kind === 'carrefour') this.puff(it.x, 0.4, it.z, 2, 0x9AA0A6);
    return true;
  }
  setHouse(game) {
    const { plan, house } = game;
    this.plan = plan; this.house = house; this.items = game.items; // voirie puis maison
    for (const w of this.workers) { w.userData.job = null; this.workerGroup.remove(w); }
    this.workers = [];
    for (const m of this.meshes) if (m) this.houseGroup.remove(m);
    this.meshes = []; this.falling = [];
    if (this.plotMesh) this.scene.remove(this.plotMesh);
    const P = plan.plot;
    // Terrain : l'emprise de la maison et de ses abords, avec une marge
    this.plotMesh = new THREE.Mesh(new THREE.BoxGeometry(plan.w + 3, 0.06, plan.d + 3), new THREE.MeshStandardMaterial({ color: 0xB08A5B, roughness: 0.95, flatShading: true })); this.plotMesh.position.set(0, 0.01, 0); this.plotMesh.receiveShadow = true; this.scene.add(this.plotMesh);
    // Route derrière la maison : on voit le camion arriver au-dessus du chantier
    // Ville : le chantier est sur sa parcelle, le camion arrive par la rue de derrière
    const lvl = game.s.level, c = lotCenter(lvl - 1), cb = cityBounds(lvl);
    this.city.setLevel(lvl);
    // Côtés de la parcelle pas encore goudronnés : chemins de terre, goudronnés à la fin de la construction
    for (const k of ['dirtMesh', 'pavedMesh']) if (this[k]) { this.scene.remove(this[k]); this[k].geometry.dispose(); this[k] = null; }
    this.dirtMesh = bake(pendingStreets(lvl - 1, false)); if (this.dirtMesh) this.scene.add(this.dirtMesh);
    this.paveLevel = lvl;
    this.bounds = { x0: cb.x0 - c.x, x1: cb.x1 - c.x, z0: cb.z0 - c.z, z1: cb.z1 - c.z };
    // Le dézoom maximal grandit avec la ville : on peut toujours la voir en entier
    this.roadZ = -LOT / 2; this.road.position.set(0, 0.02, this.roadZ);
    // Décor autour du terrain (déterministe), selon le décor choisi
    this.decor.clear(); this.decor.add(buildDecor(this.skin.decor, plan, this.roadZ, this.bounds)); this.applyDecorColors();
    for (let i = 0; i < game.s.placed; i++) this.addItem(i, false);
    // Palette au bord de la rue de derrière, là où le camion décharge
    this.palletPos = new THREE.Vector3(Math.max(-(LOT - STREET) / 2 + 1.5, -plan.w / 2 - 0.2), 0, -LOT / 2 + STREET / 2 + 1.6);
    this.pallet.position.copy(this.palletPos);
    this.camDist = 9 + Math.max(plan.w, plan.d * 1.1) * 1.3 + plan.ridgeY * 0.7;
    const B = this.bounds, far = Math.max(-B.x0, B.x1, -B.z0, B.z1) * 2.4;
    this.zoomMax = Math.max(ZOOM_MAX, Math.min(9, far / this.camDist));
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
    if (changed.decor && this.plan) { this.decor.clear(); this.decor.add(buildDecor(this.skin.decor, this.plan, this.roadZ, this.bounds)); this.applyDecorColors(); }
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
  // Emprise déjà construite (fondations et murs posés) : les ouvriers en font le tour au lieu de la traverser
  footprint() {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let k = 0; k < this.meshes.length; k++) {
      const it = this.items[k]; if (!this.meshes[k] || !it || (it.kind !== 'parpaing' && it.kind !== 'dalle' && it.kind !== 'brique')) continue;
      x0 = Math.min(x0, it.x); x1 = Math.max(x1, it.x); z0 = Math.min(z0, it.z); z1 = Math.max(z1, it.z);
    }
    if (x0 === Infinity) return null;
    const m = 0.8; return { x0: x0 - m, x1: x1 + m, z0: z0 - m, z1: z1 + m };
  }
  // Le segment a → b traverse-t-il le rectangle r (intérieur strict) ?
  crosses(a, b, r) {
    const e = 0.05, R = { x0: r.x0 + e, x1: r.x1 - e, z0: r.z0 + e, z1: r.z1 - e };
    let t0 = 0, t1 = 1; const dx = b.x - a.x, dz = b.z - a.z;
    for (const [pp, q] of [[-dx, a.x - R.x0], [dx, R.x1 - a.x], [-dz, a.z - R.z0], [dz, R.z1 - a.z]]) {
      if (pp === 0) { if (q < 0) return false; continue; }
      const t = q / pp; if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return t0 < t1;
  }
  // Chemin le plus court de a à b en contournant le rectangle r par ses coins (graphe de visibilité, 6 points)
  route(a, b, r) {
    if (!r || !this.crosses(a, b, r)) return [b];
    const C = [new THREE.Vector3(r.x0, 0, r.z0), new THREE.Vector3(r.x1, 0, r.z0), new THREE.Vector3(r.x1, 0, r.z1), new THREE.Vector3(r.x0, 0, r.z1)];
    const N = [a, ...C, b], dist = N.map(() => Infinity), prev = N.map(() => -1), done = N.map(() => false); dist[0] = 0;
    for (;;) {
      let u = -1; for (let k = 0; k < N.length; k++) if (!done[k] && dist[k] < Infinity && (u < 0 || dist[k] < dist[u])) u = k;
      if (u < 0 || u === N.length - 1) break; done[u] = true;
      for (let v = 0; v < N.length; v++) if (!done[v] && v !== u && !this.crosses(N[u], N[v], r)) {
        const d = dist[u] + N[u].distanceTo(N[v]); if (d < dist[v]) { dist[v] = d; prev[v] = u; }
      }
    }
    const path = []; for (let v = N.length - 1; v > 0 && v !== -1; v = prev[v]) path.unshift(N[v]);
    return path.length ? path : [b];
  }
  // Point de dépose : à côté de l'élément, ou au bord de la construction s'il est à l'intérieur
  dropPoint(it, r) {
    const p = new THREE.Vector3(it.x, 0, it.z);
    let dx = it.x, dz = it.z; const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    if (!r || it.x < r.x0 || it.x > r.x1 || it.z < r.z0 || it.z > r.z1) return p.add(new THREE.Vector3(dx * 0.9, 0, dz * 0.9));
    const opts = [[r.x0 - 0.1, it.z, it.x - r.x0], [r.x1 + 0.1, it.z, r.x1 - it.x], [it.x, r.z0 - 0.1, it.z - r.z0], [it.x, r.z1 + 0.1, r.z1 - it.z]].sort((a, b) => a[2] - b[2]);
    return new THREE.Vector3(opts[0][0], 0, opts[0][1]);
  }
  // Tape sur le chantier : les ouvriers pressent le pas (cumulable, retombe en une ou deux secondes)
  boostWorkers() { this.boost = Math.min(1, (this.boost || 0) + 0.15); }
  idleWorkers() { return this.workers.filter(w => !w.userData.job).length; }

  // Un ouvrier libre va chercher l'élément sur la palette et le porte jusqu'à la maison, à pied (vitesse walkSpeed),
  // en contournant ce qui est déjà construit. onDone(durée du trajet) est appelé quand l'élément est posé.
  workerJob(index, onDone) {
    const w = this.workers.find(x => !x.userData.job);
    const it = this.items[index];
    if (!w || !it) { this.addItem(index, true); onDone(0); return; }
    const r = this.footprint();
    const pal = this.palletPos.clone().add(new THREE.Vector3(0.3, 0, -0.9));
    const drop = this.dropPoint(it, r), u = w.userData, here = w.position.clone(); here.y = 0;
    const toPal = this.route(here, pal, r), toDrop = this.route(pal, drop, r), toHome = this.route(drop, u.home.clone(), r);
    u.job = { index, onDone, start: this.time, color: it.color || [0x4B4F55, 0x9AA0A6, 0xC8553D, 0xA4703F, 0xB5512F, 0xF7F7F2, 0x62B04B][it.stage] };
    u.speed = this.walkSpeed || 2.2;
    u.path = [...toPal.slice(0, -1).map(p => ({ p, act: 'via' })), { p: pal, act: 'take' },
      ...toDrop.slice(0, -1).map(p => ({ p, act: 'via' })), { p: drop, act: 'drop' },
      ...toHome.slice(0, -1).map(p => ({ p, act: 'via' })), { p: u.home.clone(), act: 'home' }];
    u.pause = 0;
  }
  finishJob(w) {
    const u = w.userData; if (!u.job) return;
    const j = u.job; u.job = null; u.carry.visible = false; u.path = [];
    if (!this.meshes[j.index] && this.items[j.index]) this.addItem(j.index, true);
    j.onDone(this.time - j.start);
  }
  busy() { return this.workers.some(w => w.userData.job); }
  updateWorkers(dt) {
    this.boost = Math.max(0, (this.boost || 0) - dt * 0.6);
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
      // Vitesse de marche, augmentée par les tapes sur le chantier (jusqu'à ×2)
      const to = step.p, d = Math.hypot(to.x - w.position.x, to.z - w.position.z), sp = (this.walkSpeed || u.speed) * (1 + (this.boost || 0));
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
      if (step.act === 'take') { u.carry.material = mat(`porte-${u.job.color}`, u.job.color); u.carry.visible = true; u.pause = 0.35; }
      else if (step.act === 'drop') { u.pause = 0.25; u.hop = 1; const j = u.job; u.job = null; u.carry.visible = false; if (!this.meshes[j.index] && this.items[j.index]) this.addItem(j.index, true); j.onDone(this.time - j.start); }
      else if (step.act === 'home') w.lookAt(0, 0, 0);
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
    this.craneT = 0; // la grue (s'il y en a une) pivote vers la palette pour décharger
    if (!this.truck || interval < 2.5) return;
    this.truckAnim = { t: 0 };
  }
  // Tape sur l'écran : petit coup d'accélérateur (fumée à l'échappement, le camion se cabre)
  rushTruck() {
    if (!this.truck) return;
    const p = this.truck.position; this.puff(p.x + 2.2, 0.5, p.z + 0.5, 3, 0x9AA0A6);
    this.truckKick = 1;
  }

  // ---------- Feux d'artifice (maison terminée) ----------
  // Des fusées partent autour de la maison et explosent en gerbes de couleur au-dessus du toit.
  fireworks(duration = 3.2, onRocket = () => {}, onBurst = () => {}) {
    this.fw = this.fw || []; this.fwSpawn = { left: duration, next: 0, onRocket }; this.fwBurst = onBurst;
    this.duskT = duration + 2.5; // le ciel s'assombrit le temps du feu d'artifice
  }
  // Crépuscule pendant le feu d'artifice : ciel, brouillard et lumières baissent puis reviennent
  updateDusk(dt) {
    this.duskT = Math.max(0, (this.duskT || 0) - dt);
    const target = this.duskT > 0 ? 1 : 0;
    this.dusk = (this.dusk || 0) + (target - (this.dusk || 0)) * Math.min(1, dt * 1.5);
    if (this.dusk < 0.002 && !this.duskWas) return;
    this.duskWas = this.dusk >= 0.002;
    const D = DECORS[this.skin.decor] || DECORS.prairie, night = new THREE.Color(0x1B2A4A), k = this.dusk;
    this.scene.background.setHex(D.sky).lerp(night, k * 0.85); this.scene.fog.color.copy(this.scene.background);
    this.sun.intensity = 2.2 * (1 - 0.6 * k); this.hemi.intensity = 1.1 * (1 - 0.45 * k);
  }
  updateFireworks(dt) {
    this.updateDusk(dt);
    const S = this.fwSpawn; if (!S && !(this.fw && this.fw.length)) return;
    if (S) {
      S.left -= dt; S.next -= dt;
      if (S.next <= 0 && S.left > 0) {
        S.next = 0.22 + Math.random() * 0.2;
        const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * Math.max(this.plan.w, this.plan.d) * 0.4;
        const rocket = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: 0xFFF2B0 }));
        rocket.position.set(Math.cos(a) * r, 0.5, Math.sin(a) * r * 0.6);
        this.scene.add(rocket);
        // Vitesse calculée pour exploser juste au-dessus du toit (bien dans le cadre)
        const top = this.plan.ridgeY + 1.5 + Math.random() * 3, fuse = 0.7 + Math.random() * 0.2, vy = (top - 0.5 + 0.5 * 9 * fuse * fuse) / fuse;
        this.fw.push({ type: 'rocket', m: rocket, v: new THREE.Vector3((Math.random() - 0.5) * 2, vy, (Math.random() - 0.5) * 1.5), t: 0, fuse });
        S.onRocket();
      }
      if (S.left <= 0) this.fwSpawn = null;
    }
    const COLORS = [0xFF4D6D, 0xFFD23F, 0x4DD2FF, 0x7CFF6B, 0xC77DFF, 0xFF8A1F, 0xFFFFFF];
    for (let i = this.fw.length - 1; i >= 0; i--) {
      const f = this.fw[i]; f.t += dt;
      if (f.type === 'rocket') {
        f.v.y -= 9 * dt; f.m.position.addScaledVector(f.v, dt);
        if (Math.random() < 0.6) this.puff(f.m.position.x, f.m.position.y - 0.2, f.m.position.z, 1, 0xFFE9A8);
        if (f.t >= f.fuse) {
          // Explosion : une gerbe de points lumineux qui retombent en s'éteignant
          const n = 70, pos = new Float32Array(n * 3), vel = [];
          for (let k = 0; k < n; k++) {
            pos.set([f.m.position.x, f.m.position.y, f.m.position.z], k * 3);
            const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, sp = 6 + Math.random() * 2, q = Math.sqrt(1 - u * u);
            vel.push(new THREE.Vector3(q * Math.cos(th) * sp, u * sp, q * Math.sin(th) * sp));
          }
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          const color = COLORS[Math.floor(Math.random() * COLORS.length)];
          if (!this.glowTex) {
            // Étincelle ronde et lumineuse (dégradé radial dessiné une fois)
            const cv = document.createElement('canvas'); cv.width = cv.height = 64; const cx = cv.getContext('2d');
            const gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
            cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64); this.glowTex = new THREE.CanvasTexture(cv);
          }
          const mat2 = new THREE.PointsMaterial({ color, size: 1.3, map: this.glowTex, transparent: true, opacity: 1, depthWrite: false });
          // Éclair au centre de l'explosion
          const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, depthWrite: false }));
          flash.position.copy(f.m.position); flash.scale.setScalar(5); this.scene.add(flash);
          this.fw.push({ type: 'flash', m: flash, t: 0 });
          const pts = new THREE.Points(geo, mat2); this.scene.add(pts);
          this.fw.push({ type: 'burst', m: pts, vel, t: 0 });
          this.scene.remove(f.m); f.m.geometry.dispose(); this.fw.splice(i, 1);
          this.fwBurst?.();
        }
      } else if (f.type === 'flash') {
        f.m.material.opacity = Math.max(0, 1 - f.t / 0.3); f.m.scale.setScalar(5 + f.t * 8);
        if (f.t > 0.3) { this.scene.remove(f.m); f.m.material.dispose(); this.fw.splice(i, 1); }
      } else {
        const a = f.m.geometry.attributes.position;
        for (let k = 0; k < f.vel.length; k++) {
          const v = f.vel[k]; v.multiplyScalar(1 - dt * 1.6); v.y -= 3.5 * dt;
          a.array[k * 3] += v.x * dt; a.array[k * 3 + 1] += v.y * dt; a.array[k * 3 + 2] += v.z * dt;
        }
        a.needsUpdate = true;
        f.m.material.opacity = Math.max(0, 1 - f.t / 1.6); f.m.material.size = 1.3 * (1 - f.t / 2.4);
        if (f.t > 1.6) { this.scene.remove(f.m); f.m.geometry.dispose(); f.m.material.dispose(); this.fw.splice(i, 1); }
      }
    }
  }

  update(dt, game) {
    this.time += dt;
    this.updateFireworks(dt);
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
        const k = Math.min(1, s.deliveryT / p.delivery), edge = LOT / 2 + 4;
        x = k < 0.08 ? THREE.MathUtils.lerp(50, edge, k / 0.08) : THREE.MathUtils.lerp(edge, stopX, (k - 0.08) / 0.92);
      }
      // Lissage (sauf quand il réapparaît au loin à droite)
      const T = this.truck, U = T.userData, cur = T.position.x;
      T.position.x = x > cur + 20 ? x : cur + (x - cur) * Math.min(1, dt * 10);
      T.rotation.y = Math.PI; // il roule vers la gauche
      const moved = T.position.x - cur, speed = Math.abs(moved) / Math.max(dt, 1e-3);
      this.truckSpeed = speed; // pour le bruit du moteur
      // Roues qui tournent (il roule vers −x du monde, soit vers l'avant du camion)
      if (Math.abs(moved) < 15) for (const w of U.wheels) w.piv.rotation.z -= Math.abs(moved) / w.r;
      // Freinage : feux stop et cabine qui plonge ; départ : fumée à l'échappement
      const prev = this.prevTruckSpeed || 0; this.prevTruckSpeed = speed;
      if (speed < prev - dt * 40 && prev > 1.5) this.brake = 1;
      this.brake = Math.max(0, (this.brake || 0) - dt * 2.2);
      if (prev < 0.8 && speed > 2 && Math.abs(moved) < 15) { const e = T.localToWorld(U.exhaust.clone()); this.puff(e.x, e.y + 0.3, e.z, 4, 0x8A9097); }
      for (const m of U.brake) m.emissiveIntensity = 0.1 + this.brake * 1.6;
      if (U.headlights) U.headlights.emissiveIntensity = 0.15 + (this.dusk || 0) * 1.6;
      this.truckKick = Math.max(0, (this.truckKick || 0) - dt * 5);
      if (U.body) U.body.rotation.z = -this.brake * 0.035 + this.truckKick * 0.05;
      if (U.gyro) U.gyro.rotation.y += dt * 6;
      // Grue : pivote vers la palette, descend le crochet, puis revient au-dessus du plateau
      if (U.crane) {
        this.craneT = (this.craneT ?? 9) + dt;
        const c = this.craneT, k = c < 0.35 ? c / 0.35 : c < 0.7 ? 1 : c < 1.1 ? 1 - (c - 0.7) / 0.4 : 0, e = k * k * (3 - 2 * k);
        U.crane.yaw.rotation.y = -e * Math.PI / 2; U.crane.boom.rotation.z = -0.12 + e * 0.3;
        const drop = 1 + e * 0.7; U.crane.cable.scale.y = drop; U.crane.cable.position.y = -0.1 - drop / 2; U.crane.hook.position.y = -0.17 - drop;
      }
      // Chargement : les éléments de l'étape en cours ; le camion repart à vide
      const next = game.items[s.placed], key = next ? STAGES[next.stage].key : 'fini';
      const leaving = a && a.t > 0.45, n = leaving || game.done ? 0 : Math.max(1, Math.min(truckSlots(T), p.batch || 1));
      setTruckLoad(T, key, n, next && next.color);
    }
    // Caméra : tourne doucement autour du chantier, monte avec la construction
    // Léger balancement automatique de la caméra, seulement tant qu'on n'a jamais tourné la vue à la main
    if (!this.drag && !this.userOrbit) this.orbitTarget += (Math.sin(this.time * 0.12) * 0.35 - this.orbitTarget) * dt * 0.05;
    this.orbit += (this.orbitTarget - this.orbit) * Math.min(1, dt * 6);
    const done = game.items.length ? game.s.placed / game.items.length : 0;
    // Zoom lissé ; le brouillard recule avec la caméra pour que la maison reste nette en vue d'ensemble
    this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, dt * 8);
    this.scene.fog.near = 45 * this.zoom; this.scene.fog.far = 110 * this.zoom;
    // Pendant la voirie, la caméra prend du recul pour voir les rues autour de la parcelle
    this.city.update();
    // Goudronnage des derniers côtés de la parcelle (fin de construction) : la rue « pousse » du sol
    if (this.paveT != null && this.pavedMesh) { this.paveT += dt; const t = Math.min(1, this.paveT / 0.9), e = 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2); this.pavedMesh.scale.y = Math.max(0.01, e); if (t >= 1) { this.pavedMesh.scale.y = 1; this.paveT = null; } }
    const want = game.stage === 0 && !game.done ? Math.max(this.camDist, LOT * 1.15) : this.camDist;
    this.camBase = this.camBase ? this.camBase + (want - this.camBase) * Math.min(1, dt * 1.5) : want;
    const ty = 0.8 + this.plan.ridgeY * 0.45 * done, D = this.camBase * this.zoom;
    this.pan.lerp(this.panTarget, Math.min(1, dt * 10));
    this.camera.position.set(Math.sin(this.orbit) * D + this.pan.x, ty + D * 0.48, Math.cos(this.orbit) * D + 1.2 + this.pan.z);
    this.camera.lookAt(this.pan.x, ty, 0.8 + this.pan.z);
    this.renderer.render(this.scene, this.camera);
  }
}
