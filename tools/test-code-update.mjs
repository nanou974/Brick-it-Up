// Teste le code de sauvegarde (aller-retour, code abîmé) et le bandeau « nouvelle version » (version web)
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { execSync } from 'node:child_process';
const root = path.resolve('www'), out = 'tools/out/ville'; fs.mkdirSync(out, { recursive: true });
const ty = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', ty[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(8797);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8797/index.html'); await p.waitForTimeout(3000); await p.click('#b-start');
// 1) code de sauvegarde
await p.evaluate(() => { const { game } = window.__bu; game.s.level = 7; game.s.stars = 6; game.s.credits = 1234; game.loadHouse(); });
await p.click('#b-menu'); await p.click('#b-code'); await p.waitForTimeout(800);
const code = await p.inputValue('#t-code-out'); console.log('code', code.length, 'caractères :', code.slice(0, 40) + '…');
await p.screenshot({ path: `${out}/code.png` });
await p.fill('#t-code-in', code.slice(0, 60) + (code[60] === 'A' ? 'B' : 'A') + code.slice(61)); await p.click('#b-code-load'); await p.waitForTimeout(400);
console.log('code abîmé →', await p.textContent('#v-code-msg'));
await p.evaluate(() => { const { game } = window.__bu; game.s.level = 2; game.s.stars = 0; }); // la partie change entre-temps
await p.fill('#t-code-in', code); await p.click('#b-code-load'); await p.waitForTimeout(400);
console.log('bon code →', await p.textContent('#v-code-msg'));
await p.click('#b-code-load'); await p.waitForTimeout(3000);
console.log('après chargement', await p.evaluate(() => { const s = window.__bu.game.s; return { level: s.level, stars: s.stars, credits: s.credits }; }));
// 2) nouvelle version publiée pendant la partie
await p.click('#b-start').catch(() => {}); await p.waitForTimeout(500);
const vfile = 'src/game/version.js', orig = fs.readFileSync(vfile, 'utf8');
fs.writeFileSync(vfile, orig.replace(/'[\d.]+'/, "'9.9.9'")); execSync('node tools/build-app.mjs'); fs.writeFileSync(vfile, orig);
await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
await p.waitForTimeout(5000);
console.log('bandeau', await p.evaluate(() => ({ show: document.getElementById('update-bar').classList.contains('show'), txt: document.getElementById('v-update').textContent })));
await p.screenshot({ path: `${out}/maj.png` });
await p.click('#b-update'); await p.waitForTimeout(3500);
console.log('après redémarrage', await p.evaluate(() => ({ level: window.__bu.game.s.level, ver: document.getElementById('v-version2')?.textContent })));
execSync('node tools/build-app.mjs');
console.log('erreurs', errs.slice(0, 5)); await b.close(); srv.close();
