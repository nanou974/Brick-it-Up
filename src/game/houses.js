// Catalogue des 30 constructions de Brick'it Up : 19 maisons, 10 bâtiments publics (pub: true) et le château, toujours le dernier.
// Leurs variantes aux tours suivants sont calculées par houseFor.
// Chaque maison est faite d'un volume principal (w × d cases, floors étages) et éventuellement d'ailes ou d'annexes.
//  wall   : matériau des murs (brique, pierre, bois, crepi) et couleur ; base = soubassement (rangs du bas)
//  roof   : type de toit (gable = 2 pans, steep = 2 pans très pentus, hip = 4 pans, shed = 1 pente, flat = plat, crenel = créneaux)
//  win    : fenêtres (std, few, many, baie = grandes baies), shutter : couleur des volets (null = aucun)
//  wings  : volumes ajoutés, calculés à partir du volume principal m
//  feats  : finitions et ajouts (voir house.js)

export const HOUSES = [
  { name: 'Cabanon', w: 4, d: 3, floors: 1, wall: { mat: 'brique', color: 0xC8553D }, roof: { type: 'shed', color: 0x6E3B2E },
    shutter: 0x2E7D4F, win: 'std', feats: ['chemin', 'massifs2', 'boite'] },
  { name: 'Chalet en bois', w: 5, d: 4, floors: 1, wall: { mat: 'bois', color: 0xA8713F }, roof: { type: 'steep', color: 0x4A3B30 },
    shutter: 0xC0392B, win: 'std', feats: ['terrasse', 'cheminee', 'buches', 'sapins', 'lampe'] },
  { name: 'Maisonnette', fem: true, w: 5, d: 4, floors: 1, wall: { mat: 'crepi', color: 0xF0E2C4 }, roof: { type: 'gable', color: 0xB5512F },
    shutter: 0x5B8C5A, win: 'std', feats: ['auvent', 'cloture', 'massifs4', 'boite', 'chemin'] },
  { name: 'Boulangerie', pub: true, fem: true, w: 6, d: 5, floors: 2, wall: { mat: 'crepi', color: 0xF3E3C3 }, base: { mat: 'pierre', color: 0xBFB29A, courses: 2 },
    roof: { type: 'gable', color: 0x8E3B2E }, shutter: 0x2F6FD1, win: 'std', feats: ['vitrine', 'store', 'enseigne-pain', 'terrasse-cafe', 'cheminee', 'massifs2'] },
  { name: 'Petite maison', fem: true, w: 6, d: 5, floors: 1, wall: { mat: 'brique', color: 0xD9A47A }, roof: { type: 'hip', color: 0x6B4A3A },
    shutter: 0x34495E, win: 'std', feats: ['cheminee', 'chemin', 'massifs4', 'lampe', 'boite'] },
  { name: 'Maison de pêcheur', fem: true, w: 6, d: 4, floors: 1, wall: { mat: 'crepi', color: 0xFAFAF7 }, roof: { type: 'gable', color: 0x55606E },
    shutter: 0x2F6FD1, win: 'std', feats: ['barque', 'filet', 'cheminee', 'chemin', 'massifs2'] },
  { name: 'Bureau de poste', pub: true, w: 8, d: 5, floors: 1, wall: { mat: 'crepi', color: 0xEDE3CF }, base: { mat: 'pierre', color: 0xB9AE98, courses: 2 },
    roof: { type: 'hip', color: 0x45505E }, shutter: 0x2F4FA8, win: 'std', feats: ['enseigne-poste', 'boite-poste', 'fourgon-poste', 'chemin', 'lampe2', 'massifs4'] },
  { name: 'Longère', fem: true, w: 10, d: 4, floors: 1, wall: { mat: 'pierre', color: 0xB9AE98 }, roof: { type: 'gable', color: 0x45505E, k: 0.8 },
    shutter: 0x7A8B5C, win: 'few', feats: ['lucarnes3', 'cheminee2', 'massifs4', 'chemin'] },
  { name: 'Maison normande', fem: true, w: 7, d: 5, floors: 1, wall: { mat: 'crepi', color: 0xF2E8D0 }, roof: { type: 'steep', color: 0x8A6A3A },
    shutter: null, win: 'std', feats: ['colombages', 'lucarnes2', 'cloture', 'massifs4', 'pommier'] },
  { name: 'École', pub: true, fem: true, w: 12, d: 5, floors: 2, wall: { mat: 'brique', color: 0xD08A5C }, base: { mat: 'pierre', color: 0xC2B49A, courses: 2 },
    roof: { type: 'gable', color: 0x55606E }, shutter: null, win: 'many', feats: ['horloge', 'cour', 'arbres-cour', 'massifs4'] },
  { name: 'Mas provençal', w: 7, d: 4, floors: 1, wall: { mat: 'crepi', color: 0xE3B776 }, roof: { type: 'gable', color: 0xD9876A, k: 0.75 },
    shutter: 0x6FA8A0, win: 'std', wings: (m) => [{ w: 4, d: 4, floors: 1, x: m.w / 2 - 2, z: m.d / 2 + 1.8, rot: 1, omit: ['right'], door: null }], // aile en retour : plan en L
    feats: ['pergola', 'puits', 'oliviers', 'lavande'] },
  { name: 'Maison à étage', fem: true, w: 6, d: 5, floors: 2, wall: { mat: 'brique', color: 0xB4533B }, roof: { type: 'gable', color: 0xB5512F },
    shutter: 0xF2F2EC, win: 'std', feats: ['balcon', 'cheminee', 'massifs4', 'boite', 'lampe'] },
  { name: 'Caserne de pompiers', pub: true, fem: true, w: 10, d: 6, floors: 2, wall: { mat: 'brique', color: 0xB0473A }, roof: { type: 'flat', color: 0x7E8187 },
    shutter: null, win: 'std', door: 'porte-garage',
    wings: (m) => [{ w: 2, d: 2, floors: 5, x: m.w / 2 + 1, z: -m.d / 2 + 1, roof: { type: 'flat', color: 0x7E8187 }, omit: ['left'], door: null, win: 'none' }], // tour de séchage des tuyaux
    feats: ['portes-rouges', 'enseigne-pompiers', 'camion-pompier', 'lampe2', 'massifs2'] },
  { name: 'Maison moderne', fem: true, w: 8, d: 5, floors: 2, wall: { mat: 'crepi', color: 0xF4F4F0 }, roof: { type: 'flat', color: 0x8E9196 },
    shutter: null, win: 'baie', feats: ['panneaux', 'terrasse', 'haie', 'lampe2'] },
  { name: 'Maison de ville', fem: true, w: 4, d: 5, floors: 3, wall: { mat: 'brique', color: 0x9C5B44 }, roof: { type: 'gable', color: 0x3E4652 },
    shutter: 0x1F3A5F, win: 'std', feats: ['bow', 'cheminee', 'boite', 'massifs2'] },
  { name: 'Mairie', pub: true, fem: true, w: 12, d: 7, floors: 2, wall: { mat: 'pierre', color: 0xE6DCC6 }, base: { mat: 'pierre', color: 0xC9BBA0, courses: 2 },
    roof: { type: 'hip', color: 0x34495E }, shutter: null, win: 'many', feats: ['colonnade', 'marches', 'mats-drapeaux', 'massifs4', 'lampe2'] },
  { name: 'Grande maison', fem: true, w: 8, d: 5, floors: 2, wall: { mat: 'crepi', color: 0xE8D8B8 }, roof: { type: 'hip', color: 0x7A4A3A },
    shutter: 0x8E3B2E, win: 'std', wings: (m) => [{ w: 4, d: 5, floors: 1, x: m.w / 2 + 2, z: 0, roof: { type: 'flat', color: 0x8E9196 }, omit: ['left'], door: 'porte-garage', win: 'none' }],
    feats: ['cheminee', 'terrasse-cote', 'massifs4', 'lampe', 'boite', 'allee-garage'] },
  { name: 'Chalet de montagne', w: 8, d: 6, floors: 2, wall: { mat: 'bois', color: 0x8A5A32 }, base: { mat: 'pierre', color: 0x9C968C, courses: 3 },
    roof: { type: 'steep', color: 0x3E3A36 }, shutter: 0x2E7D4F, win: 'std', feats: ['balcon-large', 'cheminee-pierre', 'sapins', 'buches'] },
  { name: 'Église', pub: true, fem: true, w: 10, d: 6, floors: 2, wall: { mat: 'pierre', color: 0xC9C0AE }, roof: { type: 'steep', color: 0x45505E },
    shutter: null, win: 'none', door: null,
    wings: (m) => [{ w: 3, d: 3, floors: 5, x: m.w / 2 + 1.5, z: 0, roof: { type: 'flat', color: 0x9A948A }, omit: ['left'], door: 'porte', win: 'none' }], // clocher
    feats: ['fleche', 'rosace', 'vitraux', 'parvis', 'ifs', 'massifs2'] },
  { name: 'Villa', fem: true, w: 9, d: 6, floors: 2, wall: { mat: 'crepi', color: 0xFAFAF5 }, roof: { type: 'hip', color: 0xC9663A },
    shutter: 0x2F8F9D, win: 'many', feats: ['piscine', 'palmiers', 'transats', 'terrasse', 'massifs4'] },
  { name: 'Ferme', fem: true, w: 7, d: 5, floors: 2, wall: { mat: 'pierre', color: 0xC2B49A }, roof: { type: 'gable', color: 0xA0452B },
    shutter: 0x7A4A2B, win: 'std',
    wings: (m) => [{ w: 7, d: 5, floors: 2, x: m.w / 2 + 3.5, z: 0, wall: { mat: 'bois', color: 0x7A4A2B }, roof: { type: 'gable', color: 0x5E5348 }, omit: ['left'], door: 'porte-grange', win: 'few' }],
    feats: ['foin', 'puits', 'cloture', 'massifs2'] },
  { name: 'Gare', pub: true, fem: true, w: 12, d: 5, floors: 1, wall: { mat: 'brique', color: 0xC9875A }, base: { mat: 'pierre', color: 0xB9AE98, courses: 2 },
    roof: { type: 'gable', color: 0x55606E, k: 0.8 }, shutter: null, win: 'many', feats: ['horloge', 'quai', 'bancs', 'rails', 'train', 'lampe2'] },
  { name: "Maison d'architecte", fem: true, w: 7, d: 5, floors: 1, wall: { mat: 'crepi', color: 0xF7F7F4 }, roof: { type: 'flat', color: 0x8E9196 },
    shutter: null, win: 'baie',
    wings: (m) => [{ w: 5, d: 4, floors: 2, x: m.w / 2 + 2.5, z: -0.5, wall: { mat: 'crepi', color: 0x6E7378 }, roof: { type: 'flat', color: 0x8E9196 }, omit: ['left'], door: null, win: 'baie' }],
    feats: ['veranda', 'terrasse', 'haie', 'lampe2'] },
  { name: 'Supermarché', pub: true, w: 12, d: 7, floors: 1, wall: { mat: 'crepi', color: 0xF4F4F0 }, roof: { type: 'flat', color: 0x8E9196 },
    shutter: null, win: 'baie', feats: ['enseigne-super', 'parking', 'voitures', 'chariots', 'massifs2'] },
  { name: 'Manoir', w: 10, d: 7, floors: 3, wall: { mat: 'pierre', color: 0xBFA58A }, roof: { type: 'hip', color: 0x3E4652 },
    shutter: 0x2C3E50, win: 'std', feats: ['porche', 'tourelle', 'lucarnes3', 'cheminee2', 'massifs4', 'lampe2', 'allee'] },
  { name: 'Hôpital', pub: true, w: 10, d: 6, floors: 4, wall: { mat: 'crepi', color: 0xF7F7F2 }, roof: { type: 'flat', color: 0x8E9196 },
    shutter: null, win: 'many',
    wings: (m) => [-1, 1].map(s => ({ w: 4, d: 5, floors: 3, x: s * (m.w / 2 + 2), z: -0.5, wall: { mat: 'crepi', color: 0xDDE8EE }, roof: { type: 'flat', color: 0x8E9196 }, omit: [s > 0 ? 'left' : 'right'], door: null, win: 'many' })),
    feats: ['croix-verte', 'helipad', 'ambulance', 'chemin', 'massifs4', 'lampe2'] },
  { name: 'Petit immeuble', w: 8, d: 6, floors: 4, wall: { mat: 'brique', color: 0xB86B4A }, roof: { type: 'flat', color: 0x7E8187 },
    shutter: null, win: 'many', feats: ['balcons-etages', 'auvent', 'boites3', 'antennes', 'massifs2'] },
  { name: 'Usine', pub: true, fem: true, w: 14, d: 8, floors: 2, wall: { mat: 'brique', color: 0xA85A3C }, roof: { type: 'flat', color: 0x6E7378 },
    shutter: null, win: 'few', door: 'porte-grange', feats: ['sheds', 'cheminees-usine', 'citerne', 'palettes', 'fourgon-usine'] },
  { name: 'Hôtel particulier', w: 12, d: 7, floors: 3, wall: { mat: 'crepi', color: 0xF1E6CF }, base: { mat: 'pierre', color: 0xC9BBA0, courses: 2 },
    roof: { type: 'gable', color: 0x2C3E50, k: 0.7 }, shutter: null, win: 'many', feats: ['grille', 'balcon', 'balcons-etages', 'cheminee2', 'massifs4', 'lampe2', 'allee'] },
  { name: 'Château', w: 12, d: 8, floors: 3, wall: { mat: 'pierre', color: 0xB8B2A6 }, roof: { type: 'crenel', color: 0x9A948A },
    shutter: null, win: 'few', feats: ['tours', 'drapeaux', 'douves', 'pontlevis', 'massifs4'] },
];

// ---------- Variantes des tours suivants ----------
// Couleurs de murs et de toits, matériaux échangés et un ajout supplémentaire par tour : jamais deux fois la même maison.
const PALETTES = [
  { wall: 0xD98C5F, roof: 0x5A3D33, shutter: 0x2E7D4F }, { wall: 0xE9E3D3, roof: 0x34495E, shutter: 0xB5512F },
  { wall: 0xC9B79C, roof: 0x8E3B2E, shutter: 0x1F3A5F }, { wall: 0xF3D9B1, roof: 0x6B4A3A, shutter: 0x7B4FD1 },
  { wall: 0xB7C4C8, roof: 0x45505E, shutter: 0xE5383B }, { wall: 0xE8C9A8, roof: 0xA0452B, shutter: 0x2F8F9D },
  { wall: 0xD6D2C4, roof: 0x3E4652, shutter: 0xF2A900 },
];
const MAT_SWAP = { brique: 'pierre', pierre: 'crepi', crepi: 'brique', bois: 'bois' };
const EXTRAS = ['veranda', 'pergola', 'terrasse', 'puits', 'cloture', 'panneaux', 'palmiers', 'tourelle', 'lampe2', 'haie'];
const EXTRAS_PUB = ['lampe2', 'haie', 'palmiers', 'panneaux', 'arbres-cour', 'massifs4'];

export function houseFor(level) {
  const n = HOUSES.length, i = (level - 1) % n, lap = Math.floor((level - 1) / n);
  const b = HOUSES[i], h = { ...b, wall: { ...b.wall }, roof: { ...b.roof }, feats: [...b.feats], index: i, lap };
  if (lap > 0) {
    const grow = Math.min(lap, 3);
    h.w += grow; h.d += Math.min(grow, 2);
    const p = PALETTES[(i * 3 + lap) % PALETTES.length];
    if (h.roof.type !== 'crenel' && h.roof.type !== 'flat') h.roof.color = p.roof;
    h.wall.color = p.wall;
    if (lap % 2 === 1) h.wall.mat = MAT_SWAP[h.wall.mat];
    if (h.shutter !== null) h.shutter = p.shutter;
    for (let k = 0; k < Math.min(lap, 3); k++) {
      const L = b.pub ? EXTRAS_PUB : EXTRAS, extra = L[(i + lap * 3 + k * 5) % L.length];
      if (!h.feats.includes(extra) && !(extra === 'tourelle' && h.feats.includes('tours'))) h.feats.push(extra);
    }
    h.name = `${b.name} ${'★'.repeat(Math.min(lap, 3))}`;
  }
  return h;
}
