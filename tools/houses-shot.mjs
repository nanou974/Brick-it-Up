// Photographie chaque maison terminée : node tools/houses-shot.mjs [premier] [dernier]
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('www'), out = 'tools/out/maisons';
const list = process.argv.slice(2).length > 2 || process.argv[2]?.includes(',') ? process.argv[2].split(',').map(Number) : null;
const a = +(process.argv[2] || 1), z = +(process.argv[3] || 20);
fs.mkdirSync(out, { recursive: true });
const ty = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', ty[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(8781);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:8781/index.html'); await p.waitForTimeout(3000);
await p.click('#b-start');
await p.addStyleTag({ content: '#top,#head,#posebox,#cards,.panel{display:none!important}' });
for (const L of list || Array.from({ length: z - a + 1 }, (_, k) => a + k)) {
  await p.evaluate((L) => { const { game, site } = window.__bu; game.s.level = L; game.s.placed = 0; game.loadHouse(); game.s.placed = game.items.length; site.setHouse(game); site.orbitTarget = site.orbit = -0.5; }, L);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/${String(L).padStart(2, '0')}.png`, clip: { x: 0, y: 0, width: 390, height: 600 } });
}
console.log('erreurs', errs.slice(0, 5));
await b.close(); srv.close();
