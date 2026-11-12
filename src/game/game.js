// Moteur de jeu de Brick'it Up : livraisons, pose, ouvriers, achats, fin de maison, boutique d'étoiles,
// revenu hors ligne. Sans affichage.
import { STAGES, UPGRADES, PERKS, COSMETICS, houseFor, params, itemValue, upgradeCost, perkCost, tierOf, TIER_STEP, CHEST_MIN_SHARE, CHEST_MAX_SHARE } from './rules.js';
import { buildHouse, stageCounts } from './house.js';
import { voirieItems } from './city.js';

export const RUSH_MAX = 0.6; // tapes sur l'écran : au plus 60 % de l'intervalle par livraison
const RATE_TAU = 180;        // le revenu de jeu est mesuré sur environ 3 minutes

export function freshState() {
  return {
    v: 3, level: 1, stars: 0, starsTotal: 0, credits: 0, placed: 0, stock: 0, deliveryT: 0, workerT: 0, rushT: 0,
    up: Object.fromEntries(UPGRADES.map(u => [u.key, 0])),
    perks: Object.fromEntries(PERKS.map(p => [p.key, 0])),
    owned: { truck: ['jaune'], worker: ['orange'], decor: ['prairie'] },
    equip: { truck: 'jaune', worker: 'orange', decor: 'prairie' },
    rate: 0,      // pièces gagnées par seconde de jeu (moyenne glissante), base du revenu hors ligne
    tripTime: 8,  // durée moyenne d'un aller-retour d'ouvrier (mesurée en jeu), pour le travail hors ligne
    chest: 0,     // (ancien coffre hors ligne : rendu au chargement)
    chestAt: Date.now() + 20 * 60000, // moment où le prochain coffre du chantier sera prêt
    total: 0, lastSeen: Date.now(),
  };
}

export class Game {
  constructor(state) {
    const f = freshState();
    this.s = { ...f, ...(state || {}) };
    this.s.up = { ...f.up, ...(this.s.up || {}) };
    this.s.perks = { ...f.perks, ...(this.s.perks || {}) };
    this.s.owned = { ...f.owned, ...(this.s.owned || {}) };
    this.s.equip = { ...f.equip, ...(this.s.equip || {}) };
    if (this.s.v < 2) { this.s.starsTotal = this.s.stars; this.s.v = 2; } // ancienne sauvegarde : les étoiles deviennent une monnaie
    if (this.s.v < 3) { this.s.v = 3; this.migrateVoirie = true; } // la voirie s'ajoute avant la maison en cours
    if (this.s.chest > 0) { this.s.credits += this.s.chest; this.s.chest = 0; } // ancien coffre hors ligne : on rend les pièces
    this.listeners = { place: [], deliver: [], level: [] };
    this.earnedTick = 0;
    this.liveWorkers = false; // true : ce sont les ouvriers visibles qui posent (à la fin de leur trajet)
    this.loadHouse();
    // Ancienne sauvegarde au milieu d'une maison : la voirie de sa parcelle est considérée comme déjà faite
    if (this.migrateVoirie && this.s.placed > 0) this.s.placed = Math.min(this.items.length, this.s.placed + this.voirie.length);
    this.migrateVoirie = false;
  }
  on(ev, fn) { this.listeners[ev].push(fn); }
  emit(ev, ...a) { for (const f of this.listeners[ev]) f(...a); }

  loadHouse() {
    this.house = houseFor(this.s.level);
    this.plan = buildHouse(this.house);
    // D'abord la voirie (les rues qui bordent la parcelle), puis la maison
    this.voirie = voirieItems(this.s.level - 1, 0);
    this.items = [...this.voirie, ...this.plan.items];
    this.counts = stageCounts(this.items);
    this.s.placed = Math.min(this.s.placed, this.items.length);
  }
  get p() { return params(this.s.up, this.s.perks); }
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
  // rushOnly : seul le minuteur de livraison avance (tape sur l'écran), pas les ouvriers
  update(dt, rushOnly = false) {
    const s = this.s, p = this.p;
    if (this.done) return;
    const room = () => Math.min(p.cap, this.remaining) - s.stock;
    // Livraisons : le minuteur s'arrête quand l'entrepôt est plein
    if (room() > 0) {
      s.deliveryT += dt;
      while (s.deliveryT >= p.delivery && room() > 0) {
        s.deliveryT -= p.delivery;
        const n = Math.min(p.batch, room()); s.stock += n; s.rushT = 0; this.emit('deliver', n);
      }
      if (room() <= 0) s.deliveryT = 0;
    } else s.deliveryT = 0;
    // Ouvriers : chacun pose un élément toutes les workerTime secondes, s'il y a du stock
    // En jeu, les ouvriers visibles posent eux-mêmes (voir main.js) ; hors ligne, on compte un élément
    // par aller-retour mesuré (tripTime) et par ouvrier
    if (p.workers > 0 && !rushOnly && !this.liveWorkers) {
      const per = Math.max(2, s.tripTime || 8);
      s.workerT += dt * p.workers;
      while (s.workerT >= per && s.stock > 0 && !this.done) { s.workerT -= per; this.place(true); }
      if (s.stock === 0) s.workerT = Math.min(s.workerT, per);
    }
  }

  // Revenu de jeu (pièces par seconde), mesuré pendant qu'on joue : sert au revenu hors ligne
  trackRate(dt) {
    if (dt <= 0 || dt > 1) return;
    const k = dt / RATE_TAU;
    this.s.rate = this.s.rate * (1 - k) + (this.earnedTick / dt) * k;
    this.earnedTick = 0;
  }

  // Tape sur l'écran : la prochaine livraison arrive un peu plus vite (au plus 60 % de l'intervalle par livraison)
  rush() {
    const s = this.s, p = this.p;
    if (this.done || Math.min(p.cap, this.remaining) - s.stock <= 0) return 0;
    const left = p.delivery * RUSH_MAX - (s.rushT || 0), gain = Math.min(p.rushTap, left);
    if (gain <= 0) return 0;
    s.rushT = (s.rushT || 0) + gain; this.update(gain, true);
    return gain;
  }

  // Pose un élément (bouton ou ouvrier). Renvoie l'élément posé, ou null.
  place(byWorker = false) {
    const s = this.s;
    if (s.stock <= 0 || this.done) return null;
    const it = this.items[s.placed], gain = itemValue(it.stage, s.level, this.p);
    s.placed++; s.stock--; s.credits += gain; s.total += gain; this.earnedTick += gain;
    this.emit('place', it, gain, byWorker, s.placed - 1);
    return it;
  }

  // ---------- Améliorations de la maison (pièces) ----------
  cost(key) { return upgradeCost(key, this.s.up[key], this.s.level); }
  canBuy(key) { return this.s.credits >= this.cost(key); }
  buy(key) {
    const c = this.cost(key); if (this.s.credits < c) return false;
    this.s.credits -= c; this.s.up[key]++;
    return { tierUp: this.s.up[key] % TIER_STEP === 0, tier: tierOf(this.s.up[key]) };
  }

  // ---------- Boutique d'étoiles ----------
  perkCost(key) { return perkCost(key, this.s.perks[key]); }
  buyPerk(key) {
    const c = this.perkCost(key); if (c === null || this.s.stars < c) return false;
    this.s.stars -= c; this.s.perks[key]++;
    return true;
  }
  cosmetic(kind, key) { return COSMETICS[kind].find(c => c.key === key); }
  // Achète (si besoin) puis équipe un élément de personnalisation
  equip(kind, key) {
    const c = this.cosmetic(kind, key); if (!c) return false;
    if (!this.s.owned[kind].includes(key)) {
      if (this.s.stars < c.cost) return false;
      this.s.stars -= c.cost; this.s.owned[kind].push(key);
    }
    this.s.equip[kind] = key;
    return true;
  }

  // Maison terminée : une étoile à dépenser dans la boutique, puis on repart de zéro
  // sur la maison suivante : pièces, améliorations, stock et livraison
  nextLevel() {
    const s = this.s; if (!this.done) return false;
    s.stars++; s.starsTotal++; s.level++; s.placed = 0; s.stock = 0; s.deliveryT = 0; s.workerT = 0; s.rushT = 0; s.credits = 0;
    for (const k in s.up) s.up[k] = 0;
    this.loadHouse(); this.emit('level', s.level);
    return true;
  }

  // Absence : plus aucun gain hors ligne, le chantier s'arrête quand l'appli est fermée.
  // (Seul le coffre du chantier continue de se remplir en temps réel.)
  catchUp(now = Date.now()) {
    const away = Math.max(0, (now - (this.s.lastSeen || now)) / 1000);
    this.s.lastSeen = now; this.earnedTick = 0;
    return { away };
  }

  // ---------- Coffre du chantier ----------
  chestLeft(now = Date.now()) { return Math.max(0, (this.s.chestAt - now) / 1000); }
  chestReady(now = Date.now()) { return now >= this.s.chestAt; }
  // Prix moyen des améliorations en ce moment
  avgUpgradeCost() { return UPGRADES.reduce((a, u) => a + this.cost(u.key), 0) / UPGRADES.length; }
  // Tirage du contenu à l'ouverture : entre 60 % et 90 % du prix moyen (jamais plus de 90 %)
  rollChest() { const k = CHEST_MIN_SHARE + Math.random() * (CHEST_MAX_SHARE - CHEST_MIN_SHARE); return Math.max(1, Math.floor(this.avgUpgradeCost() * k)); }
  collectChest(amount, now = Date.now()) {
    if (!this.chestReady(now)) return 0;
    this.s.credits += amount; this.s.chestAt = now + this.p.chestMinutes * 60000;
    return amount;
  }
  // Durée d'un aller-retour d'ouvrier, mesurée en jeu (moyenne glissante)
  noteTrip(sec) { if (sec > 0.5) this.s.tripTime = this.s.tripTime * 0.9 + sec * 0.1; }
}
