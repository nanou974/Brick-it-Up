// Icônes dessinées en SVG (matériaux des étapes et améliorations)
const svg = (body, vb = '0 0 64 64') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
const st = 'stroke="#1B2340" stroke-width="3" stroke-linejoin="round"';

export const STAGE_ICONS = {
  fond: svg(`<path d="M6 26 L22 16 L58 16 L42 26 Z" fill="#C4C9CE" ${st}/><path d="M6 26 H42 V50 H6 Z" fill="#9AA0A6" ${st}/><path d="M42 26 L58 16 V40 L42 50 Z" fill="#7D838A" ${st}/><rect x="11" y="31" width="11" height="13" rx="2" fill="#4A4F55"/><rect x="26" y="31" width="11" height="13" rx="2" fill="#4A4F55"/>`),
  murs: svg(`<g ${st}><rect x="5" y="12" width="26" height="12" fill="#D2604A"/><rect x="33" y="12" width="26" height="12" fill="#C8553D"/><rect x="5" y="26" width="12" height="12" fill="#B84A34"/><rect x="19" y="26" width="26" height="12" fill="#D2604A"/><rect x="47" y="26" width="12" height="12" fill="#C8553D"/><rect x="5" y="40" width="26" height="12" fill="#C8553D"/><rect x="33" y="40" width="26" height="12" fill="#B84A34"/></g>`),
  charp: svg(`<g ${st}><path d="M6 50 L32 12 L58 50" fill="none" stroke-width="9" stroke="#1B2340"/><path d="M6 50 L32 12 L58 50" fill="none" stroke="#C48A52" stroke-width="5"/><rect x="8" y="44" width="48" height="8" fill="#A4703F"/><rect x="29" y="16" width="6" height="30" fill="#B37B46"/></g>`),
  toit: svg(`<g ${st}><path d="M4 40 L32 14 L60 40 Z" fill="#C9663A"/><path d="M12 33 H52 M20 25 H44" stroke="#8E3B2E" stroke-width="3"/><rect x="12" y="40" width="40" height="14" fill="#F2E6CF"/></g>`),
  menu: svg(`<g ${st}><rect x="10" y="8" width="44" height="48" rx="3" fill="#F7F7F2"/><rect x="16" y="14" width="14" height="17" fill="#8FD3F4"/><rect x="34" y="14" width="14" height="17" fill="#8FD3F4"/><rect x="16" y="35" width="14" height="15" fill="#8FD3F4"/><rect x="34" y="35" width="14" height="15" fill="#8FD3F4"/></g>`),
  fini: svg(`<g ${st}><circle cx="22" cy="36" r="13" fill="#62B04B"/><circle cx="40" cy="32" r="15" fill="#4E9A3E"/><circle cx="18" cy="28" r="4" fill="#F25C78"/><circle cx="44" cy="22" r="4" fill="#FFD23F"/><circle cx="34" cy="40" r="4" fill="#fff"/><rect x="8" y="48" width="48" height="8" rx="2" fill="#B08A5B"/></g>`),
};

export const UP_ICONS = {
  valeur: svg(`<g ${st}><circle cx="32" cy="34" r="20" fill="#FFC531"/><circle cx="32" cy="34" r="13" fill="#FFDB6E"/><path d="M32 25 V43 M26 30 H36 a4 4 0 0 1 0 8 H28" fill="none"/></g>`),
  livraison: svg(`<g ${st}><circle cx="32" cy="36" r="20" fill="#fff"/><path d="M32 36 V24 M32 36 L40 42" fill="none"/><rect x="27" y="8" width="10" height="7" rx="2" fill="#E5383B"/></g>`),
  camion: svg(`<g ${st}><rect x="4" y="20" width="34" height="22" fill="#F2A900"/><path d="M38 26 H50 L58 34 V42 H38 Z" fill="#E5383B"/><rect x="42" y="29" width="8" height="6" fill="#8FD3F4"/><circle cx="16" cy="46" r="6" fill="#2A2D31"/><circle cx="48" cy="46" r="6" fill="#2A2D31"/></g>`),
  stock: svg(`<g ${st}><rect x="8" y="46" width="48" height="8" fill="#C8A06A"/><rect x="10" y="30" width="20" height="14" fill="#9AA0A6"/><rect x="34" y="30" width="20" height="14" fill="#9AA0A6"/><rect x="22" y="14" width="20" height="14" fill="#B4BAC0"/></g>`),
  ouvrier: svg(`<g ${st}><path d="M14 34 a18 16 0 0 1 36 0 Z" fill="#FFD23F"/><rect x="10" y="33" width="44" height="7" rx="3" fill="#FFC531"/><rect x="29" y="18" width="6" height="15" fill="#FFE27A"/><circle cx="32" cy="50" r="8" fill="#F1C7A3"/></g>`),
};

export const COIN = svg(`<circle cx="32" cy="32" r="26" fill="#FFC531" stroke="#1B2340" stroke-width="4"/><circle cx="32" cy="32" r="16" fill="#FFDB6E"/><path d="M27 22 H37 L32 32 L37 42 H27" fill="none" stroke="#C98A00" stroke-width="4"/>`);
export const STAR = svg(`<path d="M32 6 L39.5 23 L58 24.5 L44 37 L48.5 55 L32 45.5 L15.5 55 L20 37 L6 24.5 L24.5 23 Z" fill="#FFD23F" stroke="#1B2340" stroke-width="4" stroke-linejoin="round"/>`);
export const GEAR = svg(`<path d="M32 20 a12 12 0 1 0 0.01 0 Z M27 4 h10 l2 8 6 3 7-4 7 7-4 7 3 6 8 2 v10 l-8 2-3 6 4 7-7 7-7-4-6 3-2 8 H27 l-2-8-6-3-7 4-7-7 4-7-3-6-8-2 V27 l8-2 3-6-4-7 7-7 7 4 6-3 Z" fill="#fff" fill-rule="evenodd"/>`);

// Coffre aux pièces (écran de retour)
export const CHEST = svg(`<g stroke="#1B2340" stroke-width="3" stroke-linejoin="round"><path d="M8 30 Q8 14 32 14 Q56 14 56 30 Z" fill="#B5652D"/><rect x="8" y="30" width="48" height="24" rx="3" fill="#C8763A"/><rect x="8" y="28" width="48" height="6" fill="#F2B635"/><rect x="28" y="30" width="8" height="10" rx="2" fill="#F2B635"/><path d="M14 54 V30 M50 54 V30" stroke="#8C4A1E"/></g><g fill="#FFD23F" stroke="#1B2340" stroke-width="2"><circle cx="22" cy="14" r="5"/><circle cx="32" cy="10" r="5"/><circle cx="42" cy="14" r="5"/></g>`);
