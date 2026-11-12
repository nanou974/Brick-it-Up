// Règles et économie de Brick'it Up (sans dépendance : utilisable par le jeu et par la simulation)

// ---------- Étapes de construction ----------
// Chaque maison se construit dans cet ordre. `val` = crédits rapportés par élément posé au niveau 1.
export const STAGES = [
  { key: 'voirie', name: 'Voirie', item: 'élément de voirie', items: 'éléments de voirie', val: 1 },
  { key: 'fond', name: 'Fondations', item: 'parpaing', items: 'parpaings', val: 1 },
  { key: 'murs', name: 'Murs', item: 'brique', items: 'briques', val: 1 },
  { key: 'charp', name: 'Charpente', item: 'poutre', items: 'poutres', val: 4 },
  { key: 'toit', name: 'Toiture', item: 'tuile', items: 'tuiles', val: 2 },
  { key: 'menu', name: 'Menuiseries', item: 'fenêtre', items: 'fenêtres', val: 6 },
  { key: 'fini', name: 'Finitions', item: 'décor', items: 'décors', val: 5 },
];

// ---------- Maisons ----------
// Le catalogue des 20 maisons et leurs variantes est dans houses.js
export { HOUSES, houseFor } from './houses.js';

// Les gains et les prix grandissent avec le niveau (×1,7 par maison)
export const levelMult = (level) => Math.pow(1.7, level - 1);
// Les prix montent un peu plus vite que les gains : chaque maison demande un peu plus de temps que la précédente
export const COST_GROWTH = 1.8;
export const costMult = (level) => Math.pow(COST_GROWTH, level - 1);

// ---------- Améliorations ----------
// Palier toutes les 5 améliorations : chaque achat compte pour 0,7 et chaque palier ajoute d'un coup 1,5.
export const TIER_STEP = 5;
export const tierOf = (n) => Math.floor((n || 0) / TIER_STEP);
export const eff = (n) => 0.7 * (n || 0) + 1.5 * tierOf(n);

export const UPGRADES = [
  { key: 'valeur', name: 'Rapport', desc: 'Crédits par élément posé', base: 5, grow: 1.42 },
  { key: 'livraison', name: 'Livraison', desc: 'Temps entre deux livraisons', base: 6, grow: 1.5 },
  { key: 'camion', name: 'Camion', desc: 'Éléments par livraison', base: 30, grow: 2.1 },
  { key: 'stock', name: 'Entrepôt', desc: 'Éléments stockés en attente', base: 10, grow: 1.6 },
  { key: 'ouvrier', name: 'Ouvriers', desc: 'Posent les éléments tout seuls', base: 45, grow: 1.9 },
];
export function upgradeCost(key, n, level) {
  const u = UPGRADES.find(u => u.key === key);
  return Math.ceil(u.base * 0.3 * Math.pow(u.grow, n) * costMult(level));
}

// ---------- Boutique d'étoiles : améliorations permanentes (jamais remises à zéro) ----------
// cost[k] = prix en étoiles du niveau k+1
export const PERKS = [
  { key: 'equipe', name: 'Équipe de départ', desc: (n) => `Chaque maison commence avec ${n} ouvrier${n > 1 ? 's' : ''}`, cost: [3, 6, 10] },
  { key: 'camion', name: 'Gros camion', desc: (n) => `Le camion livre ${n + 1} éléments dès le départ`, cost: [4, 8] },
  { key: 'express', name: 'Livraison express', desc: (n) => `Livraisons ${n * 10} % plus rapides`, cost: [2, 4, 6] },
  { key: 'tapes', name: 'Tapes efficaces', desc: (n) => `Chaque tape fait gagner ${(0.1 + 0.05 * n).toFixed(2).replace('.', ',')} s`, cost: [1, 3] },
  { key: 'coffre', name: 'Coffre rapide', desc: (n) => `Un coffre toutes les ${CHEST_MINUTES[n]} min`, cost: [2, 5] },
  { key: 'rapport', name: 'Rapport de base', desc: (n) => `+${n * 10} % de pièces sur chaque élément`, cost: [1, 2, 3, 4, 5] },
];
// Coffre du chantier : un coffre à récupérer toutes les 20 min (16 puis 12 avec « Coffre rapide »).
// Il contient entre 60 % et 90 % du prix moyen des améliorations au moment où on l'ouvre (jamais plus de 90 %).
export const CHEST_MINUTES = [20, 16, 12], CHEST_MIN_SHARE = 0.6, CHEST_MAX_SHARE = 0.9;
export const perkCost = (key, n) => PERKS.find(p => p.key === key).cost[n] ?? null; // null = niveau maximum atteint

// ---------- Personnalisation (achetée avec des étoiles) ----------
export const COSMETICS = {
  truck: [
    { key: 'jaune', name: 'Plateau jaune', model: 'plateau', color: 0xF2A900, cost: 0 },
    { key: 'rouge', name: 'Plateau rouge', model: 'plateau', color: 0xE5383B, cost: 1 },
    { key: 'benne-bleue', name: 'Benne bleue', model: 'benne', color: 0x2F6FD1, cost: 2 },
    { key: 'benne-verte', name: 'Benne verte', model: 'benne', color: 0x2BA84A, cost: 2 },
    { key: 'us-rouge', name: 'Américain rouge', model: 'americain', color: 0xC0262D, cost: 3 },
    { key: 'us-noir', name: 'Américain noir', model: 'americain', color: 0x1E2126, cost: 3 },
  ],
  worker: [
    { key: 'orange', name: 'Gilet orange', vest: 0xFF8A1F, hat: 0xFFD23F, cost: 0 },
    { key: 'bleu', name: 'Bleu de travail', vest: 0x2F6FD1, hat: 0xF7F7F2, cost: 1 },
    { key: 'vert', name: 'Gilet vert', vest: 0x3DBE5B, hat: 0xFF8A1F, cost: 1 },
    { key: 'rouge', name: 'Tenue rouge', vest: 0xE5383B, hat: 0xF7F7F2, cost: 1 },
    { key: 'chef', name: 'Chef de chantier', vest: 0xF7F7F2, hat: 0x1F3A5F, cost: 2 },
  ],
  decor: [
    { key: 'prairie', name: 'Prairie', cost: 0 },
    { key: 'mer', name: 'Bord de mer', cost: 2 },
    { key: 'montagne', name: 'Montagne enneigée', cost: 3 },
    { key: 'automne', name: "Campagne d'automne", cost: 2 },
    { key: 'ville', name: 'En ville', cost: 3 },
  ],
};

// Paramètres de jeu dérivés des améliorations de la maison (up) et des améliorations permanentes (perks)
export function params(up, perks = {}) {
  const batch = 1 + (up.camion || 0) + (perks.camion || 0);
  const workers = (up.ouvrier || 0) + (perks.equipe || 0);
  return {
    value: (1 + 0.4 * eff(up.valeur)) * (1 + 0.1 * (perks.rapport || 0)),     // multiplicateur de gains
    delivery: Math.max(0.8, 10 * Math.pow(0.86, eff(up.livraison)) * (1 - 0.1 * (perks.express || 0))), // secondes entre deux livraisons
    batch,                                                    // éléments apportés par le camion
    cap: batch + 2 * (up.stock || 0),                         // stock maximum en attente
    workers,                                                  // chaque ouvrier pose un élément…
    workerTime: Math.max(1.2, 6 * Math.pow(0.93, Math.max(0, workers - 1))), // …toutes les N secondes
    rushTap: 0.1 + 0.05 * (perks.tapes || 0),                 // secondes gagnées par tape sur le chantier
    chestMinutes: CHEST_MINUTES[perks.coffre || 0],          // intervalle entre deux coffres
  };
}
export function itemValue(stageIndex, level, p) {
  return Math.max(1, Math.round(STAGES[stageIndex].val * levelMult(level) * p.value));
}
