// Affichage de la ville : les constructions terminées (version simplifiée), les rues déjà faites et la place.
// Chaque bâtiment est « cuit » en un seul objet (couleurs dans les sommets) : la ville peut grandir sans ralentir le jeu.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeItem } from './items3d.js';
import { houseFor } from './houses.js';
import { buildHouse, coarsen } from './house.js';
import { LOT, STREET, lotCenter, voirieItems } from './city.js';

const cityMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });

// Fusionne des éléments (dessinés avec makeItem) en un seul objet, décalés de offset
export function bake(items, offset = { x: 0, z: 0 }) {
  const root = new THREE.Group();
  for (const it of items) { const m = makeItem(it); m.position.set(it.x + offset.x, it.y, it.z + offset.z); root.add(m); }
  root.updateMatrixWorld(true);
  const geos = [];
  root.traverse(o => {
    if (!o.isMesh || !o.geometry.attributes.position) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(o.matrixWorld);
    const c = o.material.color || new THREE.Color(1, 1, 1), n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(g);
  });
  if (!geos.length) return null;
  const merged = mergeGeometries(geos); geos.forEach(g => g.dispose());
  const mesh = new THREE.Mesh(merged, cityMat); mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

export class CityView {
  constructor(scene) {
    this.group = new THREE.Group(); scene.add(this.group);
    this.buildings = new Map(); this.queue = []; this.streets = null; this.level = 0;
    // Place centrale (au centre de la ville)
    this.plaza = bake([{ kind: 'place', size: LOT - STREET, x: 0, y: 0, z: 0, ry: 0 }]);
    this.group.add(this.plaza);
  }
  // Affiche la ville telle qu'elle est quand on construit la maison n° level (les maisons 1 … level−1 sont finies)
  setLevel(level) {
    const done = level - 1, c = lotCenter(done);
    this.group.position.set(-c.x, 0, -c.z); // le chantier en cours est à l'origine de la scène
    if (level === this.level) return;
    this.level = level;
    for (const [l, m] of this.buildings) if (l >= level) { this.group.remove(m); m.geometry.dispose(); this.buildings.delete(l); }
    // Rues terminées : toutes celles des parcelles précédentes, en un seul objet
    if (this.streets) { this.group.remove(this.streets); this.streets.geometry.dispose(); this.streets = null; }
    const items = [];
    for (let k = 0; k < done; k++) { const o = lotCenter(k); for (const it of voirieItems(k, 0)) items.push({ ...it, x: it.x + o.x, z: it.z + o.z }); }
    if (items.length) { this.streets = bake(items); this.group.add(this.streets); }
    // Bâtiments à (re)construire, les plus proches du chantier d'abord (un par image)
    this.queue = [];
    for (let l = 1; l <= done; l++) if (!this.buildings.has(l)) this.queue.push(l);
    const d = (l) => { const p = lotCenter(l - 1); return Math.hypot(p.x - c.x, p.z - c.z); };
    this.queue.sort((a, b) => d(a) - d(b));
  }
  update() {
    const l = this.queue.shift(); if (!l) return;
    const plan = buildHouse(houseFor(l)), m = bake(coarsen(plan.items), lotCenter(l - 1));
    if (m) { this.group.add(m); this.buildings.set(l, m); }
  }
}
