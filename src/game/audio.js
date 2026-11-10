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
    this.startMusic();
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
  // Pose : un « toc » dont la hauteur dépend du matériau
  place(stage) {
    const f = [110, 150, 190, 260, 320, 420][stage] || 150;
    this.noise(0.09, 0.35, 900 + stage * 300); this.tone(f, 0.12, 'triangle', 0.25, 0, f * 0.7);
  }
  coin() { this.tone(988, 0.07, 'square', 0.06, 0.03); this.tone(1319, 0.12, 'square', 0.05, 0.09); }
  deliver() { this.tone(392, 0.12, 'square', 0.07); this.tone(330, 0.16, 'square', 0.07, 0.13); }
  buy() { this.tone(660, 0.08, 'triangle', 0.18); this.tone(990, 0.12, 'triangle', 0.16, 0.07); }
  tier() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.18, i * 0.08)); this.noise(0.4, 0.2, 500); }
  win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.2, i * 0.11)); }
  denied() { this.tone(180, 0.12, 'square', 0.06); }
  // Tape pour accélérer : petit « tic » de klaxon, de plus en plus aigu quand on enchaîne
  rush(k) { this.tone(700 + k * 40, 0.04, 'square', 0.035); }
}
