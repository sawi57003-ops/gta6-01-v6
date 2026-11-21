// Synthesised sound, no audio files.
//
// A small WebAudio engine builds every effect out of oscillators and
// filtered noise: the engine hum, the siren, gunshots, cash chimes, crashes
// and the little jingles for starting and finishing a job. It stays silent
// until the first user gesture — browsers require that — and it is a no-op
// when WebAudio is unavailable, so the game never breaks over sound.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.enabled = true;
    this.muted = false;
  }

  // Create (or resume) the audio context. Call from a user gesture.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.32;
  }

  // One oscillator blip, optionally sliding down to another pitch.
  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // A burst of filtered noise that fades out — punches, shots, crashes.
  _noise(dur, vol, filterFreq) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.25, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  // A helper for the little two-note chimes (cash, pickups).
  _chime(first, second, gapMs) {
    this._tone(first, 0.09, 'sine', 0.16);
    setTimeout(() => this._tone(second, 0.12, 'sine', 0.16), gapMs || 70);
  }

  click() { this._tone(880, 0.06, 'square', 0.08); }

  cash() { this._chime(1320, 1760, 70); }

  punch() {
    this._noise(0.08, 0.3, 900);
    this._tone(160, 0.08, 'sine', 0.2, 70);
  }

  shoot() {
    this._noise(0.12, 0.35, 2600);
    this._tone(220, 0.1, 'square', 0.14, 60);
  }

  crash() {
    this._noise(0.25, 0.4, 700);
    this._tone(90, 0.25, 'sine', 0.25, 40);
  }

  horn() { this._tone(370, 0.18, 'square', 0.1); }

  // The thunk of a car door: a low thud plus a metallic click.
  door() {
    this._noise(0.07, 0.28, 500);
    this._tone(120, 0.07, 'sine', 0.18, 60);
  }

  sirenBlip() { this._tone(980, 0.16, 'sine', 0.07, 1240); }

  pickup() { this._chime(1040, 1560, 60); }

  missionStart() {
    this._tone(523, 0.1, 'triangle', 0.16);
    setTimeout(() => this._tone(659, 0.1, 'triangle', 0.16), 90);
    setTimeout(() => this._tone(784, 0.16, 'triangle', 0.18), 180);
  }

  missionDone() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => setTimeout(() => this._tone(f, 0.14, 'triangle', 0.18), i * 95));
  }

  busted() { this._tone(330, 0.5, 'sawtooth', 0.14, 110); }

  wasted() { this._tone(220, 0.7, 'sawtooth', 0.16, 55); }

  // Continuous engine hum while driving. Call every frame with the
  // normalised speed 0..1; it fades out when the car stops.
  engine(speed) {
    if (!this.ctx || this.muted) return;
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 60;
      this.engineGain.gain.value = 0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    }
    const target = speed > 0.02 ? 0.05 + speed * 0.075 : 0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    this.engineOsc.frequency.setTargetAtTime(55 + speed * 165, this.ctx.currentTime, 0.08);
  }
}
