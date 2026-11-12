// Vérifie : passage à la maison suivante (la maison finie rejoint la ville) et migration d'une ancienne sauvegarde
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('www'), out = 'tools/out/ville'; fs.mkdirSync(out, { recursive: true });
const ty = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', ty[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(8796);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:8796/index.html'); await p.waitForTimeout(2500);
// 1) ancienne sauvegarde (version 2) en cours de maison 3
const k = 'brick-it-up-save';
const saved = await p.evaluate(() => { const s = JSON.parse(JSON.stringify(window.__bu.game.s)); s.v = 2; s.level = 3; s.placed = 20; return JSON.stringify(s); });
await p.close({ runBeforeUnload: false });
const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push(e.message)); await p2.addInitScript(([k, v]) => { if (!sessionStorage.getItem('inj')) { localStorage.setItem(k, v); sessionStorage.setItem('inj', '1'); } }, [k, saved]);
await p2.goto('http://localhost:8796/index.html'); console.log('après chargement', await p2.evaluate(() => JSON.parse(localStorage.getItem('brick-it-up-save') || 'null')?.level), await p2.evaluate(() => window.__bu.game.s.level)); await p2.waitForTimeout(2500); await p2.click('#b-start'); await p2.waitForTimeout(800);
console.log('migration', await p2.evaluate(() => { const { game } = window.__bu; const v = game.items.filter(i => i.stage === 0).length; return { v: game.s.v, level: game.s.level, placed: game.s.placed, voirie: v, total: game.items.length }; }));
// 2) finir la maison et passer à la suivante
const r = await p2.evaluate(async () => { const { game, site } = window.__bu; game.s.placed = game.items.length; game.nextLevel(); site.setHouse(game); while (site.city.queue.length) site.city.update(); return { level: game.s.level, placed: game.s.placed, coins: game.s.credits, stars: game.s.stars, built: site.city.buildings.size, items: game.items.length }; });
console.log('après passage', r);
await p2.waitForTimeout(1500); await p2.screenshot({ path: `${out}/transition.png`, clip: { x: 0, y: 0, width: 390, height: 640 } });
// 3) phase voirie : poser quelques éléments à la main
for (let i = 0; i < 6; i++) { await p2.evaluate(() => { window.__bu.game.s.stock = 3; }); await p2.click('#b-pose', { force: true }); await p2.waitForTimeout(250); }
console.log('posés en voirie', await p2.evaluate(() => window.__bu.game.s.placed));
await p2.waitForTimeout(1200); await p2.screenshot({ path: `${out}/voirie.png`, clip: { x: 0, y: 0, width: 390, height: 640 } });
console.log('erreurs', errs.slice(0, 5)); await b.close(); srv.close();
