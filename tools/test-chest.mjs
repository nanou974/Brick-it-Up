// Test du coffre du chantier (toutes les 20 minutes, 60 à 90 % du prix moyen des améliorations)
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('www'), out = 'tools/out/coffre';
fs.mkdirSync(out, { recursive: true });
const ty = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', ty[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(8791);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8791/index.html'); await p.waitForTimeout(3000); await p.click('#b-start'); await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/1-attente.png` });
const t1 = await p.evaluate(() => document.getElementById('v-chesttime').textContent);
// Absence d'une heure : aucun gain, mais le coffre est prêt
await p.evaluate(() => { const g = window.__bu.game; g.s.up.valeur = 6; g.s.up.livraison = 4; g.s.credits = 100; g.s.lastSeen = Date.now() - 3600e3; g.s.chestAt = Date.now() - 1000; document.dispatchEvent(new Event('visibilitychange')); });
await p.waitForTimeout(800);
const afterAway = await p.evaluate(() => window.__bu.game.s.credits);
await p.screenshot({ path: `${out}/2-pret.png` });
await p.click('#b-chest', { force: true }); await p.waitForTimeout(500);
const shown = await p.evaluate(() => ({ montant: document.getElementById('v-chest').textContent, moyenne: Math.round(window.__bu.game.avgUpgradeCost()) }));
await p.screenshot({ path: `${out}/3-ouvert.png` });
await p.click('#b-away'); await p.waitForTimeout(400);
const after = await p.evaluate(() => ({ pièces: window.__bu.game.s.credits, prochainDans: Math.round(window.__bu.game.chestLeft() / 60) + ' min', bouton: document.getElementById('v-chesttime').textContent }));
// Tirages : jamais au-dessus de 90 %
const rolls = await p.evaluate(() => { const g = window.__bu.game, avg = g.avgUpgradeCost(); let mn = 9, mx = 0; for (let k = 0; k < 2000; k++) { const r = g.rollChest() / avg; mn = Math.min(mn, r); mx = Math.max(mx, r); } return [mn.toFixed(3), mx.toFixed(3)]; });
console.log({ t1, piecesApresAbsence: afterAway, shown, after, partMinMax: rolls }, errs);
await b.close(); srv.close();
