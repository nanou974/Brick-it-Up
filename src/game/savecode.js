// Code de sauvegarde de Brick'it Up : la partie est compressée puis chiffrée (AES-GCM) dans un texte à copier-coller.
// Format : « BIU1- » + base64url( version du format (1 octet) + IV (12 octets) + données chiffrées ).
// Le chiffrement empêche de lire ou de modifier la partie à la main : un code modifié, même d'un seul caractère, est refusé.
// La clé est dans le jeu : c'est une protection contre la triche et les erreurs de copie, pas un coffre-fort.
const PREFIX = 'BIU1-';
const SECRET = 'Brick-it-Up · nanou974 · parpaing après parpaing · 2026';

let keyP = null;
function key() {
  if (!keyP) keyP = crypto.subtle.digest('SHA-256', new TextEncoder().encode(SECRET))
    .then(h => crypto.subtle.importKey('raw', h, 'AES-GCM', false, ['encrypt', 'decrypt']));
  return keyP;
}
const canZip = typeof CompressionStream !== 'undefined';
async function pipe(bytes, Stream, mode) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Stream(mode))).arrayBuffer()); }
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };

// Partie → code
export async function encodeSave(state) {
  let data = new TextEncoder().encode(JSON.stringify(state)), fmt = 0;
  if (canZip) { data = await pipe(data, CompressionStream, 'deflate-raw'); fmt = 1; }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), data));
  const out = new Uint8Array(1 + 12 + enc.length); out[0] = fmt; out.set(iv, 1); out.set(enc, 13);
  return PREFIX + b64(out);
}

// Code → partie (lève une erreur au message lisible si le code est invalide)
export async function decodeSave(code) {
  const clean = String(code || '').replace(/\s+/g, '');
  if (!clean.startsWith(PREFIX)) throw new Error('Ce n\'est pas un code de sauvegarde Brick\'it Up.');
  let raw; try { raw = unb64(clean.slice(PREFIX.length)); } catch { throw new Error('Code incomplet ou mal copié.'); }
  if (raw.length < 30) throw new Error('Code incomplet ou mal copié.');
  let data;
  try { data = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(1, 13) }, await key(), raw.slice(13))); }
  catch { throw new Error('Code incomplet, mal copié ou modifié.'); }
  if (raw[0] === 1) {
    if (!canZip) throw new Error('Ce navigateur est trop ancien pour lire ce code.');
    data = await pipe(data, DecompressionStream, 'deflate-raw');
  }
  const state = JSON.parse(new TextDecoder().decode(data));
  if (!state || typeof state.level !== 'number') throw new Error('Ce code ne contient pas de partie.');
  return state;
}
