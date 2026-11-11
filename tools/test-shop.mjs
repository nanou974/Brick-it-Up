// Test de la boutique d'étoiles, des décors et du coffre hors ligne
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('www'), out = 'tools/out/shop';
fs.mkdirSync(out, { recursive: true });
const ty = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', ty[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(8782);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:8782/index.html'); await p.waitForTimeout(3000);
await p.click('#b-start');
await p.evaluate(() => { const g = window.__bu.game; g.s.stars = 25; g.s.level = 5; g.s.placed = 0; g.loadHouse(); g.s.placed = 120; window.__bu.site.setHouse(g); });
await p.click('#pill-stars'); await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/1-ameliorations.png` });
await p.click('button[data-perk=equipe]', { force: true }); await p.waitForTimeout(300);
await p.click('button[data-perk=rapport]', { force: true }); await p.waitForTimeout(300);
const perks = await p.evaluate(() => ({ perks: window.__bu.game.s.perks, stars: window.__bu.game.s.stars, workers: window.__bu.game.p.workers }));
await p.click('.tab[data-tab=looks]'); await p.waitForTimeout(300);
await p.click('button[data-key=benne-bleue]', { force: true }); await p.click('button[data-key=bleu]', { force: true });
await p.waitForTimeout(400); await p.screenshot({ path: `${out}/2-personnalisation.png` });
await p.click('#b-shopclose');
await p.addStyleTag({ content: '#cards,#posebox{opacity:.25}' });
for (const d of ['mer', 'montagne', 'automne', 'ville']) {
  await p.evaluate((d) => { const g = window.__bu.game; g.s.stars += 5; g.equip('decor', d); }, d);
  await p.evaluate(() => { document.querySelector('#pill-stars').click(); document.querySelector('#b-shopclose').click(); });
  await p.evaluate(() => { const { game, site } = window.__bu; const e = game.s.equip, t = game.cosmetic('truck', e.truck), w = game.cosmetic('worker', e.worker); site.setSkins({ truck: { model: t.model, color: t.color }, worker: { vest: w.vest, hat: w.hat }, decor: e.decor }); game.s.deliveryT = 8.5; });
  await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/3-decor-${d}.png` });
}
// Absence de 2 h : revenu mesuré à 3 pièces/s
await p.evaluate(() => { const g = window.__bu.game; g.s.rate = 3; g.s.lastSeen = Date.now() - 2 * 3600 * 1000; window.__bu.save = () => {}; document.dispatchEvent(new Event('visibilitychange')); });
await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/4-coffre.png` });
const before = await p.evaluate(() => ({ credits: window.__bu.game.s.credits, chest: window.__bu.game.s.chest, txt: document.getElementById('v-awaytxt').textContent }));
await p.click('#b-away'); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/5-recuperer.png` });
const after = await p.evaluate(() => ({ credits: window.__bu.game.s.credits, chest: window.__bu.game.s.chest }));
console.log(JSON.stringify({ perks, before, after }, null, 1));
console.log('erreurs', errs);
await b.close(); srv.close();
