// Simulation d'un joueur actif : il pose dès qu'un élément est livré (jusqu'à 4 poses/s)
// et achète l'amélioration la moins chère dès qu'il peut. Affiche la durée de chaque maison.
import { Game } from '../src/game/game.js';
import { UPGRADES, PERKS } from '../src/game/rules.js';
const LEVELS = +(process.env.LEVELS || 12), TAP = +(process.env.TAP || 4), BUY_PERKS = process.env.PERKS === '1';
const g = new Game();
let totalT = 0;
for (let L = 1; L <= LEVELS; L++) {
  let t = 0, tapT = 0, buys = 0;
  while (!g.done && t < 6 * 3600) {
    const dt = 0.05; t += dt; tapT += dt;
    g.update(dt);
    if (tapT >= 1 / TAP && g.s.stock > 0) { tapT = 0; g.place(); }
    for (;;) { const k = UPGRADES.map(u => u.key).sort((a, b) => g.cost(a) - g.cost(b))[0]; if (!g.buy(k)) break; buys++; }
  }
  totalT += t;
  console.log(`Maison ${String(L).padStart(2)} ${g.house.name.padEnd(20)} ${String(g.items.length).padStart(4)} éléments  ${(t / 60).toFixed(1).padStart(5)} min  achats ${String(buys).padStart(3)}  ${JSON.stringify(g.s.up)}`);
  g.nextLevel();
  // Boutique d'étoiles : achète l'amélioration permanente la moins chère tant que possible
  while (BUY_PERKS) { const k = PERKS.map(p => p.key).filter(k => g.perkCost(k) !== null).sort((a, b) => g.perkCost(a) - g.perkCost(b))[0]; if (!k || !g.buyPerk(k)) break; }
}
console.log(`Total ${(totalT / 60).toFixed(0)} min`);
