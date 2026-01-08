
import { Component, OnInit, OnDestroy, Output, EventEmitter, HostListener, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../services/audio.service';

type IntroPhase = 'OPENING' | 'NARRATIVE' | 'TITLE_REVEAL' | 'WAITING';

@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[9999] bg-[#0c0a09] font-serif overflow-hidden select-none cursor-default text-[#d6d3d1]"
         [class.ending]="isEnding()"
         (click)="handleClick()">
        
        <div class="absolute inset-0 z-[1] opacity-[0.1] bg-noise mix-blend-overlay pointer-events-none"></div>
        <div class="absolute inset-0 z-[2] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:24px_24px] opacity-20 pointer-events-none"></div>
        <div class="absolute inset-0 z-[3] bg-[#2f1b14] opacity-20 mix-blend-multiply pointer-events-none"></div>

        <div class="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 md:p-16">
            
            @if (phase() === 'NARRATIVE') {
                <div class="max-w-5xl w-full flex flex-col items-center text-center animate-fade-in-slow">
                    <div class="mb-8 flex items-center gap-3 opacity-60">
                        <div class="h-[1px] w-12 bg-[#78716c]"></div>
                        <div class="font-mono text-xs tracking-[0.3em] text-[#a8a29e] uppercase">
                            {{ currentSlide()?.meta }}
                        </div>
                        <div class="h-[1px] w-12 bg-[#78716c]"></div>
                    </div>

                    <div class="relative">
                        <div class="text-3xl md:text-5xl leading-tight font-bold tracking-widest text-[#e5e5e5] font-serif"
                             [innerHTML]="currentSlide()?.text">
                        </div>
                    </div>

                    @if (currentSlide()?.sub) {
                        <div class="mt-12 max-w-3xl text-lg md:text-2xl text-[#a1887f] font-serif italic leading-relaxed opacity-0 animate-fade-in-slow">
                            {{ currentSlide()?.sub }}
                        </div>
                        <div class="mt-4 text-sm font-mono text-[#5d4037] opacity-0 animate-fade-in-slow uppercase tracking-widest" style="animation-delay: 1.5s;">
                            {{ currentSlide()?.source }}
                        </div>
                    }
                </div>
            }

            @if (phase() === 'TITLE_REVEAL' || phase() === 'WAITING') {
                <div class="flex flex-col items-center justify-center relative w-full h-full animate-fade-in-slow">
                    <div class="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none scale-125">
                         <div class="w-[600px] h-[600px] border border-[#5d4037] rounded-full opacity-20"></div>
                    </div>

                    <div class="relative z-20 flex flex-col items-center">
                        <div class="text-[#8d6e63] font-serif text-sm tracking-[1em] mb-4 opacity-0 animate-fade-in font-bold">
                            一九三七 · 八月十三日
                        </div>

                        <h1 class="font-calligraphy text-9xl md:text-[12rem] text-[#e5e5e5] leading-none font-black relative drop-shadow-xl">
                            <span class="inline-block animate-fade-in text-[#9f1239]" style="animation-delay: 0.2s;">赤</span>
                            <span class="inline-block animate-fade-in text-[#d6d3d1]" style="animation-delay: 0.6s">色</span>
                            <span class="inline-block animate-fade-in text-[#d6d3d1]" style="animation-delay: 1.0s">淞</span>
                            <span class="inline-block animate-fade-in text-[#d6d3d1]" style="animation-delay: 1.4s">沪</span>
                        </h1>
                        
                        <div class="h-[1px] w-64 bg-[#5d4037] mt-8 mb-6 opacity-0 animate-expand"></div>
                        
                        <div class="flex flex-col items-center opacity-0 animate-fade-in" style="animation-delay: 2.0s;">
                            <div class="font-calligraphy text-4xl md:text-5xl text-[#7f1d1d] font-bold tracking-[0.2em] text-center">
                                “一寸山河一寸血”
                            </div>
                        </div>
                    </div>

                    @if (phase() === 'WAITING') {
                        <div class="mt-32 animate-fade-in" style="animation-delay: 2.5s">
                           <div class="text-center text-sm text-[#78716c] font-mono tracking-widest opacity-60">
                                [ 点击任意处进入战场 ]
                           </div>
                        </div>
                    }
                </div>
            }
        </div>

        <div class="absolute bottom-8 left-8 right-8 flex justify-between items-end font-mono text-[10px] text-[#57534e] z-20 pointer-events-none">
            <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                    <div class="w-1.5 h-1.5 bg-[#8d6e63] animate-pulse"></div>
                    <span class="uppercase tracking-widest">{{ loadingText() }}</span>
                </div>
                <div class="w-64 h-[1px] bg-[#292524] mt-1 relative overflow-hidden">
                    <div class="absolute inset-y-0 left-0 bg-[#8d6e63]" [style.width.%]="progress()"></div>
                </div>
            </div>
            
            <div class="flex flex-col items-end opacity-60">
                <div class="text-4xl font-black font-mono text-[#5d4037] tracking-tighter leading-none opacity-80">
                    1937.08.13
                </div>
                <div class="text-[9px] uppercase tracking-[0.3em] text-[#5d4037] mt-1">
                    上海 // 上午 9:00
                </div>
            </div>
        </div>

        <div class="outro-shutter top"></div>
        <div class="outro-shutter bottom"></div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .font-kaiti { font-family: "KaiTi", "STKaiti", serif; }
    .bg-noise { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"); }
    @keyframes fadeInSlow { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in-slow { animation: fadeInSlow 2.5s ease-out forwards; }
    .animate-fade-in { animation: fadeInSlow 1.5s ease-out forwards; }
    @keyframes expandWidth { from { width: 0; opacity: 0; } to { width: 16rem; opacity: 1; } }
    .animate-expand { animation: expandWidth 1.5s ease-out 1s forwards; }
    .ending > *:not(.outro-shutter) { transition: opacity 0.4s ease-in !important; opacity: 0 !important; }
    .outro-shutter { position: absolute; left: 0; right: 0; height: 50.5%; background-color: #0c0a09; z-index: 200; transform: scaleY(0); transition: transform 1s cubic-bezier(0.86, 0, 0.07, 1) 0.2s; }
    .outro-shutter.top { top: 0; transform-origin: top; }
    .outro-shutter.bottom { bottom: 0; transform-origin: bottom; }
    .ending .outro-shutter { transform: scaleY(1); }
  `]
})
export class IntroComponent implements OnInit, OnDestroy {
  @Output() complete = new EventEmitter<void>();
  private audio = inject(AudioService);

  phase = signal<IntroPhase>('OPENING');
  currentSlideIndex = signal(0);
  progress = signal(0);
  loadingText = signal("正在建立通讯链路...");
  isEnding = signal(false);

  currentSlide = computed(() => this.script[this.currentSlideIndex()]);

  private narrativeTimer: ReturnType<typeof setTimeout> | null = null;
  private narrativePromiseResolver: (() => void) | null = null;

  private readonly script = [
      {
          meta: '1937年7月8日 / 延安',
          text: `山河破碎，<span class="text-[#a1887f]">民族存亡</span>之秋。<br>中国共产党通电全国，号召全民族统一抗战。`,
          sub: "“平津危急！华北危急！中华民族危急！只有全民族实行抗战，才是我们的出路！”",
          source: "—— 毛泽东《中国共产党为日军进攻卢沟桥通电》",
          duration: 5500
      },
      {
          meta: '1937年7月17日 / 庐山',
          text: `华北枪响，<span class="text-[#a1887f]">全面战争</span>爆发。<br>帝国蓄谋已久，企图在三个月内，灭亡中国。`,
          sub: "“如果战端一开，那就是地无分南北，年无分老幼，无论何人，皆有守土抗战之责任，皆应抱定牺牲一切之决心。”",
          source: "—— 蒋中正《庐山声明》",
          duration: 5000
      },
      {
          meta: '战略抉择 / 以空间换时间',
          text: `统帅部决定<span class="text-[#e5e5e5]">主动开辟第二战场</span>。<br>将日军主力从由北向南的俯冲，拖入淞沪沿岸的绞杀。`,
          sub: "“与其不战而亡，不如战而亡。中国对日持久抗战，须以空间换取时间。”",
          source: "—— 蒋百里《国防论》",
          duration: 5500
      },
      {
          meta: '1937年8月 / 战争决心',
          text: `黑云压城。<br>在这座被称为<span class="text-[#d6d3d1]">“东方巴黎”</span>的繁华都市上空，<br>战争的阴霾已令人窒息。`,
          sub: "“上海战事，关系国家存亡，不论牺牲如何，必须尽量支持。我务求死里求生，并在死中求生。”",
          source: "—— 第三战区前敌总指挥 陈诚",
          duration: 5000
      },
      {
          meta: '战力对比 / 绝望与勇气',
          text: `这是<span class="text-[#d6d3d1] font-black">草鞋</span>与<span class="text-[#7f1d1d] font-black">重炮</span>的对决。<br>七十万血肉之躯，直面帝国的钢铁洪流。`,
          sub: "“中国军队装备之劣，以此抗击日本强敌，其牺牲之惨烈，不难想象。但其英勇之精神，虽德日军队不及也。”",
          source: "—— 德国军事顾问 亚历山大·冯·法尔肯豪森",
          duration: 5500
      },
      {
          meta: '9月5日 / 宝山喋血',
          text: `这不是战斗，这是<span class="text-[#9f1239] text-6xl font-black font-calligraphy">屠杀</span>。<br>整连整营填进去，几个小时就打光了。`,
          sub: "“全营官兵，誓与阵地共存亡，生为军人，死为军魂。”",
          source: "—— 宝山守备营长 姚子青 殉国前电文",
          duration: 5000
      },
      {
          meta: '最高统帅部 / 死令',
          text: `身后即是南京。<br>我们<span class="border-b-4 border-[#5d4037] pb-1">已无路可退</span>。`,
          sub: "“与其忍辱生，毋宁光荣死。”",
          source: "—— 第九集团军总司令 张治中",
          duration: 4000
      }
  ];

  ngOnInit() {
    this.runSequence();
    this.simulateLoading();
  }

  ngOnDestroy() {}

  private async runSequence() {
      await this.wait(1000);
      
      this.phase.set('NARRATIVE');
      for (let i = 0; i < this.script.length; i++) {
          this.currentSlideIndex.set(i);
          this.playTypewriterSoundForText(this.script[i].text);
          await this.cancellableWait(this.script[i].duration);
          if (this.phase() !== 'NARRATIVE') break;
      }

      if (this.phase() === 'NARRATIVE') {
          this.phase.set('TITLE_REVEAL');
          this.audio.playFlagAnthem(); // PLAY ANTHEM HERE
          await this.wait(3000); 
          this.phase.set('WAITING');
      }
  }

  private playTypewriterSoundForText(htmlText: string) {
      const plainText = htmlText.replace(/<[^>]*>/g, '');
      const count = Math.min(20, plainText.length);
      let i = 0;
      const interval = setInterval(() => {
          i++;
          if (i >= count) clearInterval(interval);
      }, 50);
  }

  private simulateLoading() {
      const interval = setInterval(() => {
          const current = this.progress();
          if (current >= 100) { clearInterval(interval); this.loadingText.set("系统就绪。等待指令。"); return; }
          const increment = Math.random() > 0.6 ? Math.floor(Math.random() * 4) + 1 : 0;
          this.progress.set(Math.min(100, current + increment));
      }, 60);
  }

  private wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

  private cancellableWait(ms: number): Promise<void> {
    return new Promise(resolve => {
        this.narrativePromiseResolver = resolve;
        this.narrativeTimer = setTimeout(() => {
            if (this.narrativePromiseResolver) { this.narrativePromiseResolver(); }
            this.narrativeTimer = null; this.narrativePromiseResolver = null;
        }, ms);
    });
  }

  handleClick() {
      this.audio.init();

      if (this.phase() === 'NARRATIVE') {
          if (this.narrativeTimer && this.narrativePromiseResolver) {
              clearTimeout(this.narrativeTimer);
              this.narrativePromiseResolver();
              this.narrativeTimer = null;
              this.narrativePromiseResolver = null;
          }
      } else if (this.phase() === 'WAITING') {
          this.finishIntro();
      }
  }

  @HostListener('window:keydown.enter')
  async finishIntro() {
    this.audio.init();
    if (this.phase() === 'WAITING') {
        if (this.isEnding()) return;
        this.audio.playSfx('MUFFLED_CANNON'); // MUFFLED_CANNON on start
        this.isEnding.set(true);
        await this.wait(1500);
        this.complete.emit();
    } else {
        if (this.narrativeTimer && this.narrativePromiseResolver) {
            clearTimeout(this.narrativeTimer);
            this.narrativePromiseResolver();
            this.narrativeTimer = null;
            this.narrativePromiseResolver = null;
        }
        this.progress.set(100);
        this.phase.set('WAITING');
        this.audio.playFlagAnthem(); // Ensure it plays if skipped
    }
  }
}
