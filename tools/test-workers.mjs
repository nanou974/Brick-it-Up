// Test des allers-retours des ouvriers (palette → maison)
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('www'), out = 'tools/out/ouvriers';
fs.mkdirSync(out, { recursive: true });
const ty = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', ty[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(8784);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:8784/index.html'); await p.waitForTimeout(3000); await p.click('#b-start');
await p.addStyleTag({ content: '#cards,#posebox,#head{opacity:.2}' });
await p.evaluate(() => { const { game, site } = window.__bu; game.s.up.ouvrier = 3; game.s.up.stock = 6; game.s.placed = 20; game.loadHouse(); site.setHouse(game); site.setWorkers(game.p.workers); game.s.stock = 9; site.setStock(9, game.p.cap); });
const log = [];
for (let k = 0; k < 6; k++) {
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/${k}.png`, clip: { x: 0, y: 80, width: 390, height: 480 } });
  log.push(await p.evaluate(() => { const { game, site } = window.__bu; return { posés: game.s.placed, visibles: site.meshes.filter(Boolean).length, enRoute: site.workers.filter(w => w.userData.job).length, porte: site.workers.filter(w => w.userData.carry.visible).length }; }));
}
console.log(log); console.log('erreurs', errs);
await b.close(); srv.close();
