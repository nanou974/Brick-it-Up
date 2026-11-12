// Brick'it Up : boucle de jeu, interface et sauvegarde
import { Game, freshState } from './game.js';
import { Site } from './scene.js';
import { Sound } from './audio.js';
import { STAGES, UPGRADES, PERKS, COSMETICS, params, tierOf, TIER_STEP } from './rules.js';
import { STAGE_ICONS, UP_ICONS, COIN, STAR, GEAR, CHEST } from './icons.js';
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
$('i-chest').innerHTML = CHEST; $('i-coin2').innerHTML = COIN; $('i-star2').innerHTML = STAR; $('i-chestbtn').innerHTML = CHEST;
$('v-version').textContent = $('v-version2').textContent = `v${VERSION}`;

// ---------- Chantier ----------
let lastStage = -1;
function setupSite() {
  applySkins();
  site.setHouse(game);
  site.setWorkers(game.p.workers);
  site.setTruck(Math.min(5, tierOf(game.s.up.camion)));
  site.setStock(game.s.stock, game.p.cap);
  lastStage = game.stage;
  buildCards(); refresh(true);
}

game.on('place', (it, gain, byWorker, index) => {
  site.updateGhost(game);
  site.setStock(game.s.stock, game.p.cap);
  // Bruit de pose (raccourci quand les poses sont très rapprochées) et gain qui s'envole
  const landed = (small) => { const nowP = performance.now(); sfx.place(it.stage, nowP - lastPlaceAt < 160); lastPlaceAt = nowP; floatGain(`+${fmt(gain)}`, small); };
  // Pose par un ouvrier : il va chercher l'élément sur la palette et le porte jusqu'à la maison
  if (byWorker) site.workerJob(index, (sec) => { landed(true); game.noteTrip(sec); });
  else { site.addItem(index, true); landed(false); }
  if (game.stage !== lastStage && !game.done) { lastStage = game.stage; banner(`${STAGES[game.stage].name.toUpperCase()} !`); }
  if (game.done) { setTimeout(finishWhenReady, 900); }
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
  el.className = 'gain' + (small ? ' small' : ''); el.innerHTML = `${txt}<span class="ico mini">${COIN}</span>`;
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
  if (site.workers.length) site.boostWorkers(); // les ouvriers pressent le pas, même si l'entrepôt est plein
  const g = game.rush(); if (!g) return;
  const now = performance.now(); rushCombo = now - rushLast < 400 ? Math.min(rushCombo + 1, 12) : 0; rushLast = now;
  sfx.rush(rushCombo);
  const el = document.createElement('div'); el.className = 'gain rush'; el.textContent = `−${String(Math.round(g * 100) / 100).replace('.', ',')} s`;
  el.style.left = `${e.clientX}px`; el.style.top = `${e.clientY - 20}px`; $('app').appendChild(el); setTimeout(() => el.remove(), 700);
  const r = $('ring-fg'); r.classList.remove('flash'); void r.getBBox(); r.classList.add('flash');
  site.rushTruck();
});

// ---------- Améliorations ----------
let dirtyCards = true, lastCredits = -1, lastHint = '';
function effect(key) {
  const a = params(game.s.up, game.s.perks), b = params({ ...game.s.up, [key]: game.s.up[key] + 1 }, game.s.perks);
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
  // Gain par pose suivi d'une petite pièce, pour qu'on comprenne tout de suite que ce sont des pièces
  const coin = `<span class="ico mini">${COIN}</span>`, v = fmt(game.nextValue());
  const hint = game.done ? 'Maison terminée !' : full ? `Entrepôt plein · +${v}${coin} par pose` : s.stock > 0 ? `Touche pour poser · +${v}${coin}` : `Livraison dans ${Math.ceil(p.delivery - s.deliveryT)} s`;
  if (hint !== lastHint) { $('v-posehint').innerHTML = hint; lastHint = hint; }
  if (force || dirtyCards || s.credits !== lastCredits) { refreshCards(); dirtyCards = false; lastCredits = s.credits; }
}
function ring() {
  const p = game.p, s = game.s, full = s.stock >= Math.min(p.cap, game.remaining);
  const k = full ? 1 : s.deliveryT / p.delivery;
  $('ring-fg').style.strokeDashoffset = 339.3 * (1 - k);
}

// ---------- Fin de maison ----------
// On attend que les ouvriers aient déposé leurs derniers éléments
function finishWhenReady() { if (site.busy()) setTimeout(finishWhenReady, 300); else finishHouse(); }
function finishHouse() {
  if (!game.done) return;
  // Klaxon de victoire et feux d'artifice au-dessus de la maison
  sfx.victory(); banner('MAISON TERMINÉE !');
  site.fireworks(3.4, () => sfx.rocket(), () => sfx.burst());
  $('v-donetxt').textContent = `${game.house.name} terminé${game.house.fem ? 'e' : ''} ! Tu gagnes une étoile.`;
  $('v-donebonus').textContent = `Dépense tes étoiles dans la BOUTIQUE (bouton en haut) : améliorations pour toujours, camions, tenues, décors. Sur la prochaine maison, tu repars de zéro : pièces et améliorations.`;
  setTimeout(() => show('p-done', true), 3000); // on laisse le temps d'admirer le feu d'artifice
}
$('b-next').addEventListener('click', () => { sfx.unlock(); game.nextLevel(); show('p-done', false); setupSite(); banner(`MAISON ${game.s.level} !`); save(); });

// ---------- Coffre du chantier ----------
// Un coffre toutes les 20 minutes (en temps réel). Son contenu est tiré à l'ouverture.
let chestRoll = 0;
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
function refreshChest() {
  const ready = game.chestReady(), b = $('b-chest');
  b.classList.toggle('ready', ready);
  const t = ready ? 'OUVRIR !' : mmss(game.chestLeft());
  if ($('v-chesttime').textContent !== t) $('v-chesttime').textContent = t;
}
$('b-chest').addEventListener('click', () => {
  sfx.unlock();
  if (!game.chestReady()) { sfx.denied(); banner(`COFFRE DANS ${mmss(game.chestLeft())}`); return; }
  chestRoll = game.rollChest();
  $('v-chest').textContent = fmt(chestRoll);
  $('v-awaytxt').textContent = `Un nouveau coffre sera prêt dans ${game.p.chestMinutes} minutes.`;
  sfx.tier(); show('p-away', true);
});
function catchUp() {
  game.catchUp();
  setupSite();
  if (game.done) finishHouse();
}
$('b-away').addEventListener('click', () => {
  sfx.unlock();
  const from = $('i-chest').getBoundingClientRect(), to = $('pill-credits').getBoundingClientRect();
  const got = game.collectChest(chestRoll); chestRoll = 0; show('p-away', false); save();
  if (!got) return;
  // Les pièces s'envolent du coffre vers le compteur
  for (let k = 0; k < 12; k++) {
    const c = document.createElement('span'); c.className = 'flycoin'; c.innerHTML = COIN;
    c.style.left = `${from.left + from.width / 2}px`; c.style.top = `${from.top + from.height / 2}px`;
    c.style.setProperty('--dx', `${to.left + 20 - from.left - from.width / 2}px`); c.style.setProperty('--dy', `${to.top + 12 - from.top - from.height / 2}px`);
    c.style.animationDelay = `${k * 45}ms`; $('app').appendChild(c); setTimeout(() => c.remove(), 1100 + k * 45);
    setTimeout(() => sfx.coin(), 500 + k * 45);
  }
  floatGain(`+${fmt(got)}`);
  refresh(true);
});

// ---------- Boutique d'étoiles ----------
function applySkins() {
  const e = game.s.equip, t = game.cosmetic('truck', e.truck), w = game.cosmetic('worker', e.worker);
  site.setSkins({ truck: { model: t.model, color: t.color }, worker: { vest: w.vest, hat: w.hat }, decor: e.decor }, game);
}
const LOOK_KINDS = [['truck', 'Camion'], ['worker', 'Tenue des ouvriers'], ['decor', 'Décor']];
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
const DECOR_SWATCH = { prairie: ['#8FCFF5', '#7CC35A'], mer: ['#79D2F2', '#EAD7A0'], montagne: ['#BFD9EE', '#EEF3F7'], automne: ['#F4D6A8', '#D9822B'], ville: ['#A9C4D8', '#9A9EA3'] };
function swatch(kind, c) {
  if (kind === 'truck') return `<span class="sw" style="background:${hex(c.color)}"></span>`;
  if (kind === 'worker') return `<span class="sw" style="background:linear-gradient(${hex(c.hat)} 0 40%, ${hex(c.vest)} 40%)"></span>`;
  const [a, b] = DECOR_SWATCH[c.key]; return `<span class="sw" style="background:linear-gradient(${a} 0 55%, ${b} 55%)"></span>`;
}
function renderShop() {
  const s = game.s;
  $('v-shopstars').textContent = s.stars;
  $('shop-perks').innerHTML = PERKS.map(p => {
    const n = s.perks[p.key], cost = game.perkCost(p.key), max = p.cost.length;
    const now = n > 0 ? p.desc(n) : 'Pas encore acheté', next = cost === null ? 'Niveau maximum' : `Niveau ${n + 1} : ${p.desc(n + 1)}`;
    return `<div class="srow"><div class="stxt"><b>${p.name}</b> <span class="pips">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(max - n)}</span>
      <small>${now}</small><small class="next">${next}</small></div>
      <button data-perk="${p.key}" ${cost === null || s.stars < cost ? 'disabled' : ''}>${cost === null ? 'MAX' : `<span class="ico">${STAR}</span>${cost}`}</button></div>`;
  }).join('');
  $('shop-looks').innerHTML = LOOK_KINDS.map(([kind, label]) => `<div class="lookhead">${label}</div><div class="looks">` + COSMETICS[kind].map(c => {
    const owned = s.owned[kind].includes(c.key), on = s.equip[kind] === c.key;
    const btn = on ? 'CHOISI' : owned ? 'CHOISIR' : `<span class="ico">${STAR}</span>${c.cost}`;
    return `<button class="look${on ? ' on' : ''}" data-kind="${kind}" data-key="${c.key}" ${!owned && s.stars < c.cost ? 'disabled' : ''}>${swatch(kind, c)}<span class="lname">${c.name}</span><span class="lbtn">${btn}</span></button>`;
  }).join('') + '</div>').join('');
}
$('b-shop').addEventListener('click', () => { sfx.unlock(); renderShop(); show('p-shop', true); });
$('b-shopclose').addEventListener('click', () => show('p-shop', false));
for (const t of document.querySelectorAll('.tab')) t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
  $('shop-perks').classList.toggle('hidden', t.dataset.tab !== 'perks'); $('shop-looks').classList.toggle('hidden', t.dataset.tab !== 'looks');
});
$('shop-perks').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-perk]'); if (!b) return;
  if (!game.buyPerk(b.dataset.perk)) { sfx.denied(); return; }
  sfx.tier();
  // Effets immédiats : ouvriers de départ, camion
  site.setWorkers(game.p.workers); site.setStock(game.s.stock, game.p.cap);
  renderShop(); refresh(true); save();
});
$('shop-looks').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-kind]'); if (!b) return;
  const owned = game.s.owned[b.dataset.kind].includes(b.dataset.key);
  if (!game.equip(b.dataset.kind, b.dataset.key)) { sfx.denied(); return; }
  owned ? sfx.buy() : sfx.tier();
  applySkins(); renderShop(); refresh(true); save();
});
// Appli en arrière-plan : on sauvegarde et on coupe le son ; au retour, le chantier reprend là où il s'était arrêté
document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); sfx.pause(true); } else { sfx.pause(false); game.catchUp(); last = performance.now(); } });
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

// ---------- Ouvriers ----------
// En jeu, chaque ouvrier visible libre prend un élément du stock et le porte à pied jusqu'à la maison :
// la cadence vient de leurs trajets. Au-delà de 8 ouvriers (affichés au maximum), les autres les font marcher plus vite.
game.liveWorkers = true;
function workersWork() {
  const n = game.p.workers;
  site.walkSpeed = 2.2 * (1 + 0.12 * Math.max(0, n - 8));
  let free = site.idleWorkers();
  while (free > 0 && game.s.stock > 0 && !game.done) { game.place(true); free--; }
}

// ---------- Boucle ----------
addEventListener('resize', () => site.resize());
let last = performance.now(), uiT = 0, saveT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  game.update(dt);
  workersWork();
  updateHold(dt);
  site.update(dt, game);
  truckSounds(dt);
  ring();
  uiT -= dt; if (uiT <= 0) { uiT = 0.1; refresh(); refreshChest(); }
  saveT += dt; if (saveT > 5) { saveT = 0; save(); }
  requestAnimationFrame(frame);
}
catchUp();
requestAnimationFrame(frame);
// Accès de débogage pour les tests automatiques
window.__bu = { game, site, save, sfx };
