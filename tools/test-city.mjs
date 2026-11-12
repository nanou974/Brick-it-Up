// Photographie la ville à différents niveaux : node tools/test-city.mjs
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('www'), out = 'tools/out/ville';
fs.mkdirSync(out, { recursive: true });
const ty = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', ty[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(8795);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:8795/index.html'); await p.waitForTimeout(3000); await p.click('#b-start');
await p.addStyleTag({ content: '#cards,#posebox,#b-chest{opacity:.25}' });
const shots = JSON.parse(process.argv[2] || '[[1,10,1],[1,60,1],[4,200,1],[10,300,2.6],[10,300,3.6]]');
for (const [L, placed, zoom] of shots) {
  const t0 = Date.now();
  await p.evaluate(([L, placed, zoom]) => { try { const { game, site } = window.__bu; game.s.level = L; game.s.placed = 0; game.loadHouse(); game.s.placed = Math.min(placed, game.items.length); site.setHouse(game); site.zoomTarget = site.zoom = zoom; site.camBase = 0; while (site.city.queue.length) site.city.update(); } catch (e) { return e.stack; } }, [L, placed, zoom]).then(r => r && console.log(r));
  const ms = Date.now() - t0;
  await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/L${L}-${placed}-z${zoom}.png`, clip: { x: 0, y: 0, width: 390, height: 640 } });
  console.log(`maison ${L}, ${placed} posés, zoom ${zoom} : ville prête en ${ms} ms`);
}
console.log('erreurs', errs.slice(0, 4)); await b.close(); srv.close();
