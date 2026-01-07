
import { Component, inject, ElementRef, ViewChild, OnInit, OnDestroy, HostListener, NgZone, effect, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../services/game.service';
import { REGION_COLORS, MAP_OVERLAYS } from '../mechanics';
import { HexCell, Unit, GameEvent } from '../types';
import { Subscription } from 'rxjs';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'DUST' | 'EXPLOSION' | 'SPARK' | 'PING' | 'DESTRUCTION' | 'SMOKE' | 'TEXT' | 'TRACER' | 'MUZZLE_FLASH' | 'SHOCKWAVE' | 'GRAVE' | 'BLOOD';
  life: number;
  maxLife: number;
  color: string;
  radius: number;
  text?: string;
  tx?: number; ty?: number; 
}

@Component({
  selector: 'app-hex-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Container -->
    <div #container class="w-full h-full relative overflow-hidden bg-[#222222]"
         (wheel)="onWheel($event)"
         (mousedown)="startDrag($event)"
         (mousemove)="onDrag($event)"
         (mouseup)="endDrag()"
         (mouseleave)="endDrag()">
      
      <!-- Texture Overlay (Grain & Dust) - Premium Matte Finish -->
      <div class="absolute inset-0 z-[5] pointer-events-none opacity-[0.15] mix-blend-overlay bg-noise"></div>
      
      <!-- Vignette (Cinematic Darkening) -->
      <div class="absolute inset-0 z-[6] pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_50%,rgba(10,10,12,0.6)_100%)]"></div>

      <!-- Event Popup -->
      @if (game.activeEvent(); as evt) {
        <div class="absolute inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto animate-fade-in-fast">
          <div class="relative w-[640px] bg-[#eaddcf] border-[1px] border-[#5d4037] shadow-2xl p-2 font-serif text-[#2f1b14]">
            <!-- Paper Texture -->
            <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/old-paper.png')] opacity-60 mix-blend-multiply pointer-events-none z-0"></div>
            
            <div class="relative z-10 p-8">
              <header class="mb-6 border-b-2 border-[#2f1b14] pb-4">
                <div class="flex justify-between items-center text-xs font-mono text-[#5d4037] uppercase tracking-widest mb-2">
                  <span>战时通讯 // WAR COMMUNIQUÉ</span>
                  <span>{{ game.gameDateString() }}</span>
                </div>
                <h3 class="text-4xl font-black text-center text-[#2f1b14] tracking-wide" style="font-family: 'Ma Shan Zheng', cursive;">{{evt.title}}</h3>
              </header>
              <div class="space-y-4 text-lg leading-relaxed font-serif text-[#1a1a1a]">
                <p>"{{evt.desc}}"</p>
              </div>
              @if (evt.internationalContext) {
                <div class="mt-6 pt-4 border-t border-dashed border-[#8d6e63]">
                  <h4 class="text-xs font-bold uppercase tracking-widest text-[#5d4037] mb-1 font-mono">国际观察 // INTEL</h4>
                  <div class="text-base italic text-[#4a2e24]">
                    "{{evt.internationalContext}}"
                  </div>
                </div>
              }
              <footer class="mt-8 text-center">
                <button (click)="game.closeEventPopup()"
                        class="px-12 py-3 bg-[#2f1b14] text-[#eaddcf] font-bold text-sm hover:bg-[#4e342e] transition-all uppercase tracking-[0.2em] shadow-lg">
                  阅毕
                </button>
              </footer>
            </div>
          </div>
        </div>
      }

      <canvas #mainCanvas class="block w-full h-full cursor-crosshair relative z-0"></canvas>
    </div>
  `,
  styles: [`
    .bg-noise {
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }
  `]
})
export class HexGridComponent implements OnInit, OnDestroy, AfterViewInit {
  game = inject(GameService);
  ngZone = inject(NgZone);
  
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('mainCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private animationFrameId: number = 0;
  private sub!: Subscription;
  private resizeObserver: ResizeObserver | null = null;

  // Render State
  private hexSize = 18; 
  private scale = 1.2; 
  private panX = 0;
  private panY = 0;
  private time = 0; 
  
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private dragStartX = 0;
  private dragStartY = 0;
  private isDragging = false;
  private userInteracted = false;
  
  private particles: Particle[] = [];
  private particleIdCounter = 0;

  private patternCache: Map<string, CanvasPattern> = new Map();
  private hexSprites: Map<string, HTMLCanvasElement> = new Map();

  constructor() {
    effect(() => {
        const panRequest = this.game.cameraPanRequest();
        if (panRequest) {
            this.userInteracted = false;
            const targetPixel = this.hexToPixel(panRequest.q, panRequest.r);
            this.panTo(targetPixel.x, targetPixel.y, panRequest.zoom);
            this.game.cameraPanRequest.set(null); 
        }
    });
  }

  ngOnInit() {
    this.sub = this.game.event$.subscribe(evt => this.handleGameEvent(evt));
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        if (!this.canvasRef) return;
        this.ctx = this.canvasRef.nativeElement.getContext('2d', { alpha: false })!;
        this.createPatterns();
        this.prerenderHexes();
        this.initCanvas();
        this.centerMap();
        this.startRenderLoop();
      }, 100);
    });
  }

  ngAfterViewInit() {
    if (this.containerRef?.nativeElement) {
        this.resizeObserver = new ResizeObserver(() => {
            this.ngZone.runOutsideAngular(() => {
                requestAnimationFrame(() => this.initCanvas());
            });
        });
        this.resizeObserver.observe(this.containerRef.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
    cancelAnimationFrame(this.animationFrameId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
  }

  private initCanvas() {
    if (!this.canvasRef || !this.containerRef) return;
    const canvas = this.canvasRef.nativeElement;
    const container = this.containerRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(container.clientWidth * dpr);
    const h = Math.floor(container.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        if(this.ctx) this.ctx.scale(dpr, dpr);
    }
  }

  private createPatterns() {
    const tempCtx = document.createElement('canvas').getContext('2d')!;
    
    // 1. JAPANESE WARNING
    const c1 = document.createElement('canvas'); c1.width = 16; c1.height = 16;
    const x1 = c1.getContext('2d')!;
    x1.strokeStyle = 'rgba(255, 255, 255, 0.2)'; x1.lineWidth = 2;
    x1.beginPath(); x1.moveTo(0,16); x1.lineTo(16,0); x1.stroke();
    const p1 = tempCtx.createPattern(c1, 'repeat');
    if (p1) this.patternCache.set('JAPANESE', p1);

    // 4. URBAN GRID
    const c4 = document.createElement('canvas'); c4.width = 24; c4.height = 24;
    const x4 = c4.getContext('2d')!;
    x4.strokeStyle = 'rgba(0,0,0,0.1)'; x4.lineWidth = 1;
    x4.beginPath(); x4.moveTo(12,0); x4.lineTo(12,24); x4.moveTo(0,12); x4.lineTo(24,12); x4.stroke();
    const p4 = tempCtx.createPattern(c4, 'repeat');
    if (p4) this.patternCache.set('URBAN_GRID', p4);

    // 5. CONTOUR LINES
    const c5 = document.createElement('canvas'); c5.width = 64; c5.height = 64;
    const x5 = c5.getContext('2d')!;
    x5.strokeStyle = 'rgba(0,0,0,0.08)'; x5.lineWidth = 1;
    x5.beginPath();
    x5.moveTo(0, 10); x5.bezierCurveTo(20, 0, 40, 20, 64, 15);
    x5.moveTo(0, 40); x5.bezierCurveTo(15, 55, 45, 35, 64, 50); x5.stroke();
    const p5 = tempCtx.createPattern(c5, 'repeat');
    if (p5) this.patternCache.set('CONTOUR', p5);
  }

  // --- PREMIUM FEATURE: Realistic Railway Rendering ---
  private _drawRailwayDetail(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isVertical: boolean) {
    ctx.save();
    ctx.translate(x, y);
    if (!isVertical) ctx.rotate(Math.PI / 2);
    
    // Geometry
    const sleeperWidth = size * 1.2;
    const sleeperHeight = size * 0.2;
    const trackWidth = size * 0.15;
    const trackSpacing = size * 0.6;

    // 1. Sleepers (Pure Black for contrast on dark ground)
    ctx.fillStyle = '#000000'; 
    ctx.fillRect(-sleeperWidth/2, -size*0.7, sleeperWidth, sleeperHeight);
    ctx.fillRect(-sleeperWidth/2, -sleeperHeight/2, sleeperWidth, sleeperHeight);
    ctx.fillRect(-sleeperWidth/2, size*0.7 - sleeperHeight, sleeperWidth, sleeperHeight);

    // 2. Rails (Steel Grey)
    ctx.fillStyle = '#555555'; 
    ctx.fillRect(-trackSpacing/2 - trackWidth/2, -size, trackWidth, size*2);
    ctx.fillRect(trackSpacing/2 - trackWidth/2, -size, trackWidth, size*2);
    
    ctx.restore();
  }

  private prerenderHexes() {
      const variants = ['RURAL', 'WATER', 'SETTLEMENT', 'FRENCH', 'JAPANESE', 'ZHABEI', 'OLD_CITY', 'RAILWAY_NS', 'RAILWAY_EW', 'DOCKS', 'AIRFIELD', 'ROAD', 'FOG'];
      
      const r = this.hexSize;
      const w = Math.ceil(Math.sqrt(3) * r + 2);
      const h = Math.ceil(r * 2 + 2);
      const cx = w/2;
      const cy = h/2;

      variants.forEach(variant => {
          const sprite = document.createElement('canvas');
          sprite.width = w; sprite.height = h;
          const sCtx = sprite.getContext('2d')!;
          
          let color = REGION_COLORS[variant] || REGION_COLORS['RURAL'];
          if (variant === 'FOG') color = '#0a0a0a';

          // Base Path
          sCtx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 180 * (60 * i);
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            if(i===0) sCtx.moveTo(px, py); else sCtx.lineTo(px, py);
          }
          sCtx.closePath();

          if (variant === 'WATER') {
              // Deep water base
              sCtx.fillStyle = color;
          } else {
              sCtx.fillStyle = color;
          }
          sCtx.fill();

          if (variant !== 'FOG') {
             // Patterns
             if (variant === 'JAPANESE' && this.patternCache.has('JAPANESE')) {
                 sCtx.fillStyle = this.patternCache.get('JAPANESE')!; sCtx.fill();
             } else if (variant === 'RURAL' && this.patternCache.has('CONTOUR')) {
                 sCtx.fillStyle = this.patternCache.get('CONTOUR')!; sCtx.fill();
             } else if (['SETTLEMENT', 'ZHABEI', 'OLD_CITY', 'FRENCH'].includes(variant) && this.patternCache.has('URBAN_GRID')) {
                 sCtx.fillStyle = this.patternCache.get('URBAN_GRID')!; sCtx.fill();
             }

             if (variant === 'RAILWAY_NS') this._drawRailwayDetail(sCtx, cx, cy, r, true);
             else if (variant === 'RAILWAY_EW') this._drawRailwayDetail(sCtx, cx, cy, r, false);

             if (variant === 'AIRFIELD') {
                sCtx.fillStyle = '#546e7a'; 
                sCtx.translate(cx, cy);
                sCtx.rotate(Math.PI / 4);
                sCtx.fillRect(-r*0.9, -r*0.25, r*1.8, r*0.5); 
                sCtx.strokeStyle = '#e0e0e0'; sCtx.lineWidth = 1.5;
                sCtx.setLineDash([3, 3]);
                sCtx.beginPath(); sCtx.moveTo(-r*0.8, 0); sCtx.lineTo(r*0.8, 0); sCtx.stroke();
                sCtx.setLineDash([]);
                sCtx.rotate(-Math.PI / 4);
                sCtx.translate(-cx, -cy);
             }

             if (variant === 'DOCKS') {
                sCtx.translate(cx, cy);
                sCtx.fillStyle = '#3e2723';
                sCtx.fillRect(-r*0.6, -r*0.6, r*1.2, r*1.2);
                sCtx.beginPath(); sCtx.strokeStyle = '#5d4037'; sCtx.lineWidth = 1;
                for(let i=-5; i<5; i++) {
                    sCtx.moveTo(-r*0.6, i*3); sCtx.lineTo(r*0.6, i*3);
                }
                sCtx.stroke();
                sCtx.strokeStyle = '#1a1a1a'; sCtx.lineWidth = 2;
                sCtx.beginPath(); sCtx.moveTo(-r*0.3, r*0.3); sCtx.lineTo(0, -r*0.4); sCtx.lineTo(r*0.4, -r*0.1); sCtx.stroke();
                sCtx.translate(-cx, -cy);
             }

             // Highlights and Shadows for 3D effect
             sCtx.beginPath();
             for (let i = 3; i <= 6; i++) {
                const angle = Math.PI / 180 * (60 * i);
                const px = cx + r * Math.cos(angle);
                const py = cy + r * Math.sin(angle);
                if(i===3) sCtx.moveTo(px, py); else sCtx.lineTo(px, py);
             }
             sCtx.lineWidth = 1.5; sCtx.strokeStyle = 'rgba(255,255,255,0.05)'; sCtx.stroke();

             sCtx.beginPath();
             for (let i = 0; i <= 3; i++) {
                const angle = Math.PI / 180 * (60 * i);
                const px = cx + r * Math.cos(angle);
                const py = cy + r * Math.sin(angle);
                if(i===0) sCtx.moveTo(px, py); else sCtx.lineTo(px, py);
             }
             sCtx.lineWidth = 1.5; sCtx.strokeStyle = 'rgba(0,0,0,0.3)'; sCtx.stroke();

             sCtx.strokeStyle = 'rgba(0,0,0,0.2)'; sCtx.lineWidth = 1; 
             sCtx.beginPath();
             for(let i=0; i<6; i++) {
                 const a = Math.PI/180*(60*i); sCtx.lineTo(cx+(r-2)*Math.cos(a), cy+(r-2)*Math.sin(a));
             }
             sCtx.closePath(); sCtx.stroke();
          } else {
             sCtx.strokeStyle = '#222'; sCtx.lineWidth = 1; sCtx.stroke();
          }
          this.hexSprites.set(variant, sprite);
      });
  }

  private startRenderLoop() {
    const render = () => {
      this.time += 0.05;
      this.updatePhysics();
      this.draw();
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }
  
  private updatePhysics() {
    if (this.particles.length === 0) return;
    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.02;
        if (p.type === 'SMOKE') { p.radius *= 1.02; p.vx *= 0.95; p.vy *= 0.95; }
        if (p.type === 'SHOCKWAVE') { p.radius += 2; p.life -= 0.05; }
        if (p.type === 'MUZZLE_FLASH') p.life -= 0.1;
        
        if (p.type === 'GRAVE') { 
            p.y -= 0.2; 
            p.life -= 0.01; 
            p.radius *= 0.99; 
        }
        if (p.type === 'BLOOD') {
             p.vy += 0.1; 
        }
        if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private draw() {
    if (!this.ctx || !this.canvasRef) return;
    const width = this.canvasRef.nativeElement.width / (window.devicePixelRatio || 1);
    const height = this.canvasRef.nativeElement.height / (window.devicePixelRatio || 1);
    this.ctx.fillStyle = REGION_COLORS['BG']; // Use Premium Dark Background
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.scale, this.scale);

    const hexRadius = this.hexSize;
    const hexHeight = hexRadius * 2;
    const hexWidth = Math.sqrt(3) * hexRadius;
    const tlX = -this.panX / this.scale;
    const tlY = -this.panY / this.scale;
    const brX = (width - this.panX) / this.scale;
    const brY = (height - this.panY) / this.scale;
    
    const map = this.game.hexMap();
    const unlocked = this.game.unlockedRegions();
    const reachable = this.game.reachableHexes();
    const zocHexes = this.game.zocHexes();
    const selectedUnit = this.game.selectedUnit();
    const selectedId = this.game.selectedUnitId();
    const tutorialStep = this.game.tutorialState().currentStep;
    
    const pulseZoc = (Math.sin(Date.now() / 300) + 1) * 0.5;
    const pulseTutorial = (Math.sin(Date.now() / 200) + 1) * 0.5;
    const spriteOffsetX = -(Math.sqrt(3) * hexRadius + 2) / 2;
    const spriteOffsetY = -(hexRadius * 2 + 2) / 2;

    for (const cell of map.values()) {
        const cx = hexRadius * (3/2 * cell.q);
        const cy = hexRadius * (Math.sqrt(3)/2 * cell.q + Math.sqrt(3) * cell.r);
        if (cx < tlX - hexWidth || cx > brX + hexWidth || cy < tlY - hexHeight || cy > brY + hexHeight) continue;

        const isVisible = unlocked.has(cell.region) || this.game.tutorialState().active;
        if (isVisible) {
            let variant = cell.visualVariant || 'RURAL';
            const sprite = this.hexSprites.get(variant) || this.hexSprites.get('RURAL');
            if (sprite) this.ctx.drawImage(sprite, Math.floor(cx + spriteOffsetX), Math.floor(cy + spriteOffsetY));
            
            // PREMIUM: Dynamic Water Waves
            if (variant === 'WATER') {
                this.drawWaterDetail(cx, cy, hexRadius, this.time);
            }

            if (reachable.has(`${cell.q},${cell.r}`)) {
                const isTutorialMove = tutorialStep?.key === 'MOVE';
                if (isTutorialMove) {
                    const movePulse = (Math.sin(Date.now() / 250) + 1) * 0.5;
                    this.ctx.save();
                    this.ctx.fillStyle = `rgba(255, 235, 59, ${0.4 + movePulse * 0.4})`; 
                    this.ctx.beginPath(); this.hexPath(cx, cy, hexRadius - 1); this.ctx.fill();
                    this.ctx.strokeStyle = '#ffff00'; this.ctx.lineWidth = 3 + movePulse * 2; this.ctx.shadowBlur = 15; this.ctx.shadowColor = '#ffff00'; this.ctx.stroke();
                    this.ctx.beginPath(); this.ctx.moveTo(cx - 5, cy); this.ctx.lineTo(cx + 5, cy); this.ctx.moveTo(cx, cy - 5); this.ctx.lineTo(cx, cy + 5); this.ctx.lineWidth = 2; this.ctx.stroke();
                    this.ctx.restore();
                } else {
                    this.ctx.fillStyle = 'rgba(217, 119, 6, 0.3)';
                    this.ctx.beginPath(); this.hexPath(cx, cy, hexRadius - 2); this.ctx.fill();
                    this.ctx.strokeStyle = '#d97706'; this.ctx.lineWidth = 1; this.ctx.stroke();
                }
            }
            if (zocHexes.has(`${cell.q},${cell.r}`)) {
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = `rgba(220, 38, 38, ${0.4 + 0.6 * pulseZoc})`;
                this.ctx.beginPath(); this.hexPath(cx, cy, hexRadius - 1); this.ctx.stroke();
            }
            if (tutorialStep?.highlightHex?.q === cell.q && tutorialStep?.highlightHex?.r === cell.r) {
                const pulseOpacity = 0.6 + pulseTutorial * 0.4; 
                this.ctx.save();
                this.ctx.fillStyle = `rgba(255, 215, 0, ${0.2 + pulseTutorial * 0.3})`;
                this.ctx.beginPath(); this.hexPath(cx, cy, hexRadius); this.ctx.fill();
                const ringSize = hexRadius + (pulseTutorial * 8); 
                this.ctx.strokeStyle = `rgba(255, 215, 0, ${1 - pulseTutorial})`; this.ctx.lineWidth = 2;
                this.ctx.beginPath(); this.hexPath(cx, cy, ringSize); this.ctx.stroke();
                this.ctx.strokeStyle = `rgba(255, 215, 0, ${pulseOpacity})`; this.ctx.lineWidth = 3; this.ctx.shadowBlur = 20; this.ctx.shadowColor = '#FFD700';
                this.ctx.beginPath(); this.hexPath(cx, cy, hexRadius); this.ctx.stroke();
                const arrowOffset = 25 + pulseTutorial * 5;
                this.ctx.fillStyle = '#FFD700'; this.ctx.shadowBlur = 0;
                this.ctx.beginPath(); this.ctx.moveTo(cx, cy - arrowOffset); this.ctx.lineTo(cx - 5, cy - arrowOffset - 10); this.ctx.lineTo(cx + 5, cy - arrowOffset - 10); this.ctx.fill();
                this.ctx.restore();
            }
        } else {
            const sprite = this.hexSprites.get('FOG');
            if (sprite) this.ctx.drawImage(sprite, Math.floor(cx + spriteOffsetX), Math.floor(cy + spriteOffsetY));
        }
    }

    if (!this.game.tutorialState().active) this.drawLabels(tlX, tlY, brX, brY);

    const units = this.game.units();
    for (const unit of units) {
         if (unit.visibility === 'Hidden') continue;
         const cx = hexRadius * (3/2 * unit.q);
         const cy = hexRadius * (Math.sqrt(3)/2 * unit.q + Math.sqrt(3) * unit.r);
         if (cx < tlX - 50 || cx > brX + 50 || cy < tlY - 50 || cy > brY + 50) continue;
         if (unit.id === selectedId) {
             this.ctx.save(); this.ctx.shadowColor = '#fbbf24'; this.ctx.shadowBlur = 15;
             this.ctx.beginPath(); this.ctx.arc(cx, cy, 12, 0, Math.PI*2); this.ctx.fillStyle = 'rgba(251, 191, 36, 0.3)'; this.ctx.fill(); this.ctx.restore();
         }
         this.drawUnit(this.ctx, unit, cx, cy);
         if (selectedId && selectedUnit && unit.id !== selectedId && unit.owner !== selectedUnit.owner) {
             const dist = (Math.abs(selectedUnit.q - unit.q) + Math.abs(selectedUnit.r - unit.r) + Math.abs((-selectedUnit.q-selectedUnit.r) - (-unit.q-unit.r))) / 2;
             if (dist <= selectedUnit.range && !selectedUnit.hasAttacked) {
                 this.ctx.beginPath(); this.ctx.arc(cx, cy, 18, 0, Math.PI*2); this.ctx.strokeStyle = '#f97316'; this.ctx.lineWidth = 2; this.ctx.stroke(); this.ctx.lineWidth = 1;
             }
         }
    }
    this.drawVFX();
    this.ctx.restore();
  }

  private hexPath(cx: number, cy: number, r: number) {
      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 180 * (60 * i);
          const px = cx + r * Math.cos(angle);
          const py = cy + r * Math.sin(angle);
          if (i === 0) this.ctx.moveTo(px, py); else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
  }

  // PREMIUM: Improved Water Animation
  private drawWaterDetail(cx: number, cy: number, r: number, time: number) {
      if (this.scale < 0.8) return; // Optimization: Don't draw detailed water when zoomed out far
      
      this.ctx.save(); this.ctx.beginPath(); this.hexPath(cx, cy, r); this.ctx.clip(); this.ctx.lineWidth = 1.5;
      
      // Wave 1
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.beginPath();
      for(let i = -r; i < r; i += 6) {
          const x = cx + i; const y = cy + Math.sin(i * 0.1 + time) * 3 + r * -0.2;
          if(i === -r) this.ctx.moveTo(x, y); else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
      
      // Wave 2
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.beginPath();
      for(let i = -r; i < r; i += 5) {
          const x = cx + i; const y = cy + Math.sin(i * 0.15 + time * 1.5) * 2.5 + r * 0.3;
          if(i === -r) this.ctx.moveTo(x, y); else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
      this.ctx.restore();
  }

  private drawLabels(tlX: number, tlY: number, brX: number, brY: number) {
      this.ctx.save();
      for (const overlay of MAP_OVERLAYS) {
          const pixel = this.hexToPixel(overlay.q, overlay.r);
          if (pixel.x < tlX - 500 || pixel.x > brX + 500 || pixel.y < tlY - 500 || pixel.y > brY + 500) continue;
          this.ctx.translate(pixel.x, pixel.y);
          if (overlay.rotate) this.ctx.rotate(overlay.rotate);
          const fontSize = overlay.size * this.scale;
          if (fontSize < 10 && !overlay.bg) continue;
          // Font change: Consolidate to Noto Serif SC for consistency
          const fontName = overlay.font || "Noto Serif SC";
          const weight = overlay.weight || "bold";
          this.ctx.font = `${weight} ${fontSize}px "${fontName}", serif`;
          this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
          this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'; this.ctx.shadowBlur = 4; this.ctx.shadowOffsetX = 0; this.ctx.shadowOffsetY = 2;
          if (overlay.bg) {
               const metrics = this.ctx.measureText(overlay.text);
               const w = metrics.width + (16 * this.scale);
               const h = fontSize + (8 * this.scale);
               this.ctx.fillStyle = overlay.bgColor || 'rgba(0,0,0,0.8)';
               this.ctx.beginPath(); this.roundRect(this.ctx, -w/2, -h/2, w, h, 3 * this.scale); this.ctx.fill();
               this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)'; this.ctx.lineWidth = 1; this.ctx.stroke(); this.ctx.shadowBlur = 0;
          }
          this.ctx.fillStyle = overlay.color;
          
          // Outline for large text
          if (!overlay.bg && fontSize > 14) {
             this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
             this.ctx.lineWidth = 3;
             this.ctx.strokeText(overlay.text, 0, 0);
          }

          this.ctx.fillText(overlay.text, 0, 0);
          if (overlay.rotate) this.ctx.rotate(-overlay.rotate);
          this.ctx.translate(-pixel.x, -pixel.y);
      }
      this.ctx.restore();
  }

  private drawVFX() {
      for (const p of this.particles) {
        this.ctx.globalAlpha = p.life;
        if (p.type === 'GRAVE') {
            // Replaced Skull with a simple, solemn Cross or Debris marker
            this.ctx.shadowColor = '#000'; this.ctx.shadowBlur = 2; 
            this.ctx.strokeStyle = `rgba(255,255,255,${p.life})`;
            this.ctx.lineWidth = 2;
            const s = p.radius * 0.6; // Scale
            this.ctx.beginPath();
            // Draw Cross
            this.ctx.moveTo(p.x, p.y - s); this.ctx.lineTo(p.x, p.y + s);
            this.ctx.moveTo(p.x - s*0.6, p.y - s*0.3); this.ctx.lineTo(p.x + s*0.6, p.y - s*0.3);
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        } else if (p.type === 'BLOOD') {
            // Darker, drier blood
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); 
            this.ctx.fillStyle = '#7f1d1d'; // Darker red (Dried blood)
            this.ctx.fill();
        } else if (p.type === 'TEXT') {
            this.ctx.fillStyle = '#ef4444'; this.ctx.font = 'bold 12px serif'; this.ctx.fillText(p.text || '', p.x, p.y);
        } else if (p.type === 'TRACER') {
            this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y); this.ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); this.ctx.strokeStyle = '#fef08a'; this.ctx.lineWidth = 2; this.ctx.stroke();
        } else if (p.type === 'SHOCKWAVE') {
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); this.ctx.strokeStyle = `rgba(255,255,255,${p.life * 0.5})`; this.ctx.lineWidth = 4; this.ctx.stroke();
        } else if (p.type === 'MUZZLE_FLASH') {
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius * (0.8 + Math.random()*0.4), 0, Math.PI*2); this.ctx.fillStyle = '#fde047'; this.ctx.fill();
        } else {
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); this.ctx.fillStyle = p.color; this.ctx.fill();
        }
    }
    this.ctx.globalAlpha = 1.0;
  }

  private drawUnit(ctx: CanvasRenderingContext2D, unit: Unit, x: number, y: number) {
      if (unit.visibility === 'Unknown') {
          const size = 14; const left = x - size; const top = y - size;
          ctx.fillStyle = '#262626'; ctx.strokeStyle = '#525252'; ctx.lineWidth = 1;
          ctx.beginPath(); this.roundRect(ctx, left, top, size*2, size*2, 3); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#737373'; ctx.font = 'bold 14px "Courier New"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, y);
          return;
      }
      const visuals = unit.visuals;
      const size = 17; const w = size * 2; const h = size * 2; const left = x - size; const top = y - size;
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 6; ctx.shadowOffsetX = 3;
      const grad = ctx.createLinearGradient(left, top, left + w, top + h);
      grad.addColorStop(0, visuals.color); grad.addColorStop(1, '#1c1917');
      ctx.fillStyle = grad; ctx.beginPath(); this.roundRect(ctx, left, top, w, h, 2); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.save();
      ctx.clip();
      const shine = ctx.createLinearGradient(left, top, left, top + h * 0.4);
      shine.addColorStop(0, 'rgba(255,255,255,0.15)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shine; ctx.fillRect(left, top, w, h);
      ctx.restore();
      ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5;
      ctx.moveTo(left + w, top); ctx.lineTo(left, top); ctx.lineTo(left, top + h); ctx.stroke();
      ctx.beginPath(); ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.moveTo(left + w, top); ctx.lineTo(left + w, top + h); ctx.lineTo(left, top + h); ctx.stroke();
      this.drawFlag(ctx, visuals.flag, left + 3, top + 3, 10);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
      this.drawSilhouette(ctx, visuals.iconType, x, y - 2, 1.2); ctx.restore();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fillRect(left + 2, top + h - 10, w - 4, 8);
      ctx.font = '900 8px "Courier Prime", monospace'; ctx.textBaseline = 'middle';
      ctx.textAlign = 'left'; ctx.fillStyle = '#fbbf24'; ctx.fillText(`${Math.floor(unit.combatStrength)}`, left + 4, top + h - 6);
      ctx.textAlign = 'right'; ctx.fillStyle = '#e5e5e5'; ctx.fillText(`${Math.floor(unit.ap)}`, left + w - 4, top + h - 6);
      const steps = unit.steps; const pipX = left + w - 4; const pipStartY = top + 4; const pipGap = 3;
      for (let i = 0; i < steps; i++) {
          ctx.beginPath(); ctx.arc(pipX, pipStartY + (i * pipGap), 1.2, 0, Math.PI * 2);
          ctx.fillStyle = '#4ade80'; if (unit.steps <= 1) ctx.fillStyle = '#ef4444'; ctx.fill();
      }
      if (unit.morale < 40) {
          ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.setLineDash([3, 2]);
          ctx.beginPath(); this.roundRect(ctx, left - 2, top - 2, w + 4, h + 4, 4); ctx.stroke(); ctx.setLineDash([]);
      }
      if (this.game.selectedUnitId() === unit.id) {
          ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
          ctx.beginPath(); this.roundRect(ctx, left + 1, top + 1, w - 2, h - 2, 2); ctx.stroke();
      }
  }

  private drawFlag(ctx: CanvasRenderingContext2D, flag: string, x: number, y: number, w: number) {
      if (flag === 'none') return;
      const h = w * 0.66;
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 1, y + 1, w, h);
      if (flag === 'roc') {
          ctx.fillStyle = '#FE0000'; ctx.fillRect(x, y, w, h);
          ctx.fillStyle = '#000095'; ctx.fillRect(x, y, w/2, h/2);
          ctx.beginPath(); ctx.arc(x + w/4, y + h/4, w/8, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      } else if (flag === 'japan') {
          ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h);
          ctx.beginPath(); ctx.arc(x + w/2, y + h/2, h/3, 0, Math.PI * 2); ctx.fillStyle = '#BC002D'; ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x, y, w, h/2); ctx.restore();
  }

  private drawSilhouette(ctx: CanvasRenderingContext2D, type: string, x: number, y: number, s: number) {
      ctx.save(); ctx.translate(x, y); const scale = s * 0.9; ctx.scale(scale, scale); 
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 2;
      ctx.beginPath();
      switch (type) {
          case 'civilian':
             ctx.fillStyle = '#e5e5e5'; ctx.arc(0, -4, 2.5, 0, Math.PI*2); ctx.rect(-2, -1, 4, 6); ctx.arc(-3, 2, 1.5, 0, Math.PI*2); ctx.fill(); break;
          case 'infantry':
             ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.rect(-6, -4, 12, 8); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(6, 4); ctx.moveTo(6, -4); ctx.lineTo(-6, 4); ctx.stroke(); break;
          case 'tank_light':
          case 'tank_medium':
          case 'armor':
              ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI*2); ctx.stroke();
              ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI*2); ctx.fill(); break;
          case 'artillery':
          case 'aa_gun':
              ctx.fillStyle = '#fff'; ctx.arc(0, 1, 2.5, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.moveTo(0, 1); ctx.lineTo(0, -6); ctx.stroke(); break;
          case 'plane':
              ctx.fillStyle = '#fff'; ctx.moveTo(0, -7); ctx.lineTo(-1, -1); ctx.lineTo(-8, 1); ctx.lineTo(-8, 3);
              ctx.lineTo(-1, 2); ctx.lineTo(0, 7); ctx.lineTo(1, 2); ctx.lineTo(8, 3); ctx.lineTo(8, 1); ctx.lineTo(1, -1); ctx.fill(); break;
          case 'ship_cruiser':
          case 'ship_boat':
          case 'naval':
              ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(7, -2); ctx.lineTo(5, 3); ctx.lineTo(-6, 3); ctx.fill();
              ctx.fillRect(-2, -5, 3, 3); ctx.fillRect(2, -4, 1, 2); break;
          case 'hq':
              ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.rect(-6, -6, 12, 8); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-6, 8); ctx.stroke();
              ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('HQ', 0, -2); break;
          case 'marine':
          case 'amphib':
             ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5);
             ctx.moveTo(-3, -3); ctx.lineTo(3, -3); ctx.moveTo(-4, 2); ctx.quadraticCurveTo(0, 7, 4, 2); ctx.stroke(); break;
          case 'engineer':
             ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
             ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(6, 4); ctx.lineTo(6, -2); ctx.lineTo(-6, -2); ctx.closePath(); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -5); ctx.moveTo(-2, -2); ctx.lineTo(-2, -5); ctx.moveTo(2, -2); ctx.lineTo(2, -5); ctx.stroke(); break;
          default:
             ctx.fillStyle = '#fff'; ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill(); break;
      }
      ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  hexToPixel(q: number, r: number): { x: number, y: number } {
    const x = this.hexSize * (3/2 * q);
    const y = this.hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x, y };
  }

  private panTo(x: number, y: number, scale?: number, duration = 1200) {
    if (this.userInteracted) return;
    this.ngZone.runOutsideAngular(() => {
        const startX = this.panX; const startY = this.panY; const startScale = this.scale; const newScale = scale || this.scale;
        if (!this.canvasRef) return;
        const w = this.canvasRef.nativeElement.width / (window.devicePixelRatio || 1);
        const h = this.canvasRef.nativeElement.height / (window.devicePixelRatio || 1);
        const targetX = w/2 - x * newScale; const targetY = h/2 - y * newScale;
        const startTime = performance.now();
        const animate = (currentTime: number) => {
            const elapsedTime = currentTime - startTime;
            if (this.userInteracted) return;
            const progress = Math.min(elapsedTime / duration, 1);
            const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
            this.panX = startX + (targetX - startX) * ease;
            this.panY = startY + (targetY - startY) * ease;
            this.scale = startScale + (newScale - startScale) * ease;
            if (progress < 1) requestAnimationFrame(animate);
            else { this.panX = targetX; this.panY = targetY; this.scale = newScale; }
        };
        requestAnimationFrame(animate);
    });
  }

  centerMap() {
    const units = this.game.units();
    if (units.length > 0) {
        let sumQ = 0; let sumR = 0; units.forEach(u => { sumQ += u.q; sumR += u.r; });
        const avgQ = sumQ / units.length; const avgR = sumR / units.length;
        const p = this.hexToPixel(avgQ, avgR); this.panTo(p.x, p.y, this.scale, 1);
    } else { this.panTo(0, 0, this.scale, 1); }
  }

  handleGameEvent(evt: GameEvent) {
    const p = this.hexToPixel(evt.q, evt.r);
    const rx = p.x + (Math.random() - 0.5) * 20; const ry = p.y + (Math.random() - 0.5) * 20;
    if (evt.message) {
         this.particles.push({
            id: ++this.particleIdCounter, x: p.x, y: p.y - 20, vx: 0, vy: -0.5, life: 2.0, maxLife: 2.0, type: 'TEXT', text: evt.message, color: '#fff', radius: 0
        });
    }
    switch (evt.type) {
        case 'EXPLOSION': this.spawnExplosion(p.x, p.y); break;
        case 'ATTACK': if (evt.sourceQ !== undefined && evt.sourceR !== undefined) { const src = this.hexToPixel(evt.sourceQ, evt.sourceR); this.spawnTracer(src.x, src.y, p.x, p.y); } this.spawnExplosion(p.x, p.y, 0.5); break;
        case 'MOVE': this.spawnDust(p.x, p.y); break;
        case 'DESTRUCTION': 
            this.spawnExplosion(p.x, p.y, 2.0); 
            // Replaced SKULL with GRAVE, removed blood spray, made it debris/grave
            this.particles.push({ id: ++this.particleIdCounter, x: p.x, y: p.y, vx: 0, vy: 0, life: 4.0, maxLife: 4.0, type: 'GRAVE', color: '#fff', radius: 15 });
            // Debris/Dust instead of bright blood
            for(let i=0; i<15; i++) { 
                this.particles.push({ id: ++this.particleIdCounter, x: p.x, y: p.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 - 2, life: 2.0, maxLife: 2.0, type: 'BLOOD', color: '#5d4037', radius: 2 + Math.random() * 3 }); 
            } 
            break;
        case 'RICOCHET': this.particles.push({ id: ++this.particleIdCounter, x: p.x, y: p.y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2 - 2, life: 1.0, maxLife: 1.0, type: 'SPARK', color: '#fbbf24', radius: 2 }); break;
        case 'SMOKE': this.spawnDust(p.x, p.y); break;
    }
  }

  spawnExplosion(x: number, y: number, scale = 1.0) {
      for(let i=0; i<8 * scale; i++) { this.particles.push({ id: ++this.particleIdCounter, x: x, y: y, vx: (Math.random() - 0.5) * 5 * scale, vy: (Math.random() - 0.5) * 5 * scale, life: 1.0, maxLife: 1.0, type: 'EXPLOSION', color: i % 2 === 0 ? '#ef4444' : '#f59e0b', radius: (3 + Math.random() * 5) * scale }); }
      this.particles.push({ id: ++this.particleIdCounter, x: x, y: y, vx: 0, vy: 0, life: 0.5, maxLife: 0.5, type: 'SHOCKWAVE', color: '#fff', radius: 10 * scale });
  }

  spawnTracer(x1: number, y1: number, x2: number, y2: number) {
      const dx = x2 - x1; const dy = y2 - y1; const dist = Math.sqrt(dx*dx + dy*dy); const steps = Math.min(10, dist / 20); 
      for(let i=0; i<steps; i++) {
          setTimeout(() => {
             const t = i / steps;
             this.particles.push({ id: ++this.particleIdCounter, x: x1 + dx * t, y: y1 + dy * t, vx: dx / dist * 15, vy: dy / dist * 15, life: 0.3, maxLife: 0.3, type: 'TRACER', color: '#fef08a', radius: 1 });
             if (i===0) { this.particles.push({ id: ++this.particleIdCounter, x: x1, y: y1, vx: 0, vy: 0, life: 0.2, maxLife: 0.2, type: 'MUZZLE_FLASH', color: '#fde047', radius: 8 }); }
          }, i * 50);
      }
  }

  spawnDust(x: number, y: number) {
      for(let i=0; i<3; i++) { this.particles.push({ id: ++this.particleIdCounter, x: x + (Math.random()-0.5)*10, y: y + (Math.random()-0.5)*10, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5) - 0.5, life: 1.5, maxLife: 1.5, type: 'SMOKE', color: 'rgba(215, 204, 200, 0.4)', radius: 4 + Math.random() * 4 }); }
  }

  onWheel(e: WheelEvent) {
    e.preventDefault(); this.userInteracted = true;
    if (this.game.tutorialState().active) this.game.advanceTutorial('ZOOM');
    const zoomIntensity = 0.1; const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
    const newScale = Math.min(Math.max(0.5, this.scale + delta), 4);
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
    const wx = (mx - this.panX) / this.scale; const wy = (my - this.panY) / this.scale;
    this.scale = newScale; this.panX = mx - wx * newScale; this.panY = my - wy * newScale;
  }

  startDrag(e: MouseEvent) {
    this.isMouseDown = true; this.isDragging = false;
    this.dragStartX = e.clientX; this.dragStartY = e.clientY;
    this.lastMouseX = e.clientX; this.lastMouseY = e.clientY;
  }

  onDrag(e: MouseEvent) {
    if (this.isMouseDown) {
        const dx = e.clientX - this.lastMouseX; const dy = e.clientY - this.lastMouseY;
        if (!this.isDragging && (Math.abs(e.clientX - this.dragStartX) > 5 || Math.abs(e.clientY - this.dragStartY) > 5)) {
            this.isDragging = true;
            if (this.game.tutorialState().active) this.game.advanceTutorial('PAN');
        }
        if (this.isDragging) { this.panX += dx; this.panY += dy; this.userInteracted = true; }
        this.lastMouseX = e.clientX; this.lastMouseY = e.clientY;
    }
  }

  endDrag() {
    this.isMouseDown = false;
    if (!this.isDragging) {
        const rect = this.containerRef.nativeElement.getBoundingClientRect();
        const mx = this.lastMouseX - rect.left; const my = this.lastMouseY - rect.top;
        const wx = (mx - this.panX) / this.scale; const wy = (my - this.panY) / this.scale;
        const coords = this.pixelToHex(wx, wy);
        this.game.selectHex(coords.q, coords.r);
    }
    this.isDragging = false;
  }

  private pixelToHex(x: number, y: number): { q: number, r: number } {
      const size = this.hexSize;
      const q = (2./3 * x) / size;
      const r = (-1./3 * x + Math.sqrt(3)/3 * y) / size;
      return this.axialRound(q, r);
  }

  private axialRound(x: number, y: number) {
      const z = -x - y;
      let rx = Math.round(x); let ry = Math.round(y); let rz = Math.round(z);
      const x_diff = Math.abs(rx - x); const y_diff = Math.abs(ry - y); const z_diff = Math.abs(rz - z);
      if (x_diff > y_diff && x_diff > z_diff) rx = -ry - rz;
      else if (y_diff > z_diff) ry = -rx - rz;
      else rz = -rx - ry;
      return { q: rx, r: ry };
  }
}
