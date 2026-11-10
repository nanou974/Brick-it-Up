// Test des commandes : appui maintenu sur le bouton, tapes sur le chantier, musique
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('www'), out = process.argv[2] || 'tools/out';
fs.mkdirSync(out, { recursive: true });
const ty = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', ty[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(8779);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:8779/index.html'); await p.waitForTimeout(3000);
await p.click('#b-start'); await p.waitForTimeout(1500);
const music = await p.evaluate(() => { const s = window.__bu.sfx; return { ctx: s.ctx?.state, decoded: !!s.musicBuf, duree: s.musicBuf?.duration?.toFixed(2), joue: !!s.musicSrc }; });
// Appui maintenu : 12 éléments en stock, on garde le doigt 2 s
await p.evaluate(() => { const g = window.__bu.game; g.s.stock = 12; g.s.up.stock = 6; });
const bb = await p.locator('#b-pose').boundingBox();
const before = await p.evaluate(() => window.__bu.game.s.placed);
await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down();
await p.waitForTimeout(2000); await p.mouse.up();
const afterHold = await p.evaluate(() => window.__bu.game.s.placed);
await p.waitForTimeout(500);
const afterRelease = await p.evaluate(() => window.__bu.game.s.placed);
// Tapes : stock vidé, minuteur à zéro, 20 tapes rapides sur le chantier
await p.evaluate(() => { const g = window.__bu.game; g.s.stock = 0; g.s.deliveryT = 0; g.s.rushT = 0; });
const t0 = Date.now();
for (let i = 0; i < 20; i++) await p.mouse.click(200, 300);
const rush = await p.evaluate(() => ({ deliveryT: window.__bu.game.s.deliveryT.toFixed(2), rushT: (window.__bu.game.s.rushT || 0).toFixed(2), stock: window.__bu.game.s.stock }));
const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
await p.screenshot({ path: `${out}/rush.png` });
// Plafond : 100 tapes de plus ne doivent pas dépasser 60 % de l'intervalle par livraison
for (let i = 0; i < 60; i++) await p.mouse.click(200, 300);
const cap = await p.evaluate(() => ({ stock: window.__bu.game.s.stock, rushT: (window.__bu.game.s.rushT || 0).toFixed(2) }));
console.log({ music, hold: { avant: before, pendant2s: afterHold - before, apresRelache: afterRelease - afterHold }, rush, elapsed, cap });
console.log('erreurs', errs);
await b.close(); srv.close();
