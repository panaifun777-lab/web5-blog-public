// ════════════════════════════════════════════════════════════════
// src/lib/web5/audio-engine.ts
// 纯 Web Audio API 程序化音效引擎（移植自 PLVTVS audioEngine.ts）
// 四阶段：void / ritual / revelation / dashboard
// ════════════════════════════════════════════════════════════════

class Web5AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private currentPhase: 'void' | 'ritual' | 'revelation' | 'dashboard' | null = null;
  private initialized = false;

  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (err) {
      console.warn('[audioEngine] Web Audio API not available:', err);
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.15,
    delay = 0
  ) {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(env);
    env.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  private playNoise(duration: number, gain = 0.05, delay = 0) {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime + delay;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const env = this.ctx.createGain();
    env.gain.value = gain;
    src.connect(env);
    env.connect(this.masterGain);
    src.start(t);
  }

  /** 启动持续低音 drone（void / ritual 阶段） */
  startDrone(freq = 50) {
    if (!this.ctx || !this.masterGain) return;
    if (this.droneOsc) this.stopDrone();
    this.droneOsc = this.ctx.createOscillator();
    this.droneGain = this.ctx.createGain();
    this.droneOsc.type = 'sine';
    this.droneOsc.frequency.value = freq;
    this.droneGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.droneGain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.5);
    this.droneOsc.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
    this.droneOsc.start();
  }

  stopDrone() {
    if (!this.ctx || !this.droneOsc || !this.droneGain) return;
    this.droneGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    this.droneOsc.stop(this.ctx.currentTime + 0.4);
    this.droneOsc = null;
    this.droneGain = null;
  }

  /** Phase 1: void — 虚无阶段 */
  playVoid() {
    this.init();
    this.resume();
    if (this.currentPhase === 'void') return;
    this.currentPhase = 'void';
    this.startDrone(50);
  }

  /** Phase 2: ritual — 扫描仪式 */
  playRitual() {
    this.init();
    this.resume();
    if (this.currentPhase === 'ritual') return;
    this.currentPhase = 'ritual';
    this.stopDrone();
    this.startDrone(80);

    // 扫描声 — 升频
    for (let i = 0; i < 8; i++) {
      this.playTone(200 + i * 100, 0.1, 'sawtooth', 0.04, i * 0.15);
    }
    // 噪音扫描
    this.playNoise(1.2, 0.03);
  }

  /** Phase 3: revelation — 容器激活爆炸 */
  playRevelation() {
    this.init();
    this.resume();
    if (this.currentPhase === 'revelation') return;
    this.currentPhase = 'revelation';
    this.stopDrone();

    // 爆炸 — 低频冲击 + 高频闪光
    this.playTone(60, 0.8, 'sawtooth', 0.2);
    this.playTone(120, 0.6, 'square', 0.15, 0.05);
    this.playNoise(0.5, 0.12);
    // 升调和弦 — C-E-G-C
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((f, i) => {
      this.playTone(f, 1.5, 'sine', 0.1, 0.2 + i * 0.08);
    });
  }

  /** Phase 4: dashboard — 进入控制台 */
  playDashboard() {
    this.init();
    this.resume();
    if (this.currentPhase === 'dashboard') return;
    this.currentPhase = 'dashboard';
    // 短促成功音
    this.playTone(880, 0.15, 'sine', 0.12);
    this.playTone(1318.51, 0.25, 'sine', 0.1, 0.1);
  }

  /** 单次点击反馈 */
  playClick() {
    this.init();
    this.resume();
    this.playTone(1500, 0.04, 'square', 0.06);
  }

  /** 错误音 */
  playError() {
    this.init();
    this.resume();
    this.playTone(220, 0.15, 'sawtooth', 0.12);
    this.playTone(180, 0.2, 'sawtooth', 0.1, 0.1);
  }

  stopAll() {
    this.stopDrone();
    this.currentPhase = null;
  }
}

// 单例
let _instance: Web5AudioEngine | null = null;
export function getAudioEngine(): Web5AudioEngine {
  if (!_instance) _instance = new Web5AudioEngine();
  return _instance;
}
