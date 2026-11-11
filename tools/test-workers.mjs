// Test des allers-retours des ouvriers : marche à pied, contournement de la construction, durée des trajets
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('www'), out = 'tools/out/ouvriers', L = +(process.argv[2] || 1), placed = +(process.argv[3] || 40);
fs.mkdirSync(out, { recursive: true });
const ty = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', ty[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(8784);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:8784/index.html'); await p.waitForTimeout(3000); await p.click('#b-start');
await p.addStyleTag({ content: '#cards,#posebox,#head{opacity:.2}' });
// Le navigateur de test est lent : on fait avancer le temps du jeu nous-mêmes, par pas de 1/30 s
await p.evaluate(([L, placed]) => { const { game, site } = window.__bu; game.s.level = L; game.s.up.ouvrier = 3; game.s.up.stock = 8; game.s.placed = 0; game.loadHouse(); game.s.placed = placed; site.setHouse(game); site.setWorkers(game.p.workers); game.s.stock = 12; site.setStock(12, game.p.cap); window.__trips = []; const nt = game.noteTrip.bind(game); game.noteTrip = (s) => { window.__trips.push(+s.toFixed(1)); nt(s); }; }, [L, placed]);
const step = (sec) => p.evaluate((sec) => { const { game, site } = window.__bu; for (let k = 0; k < sec * 30; k++) { game.update(1 / 30); const n = game.p.workers; site.walkSpeed = 2.2; let free = site.idleWorkers(); while (free > 0 && game.s.stock > 0 && !game.done) { game.place(true); free--; } site.updateWorkers(1 / 30); site.time += 1 / 30; } }, sec);
for (let k = 0; k < 4; k++) { await step(2.5); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${k}.png`, clip: { x: 0, y: 80, width: 390, height: 480 } }); }
await step(30);
console.log('trajets (s) :', await p.evaluate(() => window.__trips), 'posés en 40 s :', await p.evaluate(() => window.__bu.game.s.placed), 'erreurs', errs);
await b.close(); srv.close();
