
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private ctx: AudioContext | null = null;
  private isMuted = false;

  constructor() {}

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
  }

  // --- PROCEDURAL SFX GENERATORS ---
  // Guarantees sound works without loading external assets (Cinematic quality via synthesis)

  playSfx(type: 'EXPLOSION' | 'GUNSHOT' | 'CLICK' | 'HOVER' | 'MARCH' | 'TYPEWRITER' | 'SIREN' | 'AA_FIRE') {
    if (this.isMuted || !this.ctx) return;
    
    // Resume context if needed
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;

    switch (type) {
        case 'EXPLOSION':
            this.createExplosion(t);
            break;
        case 'GUNSHOT':
            this.createGunshot(t);
            break;
        case 'AA_FIRE':
             this.createAAFire(t);
             break;
        case 'CLICK':
            this.createBlip(t, 800, 0.05);
            break;
        case 'HOVER':
            this.createBlip(t, 300, 0.02, 0.02);
            break;
        case 'TYPEWRITER':
            this.createClick(t);
            break;
        case 'MARCH':
            this.createThud(t);
            break;
    }
  }

  // 1. Cinematic Explosion (Low Rumble + Noise Burst)
  private createExplosion(t: number) {
      const noise = this.createBufferSource();
      const noiseGain = this.ctx!.createGain();
      const lowFilter = this.ctx!.createBiquadFilter();

      lowFilter.type = 'lowpass';
      lowFilter.frequency.setValueAtTime(800, t);
      lowFilter.frequency.exponentialRampToValueAtTime(10, t + 1.5);

      noiseGain.gain.setValueAtTime(1, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);

      noise.connect(lowFilter);
      lowFilter.connect(noiseGain);
      noiseGain.connect(this.ctx!.destination);
      noise.start(t);
      noise.stop(t + 1.5);
  }

  // 2. Sharp Gunshot / Cannon (Snap + Decay)
  private createGunshot(t: number) {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.3);
      
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.3);

      // Add noise crack
      const noise = this.createBufferSource();
      const nGain = this.ctx!.createGain();
      const hp = this.ctx!.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1000;

      nGain.gain.setValueAtTime(0.8, t);
      nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

      noise.connect(hp);
      hp.connect(nGain);
      nGain.connect(this.ctx!.destination);
      noise.start(t);
      noise.stop(t + 0.1);
  }
  
  // 3. AA Flak Sound (Rapid poofs)
  private createAAFire(t: number) {
      for(let i=0; i<3; i++) {
          const time = t + i * 0.1;
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(100, time);
          osc.frequency.exponentialRampToValueAtTime(10, time + 0.1);
          gain.gain.setValueAtTime(0.3, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
          osc.connect(gain);
          gain.connect(this.ctx!.destination);
          osc.start(time);
          osc.stop(time + 0.1);
      }
  }

  // UI Blip
  private createBlip(t: number, freq: number, dur: number, vol: number = 0.1) {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + dur);
  }

  private createClick(t: number) {
     this.createBlip(t, 2000, 0.05, 0.05);
  }

  private createThud(t: number) {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.1);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.1);
  }

  // Utils
  private createBufferSource() {
      const bufferSize = this.ctx!.sampleRate * 2; 
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx!.createBufferSource();
      noise.buffer = buffer;
      return noise;
  }
}
