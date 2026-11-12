// Code de sauvegarde de Brick'it Up : la partie, réduite à l'essentiel et chiffrée (AES-GCM), dans un texte court.
//
// Format actuel « BIU2- » + base64url( IV (12 octets) + données chiffrées ).
// Les données sont une suite de nombres entiers, chacun écrit sur le moins d'octets possible (1 octet jusqu'à 127) :
//   niveau, éléments posés, étoiles, étoiles gagnées en tout, pièces, stock, pièces gagnées en tout,
//   améliorations (dans l'ordre de UPGRADES), boutique (ordre de PERKS),
//   camions / tenues / décors possédés (un bit par article, ordre de COSMETICS), articles équipés (leur numéro),
//   secondes avant le prochain coffre, durée d'un trajet d'ouvrier (en dixièmes de seconde).
// Le reste (minuteurs de livraison, moyenne de gains, date de dernière visite…) est recalculé par le jeu.
// Ajouter un article à la fin d'une liste ne casse pas les anciens codes ; il ne faut pas en retirer ni en changer l'ordre.
//
// Ancien format « BIU1- » (partie complète en JSON compressé) : toujours accepté.
// Le chiffrement empêche de lire ou de modifier la partie à la main : un code modifié, même d'un seul caractère, est refusé.
// La clé est dans le jeu : c'est une protection contre la triche et les erreurs de copie, pas un coffre-fort.
import { UPGRADES, PERKS, COSMETICS } from './rules.js';

const SECRET = 'Brick-it-Up · nanou974 · parpaing après parpaing · 2026';
let keyP = null;
function key() {
  if (!keyP) keyP = crypto.subtle.digest('SHA-256', new TextEncoder().encode(SECRET))
    .then(h => crypto.subtle.importKey('raw', h, 'AES-GCM', false, ['encrypt', 'decrypt']));
  return keyP;
}
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };

// Nombres entiers positifs → octets (7 bits par octet, le 8e indique qu'il en reste) ; marche au-delà de 2³² (grosses sommes de pièces)
function packInts(list) {
  const out = [];
  for (let n of list) { n = Math.max(0, Math.floor(Number(n) || 0)); do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b += 128; out.push(b); } while (n > 0); }
  return new Uint8Array(out);
}
function unpackInts(bytes) {
  const list = []; let n = 0, mul = 1;
  for (const b of bytes) { n += (b % 128) * mul; if (b >= 128) mul *= 128; else { list.push(n); n = 0; mul = 1; } }
  return list;
}
const KINDS = ['truck', 'worker', 'decor'];

// Partie → nombres
function compact(s) {
  const L = [s.level, s.placed, s.stars, s.starsTotal, s.credits, s.stock, s.total];
  for (const u of UPGRADES) L.push(s.up?.[u.key] || 0);
  for (const p of PERKS) L.push(s.perks?.[p.key] || 0);
  for (const k of KINDS) L.push(COSMETICS[k].reduce((m, c, i) => m + ((s.owned?.[k] || []).includes(c.key) ? 2 ** i : 0), 0));
  for (const k of KINDS) L.push(Math.max(0, COSMETICS[k].findIndex(c => c.key === s.equip?.[k])));
  L.push(Math.round(Math.max(0, (s.chestAt || 0) - Date.now()) / 1000), Math.round((s.tripTime || 8) * 10));
  return L;
}
// Nombres → partie (les champs absents seront complétés par le jeu au chargement)
function expand(L) {
  let i = 0; const next = () => L[i++] ?? 0;
  const s = { v: 4, level: Math.max(1, next()), placed: next(), stars: next(), starsTotal: next(), credits: next(), stock: next(), total: next() };
  s.up = {}; for (const u of UPGRADES) s.up[u.key] = next();
  s.perks = {}; for (const p of PERKS) s.perks[p.key] = next();
  s.owned = {}; for (const k of KINDS) { const m = next(); s.owned[k] = COSMETICS[k].filter((c, j) => c.cost === 0 || Math.floor(m / 2 ** j) % 2 === 1).map(c => c.key); }
  s.equip = {}; for (const k of KINDS) { const c = COSMETICS[k][next()] || COSMETICS[k][0]; s.equip[k] = s.owned[k].includes(c.key) ? c.key : COSMETICS[k][0].key; }
  s.chestAt = Date.now() + next() * 1000; s.tripTime = Math.max(1, next() / 10) || 8;
  s.lastSeen = Date.now(); s.deliveryT = 0; s.workerT = 0; s.rushT = 0; s.rate = 0; s.chest = 0;
  return s;
}

// Partie → code
export async function encodeSave(state) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), packInts(compact(state))));
  const out = new Uint8Array(12 + enc.length); out.set(iv); out.set(enc, 12);
  return 'BIU2-' + b64(out);
}

// Code → partie (lève une erreur au message lisible si le code est invalide)
export async function decodeSave(code) {
  const clean = String(code || '').replace(/\s+/g, ''), m = clean.match(/^BIU([12])-(.+)$/);
  if (!m) throw new Error('Ce n\'est pas un code de sauvegarde Brick\'it Up.');
  let raw; try { raw = unb64(m[2]); } catch { throw new Error('Code incomplet ou mal copié.'); }
  const old = m[1] === '1', ivAt = old ? 1 : 0;
  if (raw.length < ivAt + 12 + 17) throw new Error('Code incomplet ou mal copié.');
  let data;
  try { data = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(ivAt, ivAt + 12) }, await key(), raw.slice(ivAt + 12))); }
  catch { throw new Error('Code incomplet, mal copié ou modifié.'); }
  let state;
  if (old) {
    if (raw[0] === 1) {
      if (typeof DecompressionStream === 'undefined') throw new Error('Ce navigateur est trop ancien pour lire ce code.');
      data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    }
    state = JSON.parse(new TextDecoder().decode(data));
  } else state = expand(unpackInts(data));
  if (!state || typeof state.level !== 'number') throw new Error('Ce code ne contient pas de partie.');
  return state;
}
