// Brick'it Up : boucle de jeu, interface et sauvegarde
import { Game, freshState } from './game.js';
import { Site } from './scene.js';
import { Sound } from './audio.js';
import { STAGES, UPGRADES, params, tierOf, TIER_STEP } from './rules.js';
import { STAGE_ICONS, UP_ICONS, COIN, STAR, GEAR } from './icons.js';
import { VERSION } from './version.js';

const SAVE_KEY = 'brick-it-up-save', VOL_KEY = 'brick-it-up-volume';
const $ = (id) => document.getElementById(id);
const show = (id, on) => $(id).classList.toggle('show', on);

// Nombres lisibles : 1 234, 12,3 k, 4,56 M…
function fmt(n) {
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('fr-FR');
  const u = ['k', 'M', 'Md', 'T', 'P']; let i = -1;
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: n < 100 ? 1 : 0 })} ${u[i]}`;
}
const dec = (x, d = 1) => x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------- Sauvegarde ----------
function load() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } }
function save() { try { game.s.lastSeen = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(game.s)); } catch {} }

const game = new Game(load());
const site = new Site($('gl'));
const sfx = new Sound();
// Volumes enregistrés : { sfx, music } (ancien format : un seul nombre pour les sons)
const vols = { sfx: 0.8, music: 0.6 };
try { const v = JSON.parse(localStorage.getItem(VOL_KEY)); if (typeof v === 'number') vols.sfx = v; else if (v) Object.assign(vols, v); } catch {}
sfx.setVolume(vols.sfx); sfx.setMusicVolume(vols.music);
$('r-sfx').value = Math.round(vols.sfx * 100); $('r-music').value = Math.round(vols.music * 100);
const saveVols = () => { try { localStorage.setItem(VOL_KEY, JSON.stringify(vols)); } catch {} };
sfx.loadMusic('assets/music/theme.ogg');

// Icônes fixes
$('i-coin').innerHTML = COIN; $('i-star').innerHTML = STAR; $('i-gear').innerHTML = GEAR; $('i-starbig').innerHTML = STAR;
$('v-version').textContent = $('v-version2').textContent = `v${VERSION}`;

// ---------- Chantier ----------
let lastStage = -1;
function setupSite() {
  site.setHouse(game);
  site.setWorkers(game.p.workers);
  site.setTruck(Math.min(5, tierOf(game.s.up.camion)));
  site.setStock(game.s.stock, game.p.cap);
  lastStage = game.stage;
  buildCards(); refresh(true);
}

game.on('place', (it, gain, byWorker, index) => {
  site.addItem(index, true);
  site.updateGhost(game);
  site.setStock(game.s.stock, game.p.cap);
  // Poses très rapprochées (doigt maintenu, équipe nombreuse) : bruit raccourci pour ne pas saturer
  const nowP = performance.now(); sfx.place(it.stage, nowP - lastPlaceAt < 160); lastPlaceAt = nowP;
  if (byWorker) { site.workerHop(); floatGain(`+${fmt(gain)}`, true); } else floatGain(`+${fmt(gain)}`);
  if (game.stage !== lastStage && !game.done) { lastStage = game.stage; banner(`${STAGES[game.stage].name.toUpperCase()} !`); }
  if (game.done) { setTimeout(finishHouse, 900); }
  dirtyCards = true;
});
let lastPlaceAt = 0, braked = false;
game.on('deliver', (n) => {
  const p = game.p; site.deliver(p.delivery); site.setStock(game.s.stock, p.cap);
  braked = false;
  // Déchargement : complet quand le camion fait l'aller-retour, discret quand les livraisons s'enchaînent
  if (p.delivery >= 2.5) { if (!brakePending) sfx.brake(); sfx.unload(Math.min(4, 1 + n)); sfx.horn(0.55); }
  else if (p.delivery >= 1) sfx.unload(2, true);
  brakePending = false;
});
let brakePending = false;
// Freins juste avant l'arrivée du camion (aller-retour seulement)
function truckSounds(dt) {
  const p = game.p, s = game.s;
  const full = s.stock >= Math.min(p.cap, game.remaining) || game.done;
  if (!braked && !full && p.delivery >= 2.5 && p.delivery - s.deliveryT < 0.4) { braked = true; brakePending = true; sfx.brake(); }
  const x = site.truck ? site.truck.position.x : 99;
  sfx.engineUpdate(Math.max(0, 1 - Math.abs(x) / 26), site.truckSpeed || 0, dt);
}

// Texte « +3 » qui s'envole au-dessus du bouton de pose
function floatGain(txt, small = false) {
  const b = $('b-pose').getBoundingClientRect(), el = document.createElement('div');
  el.className = 'gain' + (small ? ' small' : ''); el.textContent = txt;
  el.style.left = `${b.left + b.width / 2 + (Math.random() - 0.5) * (small ? 120 : 40)}px`; el.style.top = `${b.top - 10}px`;
  $('app').appendChild(el); setTimeout(() => el.remove(), 950);
}
function banner(txt) { const b = $('banner'); b.textContent = txt; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); }

// ---------- Bouton de pose ----------
// Une touche pose un élément ; en restant appuyé, les poses s'enchaînent de plus en plus vite
// (dès qu'un élément arrive, il est posé tant que le doigt reste sur le bouton).
const HOLD_DELAY = 0.35, HOLD_START = 0.2, HOLD_MIN = 0.07;
let hold = null;
function poseOnce(fromHold) {
  const b = $('b-pose');
  if (!game.place()) {
    if (!fromHold) { sfx.denied(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
    return false;
  }
  b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 70);
  return true;
}
$('b-pose').addEventListener('pointerdown', (e) => {
  e.preventDefault(); sfx.unlock();
  try { $('b-pose').setPointerCapture(e.pointerId); } catch {}
  poseOnce(false);
  hold = { t: -HOLD_DELAY, every: HOLD_START, id: e.pointerId };
});
const endHold = (e) => { if (hold && (!e || e.pointerId === hold.id)) hold = null; };
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) $('b-pose').addEventListener(ev, endHold);
function updateHold(dt) {
  if (!hold) return;
  hold.t += dt;
  while (hold.t >= hold.every) {
    hold.t -= hold.every;
    if (poseOnce(true)) hold.every = Math.max(HOLD_MIN, hold.every * 0.88); // accélère à chaque pose réussie
    else { hold.t = Math.min(hold.t, 0); break; }                           // stock vide : on attend la livraison
  }
}

// Tapoter le chantier : le camion arrive plus vite
let rushCombo = 0, rushLast = 0;
$('gl').addEventListener('pointerdown', (e) => {
  sfx.unlock();
  const g = game.rush(); if (!g) return;
  const now = performance.now(); rushCombo = now - rushLast < 400 ? Math.min(rushCombo + 1, 12) : 0; rushLast = now;
  sfx.rush(rushCombo);
  const el = document.createElement('div'); el.className = 'gain rush'; el.textContent = '−0,1 s';
  el.style.left = `${e.clientX}px`; el.style.top = `${e.clientY - 20}px`; $('app').appendChild(el); setTimeout(() => el.remove(), 700);
  const r = $('ring-fg'); r.classList.remove('flash'); void r.getBBox(); r.classList.add('flash');
  site.rushTruck();
});

// ---------- Améliorations ----------
let dirtyCards = true, lastCredits = -1;
function effect(key) {
  const a = params(game.s.up, game.s.stars), b = params({ ...game.s.up, [key]: game.s.up[key] + 1 }, game.s.stars);
  switch (key) {
    case 'valeur': return `×${dec(a.value, 2)} → ×${dec(b.value, 2)}`;
    case 'livraison': return `${dec(a.delivery)} s → ${dec(b.delivery)} s`;
    case 'camion': return `${a.batch} → ${b.batch} par livraison`;
    case 'stock': return `${a.cap} → ${b.cap} places`;
    case 'ouvrier': return `${a.workers} → ${b.workers} ouvrier${b.workers > 1 ? 's' : ''}`;
  }
}
function buildCards() {
  const c = $('cards'); c.innerHTML = '';
  for (const u of UPGRADES) {
    const d = document.createElement('div'); d.className = 'card'; d.dataset.key = u.key;
    d.innerHTML = `<div class="name">${u.name.toUpperCase()}</div><span class="ico">${UP_ICONS[u.key]}</span><span class="lvl">0</span>
      <div class="pips">${'<i></i>'.repeat(TIER_STEP)}</div><div class="eff"></div>
      <button><span class="ico">${COIN}</span><span class="cost">0</span></button>`;
    d.querySelector('button').addEventListener('click', () => buy(u.key, d));
    c.appendChild(d);
  }
  dirtyCards = true;
}
function refreshCards() {
  for (const d of $('cards').children) {
    const k = d.dataset.key, n = game.s.up[k];
    d.querySelector('.lvl').textContent = n;
    d.querySelectorAll('.pips i').forEach((p, i) => p.classList.toggle('on', i < n % TIER_STEP || (n > 0 && n % TIER_STEP === 0 && false)));
    d.querySelector('.eff').textContent = effect(k);
    d.querySelector('.cost').textContent = fmt(game.cost(k));
    d.querySelector('button').disabled = !game.canBuy(k);
  }
}
const TIER_NAMES = { valeur: 'RAPPORT', livraison: 'LIVRAISON', camion: 'CAMION', stock: 'ENTREPÔT', ouvrier: 'OUVRIERS' };
const TIER_GAINS = { valeur: 'GROS BONUS DE GAINS', livraison: 'LIVRAISONS BIEN PLUS RAPIDES', camion: 'NOUVEAU CAMION !', stock: 'ENTREPÔT AGRANDI', ouvrier: 'ÉQUIPE RENFORCÉE' };
function buy(key, card) {
  sfx.unlock();
  const r = game.buy(key);
  if (!r) { sfx.denied(); return; }
  if (r.tierUp) {
    sfx.tier(); card.classList.remove('tierup'); void card.offsetWidth; card.classList.add('tierup');
    card.querySelector('.tiertag')?.remove();
    card.insertAdjacentHTML('beforeend', `<span class="tiertag">${TIER_NAMES[key]} ${r.tier} !<small>${TIER_GAINS[key]}</small></span>`);
    setTimeout(() => card.querySelector('.tiertag')?.remove(), 2700);
  } else sfx.buy();
  if (key === 'camion') site.setTruck(Math.min(5, tierOf(game.s.up.camion)));
  if (key === 'ouvrier') site.setWorkers(game.p.workers);
  site.setStock(game.s.stock, game.p.cap);
  refresh(true); save();
}

// ---------- Affichage ----------
function refresh(force = false) {
  const s = game.s, p = game.p;
  $('v-credits').textContent = fmt(s.credits);
  $('v-stars').textContent = s.stars;
  $('v-level').textContent = `MAISON ${s.level}`;
  $('v-house').textContent = game.house.name;
  const k = game.stage, [a, b] = game.stageProgress(), S = STAGES[k];
  $('v-stage').textContent = `${S.name.toUpperCase()} · ${Math.floor(100 * s.placed / game.items.length)} %`;
  $('bar-stage').style.width = `${(100 * a) / b}%`;
  $('v-stagecount').textContent = `${a} / ${b} ${b > 1 ? S.items : S.item}`;
  if ($('i-stage').dataset.k !== String(k)) { $('i-stage').innerHTML = STAGE_ICONS[S.key]; $('i-stage').dataset.k = k; }
  $('v-stock').textContent = s.stock;
  $('b-pose').classList.toggle('empty', s.stock === 0);
  $('b-pose').classList.toggle('ready', s.stock > 0 && p.workers === 0);
  const full = s.stock >= Math.min(p.cap, game.remaining);
  $('v-posehint').textContent = game.done ? 'Maison terminée !' : full ? `Entrepôt plein · +${fmt(game.nextValue())} par pose` : s.stock > 0 ? `Touche pour poser · +${fmt(game.nextValue())}` : `Livraison dans ${Math.ceil(p.delivery - s.deliveryT)} s`;
  if (force || dirtyCards || s.credits !== lastCredits) { refreshCards(); dirtyCards = false; lastCredits = s.credits; }
}
function ring() {
  const p = game.p, s = game.s, full = s.stock >= Math.min(p.cap, game.remaining);
  const k = full ? 1 : s.deliveryT / p.delivery;
  $('ring-fg').style.strokeDashoffset = 339.3 * (1 - k);
}

// ---------- Fin de maison ----------
function finishHouse() {
  if (!game.done) return;
  sfx.win(); banner('MAISON TERMINÉE !');
  $('v-donetxt').textContent = `${game.house.name} terminé${game.house.fem ? 'e' : ''} ! Tu gagnes une étoile.`;
  $('v-donebonus').textContent = `Tes étoiles sont conservées : chacune donne +5 % de crédits pour toujours. Sur la prochaine maison, plus grande et plus rentable, tu repars de zéro : crédits et améliorations.`;
  setTimeout(() => show('p-done', true), 1400);
}
$('b-next').addEventListener('click', () => { sfx.unlock(); game.nextLevel(); show('p-done', false); setupSite(); banner(`MAISON ${game.s.level} !`); save(); });

// ---------- Absence ----------
function catchUp() {
  const r = game.catchUp();
  if (r.away > 30 && (r.placed > 0 || r.credits > 0)) {
    $('v-awaytxt').innerHTML = `Ton équipe a posé <b>${r.placed}</b> élément${r.placed > 1 ? 's' : ''} et gagné <b>${fmt(r.credits)}</b> crédits.`;
    show('p-away', true);
  }
  setupSite();
  if (game.done) finishHouse();
}
$('b-away').addEventListener('click', () => show('p-away', false));
document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); sfx.pause(true); } else { sfx.pause(false); catchUp(); } });
addEventListener('pagehide', save);

// ---------- Menu ----------
$('b-menu').addEventListener('click', () => { sfx.unlock(); show('p-menu', true); });
$('b-menuclose').addEventListener('click', () => { show('p-menu', false); disarm(); });
$('r-sfx').addEventListener('input', (e) => { vols.sfx = e.target.value / 100; sfx.setVolume(vols.sfx); saveVols(); });
$('r-music').addEventListener('input', (e) => { sfx.unlock(); vols.music = e.target.value / 100; sfx.setMusicVolume(vols.music); saveVols(); });
let armed = 0;
function disarm() { armed = 0; $('b-reset').classList.remove('armed'); $('b-reset').textContent = 'RECOMMENCER À ZÉRO'; }
$('b-reset').addEventListener('click', () => {
  if (!armed) { armed = 1; $('b-reset').classList.add('armed'); $('b-reset').textContent = 'TOUCHE ENCORE POUR CONFIRMER'; setTimeout(disarm, 4000); return; }
  disarm(); Object.assign(game.s, freshState()); game.loadHouse(); setupSite(); save(); show('p-menu', false);
});
$('b-start').addEventListener('click', () => { sfx.unlock(); show('p-start', false); });

// ---------- Boucle ----------
addEventListener('resize', () => site.resize());
let last = performance.now(), uiT = 0, saveT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  game.update(dt);
  updateHold(dt);
  site.update(dt, game);
  truckSounds(dt);
  ring();
  uiT -= dt; if (uiT <= 0) { uiT = 0.1; refresh(); }
  saveT += dt; if (saveT > 5) { saveT = 0; save(); }
  requestAnimationFrame(frame);
}
catchUp();
requestAnimationFrame(frame);
// Accès de débogage pour les tests automatiques
window.__bu = { game, site, save, sfx };
