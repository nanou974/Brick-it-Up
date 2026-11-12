import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('www');
const ty = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', ty[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(8782);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:8782/index.html'); await p.waitForTimeout(2500); await p.click('#b-start');
await p.addStyleTag({ content: '#top,#head,#posebox,#cards,.panel{display:none!important}' });
for (const [L, orbit, zoom] of JSON.parse(process.argv[2])) {
  const info = await p.evaluate(([L, orbit, zoom]) => { const { game, site } = window.__bu; game.s.level = L; game.s.placed = 0; game.loadHouse(); game.s.placed = game.items.length; site.setHouse(game); site.orbitTarget = site.orbit = orbit; if (zoom) site.zoomTarget = site.zoom = zoom; return site.items.filter(i => i.kind === 'shed').length; }, [L, orbit, zoom]);
  await p.waitForTimeout(1500); await p.screenshot({ path: `/tmp/claude-0/s-${L}-${orbit}.png`, clip: { x: 0, y: 0, width: 390, height: 600 } }); console.log(L, info);
}
console.log(errs.slice(0, 4)); await b.close(); srv.close();
