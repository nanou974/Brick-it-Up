// Capture d'écran du jeu (format téléphone) avec scénario : node tools/shot.mjs <dossier> [scénario]
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('www'), out = process.argv[2] || 'tools/out', scen = process.argv[3] || 'start';
fs.mkdirSync(out, { recursive: true });
const ty = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', ty[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(8777);
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript((s) => { if (s) localStorage.setItem('brick-it-up-save', s); }, process.env.SAVE || '');
await p.goto('http://localhost:8777/index.html'); await p.waitForTimeout(4000);
await p.screenshot({ path: `${out}/0-titre.png` });
await p.click('#b-start'); await p.waitForTimeout(500);
// Scénario : on avance la partie à un pourcentage donné en posant directement
const steps = (process.env.STEPS || '0').split(',').map(Number);
for (const pct of steps) {
  await p.evaluate((pct) => { const { game, site } = window.__bu; while (game.s.placed < Math.floor(game.items.length * pct / 100)) { game.s.stock = 1; game.place(); } game.s.stock = 3; game.s.credits += 500; }, pct);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/${String(pct).padStart(3, '0')}.png` });
}
console.log('erreurs', errs);
await b.close(); srv.close();
