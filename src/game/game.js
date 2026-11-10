// Moteur de jeu de Brick'it Up : livraisons, pose, ouvriers, achats, fin de maison. Sans affichage.
import { STAGES, UPGRADES, houseFor, params, itemValue, upgradeCost, tierOf, TIER_STEP } from './rules.js';
import { buildHouse, stageCounts } from './house.js';

export const OFFLINE_MAX = 8 * 3600; // on rattrape au plus 8 h d'absence

export function freshState() {
  return { v: 1, level: 1, stars: 0, credits: 0, placed: 0, stock: 0, deliveryT: 0, workerT: 0, up: Object.fromEntries(UPGRADES.map(u => [u.key, 0])), total: 0, lastSeen: Date.now() };
}

export class Game {
  constructor(state) {
    this.s = { ...freshState(), ...(state || {}) };
    this.s.up = { ...freshState().up, ...(this.s.up || {}) };
    this.listeners = { place: [], deliver: [], level: [] };
    this.loadHouse();
  }
  on(ev, fn) { this.listeners[ev].push(fn); }
  emit(ev, ...a) { for (const f of this.listeners[ev]) f(...a); }

  loadHouse() {
    this.house = houseFor(this.s.level);
    this.plan = buildHouse(this.house);
    this.items = this.plan.items;
    this.counts = stageCounts(this.items);
    this.s.placed = Math.min(this.s.placed, this.items.length);
  }
  get p() { return params(this.s.up, this.s.stars); }
  get remaining() { return this.items.length - this.s.placed; }
  get done() { return this.s.placed >= this.items.length; }
  get stage() { return this.done ? STAGES.length - 1 : this.items[this.s.placed].stage; }
  // Avancement dans l'étape en cours : [posés, total]
  stageProgress() {
    const k = this.stage; let before = 0;
    for (let i = 0; i < k; i++) before += this.counts[i];
    return [this.s.placed - before, this.counts[k]];
  }
  nextValue() { return itemValue(this.stage, this.s.level, this.p); }

  // Avance le temps : livraisons du camion et pose automatique par les ouvriers
  update(dt) {
    const s = this.s, p = this.p;
    if (this.done) return;
    const room = () => Math.min(p.cap, this.remaining) - s.stock;
    // Livraisons : le minuteur s'arrête quand l'entrepôt est plein
    if (room() > 0) {
      s.deliveryT += dt;
      while (s.deliveryT >= p.delivery && room() > 0) {
        s.deliveryT -= p.delivery;
        const n = Math.min(p.batch, room()); s.stock += n; this.emit('deliver', n);
      }
      if (room() <= 0) s.deliveryT = 0;
    } else s.deliveryT = 0;
    // Ouvriers : chacun pose un élément toutes les workerTime secondes, s'il y a du stock
    if (p.workers > 0) {
      s.workerT += dt * p.workers;
      while (s.workerT >= p.workerTime && s.stock > 0 && !this.done) { s.workerT -= p.workerTime; this.place(true); }
      if (s.stock === 0) s.workerT = Math.min(s.workerT, p.workerTime);
    }
  }

  // Pose un élément (bouton ou ouvrier). Renvoie l'élément posé, ou null.
  place(byWorker = false) {
    const s = this.s;
    if (s.stock <= 0 || this.done) return null;
    const it = this.items[s.placed], gain = itemValue(it.stage, s.level, this.p);
    s.placed++; s.stock--; s.credits += gain; s.total += gain;
    this.emit('place', it, gain, byWorker, s.placed - 1);
    return it;
  }

  cost(key) { return upgradeCost(key, this.s.up[key], this.s.level); }
  canBuy(key) { return this.s.credits >= this.cost(key); }
  buy(key) {
    const c = this.cost(key); if (this.s.credits < c) return false;
    this.s.credits -= c; this.s.up[key]++;
    return { tierUp: this.s.up[key] % TIER_STEP === 0, tier: tierOf(this.s.up[key]) };
  }

  // Maison terminée : une étoile (+10 % de gains pour toujours), améliorations remises à zéro, maison suivante
  nextLevel() {
    const s = this.s; if (!this.done) return false;
    s.stars++; s.level++; s.placed = 0; s.stock = 0; s.deliveryT = 0; s.workerT = 0;
    for (const k in s.up) s.up[k] = 0;
    this.loadHouse(); this.emit('level', s.level);
    return true;
  }

  // Rattrapage de l'absence : on fait tourner le jeu par pas d'une seconde (les poses des ouvriers comptent)
  catchUp(now = Date.now()) {
    const away = Math.min(OFFLINE_MAX, Math.max(0, (now - (this.s.lastSeen || now)) / 1000));
    const before = { credits: this.s.credits, placed: this.s.placed };
    const silent = this.listeners; this.listeners = { place: [], deliver: [], level: [] };
    for (let t = 0; t < away && !this.done; t += 1) this.update(Math.min(1, away - t));
    this.listeners = silent; this.s.lastSeen = now;
    return { away, credits: this.s.credits - before.credits, placed: this.s.placed - before.placed };
  }
}
