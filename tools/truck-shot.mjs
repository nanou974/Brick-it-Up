// Photo des modèles de camion (paliers 0 à 4, carrosseries de la boutique) : tools/out/camions.png
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('www'); fs.mkdirSync('tools/out', { recursive: true });
const ty = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', ty[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(8783);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:8783/index.html'); await p.waitForTimeout(2500); await p.click('#b-start');
await p.addStyleTag({ content: '#top,#head,#posebox,#cards,.panel{display:none!important}' });
const spec = JSON.parse(process.argv[2] || '[[0,"plateau",15903008,"fond"],[1,"plateau",15903008,"murs"],[2,"benne",3108817,"charp"],[3,"americain",15022139,"toit"],[4,"plateau",15903008,"menu"]]');
await p.evaluate(async (spec) => {
  const { site } = window.__bu, T = await import('./src/game/truck.js'), THREE = await import('three');
  site.houseGroup.visible = false; if (site.truck) site.truck.visible = false; site.workerGroup.visible = false; site.city.group.visible = false;
  spec.forEach(([tier, model, color, key], k) => { const t = T.makeTruck(tier, { model, color }); T.setTruckLoad(t, key, 9, 0xC8553D); t.position.set(1.5, 0, -5 + k * 2.6); site.scene.add(t); if (t.userData.crane && k === 4) t.userData.crane.yaw.rotation.y = -Math.PI / 2; });
  site.orbitTarget = site.orbit = 0.9; site.zoomTarget = site.zoom = 0.55; site.userOrbit = true;
}, spec);
await p.waitForTimeout(1800); await p.screenshot({ path: 'tools/out/camions.png' });
console.log(errs.slice(0, 5)); await b.close(); srv.close();
