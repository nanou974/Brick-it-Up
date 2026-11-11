// Sons synthétisés (WebAudio) : pose, livraison, achat, palier, maison terminée
export class Sound {
  constructor() { this.ctx = null; this.vol = 0.8; this.musicVol = 0.6; this.noiseBuf = null; this.musicBuf = null; this.musicSrc = null; }
  // Musique d'ambiance : fichier pré-calculé (tools/music-render.mjs), joué en boucle parfaite
  async loadMusic(url) {
    try { this.musicData = await (await fetch(url)).arrayBuffer(); this.startMusic(); } catch { /* pas de musique : le jeu continue */ }
  }
  async startMusic() {
    if (!this.ctx || this.musicSrc || !this.musicData || this.musicStarting) return;
    this.musicStarting = true;
    try {
      if (!this.musicBuf) this.musicBuf = await this.ctx.decodeAudioData(this.musicData.slice(0));
      if (this.musicSrc) return;
      const s = this.musicSrc = this.ctx.createBufferSource(); s.buffer = this.musicBuf; s.loop = true;
      s.connect(this.musicOut); s.start();
    } catch { } finally { this.musicStarting = false; }
  }
  setMusicVolume(v) { this.musicVol = v; if (this.musicOut) this.musicOut.gain.setTargetAtTime(v * 0.55, this.ctx.currentTime, 0.05); }
  // Appli en arrière-plan : on coupe tout le son, on le reprend au retour
  pause(on) { if (!this.ctx) return; on ? this.ctx.suspend() : this.ctx.resume(); }
  unlock() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      this.ctx = new C({ latencyHint: 'interactive' });
      this.out = this.ctx.createGain(); this.out.gain.value = this.vol; this.out.connect(this.ctx.destination);
      this.musicOut = this.ctx.createGain(); this.musicOut.gain.value = this.musicVol * 0.55; this.musicOut.connect(this.ctx.destination);
    }
    this.startMusic(); this.startEngine();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  setVolume(v) { this.vol = v; if (this.out) this.out.gain.value = v; }
  tone(f, dur, type = 'sine', vol = 0.2, delay = 0, f2 = null) {
    const c = this.ctx; if (!c || this.vol <= 0) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, vol = 0.2, freq = 800, delay = 0) {
    const c = this.ctx; if (!c || this.vol <= 0) return;
    if (!this.noiseBuf) { const n = c.sampleRate; this.noiseBuf = c.createBuffer(1, n, n); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
    const t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t); s.stop(t + dur + 0.05);
  }
  // Bruit filtré : type de filtre, fréquence (avec glissement possible), résonance, enveloppe
  fnoise(dur, vol, { type = 'bandpass', f = 1000, f2 = null, q = 1, delay = 0, attack = 0.002, trem = 0 } = {}) {
    const c = this.ctx; if (!c || this.vol <= 0) return;
    if (!this.noiseBuf) this.noise(0.001, 0.0001);
    const t = c.currentTime + delay, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g);
    if (trem) { // grain irrégulier (raclement, feuillage)
      const lfo = c.createOscillator(), lg = c.createGain(), tg = c.createGain();
      lfo.type = 'square'; lfo.frequency.value = trem * (0.8 + Math.random() * 0.4); lg.gain.value = 0.5; tg.gain.value = 0.5;
      lfo.connect(lg); lg.connect(tg.gain); g.connect(tg); tg.connect(this.out); lfo.start(t); lfo.stop(t + dur + 0.05);
    } else g.connect(this.out);
    s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.05);
  }
  // Choc sourd : sinus dont la hauteur chute (masse qui se pose)
  thump(f, dur, vol, delay = 0) { this.tone(f, dur, 'sine', vol, delay, f * 0.6); }

  // Pose : un bruit de chantier propre à chaque matériau, légèrement différent à chaque fois.
  // fast = poses très rapprochées (doigt maintenu) : seulement le coup principal, plus court.
  place(stage, fast = false) {
    const v = () => 0.9 + Math.random() * 0.2, r = (a, b) => a + Math.random() * (b - a);
    switch (stage) {
      case 0: // parpaing : choc lourd et granuleux, puis un coup de truelle
        this.thump(r(78, 92), 0.2, 0.55 * v()); this.fnoise(0.12, 0.3 * v(), { f: 650, q: 1.2 });
        if (!fast) this.fnoise(0.2, 0.08, { f: 2600, f2: 1700, q: 2, delay: r(0.12, 0.16), attack: 0.03, trem: 38 });
        break;
      case 1: // brique : claquement sec, tintement de truelle et mortier écrasé
        this.fnoise(0.06, 0.5 * v(), { f: r(1700, 2000), q: 3 }); this.thump(r(200, 240), 0.11, 0.42);
        if (!fast) { const d = r(0.07, 0.1); this.tone(r(2500, 2700), 0.16, 'sine', 0.05, d); this.tone(r(3800, 4000), 0.12, 'sine', 0.03, d); this.fnoise(0.12, 0.09, { type: 'lowpass', f: 900, delay: d + 0.02 }); }
        break;
      case 2: { // poutre : bois qui cogne, puis coups de marteau
        this.thump(r(160, 190), 0.16, 0.4); this.fnoise(0.1, 0.25, { f: 900, q: 4 });
        const hits = fast ? 0 : 2 + (Math.random() < 0.5 ? 1 : 0);
        for (let k = 0; k < hits; k++) { const d = 0.14 + k * r(0.12, 0.15), g = k === hits - 1 ? 1 : 0.7; this.fnoise(0.03, 0.4 * g, { f: 3200, q: 2, delay: d }); this.tone(1250, 0.05, 'triangle', 0.12 * g, d, 800); }
        break;
      }
      case 3: // tuile : tintement de terre cuite
        for (const [f, a] of [[1450, 0.14], [2380, 0.1], [3150, 0.06]]) this.tone(f * r(0.95, 1.05), fast ? 0.12 : 0.26, 'sine', a * v());
        this.fnoise(0.04, 0.28, { f: 4200, q: 2 }); this.thump(260, 0.08, 0.25);
        break;
      case 4: // fenêtre, porte : clic du cadre, puis petit coup de visseuse
        this.fnoise(0.025, 0.35, { f: 3500, q: 3 }); this.tone(1800, 0.025, 'square', 0.05); this.thump(150, 0.12, 0.3);
        if (!fast) {
          const c = this.ctx, t = c.currentTime + 0.07, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
          o.type = 'sawtooth'; o.frequency.setValueAtTime(170, t); o.frequency.linearRampToValueAtTime(260, t + 0.12); o.frequency.linearRampToValueAtTime(220, t + 0.35);
          f.type = 'lowpass'; f.frequency.value = 1400; lfo.frequency.value = 30; lg.gain.value = 0.02; lfo.connect(lg); lg.connect(g.gain);
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.03); g.gain.setValueAtTime(0.05, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
          o.connect(f); f.connect(g); g.connect(this.out); o.start(t); lfo.start(t); o.stop(t + 0.4); lfo.stop(t + 0.4);
        }
        break;
      default: // finitions : coup de pelle et feuillage
        this.fnoise(0.22, 0.3 * v(), { f: 1300, f2: 650, q: 1.5, attack: 0.01 }); this.thump(120, 0.12, 0.32);
        if (!fast) this.fnoise(0.3, 0.07, { type: 'highpass', f: 3000, delay: 0.08, attack: 0.05, trem: 22 });
    }
  }

  // ---------- Camion : moteur continu qui suit la distance et la vitesse ----------
  startEngine() {
    const c = this.ctx; if (!c || this.engine) return;
    const g = c.createGain(); g.gain.value = 0;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 2;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator(), g3 = c.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; o3.type = 'sine'; g3.gain.value = 0.6;
    // « teuf-teuf » du diesel : modulation d'amplitude à la fréquence des explosions
    const am = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(); am.gain.value = 0.7; lfo.type = 'triangle'; lg.gain.value = 0.3;
    lfo.connect(lg); lg.connect(am.gain);
    o1.connect(lp); o2.connect(lp); o3.connect(g3); g3.connect(lp); lp.connect(am); am.connect(g); g.connect(this.out);
    for (const o of [o1, o2, o3, lfo]) o.start();
    this.engine = { g, lp, o1, o2, o3, lfo, rev: 0 };
  }
  // near : 0 (loin) → 1 (devant le chantier), speed : vitesse du camion (unités/s)
  engineUpdate(near, speed, dt) {
    const e = this.engine; if (!e) return;
    e.rev = Math.max(0, e.rev - dt * 2.5);
    const load = Math.min(1, speed / 12), f = 34 + load * 22 + e.rev * 26, t = this.ctx.currentTime;
    e.o1.frequency.setTargetAtTime(f, t, 0.08); e.o2.frequency.setTargetAtTime(f * 1.5, t, 0.08); e.o3.frequency.setTargetAtTime(f / 2, t, 0.08);
    e.lfo.frequency.setTargetAtTime(f / 2, t, 0.08); e.lp.frequency.setTargetAtTime(320 + load * 380 + e.rev * 500, t, 0.08);
    e.g.gain.setTargetAtTime(near * (0.05 + load * 0.05 + e.rev * 0.06), t, 0.1);
  }
  rev() { if (this.engine) this.engine.rev = Math.min(1, this.engine.rev + 0.35); }
  // Freins à l'arrivée : crissement léger puis « pschhh » de l'air
  brake() {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain(), vib = c.createOscillator(), vg = c.createGain();
    o.type = 'triangle'; o.frequency.value = 2350; vib.frequency.value = 9; vg.gain.value = 40; vib.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.025, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g); g.connect(this.out); o.start(t); vib.start(t); o.stop(t + 0.4); vib.stop(t + 0.4);
    this.fnoise(0.4, 0.09, { type: 'highpass', f: 2500, delay: 0.3, attack: 0.02 });
  }
  // Déchargement : quelques parpaings qui s'entrechoquent sur la palette
  unload(n = 3, soft = false) {
    for (let k = 0; k < n; k++) {
      const d = 0.05 + k * (0.09 + Math.random() * 0.05), a = soft ? 0.4 : 1;
      this.thump(70 + Math.random() * 25, 0.14, 0.3 * a, d); this.fnoise(0.08, 0.18 * a, { f: 700 + Math.random() * 300, q: 1.5, delay: d });
    }
  }
  coin() { this.tone(988, 0.07, 'square', 0.06, 0.03); this.tone(1319, 0.12, 'square', 0.05, 0.09); }
  // Petit double coup de klaxon quand le camion repart
  horn(delay = 0) { for (const [d, l] of [[0, 0.09], [0.13, 0.14]]) { this.tone(392, l, 'square', 0.045, delay + d); this.tone(494, l, 'square', 0.03, delay + d); } }
  buy() { this.tone(660, 0.08, 'triangle', 0.18); this.tone(990, 0.12, 'triangle', 0.16, 0.07); }
  tier() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.18, i * 0.08)); this.noise(0.4, 0.2, 500); }
  win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.2, i * 0.11)); }
  // Maison terminée : klaxon de fête « tut-tut-tut-tuuut », puis petite fanfare
  victory() {
    const c = this.ctx; if (!c || this.vol <= 0) return;
    const horn = (f, t0, dur) => {
      const t = c.currentTime + t0, lp = c.createBiquadFilter(), g = c.createGain();
      lp.type = 'lowpass'; lp.frequency.value = 1800; lp.Q.value = 3;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.02); g.gain.setValueAtTime(0.09, t + dur - 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      lp.connect(g); g.connect(this.out);
      for (const [m, d] of [[1, 0], [1.26, 4], [1, -6]]) { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f * m; o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }
    };
    horn(392, 0, 0.12); horn(392, 0.17, 0.12); horn(392, 0.34, 0.12); horn(523, 0.51, 0.55);
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.12, 1.15 + i * 0.09));
  }
  // Feux d'artifice : sifflement de la fusée qui monte, puis détonation et crépitement
  rocket() { this.tone(500 + Math.random() * 200, 0.7, 'sine', 0.03, 0, 1600 + Math.random() * 600); }
  burst() {
    this.thump(60 + Math.random() * 20, 0.4, 0.4); this.fnoise(0.5, 0.3, { type: 'lowpass', f: 1200, f2: 300, attack: 0.005 });
    for (let k = 0; k < 6; k++) this.fnoise(0.03, 0.08, { f: 3000 + Math.random() * 3000, q: 2, delay: 0.25 + Math.random() * 0.5 });
  }
  denied() { this.tone(180, 0.12, 'square', 0.06); }
  // Tape pour accélérer : petit « tic » de klaxon, de plus en plus aigu quand on enchaîne
  rush(k) { this.rev(); this.tone(600 + k * 35, 0.03, 'triangle', 0.03); }
}
