// Règles et économie de Brick'it Up (sans dépendance : utilisable par le jeu et par la simulation)

// ---------- Étapes de construction ----------
// Chaque maison se construit dans cet ordre. `val` = crédits rapportés par élément posé au niveau 1.
export const STAGES = [
  { key: 'fond', name: 'Fondations', item: 'parpaing', items: 'parpaings', val: 1 },
  { key: 'murs', name: 'Murs', item: 'brique', items: 'briques', val: 1 },
  { key: 'charp', name: 'Charpente', item: 'poutre', items: 'poutres', val: 4 },
  { key: 'toit', name: 'Toiture', item: 'tuile', items: 'tuiles', val: 2 },
  { key: 'menu', name: 'Menuiseries', item: 'fenêtre', items: 'fenêtres', val: 6 },
  { key: 'fini', name: 'Finitions', item: 'décor', items: 'décors', val: 5 },
];

// ---------- Maisons ----------
// w × d : emprise en cases, floors : étages. Après la dernière, on reprend la liste en plus grand.
export const HOUSES = [
  { name: 'Cabanon', w: 4, d: 3, floors: 1, wall: 0xC8553D, roof: 0x8E3B2E },
  { name: 'Maisonnette', w: 5, d: 4, floors: 1, wall: 0xE8D8B8, roof: 0xB5512F },
  { name: 'Petite maison', w: 6, d: 4, floors: 1, wall: 0xF2E6CF, roof: 0x6B4A3A },
  { name: 'Maison de campagne', w: 7, d: 5, floors: 1, wall: 0xD9C29A, roof: 0xA0452B },
  { name: 'Maison à étage', w: 6, d: 5, floors: 2, wall: 0xEFEFEA, roof: 0x45505E },
  { name: 'Grande maison', w: 8, d: 5, floors: 2, wall: 0xF5DEB3, roof: 0xB5512F },
  { name: 'Villa', w: 9, d: 6, floors: 2, wall: 0xFAFAF5, roof: 0xC9663A, pool: true },
  { name: 'Manoir', w: 10, d: 7, floors: 3, wall: 0xBFA58A, roof: 0x3E4652 },
  { name: 'Petit immeuble', w: 8, d: 6, floors: 4, wall: 0xE6C9A8, roof: 0x5A3D33 },
  { name: 'Château', w: 12, d: 8, floors: 3, wall: 0xB8B2A6, roof: 0x34495E, towers: true },
];
export function houseFor(level) {
  const i = (level - 1) % HOUSES.length, lap = Math.floor((level - 1) / HOUSES.length);
  const h = { ...HOUSES[i] };
  if (lap > 0) { h.w += lap; h.d += lap; h.name += ` ${'★'.repeat(Math.min(lap, 3))}`; }
  return h;
}
// Les gains et les prix grandissent avec le niveau (×1,7 par maison)
export const levelMult = (level) => Math.pow(1.7, level - 1);
// Les prix montent un peu plus vite que les gains : chaque maison demande un peu plus de temps que la précédente
export const COST_GROWTH = 1.85;
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

// Paramètres de jeu dérivés des améliorations (et des étoiles gagnées sur les maisons terminées)
export function params(up, stars = 0) {
  const batch = 1 + (up.camion || 0);
  return {
    value: (1 + 0.4 * eff(up.valeur)) * (1 + 0.05 * stars),   // multiplicateur de gains
    delivery: Math.max(0.8, 10 * Math.pow(0.86, eff(up.livraison))), // secondes entre deux livraisons
    batch,                                                    // éléments apportés par le camion
    cap: batch + 2 * (up.stock || 0),                         // stock maximum en attente
    workers: up.ouvrier || 0,                                 // chaque ouvrier pose un élément…
    workerTime: Math.max(1.2, 6 * Math.pow(0.93, Math.max(0, (up.ouvrier || 0) - 1))), // …toutes les N secondes
  };
}
export function itemValue(stageIndex, level, p) {
  return Math.max(1, Math.round(STAGES[stageIndex].val * levelMult(level) * p.value));
}
