/**
 * EngineSound.ts - Web Audio API Synthesizer for high-performance race cars
 * Procedurally generates realistic multi-oscillator V8/V10 racing engine roar,
 * gearshift pops, turbo whistle, tire screeching, collision impact crunch and pit stop chimes.
 */

export class EngineSound {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // Engine oscillators
  private oscBase: OscillatorNode | null = null;
  private oscHarmonic1: OscillatorNode | null = null;
  private oscHarmonic2: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private masterGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private distortion: WaveShaperNode | null = null;

  // Turbo whistle
  private turboOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;

  // Aeroacoustic Wind Roar (V^2 quadratic scaling)
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;

  // Straight-Cut Gearbox Whine & Tarmac Hum
  private gearWhineOsc: OscillatorNode | null = null;
  private gearWhineGain: GainNode | null = null;

  // 3-Band Acoustic Tire Screech & Granular Rubber Friction
  private screechGain: GainNode | null = null;
  private screechFilter: BiquadFilterNode | null = null;
  private screechNoiseBuffer: AudioBuffer | null = null;
  private screechSource: AudioBufferSourceNode | null = null;
  private tireRumbleGain: GainNode | null = null;
  private tireRumbleFilter: BiquadFilterNode | null = null;
  private tireTearGain: GainNode | null = null;
  private tireTearFilter: BiquadFilterNode | null = null;

  // Granular metal barrier scraping & spark crackle synthesizer
  private scrapeGain: GainNode | null = null;
  private scrapeFilter: BiquadFilterNode | null = null;
  private scrapeCrackleGain: GainNode | null = null;
  private scrapeCrackleFilter: BiquadFilterNode | null = null;
  private scrapeNoiseBuffer: AudioBuffer | null = null;
  private scrapeSource: AudioBufferSourceNode | null = null;
  private scrapeCrackleSource: AudioBufferSourceNode | null = null;

  // Flat Tire / Puncture Rhythmic Flapping & Metal Rim Grinding
  private flatTireGain: GainNode | null = null;
  private flatTireFilter: BiquadFilterNode | null = null;
  private flatTireOsc: OscillatorNode | null = null;
  private flatTireThumpGain: GainNode | null = null;

  // Pre-baked noise buffers for zero runtime GC / allocation latency
  private backfireBuffer: AudioBuffer | null = null;
  private crashBuffer: AudioBuffer | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init(): void {
    if (this.isInitialized) return;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Waveshaper for throaty race engine saturation
      this.distortion = this.ctx.createWaveShaper();
      this.distortion.curve = this.makeDistortionCurve(18) as unknown as Float32Array<ArrayBuffer>;
      this.distortion.oversample = '2x';

      // Engine low-pass filter (opens with throttle)
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

      this.distortion.connect(this.engineFilter);
      this.engineFilter.connect(this.masterGain);

      // Oscillator 1: Fundamental cylinder pulse (Sawtooth)
      this.oscBase = this.ctx.createOscillator();
      this.oscBase.type = 'sawtooth';
      this.oscBase.frequency.setValueAtTime(45, this.ctx.currentTime);
      const gainBase = this.ctx.createGain();
      gainBase.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.oscBase.connect(gainBase);
      gainBase.connect(this.distortion);
      this.oscBase.start();

      // Oscillator 2: First harmonic (Triangle for warmth)
      this.oscHarmonic1 = this.ctx.createOscillator();
      this.oscHarmonic1.type = 'triangle';
      this.oscHarmonic1.frequency.setValueAtTime(90, this.ctx.currentTime);
      const gainH1 = this.ctx.createGain();
      gainH1.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.oscHarmonic1.connect(gainH1);
      gainH1.connect(this.distortion);
      this.oscHarmonic1.start();

      // Oscillator 3: High resonance exhaust rasp (Square)
      this.oscHarmonic2 = this.ctx.createOscillator();
      this.oscHarmonic2.type = 'square';
      this.oscHarmonic2.frequency.setValueAtTime(135, this.ctx.currentTime);
      const gainH2 = this.ctx.createGain();
      gainH2.gain.setValueAtTime(0.2, this.ctx.currentTime);
      this.oscHarmonic2.connect(gainH2);
      gainH2.connect(this.distortion);
      this.oscHarmonic2.start();

      // Oscillator 4: Sub-bass rumble
      this.oscSub = this.ctx.createOscillator();
      this.oscSub.type = 'sine';
      this.oscSub.frequency.setValueAtTime(30, this.ctx.currentTime);
      const gainSub = this.ctx.createGain();
      gainSub.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.oscSub.connect(gainSub);
      gainSub.connect(this.masterGain);
      this.oscSub.start();

      // Turbo Spool Whistle
      this.turboOsc = this.ctx.createOscillator();
      this.turboOsc.type = 'sine';
      this.turboOsc.frequency.setValueAtTime(2400, this.ctx.currentTime);
      this.turboGain = this.ctx.createGain();
      this.turboGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.turboOsc.connect(this.turboGain);
      this.turboGain.connect(this.masterGain);
      this.turboOsc.start();

      // Aeroacoustic Wind Roar & Straight-Cut Gear Whine
      this.setupWindAndGearWhineSound();

      // Tire Screech Loop
      this.setupTireScreech();

      // Granular Metal Barrier Scraping & Spark Sputter Loop
      this.setupScrapeSound();

      // Flat Tire Rhythmic Grinding and Flapping Loop
      this.setupFlatTireSound();

      // Pre-bake backfire noise buffer (0.18s)
      const bfSize = Math.floor(this.ctx.sampleRate * 0.18);
      this.backfireBuffer = this.ctx.createBuffer(1, bfSize, this.ctx.sampleRate);
      const bfData = this.backfireBuffer.getChannelData(0);
      for (let i = 0; i < bfSize; i++) {
        bfData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.035));
      }

      // Pre-bake crash crunch noise buffer (0.4s)
      const crSize = Math.floor(this.ctx.sampleRate * 0.4);
      this.crashBuffer = this.ctx.createBuffer(1, crSize, this.ctx.sampleRate);
      const crData = this.crashBuffer.getChannelData(0);
      for (let i = 0; i < crSize; i++) {
        crData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
      }

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio could not initialize automatically:', e);
    }
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = amount;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private setupTireScreech(): void {
    if (!this.ctx || !this.masterGain) return;

    // Create 2 seconds of pink/white noise for multi-band tire friction
    const bufferSize = this.ctx.sampleRate * 2;
    this.screechNoiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.screechNoiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }

    // 1. Mid-Band Screech (800 - 2400 Hz elastic rubber peel)
    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(3.8, this.ctx.currentTime);
    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);

    // 2. Low-Band Asphalt Scrub Rumble (120 - 450 Hz contact patch vibration)
    this.tireRumbleFilter = this.ctx.createBiquadFilter();
    this.tireRumbleFilter.type = 'lowpass';
    this.tireRumbleFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
    this.tireRumbleGain = this.ctx.createGain();
    this.tireRumbleGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.tireRumbleFilter.connect(this.tireRumbleGain);
    this.tireRumbleGain.connect(this.masterGain);

    // 3. High-Band Rubber Tear & Grain Hiss (3500 - 6800 Hz)
    this.tireTearFilter = this.ctx.createBiquadFilter();
    this.tireTearFilter.type = 'highpass';
    this.tireTearFilter.frequency.setValueAtTime(3800, this.ctx.currentTime);
    this.tireTearGain = this.ctx.createGain();
    this.tireTearGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.tireTearFilter.connect(this.tireTearGain);
    this.tireTearGain.connect(this.masterGain);

    this.startScreechLoop();
  }

  private startScreechLoop(): void {
    if (!this.ctx || !this.screechNoiseBuffer || !this.screechFilter) return;
    this.screechSource = this.ctx.createBufferSource();
    this.screechSource.buffer = this.screechNoiseBuffer;
    this.screechSource.loop = true;

    this.screechSource.connect(this.screechFilter);
    if (this.tireRumbleFilter) this.screechSource.connect(this.tireRumbleFilter);
    if (this.tireTearFilter) this.screechSource.connect(this.tireTearFilter);

    this.screechSource.start();
  }

  private setupScrapeSound(): void {
    if (!this.ctx || !this.masterGain) return;

    // 1. High-frequency metallic friction noise buffer (1.5s loop with rapid micro-irregularities)
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
    this.scrapeNoiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.scrapeNoiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // High-frequency abrasive distribution
      const raw = (Math.random() * 2 - 1);
      const crackle = Math.random() > 0.96 ? (Math.random() * 2 - 1) * 1.8 : 0;
      data[i] = (raw * 0.6 + crackle) * 0.8;
    }

    // Resonant bandpass filter (metal grinding timbre)
    this.scrapeFilter = this.ctx.createBiquadFilter();
    this.scrapeFilter.type = 'bandpass';
    this.scrapeFilter.frequency.setValueAtTime(3200, this.ctx.currentTime);
    this.scrapeFilter.Q.setValueAtTime(4.2, this.ctx.currentTime);

    this.scrapeGain = this.ctx.createGain();
    this.scrapeGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.scrapeFilter.connect(this.scrapeGain);
    this.scrapeGain.connect(this.masterGain);

    // 2. High-pass spark sputtering crackle layer
    this.scrapeCrackleFilter = this.ctx.createBiquadFilter();
    this.scrapeCrackleFilter.type = 'highpass';
    this.scrapeCrackleFilter.frequency.setValueAtTime(5800, this.ctx.currentTime);

    this.scrapeCrackleGain = this.ctx.createGain();
    this.scrapeCrackleGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.scrapeCrackleFilter.connect(this.scrapeCrackleGain);
    this.scrapeCrackleGain.connect(this.masterGain);

    this.startScrapeLoop();
  }

  private startScrapeLoop(): void {
    if (!this.ctx || !this.scrapeNoiseBuffer) return;
    this.scrapeSource = this.ctx.createBufferSource();
    this.scrapeSource.buffer = this.scrapeNoiseBuffer;
    this.scrapeSource.loop = true;
    if (this.scrapeFilter) {
      this.scrapeSource.connect(this.scrapeFilter);
    }
    this.scrapeSource.start();

    // Sputter crackle source
    this.scrapeCrackleSource = this.ctx.createBufferSource();
    this.scrapeCrackleSource.buffer = this.scrapeNoiseBuffer;
    this.scrapeCrackleSource.loop = true;
    if (this.scrapeCrackleFilter) {
      this.scrapeCrackleSource.connect(this.scrapeCrackleFilter);
    }
    this.scrapeCrackleSource.start();
  }

  private setupWindAndGearWhineSound(): void {
    if (!this.ctx || !this.masterGain) return;

    // 1. Aeroacoustic High-Speed Wind Roar (Pink/white noise with dynamic speed-bandpass sweep)
    const windBufferSize = Math.floor(this.ctx.sampleRate * 2.0);
    const windBuffer = this.ctx.createBuffer(1, windBufferSize, this.ctx.sampleRate);
    const data = windBuffer.getChannelData(0);
    // 1/f Pink-filtered distribution for rich low-frequency wind rush
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < windBufferSize; i++) {
      const white = (Math.random() * 2 - 1) * 0.5;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.16;
      b6 = white * 0.115926;
    }

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = windBuffer;
    this.windSource.loop = true;
    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    this.windSource.start();

    // 2. Straight-Cut Transmission Gearbox Whine (High-frequency harmonic oscillator)
    this.gearWhineOsc = this.ctx.createOscillator();
    this.gearWhineOsc.type = 'triangle';
    this.gearWhineOsc.frequency.setValueAtTime(600, this.ctx.currentTime);

    this.gearWhineGain = this.ctx.createGain();
    this.gearWhineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.gearWhineOsc.connect(this.gearWhineGain);
    this.gearWhineGain.connect(this.masterGain);
    this.gearWhineOsc.start();
  }

  /**
   * Real-time continuous scraping / metal friction sound modulation
   * @param intensity 0.0 to 1.0 friction force
   * @param speedKmh vehicle speed in km/h
   */
  public updateScrape(intensity: number, speedKmh: number): void {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const targetGain = Math.min(0.7, Math.max(0, intensity * 0.65)) * Math.min(1.0, speedKmh / 15.0);

    if (this.scrapeGain) {
      this.scrapeGain.gain.setTargetAtTime(targetGain, t, 0.035);
    }
    if (this.scrapeCrackleGain) {
      this.scrapeCrackleGain.gain.setTargetAtTime(targetGain * 0.55, t, 0.025);
    }
    if (this.scrapeFilter) {
      // Frequency shifts with speed (grinding pitch rises with speed)
      const targetFreq = Math.min(6500, 2400 + speedKmh * 24.0);
      this.scrapeFilter.frequency.setTargetAtTime(targetFreq, t, 0.04);
    }
  }

  public resume(): void {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Update engine sound parameters every frame
   * @param rpm Current engine RPM (e.g. 1000 - 9500)
   * @param throttle Throttle pedal position (0.0 - 1.0)
   * @param slipRatio Lateral/longitudinal tire slip factor (0.0 - 1.0)
   * @param speed Car speed in m/s
   * @param engineHealth Factor 0.0 to 1.0
   */
  public update(rpm: number, throttle: number, slipRatio: number, speed: number, engineHealth: number = 1.0): void {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    // Cylinder firing frequency (V8 firing 4 pulses per revolution)
    // Revs per second = rpm / 60
    const rps = rpm / 60;
    const baseFreq = Math.max(25, rps * 2.2);

    // Subtle sputtering frequency jitter if engine is damaged
    const healthJitter = engineHealth < 0.6 ? (Math.random() - 0.5) * (1 - engineHealth) * 30 : 0;

    if (this.oscBase) {
      this.oscBase.frequency.setTargetAtTime(baseFreq + healthJitter, t, 0.04);
    }
    if (this.oscHarmonic1) {
      this.oscHarmonic1.frequency.setTargetAtTime(baseFreq * 2.05, t, 0.04);
    }
    if (this.oscHarmonic2) {
      this.oscHarmonic2.frequency.setTargetAtTime(baseFreq * 3.12, t, 0.04);
    }
    if (this.oscSub) {
      this.oscSub.frequency.setTargetAtTime(Math.max(20, baseFreq * 0.5), t, 0.05);
    }

    // Filter frequency opens wide on throttle
    if (this.engineFilter) {
      const minCutoff = 700;
      const maxCutoff = 6500;
      const targetCutoff = minCutoff + (maxCutoff - minCutoff) * Math.pow(throttle, 1.4) * (0.6 + 0.4 * (rpm / 9000));
      this.engineFilter.frequency.setTargetAtTime(targetCutoff, t, 0.06);
    }

    // Turbo spool sound
    if (this.turboOsc && this.turboGain) {
      const turboPitch = 1800 + Math.min(speed * 45, 3200) + throttle * 1200;
      this.turboOsc.frequency.setTargetAtTime(turboPitch, t, 0.1);
      const turboVol = Math.max(0.001, throttle * 0.09 * Math.min(1, speed / 15));
      this.turboGain.gain.setTargetAtTime(turboVol, t, 0.08);
    }

    // 3-Band Dynamic Acoustic Tire Friction Modulation
    const speedGate = Math.min(1.0, speed / 3.5);
    const slipIntensity = Math.min(1.0, Math.max(0.0, (slipRatio - 0.16) * 1.6)) * speedGate;

    // 1. Mid-Band Squeal
    if (this.screechGain && this.screechFilter) {
      this.screechGain.gain.setTargetAtTime(slipIntensity * 0.32, t, 0.04);
      const screechPitch = 1050 + slipRatio * 750 + speed * 12.0;
      this.screechFilter.frequency.setTargetAtTime(screechPitch, t, 0.04);
    }

    // 2. Low-Band Heavy Scrub Rumble
    if (this.tireRumbleGain && this.tireRumbleFilter) {
      const rumbleIntensity = Math.min(1.0, Math.max(0.0, (slipRatio - 0.12) * 1.8)) * speedGate;
      this.tireRumbleGain.gain.setTargetAtTime(rumbleIntensity * 0.24, t, 0.04);
      const rumbleFreq = 180 + Math.min(220, speed * 4.0);
      this.tireRumbleFilter.frequency.setTargetAtTime(rumbleFreq, t, 0.04);
    }

    // 3. High-Band Rubber Tearing & Grain Hiss
    if (this.tireTearGain && this.tireTearFilter) {
      const tearIntensity = Math.pow(Math.min(1.0, Math.max(0.0, (slipRatio - 0.25) * 1.5)), 1.3) * speedGate;
      this.tireTearGain.gain.setTargetAtTime(tearIntensity * 0.20, t, 0.04);
      const tearFreq = 3400 + slipRatio * 1800;
      this.tireTearFilter.frequency.setTargetAtTime(tearFreq, t, 0.04);
    }

    // 1. Aeroacoustic Wind Roar: Quadratic scaling with velocity (V^2 aero pressure)
    if (this.windGain && this.windFilter) {
      const speedNorm = Math.min(1.0, speed / 98.0); // 98 m/s = ~353 km/h
      const windTargetGain = Math.pow(speedNorm, 2.0) * 0.45;
      this.windGain.gain.setTargetAtTime(Math.max(0.001, windTargetGain), t, 0.06);

      // Lowpass cutoff expands from 350 Hz to 5200 Hz for visceral high-speed air roar
      const targetCutoff = 350 + Math.pow(speedNorm, 1.35) * 4850;
      this.windFilter.frequency.setTargetAtTime(targetCutoff, t, 0.06);
    }

    // 2. Straight-Cut Transmission Gearbox Whine & Tarmac Resonance
    if (this.gearWhineOsc && this.gearWhineGain) {
      const speedKmh = speed * 3.6;
      // High-pitched harmonic pitch scaling with wheel rotation
      const whinePitch = 750 + (speedKmh / 350.0) * 2700 + throttle * 250;
      this.gearWhineOsc.frequency.setTargetAtTime(whinePitch, t, 0.05);

      // Whine volume increases under load and high velocity
      const whineVol = Math.min(1.0, speed / 25.0) * (0.02 + throttle * 0.08 + (speed / 98.0) * 0.06);
      this.gearWhineGain.gain.setTargetAtTime(Math.max(0.001, whineVol), t, 0.05);
    }
  }

  /**
   * Sound effect for gear changes and exhaust backfires (zero-allocation)
   */
  public triggerBackfire(isHighRpm: boolean = false): void {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const noiseSource = this.ctx.createBufferSource();
    if (this.backfireBuffer) {
      noiseSource.buffer = this.backfireBuffer;
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isHighRpm ? 2800 : 1600, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isHighRpm ? 0.6 : 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noiseSource.start();
  }

  /**
   * Collision sound effect with volume and pitch scaled by impact force (zero-allocation)
   */
  public triggerCrash(impactForce: number): void {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const normalizedForce = Math.min(1.0, Math.max(0.1, impactForce / 35));

    // Low frequency punch
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(normalizedForce * 0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.4);

    // Crunch noise using pre-baked buffer
    const noise = this.ctx.createBufferSource();
    if (this.crashBuffer) {
      noise.buffer = this.crashBuffer;
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(2.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(normalizedForce * 0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain!);
    noise.start(t);
  }

  /**
   * Sound effect for pneumatic hydraulic car lift jacks (hiss & clank)
   */
  public triggerPneumaticJack(isUp: boolean): void {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Compressed air burst (noise with bandpass sweep)
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isUp ? 2200 : 1200, t);
    filter.frequency.exponentialRampToValueAtTime(isUp ? 600 : 300, t + 0.35);
    filter.Q.setValueAtTime(3.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    noise.start(t);

    // Mechanical jack latch clank
    const clankOsc = this.ctx.createOscillator();
    const clankGain = this.ctx.createGain();
    clankOsc.type = 'triangle';
    clankOsc.frequency.setValueAtTime(isUp ? 380 : 180, t + 0.05);
    clankOsc.frequency.exponentialRampToValueAtTime(80, t + 0.18);

    clankGain.gain.setValueAtTime(0.4, t + 0.05);
    clankGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    clankOsc.connect(clankGain);
    clankGain.connect(this.masterGain!);
    clankOsc.start(t + 0.05);
    clankOsc.stop(t + 0.22);
  }

  /**
   * Sound effect for high-speed pneumatic impact wrench unbolting/bolting wheel nuts
   */
  public triggerWheelGunRattle(): void {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Rapid rat-tat-tat pulses
    const pulseCount = 6;
    for (let p = 0; p < pulseCount; p++) {
      const pt = t + p * 0.038;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400 + Math.random() * 400, pt);
      osc.frequency.exponentialRampToValueAtTime(350, pt + 0.03);

      gain.gain.setValueAtTime(0.22, pt);
      gain.gain.exponentialRampToValueAtTime(0.001, pt + 0.035);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(pt);
      osc.stop(pt + 0.04);
    }
  }

  private setupFlatTireSound(): void {
    if (!this.ctx || !this.masterGain) return;

    // Rhythmic rim grinding / flat tire noise bandpass
    this.flatTireFilter = this.ctx.createBiquadFilter();
    this.flatTireFilter.type = 'bandpass';
    this.flatTireFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.flatTireFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    this.flatTireGain = this.ctx.createGain();
    this.flatTireGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.flatTireFilter.connect(this.flatTireGain);
    this.flatTireGain.connect(this.masterGain);

    // Low-frequency cyclic thumping oscillator (slapping rubber on wheel rotation)
    this.flatTireOsc = this.ctx.createOscillator();
    this.flatTireOsc.type = 'sawtooth';
    this.flatTireOsc.frequency.setValueAtTime(14, this.ctx.currentTime);

    this.flatTireThumpGain = this.ctx.createGain();
    this.flatTireThumpGain.gain.setValueAtTime(0, this.ctx.currentTime);

    const thumpFilter = this.ctx.createBiquadFilter();
    thumpFilter.type = 'lowpass';
    thumpFilter.frequency.setValueAtTime(160, this.ctx.currentTime);

    this.flatTireOsc.connect(thumpFilter);
    thumpFilter.connect(this.flatTireThumpGain);
    this.flatTireThumpGain.connect(this.masterGain);
    this.flatTireOsc.start();

    // Connect noise buffer to flat tire filter
    if (this.scrapeNoiseBuffer) {
      const source = this.ctx.createBufferSource();
      source.buffer = this.scrapeNoiseBuffer;
      source.loop = true;
      source.connect(this.flatTireFilter);
      source.start();
    }
  }

  /**
   * Real-time continuous flat tire flapping / rim grinding sound modulation
   */
  public updateFlatTireSound(hasPuncture: boolean, speedMs: number): void {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const speedKmh = speedMs * 3.6;

    if (hasPuncture && speedKmh > 2.0) {
      // Flapping frequency scales directly with wheel rotational velocity
      const flapFreq = Math.max(3, Math.min(35, speedMs * 2.8));
      const targetGain = Math.min(0.65, 0.15 + (speedKmh / 50.0) * 0.45);

      if (this.flatTireOsc) {
        this.flatTireOsc.frequency.setTargetAtTime(flapFreq, t, 0.04);
      }
      if (this.flatTireThumpGain) {
        this.flatTireThumpGain.gain.setTargetAtTime(targetGain * 0.75, t, 0.04);
      }
      if (this.flatTireGain) {
        this.flatTireGain.gain.setTargetAtTime(targetGain * 0.55, t, 0.04);
      }
      if (this.flatTireFilter) {
        const centerFreq = 320 + speedKmh * 18.0;
        this.flatTireFilter.frequency.setTargetAtTime(centerFreq, t, 0.05);
      }
    } else {
      if (this.flatTireThumpGain) {
        this.flatTireThumpGain.gain.setTargetAtTime(0, t, 0.06);
      }
      if (this.flatTireGain) {
        this.flatTireGain.gain.setTargetAtTime(0, t, 0.06);
      }
    }
  }

  /**
   * Explosive pneumatic tire blowout sound effect ("BANG! PSHHHHH!")
   */
  public triggerTireBlowout(): void {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Explosive Shockwave Burst (Heavy Low-Mid Transient Pop)
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    popOsc.type = 'sawtooth';
    popOsc.frequency.setValueAtTime(320, t);
    popOsc.frequency.exponentialRampToValueAtTime(35, t + 0.18);

    popGain.gain.setValueAtTime(0.85, t);
    popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    popOsc.connect(popGain);
    popGain.connect(this.masterGain!);
    popOsc.start(t);
    popOsc.stop(t + 0.25);

    // 2. High-Pressure Air Decompression Hiss ("PSHHHHH!")
    const hissLen = Math.floor(this.ctx.sampleRate * 0.85);
    const hissBuffer = this.ctx.createBuffer(1, hissLen, this.ctx.sampleRate);
    const hissData = hissBuffer.getChannelData(0);
    for (let i = 0; i < hissLen; i++) {
      hissData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.28));
    }

    const hissSource = this.ctx.createBufferSource();
    hissSource.buffer = hissBuffer;

    const hissFilter = this.ctx.createBiquadFilter();
    hissFilter.type = 'highpass';
    hissFilter.frequency.setValueAtTime(1800, t);
    hissFilter.frequency.exponentialRampToValueAtTime(600, t + 0.7);

    const hissGain = this.ctx.createGain();
    hissGain.gain.setValueAtTime(0.6, t);
    hissGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    hissSource.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(this.masterGain!);
    hissSource.start(t);

    // 3. Metallic Rim Hit Transient
    const rimOsc = this.ctx.createOscillator();
    const rimGain = this.ctx.createGain();
    rimOsc.type = 'square';
    rimOsc.frequency.setValueAtTime(980, t + 0.02);
    rimOsc.frequency.exponentialRampToValueAtTime(140, t + 0.14);

    rimGain.gain.setValueAtTime(0.45, t + 0.02);
    rimGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    rimOsc.connect(rimGain);
    rimGain.connect(this.masterGain!);
    rimOsc.start(t + 0.02);
    rimOsc.stop(t + 0.16);
  }

  /**
   * Pit stop completion sound
   */
  public triggerPitChime(): void {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, High C
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.2, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.3);
    });
  }

  /**
   * Synthesize authentic F1 Pit Radio communications with VHF static, bandpass filter & roger beeps
   */
  public triggerPitRadio(cue: 'box' | 'tyres' | 'go' | 'puncture'): void {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. VHF Radio Static Squelch Burst (Opening chirp)
    const squelchBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.09), this.ctx.sampleRate);
    const data = squelchBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.45;
    }
    const squelchSource = this.ctx.createBufferSource();
    squelchSource.buffer = squelchBuf;

    const squelchFilter = this.ctx.createBiquadFilter();
    squelchFilter.type = 'bandpass';
    squelchFilter.frequency.setValueAtTime(2100, t);
    squelchFilter.Q.setValueAtTime(4.0, t);

    const squelchGain = this.ctx.createGain();
    squelchGain.gain.setValueAtTime(0.18, t);
    squelchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.085);

    squelchSource.connect(squelchFilter);
    squelchFilter.connect(squelchGain);
    squelchGain.connect(this.masterGain!);
    squelchSource.start(t);

    // 2. F1 Team Radio Audio Bus with telephone bandpass filter (400Hz to 3200Hz)
    const radioFilter = this.ctx.createBiquadFilter();
    radioFilter.type = 'bandpass';
    radioFilter.frequency.setValueAtTime(1400, t);
    radioFilter.Q.setValueAtTime(1.8, t);

    const radioGain = this.ctx.createGain();
    radioGain.gain.setValueAtTime(0.24, t);
    radioGain.connect(this.masterGain!);
    radioFilter.connect(radioGain);

    // 3. Formant Vocal Cues depending on event
    if (cue === 'box' || cue === 'puncture') {
      // "Puncture / Box now" - urgent high-low dual tones
      [0.08, 0.24, 0.42, 0.58].forEach((timeOffset, idx) => {
        const osc = this.ctx!.createOscillator();
        const oGain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(idx % 2 === 0 ? 520 : 380, t + timeOffset);
        osc.frequency.exponentialRampToValueAtTime(280, t + timeOffset + 0.11);

        oGain.gain.setValueAtTime(0.32, t + timeOffset);
        oGain.gain.exponentialRampToValueAtTime(0.001, t + timeOffset + 0.12);

        osc.connect(oGain);
        oGain.connect(radioFilter);
        osc.start(t + timeOffset);
        osc.stop(t + timeOffset + 0.13);
      });
    } else if (cue === 'tyres') {
      // "Tyres on" - dual harmonic vocal burst
      [0.08, 0.26].forEach((timeOffset, idx) => {
        const osc = this.ctx!.createOscillator();
        const oGain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440 - idx * 60, t + timeOffset);
        osc.frequency.exponentialRampToValueAtTime(300, t + timeOffset + 0.14);

        oGain.gain.setValueAtTime(0.28, t + timeOffset);
        oGain.gain.exponentialRampToValueAtTime(0.001, t + timeOffset + 0.15);

        osc.connect(oGain);
        oGain.connect(radioFilter);
        osc.start(t + timeOffset);
        osc.stop(t + timeOffset + 0.16);
      });
    } else if (cue === 'go') {
      // "Go, Go, Go!" - rising triple urgent burst
      [0.08, 0.22, 0.36].forEach((timeOffset, idx) => {
        const osc = this.ctx!.createOscillator();
        const oGain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(380 + idx * 90, t + timeOffset);
        osc.frequency.exponentialRampToValueAtTime(540 + idx * 80, t + timeOffset + 0.1);

        oGain.gain.setValueAtTime(0.32, t + timeOffset);
        oGain.gain.exponentialRampToValueAtTime(0.001, t + timeOffset + 0.11);

        osc.connect(oGain);
        oGain.connect(radioFilter);
        osc.start(t + timeOffset);
        osc.stop(t + timeOffset + 0.12);
      });
    }

    // 4. Roger Beep (Transmission end chirp at t + 0.68s)
    const beepTime = t + 0.68;
    const beepOsc = this.ctx.createOscillator();
    const beepGain = this.ctx.createGain();
    beepOsc.type = 'sine';
    beepOsc.frequency.setValueAtTime(1920, beepTime);
    beepGain.gain.setValueAtTime(0.15, beepTime);
    beepGain.gain.exponentialRampToValueAtTime(0.001, beepTime + 0.05);

    beepOsc.connect(beepGain);
    beepGain.connect(this.masterGain!);
    beepOsc.start(beepTime);
    beepOsc.stop(beepTime + 0.06);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}
