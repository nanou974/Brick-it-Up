// Partie réelle dans le navigateur : on touche le bouton de pose, on achète, on regarde le camion et les ouvriers
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('www'), out = process.argv[2] || 'tools/out';
fs.mkdirSync(out, { recursive: true });
const ty = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', ty[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(8778);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:8778/index.html'); await p.waitForTimeout(3000);
await p.click('#b-start');
// accélère la livraison pour le test : on avance le minuteur
await p.evaluate(() => { window.__bu.game.s.deliveryT = 9.2; });
await p.waitForTimeout(1300); await p.screenshot({ path: `${out}/p1-camion.png` });
await p.click('#b-pose', { force: true }); await p.waitForTimeout(150); await p.screenshot({ path: `${out}/p2-chute.png` });
const st = await p.evaluate(() => ({ placed: window.__bu.game.s.placed, credits: window.__bu.game.s.credits }));
// achats : crédits fictifs, on achète 5 camions (palier) et 3 ouvriers
await p.evaluate(() => { window.__bu.game.s.credits = 1e5; }); await p.waitForTimeout(400);
for (let i = 0; i < 5; i++) { await p.click('.card[data-key=camion] button', { force: true }); await p.waitForTimeout(150); }
for (let i = 0; i < 3; i++) { await p.click('.card[data-key=ouvrier] button', { force: true }); await p.waitForTimeout(150); }
for (let i = 0; i < 6; i++) { await p.click('.card[data-key=stock] button', { force: true }); await p.waitForTimeout(150); }
await p.waitForTimeout(400); await p.screenshot({ path: `${out}/p3-palier.png` });
await p.evaluate(() => { window.__bu.game.s.deliveryT = 9.5; });
await p.waitForTimeout(6000); await p.screenshot({ path: `${out}/p4-ouvriers.png` });
const st2 = await p.evaluate(() => ({ placed: window.__bu.game.s.placed, stock: window.__bu.game.s.stock, up: window.__bu.game.s.up }));
// absence de 20 minutes
await p.evaluate(() => { const g = window.__bu.game; g.s.lastSeen = Date.now() - 20 * 60000; window.__bu.save = () => {}; document.dispatchEvent(new Event('visibilitychange')); });
await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/p5-absence.png` });
console.log(st, st2, 'absence', await p.evaluate(() => document.getElementById('v-awaytxt').innerText));
console.log('erreurs', errs);
await b.close(); srv.close();
