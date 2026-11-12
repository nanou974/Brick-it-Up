// Teste le QR code de sauvegarde : affichage, lecture par la caméra (caméra simulée qui filme le QR code) et ouverture du lien
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { execSync } from 'node:child_process';
const root = path.resolve('www'), out = 'tools/out/ville'; fs.mkdirSync(out, { recursive: true });
const ty = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', ty[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(8799);
const exe = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', base = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
// 1) appareil A : partie au niveau 9, on affiche le QR code
let b = await chromium.launch({ executablePath: exe, args: base });
let p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8799/index.html'); await p.waitForTimeout(2500); await p.click('#b-start');
await p.evaluate(() => { const { game } = window.__bu; game.s.level = 9; game.s.stars = 8; game.loadHouse(); });
await p.click('#b-menu'); await p.click('#b-code'); await p.waitForTimeout(800);
const code = await p.inputValue('#t-code-out');
await p.screenshot({ path: `${out}/qr-panel.png` });
await (await p.$('#qr')).screenshot({ path: '/tmp/claude-0/qr.png' });
await b.close();
// image de la caméra simulée : le QR code au milieu d'un fond gris
execSync('ffmpeg -loglevel error -y -f lavfi -i color=c=gray:s=640x480:d=1 -i /tmp/claude-0/qr.png -filter_complex "[1]scale=300:300[q];[0][q]overlay=170:90,format=yuv420p" -frames:v 20 -r 10 /tmp/claude-0/cam.y4m');
// 2) appareil B : partie au niveau 2, on scanne
b = await chromium.launch({ executablePath: exe, args: [...base, '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=/tmp/claude-0/cam.y4m'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'] });
p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8799/index.html'); await p.waitForTimeout(2500); await p.click('#b-start');
await p.click('#b-menu'); await p.click('#b-code'); await p.waitForTimeout(500); await p.click('#b-scan');
let ok = false; for (let i = 0; i < 30 && !ok; i++) { await p.waitForTimeout(500); ok = await p.evaluate(() => document.getElementById('p-code').classList.contains('show') && /Construction/.test(document.getElementById('v-code-msg').textContent)); }
console.log('scanner →', ok, await p.textContent('#v-code-msg'), '| scan :', await p.textContent('#v-scan-msg'));
await p.screenshot({ path: `${out}/qr-scan.png` });
if (ok) { await p.click('#b-code-load'); await p.waitForTimeout(3000); console.log('chargé', await p.evaluate(() => ({ level: window.__bu.game.s.level, stars: window.__bu.game.s.stars }))); }
// 3) lien du QR code ouvert par l'appareil photo (nouvelle partie)
const p2 = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p2.on('pageerror', e => errs.push(e.message));
await p2.goto(`http://localhost:8799/index.html#code=${code}`); await p2.waitForTimeout(3500);
console.log('lien →', await p2.evaluate(() => document.getElementById('p-code').classList.contains('show')), await p2.textContent('#v-code-msg'), '| adresse :', p2.url());
console.log('erreurs', errs.slice(0, 5)); await b.close(); srv.close();
