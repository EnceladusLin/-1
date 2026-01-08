
import { Injectable } from '@angular/core';

export type SfxType = 
  | 'EXPLOSION' | 'GUNSHOT' | 'HEAVY_CANNON' | 'RIFLE' | 'AUTO_CANNON' 
  | 'CLICK' | 'HOVER' | 'MARCH' | 'TYPEWRITER' | 'PAPER' | 'METAL_CLANK' 
  | 'SIREN' | 'AA_FIRE' | 'ERROR' | 'RADIO_STATIC' | 'UI_HOVER' | 'VOICE_BEEP'
  | 'DISTANT_GUNSHOT' | 'MUFFLED_CANNON'
  // NEW SKILL SFX
  | 'SKILL_MORALE' | 'SKILL_AIR' | 'SKILL_ARTY' | 'SKILL_TORPEDO' | 'SKILL_REINFORCE' | 'SKILL_CONSTRUCT';

const NOTES: Record<string, number> = {
  'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25
};

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private ctx: AudioContext | null = null;
  
  // Mix Buses
  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null; 
  private sfxBus: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private ambienceBus: GainNode | null = null;
  
  // Music Bus
  private musicBus: GainNode | null = null;
  private anthemNodes: AudioNode[] = [];

  // Weather Nodes (Persistent for cross-fading)
  private weatherNodes: {
      wind?: { src: AudioBufferSourceNode, gain: GainNode, filter: BiquadFilterNode },
      rain?: { src: AudioBufferSourceNode, gain: GainNode, filter: BiquadFilterNode },
      rumble?: { src: OscillatorNode, gain: GainNode }
  } = {};
  
  private currentWeather: 'Sunny' | 'Rain' | 'Typhoon' | 'NONE' = 'NONE';
  
  // Assets (Generated Procedurally)
  private noiseBuffers: { white: AudioBuffer | null, pink: AudioBuffer | null, brown: AudioBuffer | null } = { white: null, pink: null, brown: null };
  private impulseResponse: AudioBuffer | null = null;

  // State
  private isMuted = false;
  private isMusicPlaying = false;
  private musicTimer: any = null;
  private battleAmbienceTimer: any = null;

  constructor() {}

  async init() {
    if (this.ctx) {
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        return;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // --- 1. MASTER CHAIN (Polished, Cinematic) ---
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -18; 
    this.masterCompressor.knee.value = 30;       
    this.masterCompressor.ratio.value = 12;      
    this.masterCompressor.attack.value = 0.005;  
    this.masterCompressor.release.value = 0.25;  

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;

    // Master Filter for Pause Effect
    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 22000; // Open

    this.masterCompressor.connect(this.masterGain);
    this.masterGain.connect(this.masterFilter);
    this.masterFilter.connect(this.ctx.destination);

    // --- 2. SFX BUS & REVERB (The "War Atmosphere") ---
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 1.0;
    
    // Create a procedural Impulse Response for a "Open Battlefield" reverb
    this.impulseResponse = this.generateImpulseResponse(2.0, 2.0); 
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.impulseResponse;
    
    // Wet/Dry Mixing for SFX
    const sfxDry = this.ctx.createGain(); sfxDry.gain.value = 0.8;
    const sfxWet = this.ctx.createGain(); sfxWet.gain.value = 0.3; 

    this.sfxBus.connect(sfxDry);
    this.sfxBus.connect(this.reverbNode);
    this.reverbNode.connect(sfxWet);
    
    sfxDry.connect(this.masterCompressor);
    sfxWet.connect(this.masterCompressor);

    // --- 3. AMBIENCE BUS (Direct to Master, no Reverb) ---
    this.ambienceBus = this.ctx.createGain();
    this.ambienceBus.gain.value = 0.6;
    this.ambienceBus.connect(this.masterCompressor);

    // --- 4. MUSIC BUS ---
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.6; // Slightly quieter
    this.musicBus.connect(this.masterCompressor);

    // --- 5. PRE-GENERATE ASSETS ---
    this.noiseBuffers.white = this.createNoiseBuffer('white');
    this.noiseBuffers.pink = this.createNoiseBuffer('pink');
    this.noiseBuffers.brown = this.createNoiseBuffer('brown');
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
        const t = this.ctx.currentTime;
        this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.8, t, 0.1);
    }
  }

  setPausedEffect(isPaused: boolean) {
      if (!this.ctx || !this.masterFilter) return;
      const t = this.ctx.currentTime;
      // Filter sweep to simulate underwater/muffled sound
      this.masterFilter.frequency.setTargetAtTime(isPaused ? 200 : 22000, t, 0.3);
  }

  setAmbience(type: 'Sunny' | 'Rain' | 'Typhoon') {
      if (!this.ctx || this.isMuted) return;
      if (this.currentWeather === type) return;
      this.currentWeather = type;

      const t = this.ctx.currentTime;
      const transitionTime = 3.0; // Slow crossfade

      // Ensure nodes exist
      this.ensureWeatherNodes();

      // TARGET VALUES
      let windGain = 0; let windCutoff = 100;
      let rainGain = 0; let rainCutoff = 400;
      let rumbleGain = 0;

      switch (type) {
          case 'Sunny': windGain = 0.15; windCutoff = 150; break;
          case 'Rain': windGain = 0.3; windCutoff = 300; rainGain = 0.25; rainCutoff = 800; rumbleGain = 0.02; break;
          case 'Typhoon': windGain = 0.6; windCutoff = 600; rainGain = 0.5; rainCutoff = 2000; rumbleGain = 0.1; break;
      }

      if (this.weatherNodes.wind) {
          this.weatherNodes.wind.gain.gain.setTargetAtTime(windGain, t, transitionTime / 3);
          this.weatherNodes.wind.filter.frequency.setTargetAtTime(windCutoff, t, transitionTime / 3);
      }
      if (this.weatherNodes.rain) {
          this.weatherNodes.rain.gain.gain.setTargetAtTime(rainGain, t, transitionTime / 3);
          this.weatherNodes.rain.filter.frequency.setTargetAtTime(rainCutoff, t, transitionTime / 3);
      }
      if (this.weatherNodes.rumble) {
          this.weatherNodes.rumble.gain.gain.setTargetAtTime(rumbleGain, t, transitionTime / 3);
      }
  }

  private ensureWeatherNodes() {
      if (!this.weatherNodes.wind) {
          const src = this.ctx!.createBufferSource(); src.buffer = this.noiseBuffers.pink; src.loop = true;
          const filter = this.ctx!.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 0.5;
          const gain = this.ctx!.createGain(); gain.gain.value = 0;
          src.connect(filter).connect(gain).connect(this.ambienceBus!); src.start();
          this.weatherNodes.wind = { src, gain, filter };
      }
      if (!this.weatherNodes.rain) {
          const src = this.ctx!.createBufferSource(); src.buffer = this.noiseBuffers.white; src.loop = true;
          const filter = this.ctx!.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 0.1;
          const gain = this.ctx!.createGain(); gain.gain.value = 0;
          src.connect(filter).connect(gain).connect(this.ambienceBus!); src.start();
          this.weatherNodes.rain = { src, gain, filter };
      }
      if (!this.weatherNodes.rumble) {
          const src = this.ctx!.createOscillator(); src.type = 'sine'; src.frequency.value = 40;
          const gain = this.ctx!.createGain(); gain.gain.value = 0;
          src.connect(gain).connect(this.ambienceBus!); src.start();
          this.weatherNodes.rumble = { src, gain };
      }
  }

  playSpatialSfx(type: SfxType, q: number, r: number) {
      const dist = Math.sqrt(q*q + r*r); 
      const distFactor = Math.min(dist / 25, 1.0); 
      this.triggerSfx(type, distFactor);
  }

  playSfx(type: SfxType) {
      this.triggerSfx(type, 0); 
  }

  private triggerSfx(type: SfxType, distance: number) {
    if (this.isMuted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    const t = this.ctx.currentTime;

    switch (type) {
        case 'MUFFLED_CANNON': this.synthHeavyImpact(t, 100, 0.4, 0.8); break;
        case 'CLICK': this.synthClick(t); break;
        case 'UI_HOVER': this.synthPaperSlide(t, 0.05); break;
        case 'TYPEWRITER': this.synthTypewriter(t); break;
        case 'ERROR': this.synthBuzz(t); break;
        case 'PAPER': this.synthPaperSlide(t, 0.2); break;
        case 'GUNSHOT': case 'RIFLE': this.synthGunshot(t, distance, 1.0); break;
        case 'DISTANT_GUNSHOT': this.synthGunshot(t, 0.8 + Math.random()*0.2, 0.6); break;
        case 'HEAVY_CANNON': this.synthCannon(t, distance); break;
        case 'AUTO_CANNON': case 'AA_FIRE': this.synthAutoFire(t, distance); break;
        case 'EXPLOSION': this.synthExplosion(t, distance); break;
        case 'METAL_CLANK': this.synthMetalHit(t, distance); break;
        case 'MARCH': this.synthMarch(t); break;
        case 'SIREN': this.synthSiren(t); break;
        case 'VOICE_BEEP': this.synthBeep(t); break;
        // NEW SKILLS
        case 'SKILL_MORALE': this.synthBugle(t); break;
        case 'SKILL_AIR': this.synthAirRaid(t); break;
        case 'SKILL_ARTY': this.synthIncomingShell(t); break;
        case 'SKILL_TORPEDO': this.synthTorpedo(t); break;
        case 'SKILL_REINFORCE': this.synthReinforce(t); break;
        case 'SKILL_CONSTRUCT': this.synthConstruction(t); break;
    }
  }

  // --- NEW SKILL SYNTHESIS ---

  private synthBugle(t: number) {
      // Charge! (G3 C4 E4 G4 E4 G4)
      const notes = [
          {f: 196, d: 0.1}, {f: 261, d: 0.1}, {f: 329, d: 0.1}, 
          {f: 392, d: 0.2}, {f: 329, d: 0.1}, {f: 392, d: 0.4}
      ];
      let ct = t;
      const gain = this.ctx!.createGain(); gain.gain.setValueAtTime(0.4, t); gain.connect(this.sfxBus!);
      
      notes.forEach(n => {
          const osc = this.ctx!.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = n.f;
          const env = this.ctx!.createGain(); 
          env.gain.setValueAtTime(0, ct); env.gain.linearRampToValueAtTime(1, ct + 0.05); env.gain.linearRampToValueAtTime(0, ct + n.d);
          osc.connect(env).connect(gain);
          osc.start(ct); osc.stop(ct + n.d);
          ct += n.d;
      });
  }

  private synthAirRaid(t: number) {
      // Stuka-like dive + Propeller drone
      const dur = 3.0;
      const osc = this.ctx!.createOscillator(); osc.type = 'sawtooth'; 
      osc.frequency.setValueAtTime(600, t); osc.frequency.exponentialRampToValueAtTime(150, t + dur);
      
      const gain = this.ctx!.createGain(); 
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.3, t + 0.5); gain.gain.linearRampToValueAtTime(0, t + dur);
      
      // Propeller modulation
      const lfo = this.ctx!.createOscillator(); lfo.frequency.value = 40;
      const lfoGain = this.ctx!.createGain(); lfoGain.gain.value = 200;
      lfo.connect(lfoGain).connect(osc.frequency);
      
      osc.connect(gain).connect(this.sfxBus!);
      osc.start(t); lfo.start(t); osc.stop(t+dur); lfo.stop(t+dur);
  }

  private synthIncomingShell(t: number) {
      // High pitch whistle sliding down + Explosion
      const dur = 1.0;
      const whistle = this.ctx!.createOscillator(); whistle.type = 'sine';
      whistle.frequency.setValueAtTime(2000, t); whistle.frequency.exponentialRampToValueAtTime(200, t + dur);
      const wGain = this.ctx!.createGain();
      wGain.gain.setValueAtTime(0.1, t); wGain.gain.linearRampToValueAtTime(0.3, t + dur*0.8); wGain.gain.linearRampToValueAtTime(0, t + dur);
      
      whistle.connect(wGain).connect(this.sfxBus!);
      whistle.start(t); whistle.stop(t + dur);
      
      // Explosion at end
      setTimeout(() => this.synthExplosion(this.ctx!.currentTime, 0), (dur - 0.2) * 1000);
  }

  private synthTorpedo(t: number) {
      // Sonar Ping + Underwater Bubble noise
      const ping = this.ctx!.createOscillator(); ping.type = 'sine'; ping.frequency.setValueAtTime(800, t);
      const pGain = this.ctx!.createGain(); pGain.gain.setValueAtTime(0, t); pGain.gain.linearRampToValueAtTime(0.4, t+0.05); pGain.gain.exponentialRampToValueAtTime(0.01, t+1.0);
      ping.connect(pGain).connect(this.reverbNode!); // Wet reverb for underwater feel
      ping.start(t); ping.stop(t+1);

      // Bubbles
      const noise = this.ctx!.createBufferSource(); noise.buffer = this.noiseBuffers.brown;
      const filter = this.ctx!.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.setValueAtTime(200, t); filter.Q.value = 5;
      const nGain = this.ctx!.createGain(); nGain.gain.setValueAtTime(0.2, t); nGain.gain.linearRampToValueAtTime(0, t+1.5);
      
      // Modulate filter for bubbly sound
      const lfo = this.ctx!.createOscillator(); lfo.frequency.value = 15; 
      const lfoG = this.ctx!.createGain(); lfoG.gain.value = 300;
      lfo.connect(lfoG).connect(filter.frequency);
      
      noise.connect(filter).connect(nGain).connect(this.sfxBus!);
      noise.start(t); lfo.start(t); noise.stop(t+1.5); lfo.stop(t+1.5);
  }

  private synthReinforce(t: number) {
      // Whistle short + March
      const whistle = this.ctx!.createOscillator(); whistle.type = 'square'; whistle.frequency.setValueAtTime(1500, t);
      const wGain = this.ctx!.createGain(); wGain.gain.setValueAtTime(0.1, t); wGain.gain.linearRampToValueAtTime(0, t+0.3);
      whistle.connect(wGain).connect(this.sfxBus!); whistle.start(t); whistle.stop(t+0.3);
      
      this.synthMarch(t + 0.2);
  }

  private synthConstruction(t: number) {
      // Clanking sounds
      for(let i=0; i<3; i++) {
          this.synthMetalHit(t + i*0.25 + Math.random()*0.1, 0);
      }
  }

  // --- EXISTING SYNTHESIS ENGINES ---
  private synthHeavyImpact(t: number, freq: number, duration: number, vol: number) {
      const osc = this.ctx!.createOscillator(); osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(10, t + duration);
      const gain = this.ctx!.createGain(); gain.gain.setValueAtTime(vol, t); gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
      const noise = this.ctx!.createBufferSource(); noise.buffer = this.noiseBuffers.pink;
      const noiseFilter = this.ctx!.createBiquadFilter(); noiseFilter.type = 'lowpass'; noiseFilter.frequency.value = 150; 
      const noiseGain = this.ctx!.createGain(); noiseGain.gain.setValueAtTime(vol * 0.8, t); noiseGain.gain.exponentialRampToValueAtTime(0.01, t + duration * 1.5);
      osc.connect(gain).connect(this.sfxBus!); noise.connect(noiseFilter).connect(noiseGain).connect(this.sfxBus!);
      osc.start(t); osc.stop(t + duration); noise.start(t); noise.stop(t + duration * 1.5);
  }

  private synthGunshot(t: number, distance: number, scale: number) {
      const filter = this.ctx!.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = Math.max(800, 15000 * (1 - distance));
      const masterShotGain = this.ctx!.createGain(); masterShotGain.gain.value = scale * (1 - distance * 0.5); masterShotGain.connect(filter).connect(this.sfxBus!);
      const crack = this.ctx!.createBufferSource(); crack.buffer = this.noiseBuffers.white;
      const crackGain = this.ctx!.createGain(); crackGain.gain.setValueAtTime(0.8, t); crackGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      crack.connect(crackGain).connect(masterShotGain); crack.start(t); crack.stop(t + 0.05);
      const thump = this.ctx!.createOscillator(); thump.type = 'triangle'; thump.frequency.setValueAtTime(150, t); thump.frequency.exponentialRampToValueAtTime(50, t + 0.15);
      const thumpGain = this.ctx!.createGain(); thumpGain.gain.setValueAtTime(0.5, t); thumpGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      thump.connect(thumpGain).connect(masterShotGain); thump.start(t); thump.stop(t + 0.15);
  }

  private synthExplosion(t: number, distance: number) {
      const filter = this.ctx!.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = Math.max(400, 8000 * (1 - distance));
      const masterExpGain = this.ctx!.createGain(); masterExpGain.gain.value = 1.0 * (1 - distance * 0.4); masterExpGain.connect(filter).connect(this.sfxBus!);
      const sub = this.ctx!.createOscillator(); sub.frequency.setValueAtTime(80, t); sub.frequency.exponentialRampToValueAtTime(10, t + 1.0);
      const subGain = this.ctx!.createGain(); subGain.gain.setValueAtTime(1.0, t); subGain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);
      sub.connect(subGain).connect(masterExpGain); sub.start(t); sub.stop(t + 1.0);
      const rumble = this.ctx!.createBufferSource(); rumble.buffer = this.noiseBuffers.brown;
      const rumbleGain = this.ctx!.createGain(); rumbleGain.gain.setValueAtTime(0.8, t); rumbleGain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);
      rumble.connect(rumbleGain).connect(masterExpGain); rumble.start(t); rumble.stop(t + 1.5);
  }

  private synthCannon(t: number, distance: number) {
      this.synthExplosion(t, distance);
      const ring = this.ctx!.createOscillator(); ring.type = 'sawtooth'; ring.frequency.setValueAtTime(400, t);
      const ringGain = this.ctx!.createGain(); ringGain.gain.setValueAtTime(0.2, t); ringGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      ring.connect(ringGain).connect(this.sfxBus!); ring.start(t); ring.stop(t + 0.3);
  }

  private synthAutoFire(t: number, distance: number) {
      for(let i=0; i<4; i++) { this.synthGunshot(t + i*0.12, distance, 0.6); }
  }

  private synthClick(t: number) {
      const osc = this.ctx!.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(2000, t); osc.frequency.exponentialRampToValueAtTime(1000, t + 0.05);
      const gain = this.ctx!.createGain(); gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain).connect(this.masterGain!); osc.start(t); osc.stop(t + 0.05);
  }

  private synthPaperSlide(t: number, duration: number) {
      const src = this.ctx!.createBufferSource(); src.buffer = this.noiseBuffers.white;
      const filter = this.ctx!.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.setValueAtTime(1200, t); filter.Q.value = 1.0;
      const gain = this.ctx!.createGain(); gain.gain.setValueAtTime(0.05, t); gain.gain.linearRampToValueAtTime(0, t + duration);
      src.connect(filter).connect(gain).connect(this.masterGain!); src.start(t); src.stop(t + duration);
  }

  private synthTypewriter(t: number) { this.synthHeavyImpact(t, 300, 0.05, 0.1); this.synthClick(t); }

  private synthMetalHit(t: number, distance: number) {
      const osc = this.ctx!.createOscillator(); osc.type = 'square'; osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(200, t + 0.3);
      const filter = this.ctx!.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1500; filter.Q.value = 10; 
      const gain = this.ctx!.createGain(); gain.gain.setValueAtTime(0.2 * (1-distance), t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.connect(filter).connect(gain).connect(this.sfxBus!); osc.start(t); osc.stop(t + 0.3);
  }

  private synthMarch(t: number) {
      for(let i=0; i<4; i++) {
          const st = t + i * 0.15; const noise = this.ctx!.createBufferSource(); noise.buffer = this.noiseBuffers.pink;
          const filter = this.ctx!.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 200;
          const gain = this.ctx!.createGain(); gain.gain.setValueAtTime(0.1, st); gain.gain.exponentialRampToValueAtTime(0.01, st + 0.1);
          noise.connect(filter).connect(gain).connect(this.sfxBus!); noise.start(st); noise.stop(st+0.1);
      }
  }

  private synthSiren(t: number) {
      const osc = this.ctx!.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, t); osc.frequency.linearRampToValueAtTime(800, t + 2); osc.frequency.linearRampToValueAtTime(400, t + 4);
      const gain = this.ctx!.createGain(); gain.gain.setValueAtTime(0.05, t); gain.gain.linearRampToValueAtTime(0.05, t + 4); gain.gain.linearRampToValueAtTime(0, t + 4.1);
      const shaper = this.ctx!.createWaveShaper(); shaper.curve = this.makeDistortionCurve(50);
      osc.connect(shaper).connect(gain).connect(this.sfxBus!); osc.start(t); osc.stop(t + 4.1);
  }

  private synthBuzz(t: number) {
      const osc = this.ctx!.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 150;
      const gain = this.ctx!.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.connect(gain).connect(this.masterGain!); osc.start(t); osc.stop(t + 0.3);
  }

  private synthBeep(t: number) {
      const osc = this.ctx!.createOscillator(); osc.type = 'square'; osc.frequency.value = 800;
      const gain = this.ctx!.createGain(); gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.connect(gain).connect(this.masterGain!); osc.start(t); osc.stop(t+0.1);
  }

  // --- UTILITIES ---
  private createNoiseBuffer(type: 'white' | 'pink' | 'brown'): AudioBuffer {
      if (!this.ctx) throw new Error("No Context");
      const bufferSize = this.ctx.sampleRate * 2; const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate); const data = buffer.getChannelData(0);
      if (type === 'white') { for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1; }
      else if (type === 'pink') {
          let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
          for (let i = 0; i < bufferSize; i++) {
              const white = Math.random() * 2 - 1; b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759; b2 = 0.96900 * b2 + white * 0.1538520; b3 = 0.86650 * b3 + white * 0.3104856; b4 = 0.55000 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.0168980;
              data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11; b6 = white * 0.115926;
          }
      } else if (type === 'brown') {
          let lastOut = 0; for (let i = 0; i < bufferSize; i++) { const white = Math.random() * 2 - 1; lastOut = (lastOut + (0.02 * white)) / 1.02; data[i] = lastOut * 3.5; }
      }
      return buffer;
  }

  private generateImpulseResponse(duration: number, decay: number): AudioBuffer {
      if (!this.ctx) throw new Error("No Context");
      const length = this.ctx.sampleRate * duration; const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate); const L = impulse.getChannelData(0); const R = impulse.getChannelData(1);
      for (let i = 0; i < length; i++) { const n = i / length; const noise = (Math.random() * 2 - 1) * Math.pow(1 - n, decay); L[i] = noise; R[i] = noise; }
      return impulse;
  }

  private makeDistortionCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 50, n_samples = 44100, curve = new Float32Array(n_samples), deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) { let x = i * 2 / n_samples - 1; curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x)); }
    return curve;
  }

  // --- MUSIC ---
  startMusic(mode: 'MENU' | 'BATTLE') {
      if (!this.ctx) return;
      this.stopMusic(); // Clear existing
      this.isMusicPlaying = true;
      if (mode === 'MENU') {
          this.playMenuBeat();
          this.musicTimer = setInterval(() => this.playMenuBeat(), 4000); 
      } else {
          // BATTLE MODE
          this.playBattleDrone();
          this.musicTimer = setInterval(() => this.playBattleDrone(), 8000); 
          this.startBattleAmbience();
      }
  }

  private stopMusic() {
      this.isMusicPlaying = false;
      if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
      // Stop ongoing anthem nodes
      this.anthemNodes.forEach(node => {
          try { (node as any).stop(); } catch(e){}
          try { node.disconnect(); } catch(e){}
      });
      this.anthemNodes = [];
      this.stopBattleAmbience();
  }

  fadeOutMusic(duration: number) {
      if (!this.musicBus) return;
      this.musicBus.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + duration);
      setTimeout(() => {
          this.stopMusic();
          this.musicBus!.gain.setValueAtTime(0.6, this.ctx!.currentTime); // Reset volume
      }, duration * 1000);
  }

  // --- BATTLE AMBIENCE ---
  startBattleAmbience() {
      if (this.battleAmbienceTimer) clearInterval(this.battleAmbienceTimer);
      // Play random distant war sounds every few seconds
      this.battleAmbienceTimer = setInterval(() => {
          if (!this.isMuted && Math.random() > 0.6) { // 40% chance every 2s
              const type = Math.random() > 0.5 ? 'DISTANT_GUNSHOT' : 'EXPLOSION';
              // Simulate distance by volume/filter in triggerSfx (0.8 - 1.0 distance factor)
              this.triggerSfx(type, 0.8 + Math.random() * 0.2); 
          }
      }, 2000);
  }

  stopBattleAmbience() {
      if (this.battleAmbienceTimer) { clearInterval(this.battleAmbienceTimer); this.battleAmbienceTimer = null; }
  }

  private playMenuBeat() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator(); osc.frequency.setValueAtTime(60, t); osc.frequency.exponentialRampToValueAtTime(10, t + 1.5);
      const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      const noise = this.ctx.createBufferSource(); noise.buffer = this.noiseBuffers.pink;
      const noiseFilter = this.ctx.createBiquadFilter(); noiseFilter.type = 'lowpass'; noiseFilter.frequency.value = 200;
      const noiseGain = this.ctx.createGain(); noiseGain.gain.setValueAtTime(0.1, t); noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
      osc.connect(gain).connect(this.masterGain!); noise.connect(noiseFilter).connect(noiseGain).connect(this.masterGain!);
      osc.start(t); osc.stop(t + 1.5); noise.start(t); noise.stop(t + 1.5);
  }

  private playBattleDrone() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      // Dark, slow, rhythmic low brass/cello drone (C2 - 65.41Hz)
      this.playCelloNote(65.41, t, 4.0); 
      // Distant drum thump
      this.synthHeavyImpact(t, 50, 0.6, 0.2);
  }
  
  // "Shan Chuan Zhuang Li..." (National Flag Anthem)
  playFlagAnthem() {
      if (!this.ctx) return;
      this.stopMusic(); // Stop menu beat
      this.isMusicPlaying = true;
      
      const melody = [
          // Phrase 1: Shan chuan zhuang li, wu chan feng long
          {n: 'G3', d: 0.5}, {n: 'C4', d: 0.5}, {n: 'C4', d: 0.5}, {n: 'D4', d: 0.5}, 
          {n: 'E4', d: 0.5}, {n: 'F4', d: 0.5}, {n: 'G4', d: 1.5}, 
          // Yan huang shi zhou, dong ya cheng xiong
          {n: 'A4', d: 0.5}, {n: 'G4', d: 1.5},
          {n: 'E4', d: 0.5}, {n: 'D4', d: 0.5}, {n: 'C4', d: 0.5}, {n: 'D4', d: 0.5}, {n: 'E4', d: 1.5},
          // Phrase 2 (Extension)
          {n: 'D4', d: 0.5}, {n: 'E4', d: 0.5}, {n: 'F4', d: 0.5}, {n: 'E4', d: 0.5},
          {n: 'D4', d: 0.5}, {n: 'C4', d: 0.5}, {n: 'B3', d: 0.5}, {n: 'C4', d: 0.5},
          {n: 'D4', d: 1.5},
          // Final resolve
          {n: 'E4', d: 0.5}, {n: 'D4', d: 0.5}, {n: 'C4', d: 0.5}, {n: 'B3', d: 0.5},
          {n: 'A3', d: 0.5}, {n: 'B3', d: 0.5}, {n: 'C4', d: 2.0}
      ];
      
      this.playSequence(melody, 'BRASS');
  }

  playVictoryTheme(winner: 'Blue' | 'Red') {
      if (!this.ctx) return;
      this.stopMusic();
      if (winner === 'Blue') {
          this.playFlagAnthem();
      } else {
          // Tragic / Dark Theme
          const melody = [
              {n: 'C3', d: 1.2}, {n: 'C3', d: 1.2}, {n: 'E3', d: 1.2}, {n: 'G3', d: 2.0}, 
              {n: 'G3', d: 1.2}, {n: 'A3', d: 1.2}, {n: 'G3', d: 1.2}, {n: 'E3', d: 1.2}, {n: 'C3', d: 3.0}
          ];
          this.playSequence(melody, 'CELLO');
      }
  }

  private playSequence(notes: {n: string, d: number}[], instrument: 'BRASS' | 'CELLO') {
      let currentTime = this.ctx!.currentTime + 0.5;
      
      notes.forEach(note => {
          const freq = NOTES[note.n];
          if (freq) {
              if (instrument === 'BRASS') {
                  this.playBrassNote(freq, currentTime, note.d * 0.4); 
              } else {
                  this.playCelloNote(freq, currentTime, note.d * 0.8);
              }
          }
          currentTime += (note.d * (instrument === 'BRASS' ? 0.4 : 0.8));
      });
  }

  private playBrassNote(freq: number, startTime: number, duration: number) {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, startTime);
      filter.frequency.linearRampToValueAtTime(2000, startTime + 0.1);
      filter.frequency.linearRampToValueAtTime(1500, startTime + duration);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.setValueAtTime(0.3, startTime + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicBus!); // Route to Music Bus
      
      osc.start(startTime);
      osc.stop(startTime + duration);
      
      this.anthemNodes.push(osc, gain); // Track for stopping
  }

  private playCelloNote(freq: number, startTime: number, duration: number) {
      const osc = this.ctx!.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = freq;
      const osc2 = this.ctx!.createOscillator(); osc2.type = 'sawtooth'; osc2.frequency.value = freq - 2; 
      const filter = this.ctx!.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 400; 
      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.5); 
      gain.gain.linearRampToValueAtTime(0, startTime + duration + 0.5); 

      osc.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(this.musicBus!);
      
      osc.start(startTime); osc.stop(startTime + duration + 1);
      osc2.start(startTime); osc2.stop(startTime + duration + 1);
      
      this.anthemNodes.push(osc, osc2, gain);
  }
}
