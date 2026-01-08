
import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../services/game.service';
import { Unit } from '../types';

@Component({
  selector: 'app-info-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-24 right-8 bottom-36 w-[400px] z-[100] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] perspective-1000"
         [class.translate-x-[120%]]="shouldHide()"
         [class.opacity-0]="shouldHide()"
         [class.tutorial-spotlight]="game.tutorialState().currentStep?.highlightUi === 'info-panel'">
         
      <!-- === THE DOSSIER CARD === -->
      <div class="relative w-full h-full flex flex-col bg-[#f3f0eb] rounded-md shadow-2xl overflow-hidden font-serif border-4 border-[#d6d3d1] transform rotate-1 hover:rotate-0 transition-transform duration-300">
         
         <!-- Realistic Paper Texture -->
         <div class="absolute inset-0 opacity-40 pointer-events-none z-0" 
              style="background-image: url('https://www.transparenttextures.com/patterns/old-paper.png'); mix-blend-mode: multiply;"></div>
         
         <!-- Scuffs and Stains -->
         <div class="absolute inset-0 opacity-10 pointer-events-none z-0 bg-[radial-gradient(circle_at_top_right,#000_0%,transparent_60%)]"></div>

         @if (game.selectedUnit(); as u) {
            
            <!-- === 1. TOP HEADER: IDENTITY & FLAG === -->
            <div class="relative z-10 p-5 pb-4 border-b-2 border-[#a8a29e] flex gap-4 bg-[#e7e5e4]/50 overflow-hidden shrink-0">
                
                <!-- PHOTO ID -->
                <div class="relative shrink-0 w-24 h-28 bg-[#1c1917] p-1 shadow-md rotate-[-2deg] border border-[#d6d3d1] z-20">
                    <!-- Pin -->
                    <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-800 shadow-sm z-20 border border-white/20"></div>
                    
                    <!-- Image Area -->
                    <div class="w-full h-full bg-[#292524] relative overflow-hidden grayscale contrast-125 sepia-[0.2]">
                        <div class="absolute inset-0 bg-noise opacity-20 mix-blend-overlay"></div>
                        <div class="absolute inset-0 flex items-center justify-center">
                            <!-- Icon Type specific rendering or generic char -->
                            <span class="text-5xl font-black text-[#e5e5e5] opacity-80">{{u.icon}}</span>
                        </div>
                        <!-- Scanlines -->
                        <div class="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
                    </div>
                </div>

                <!-- INFO BLOCK -->
                <div class="flex-1 min-w-0 flex flex-col justify-between py-1 relative z-10">
                    
                    <!-- NATIONAL FLAG STAMP (Top Right) -->
                    <div class="absolute -top-2 -right-2 w-20 h-14 shadow-md transform rotate-3 border border-white/30 z-0 opacity-90">
                        @if (u.owner === 'Blue') {
                            <!-- ROC Flag -->
                            <svg viewBox="0 0 450 300" class="w-full h-full">
                                <rect width="450" height="300" fill="#FE0000"/>
                                <rect width="225" height="150" fill="#000095"/>
                                <g transform="translate(112.5, 75)">
                                    <circle r="37.5" fill="#FFF"/>
                                    <path d="M0,-67.5 L9,-42 L33.75,-58.5 L25.5,-30 L58.5,-33.75 L39,-10.5 L67.5,0 L39,10.5 L58.5,33.75 L25.5,30 L33.75,58.5 L9,42 L0,67.5 L-9,42 L-33.75,58.5 L-25.5,30 L-58.5,33.75 L-39,10.5 L-67.5,0 L-39,-10.5 L-58.5,-33.75 L-25.5,-30 L-33.75,-58.5 L-9,-42 Z" fill="#FFF"/>
                                </g>
                            </svg>
                        } @else if (u.owner === 'Red') {
                            <!-- Japan Flag -->
                            <svg viewBox="0 0 900 600" class="w-full h-full">
                                <rect width="900" height="600" fill="#fff"/>
                                <circle cx="450" cy="300" r="180" fill="#bc002d"/>
                            </svg>
                        }
                        <div class="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                    </div>

                    <div>
                        <div class="flex justify-between items-start pr-16"> 
                            <span class="text-[10px] font-mono font-bold text-[#78716c] tracking-widest uppercase border border-[#78716c] px-1 rounded-sm">
                                编号: {{u.id.substring(0,6)}}
                            </span>
                        </div>
                        
                        <h1 class="text-2xl font-black text-[#1c1917] leading-none mt-3 font-serif tracking-tight truncate pr-4">
                            {{ u.name }}
                        </h1>
                        <div class="text-xs font-bold text-[#57534e] mt-0.5">{{u.category}} 单位</div>
                    </div>

                    <div class="flex items-center gap-2 mt-1">
                        <span class="h-2 w-2 rounded-full" [class.bg-blue-600]="u.owner === 'Blue'" [class.bg-red-600]="u.owner === 'Red'"></span>
                        <span class="text-[10px] font-mono text-[#444] uppercase tracking-wider">
                            {{u.owner === 'Blue' ? '国民革命军' : '大日本帝国军队'}}
                        </span>
                    </div>
                </div>
            </div>

            <!-- === 2. MIDDLE: COMBAT METRICS & EVALUATION === -->
            <div class="relative z-10 p-5 space-y-4 bg-[#f3f0eb] shrink-0 border-b border-[#d6d3d1]">
                
                <!-- REGION CONTROL STATUS (NEW) -->
                @let rid = getRegionId(u);
                @let owner = game.getRegionOwner(rid);
                <div class="flex items-center justify-between text-xs border border-[#a8a29e] bg-[#e7e5e4] px-2 py-1 rounded-sm">
                    <span class="font-bold text-[#5d4037] uppercase tracking-wide">区域控制: {{ rid }}</span>
                    @if (owner === 'Blue') {
                        <span class="text-blue-700 font-bold flex items-center gap-1"><span class="w-2 h-2 bg-blue-600 rounded-full"></span>国军控制</span>
                    } @else if (owner === 'Red') {
                        <span class="text-red-700 font-bold flex items-center gap-1"><span class="w-2 h-2 bg-red-600 rounded-full"></span>日军控制</span>
                    } @else {
                        <span class="text-stone-500 font-bold">争夺中 / 中立</span>
                    }
                </div>

                <!-- METRICS GRID -->
                <div class="grid grid-cols-2 gap-3">
                    <!-- Strength/Casualties -->
                    <div class="space-y-1">
                        <div class="flex justify-between text-[9px] font-bold uppercase text-[#57534e]">
                            <span>战力</span>
                            <span [class]="getHpColor(u)">{{u.hp}}/{{u.maxHp}}</span>
                        </div>
                        <div class="h-2 w-full bg-[#d6d3d1] flex gap-[1px]">
                             @for(step of [1,2,3,4,5,6,7,8,9,10]; track step) {
                                 <div class="flex-1 h-full transition-all duration-300"
                                      [class.bg-[#991b1b]]="getHpPercentage(u) >= step * 10"
                                      [class.opacity-20]="getHpPercentage(u) < step * 10"></div>
                             }
                        </div>
                    </div>
                    <!-- Morale -->
                    <div class="space-y-1">
                        <div class="flex justify-between text-[9px] font-bold uppercase text-[#57534e]">
                            <span>士气</span>
                            <span>{{u.morale}}%</span>
                        </div>
                        <div class="h-2 w-full bg-[#d6d3d1]">
                            <div class="h-full bg-[#444]" [style.width.%]="u.morale"></div>
                        </div>
                    </div>
                </div>

                <!-- HARD STATS TABLE -->
                <div class="border border-[#78716c] bg-[#e7e5e4] text-[10px]">
                    <div class="grid grid-cols-4 bg-[#d6d3d1] border-b border-[#78716c] font-bold text-[#1c1917] py-1 text-center font-mono">
                        <div>软攻</div><div>硬攻</div><div>穿深</div><div>装甲</div>
                    </div>
                    <div class="grid grid-cols-4 font-mono text-[#292524] divide-x divide-[#78716c] text-center py-1 font-bold text-xs">
                        <div>{{u.softAttack}}</div>
                        <div>{{u.hardAttack}}</div>
                        <div class="text-red-700">{{u.penetration}}</div>
                        <div class="text-blue-800">{{u.armor}}</div>
                    </div>
                </div>
            </div>

            <!-- === 3. SCROLLABLE BIO (Flexible Height) === -->
            <div class="flex-1 overflow-y-auto px-5 py-4 relative z-10 custom-scrollbar bg-[#f3f0eb] min-h-0">
                <!-- BIO / BACKGROUND -->
                @if (u.historicalNote) {
                    <div class="text-sm leading-relaxed font-serif text-[#292524] text-justify opacity-90 mb-4">
                        <div class="mb-2 text-[10px] font-mono text-[#78716c] uppercase tracking-widest border-b border-dashed border-[#a8a29e] pb-1">
                            部队档案
                        </div>
                        <div [innerHTML]="u.historicalNote"></div>
                    </div>
                }

                <!-- TACTICAL EVALUATION -->
                <div class="text-xs leading-relaxed font-serif text-[#292524] text-justify opacity-90 mb-4 bg-[#e7e5e4] p-3 border border-[#a8a29e]">
                    <div class="mb-2 text-[10px] font-mono text-[#78716c] uppercase tracking-widest border-b border-dashed border-[#a8a29e] pb-1">
                        战术评估
                    </div>
                    <div [innerHTML]="getDetailedEvaluation(u)"></div>
                </div>

                <!-- CASUALTY REPORT -->
                <div class="text-xs leading-relaxed font-serif text-[#7f1d1d] text-justify opacity-90 mb-4 border-l-4 border-[#7f1d1d] pl-3">
                    <div class="mb-1 text-[10px] font-mono text-[#7f1d1d] uppercase tracking-widest">
                        战损报告
                    </div>
                    <div [innerHTML]="getCasualtyReport(u)"></div>
                </div>

                <div class="mt-4 flex flex-wrap gap-1">
                     @for(trait of u.traits; track trait) {
                        <span class="bg-[#e7e5e4] text-[#444] border border-[#a8a29e] px-1.5 py-0.5 text-[9px] font-mono uppercase rounded-sm">{{trait}}</span>
                    }
                </div>
                
                <div class="h-4"></div> <!-- Spacer -->
            </div>

            <!-- === 4. TACTICAL TARGETING MODULE (Fixed Bottom, Scrollable Content) === -->
            @if (u.owner === game.currentPlayer() && !game.isUiLocked()) {
                <div class="relative z-20 shrink-0 bg-[#1c1917] border-t-4 border-[#444] shadow-[0_-5px_15px_rgba(0,0,0,0.5)] flex flex-col max-h-[220px]"
                     [class.tutorial-spotlight]="game.tutorialState().currentStep?.highlightUi === 'attack-btn'">
                    <!-- Header -->
                    <div class="px-4 py-2 bg-[#292524] border-b border-[#444] flex justify-between items-center shrink-0">
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                            <span class="text-[10px] font-mono text-[#d6d3d1] uppercase tracking-widest">射击指挥</span>
                        </div>
                        <span class="text-[10px] font-mono" [class.text-green-500]="u.ap>=5" [class.text-red-500]="u.ap<5">
                            {{u.ap >= 5 ? '可以开火' : 'AP不足 (需5点)'}}
                        </span>
                    </div>

                    <!-- Scrollable Target List -->
                    <div class="overflow-y-auto custom-scrollbar p-2 space-y-1">
                        @if (game.attackableUnits().length > 0) {
                            @for (target of sortedTargets(); track target.id) {
                                <button (click)="fire(u, target)" 
                                        class="w-full flex items-center justify-between p-2 border-l-2 transition-all duration-200 group bg-[#0c0a09] hover:bg-[#292524] border-[#444] hover:border-[#b91c1c]"
                                        [class.tutorial-spotlight]="game.tutorialState().currentStep?.requiredTargetId === target.id">
                                    
                                    <!-- Target Info -->
                                    <div class="flex flex-col items-start text-left flex-1 min-w-0 pr-2">
                                        <div class="flex items-center justify-between w-full">
                                            <!-- NAME: Red if Enemy, Gray if Friendly -->
                                            <div class="flex items-center gap-2 min-w-0">
                                                <!-- Hostility Icon & Label -->
                                                @if (target.owner !== u.owner) {
                                                    <span class="text-[#ef4444] text-[10px] font-mono tracking-tighter shrink-0">[敌]</span>
                                                } @else {
                                                    <span class="text-[#57534e] text-[10px] font-mono tracking-tighter opacity-50 shrink-0">[友]</span>
                                                }
                                                
                                                <span class="text-xs font-bold transition-colors truncate"
                                                      [class.text-[#ef4444]]="target.owner !== u.owner"
                                                      [class.text-[#57534e]]="target.owner === u.owner"
                                                      [class.opacity-60]="target.owner === u.owner"
                                                      [class.group-hover:text-white]="true"
                                                      [class.group-hover:opacity-100]="true">
                                                    {{ target.name }}
                                                </span>
                                            </div>
                                            <span class="text-[9px] font-mono text-[#57534e] shrink-0">#{{target.id.substring(0,4)}}</span>
                                        </div>
                                        
                                        <!-- HP Bar Mini: STRICT COLOR CODING -->
                                        <!-- Red = Japan, Blue = China, Gray = Civilian -->
                                        <div class="w-full h-1 bg-[#333] mt-1 relative">
                                            <div class="absolute inset-y-0 left-0" 
                                                 [class]="getTargetHpClass(target)"
                                                 [style.width.%]="(target.hp/target.maxHp)*100"></div>
                                        </div>

                                        <div class="text-[9px] font-mono text-[#78716c] flex justify-between w-full mt-1.5">
                                            <span>距离: {{game.getDistance(u, target)}}</span>
                                            <span>装甲: <span class="text-blue-400">{{target.armor}}</span></span>
                                            <span [class]="getOddsColor(u, target)">战损比: {{ calculateOddsDisplay(u, target) }}</span>
                                        </div>
                                    </div>
                                    
                                    <!-- Action Icon -->
                                    <div class="text-[#444] group-hover:text-[#ef4444] transition-colors pl-2 border-l border-[#333]">
                                        <div class="text-[10px] font-black uppercase -rotate-90">开火</div>
                                    </div>
                                </button>
                            }
                        } @else {
                            <div class="py-6 text-center text-[#57534e]">
                                <div class="text-2xl mb-1 opacity-50">🔭</div>
                                <div class="text-[10px] font-mono uppercase tracking-widest">无有效目标</div>
                                <div class="text-[9px] opacity-60 mt-1">检查射程或AP</div>
                            </div>
                        }
                    </div>
                </div>
            }
         }
      </div>
    </div>
  `,
  styles: [`
    .perspective-1000 { perspective: 1000px; }
    
    .bg-noise {
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }

    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #1c1917; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #57534e; border-radius: 2px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #78716c; }
  `]
})
export class InfoPanelComponent {
  game = inject(GameService);
  
  shouldHide = computed(() => {
      return !this.game.selectedUnit() || this.game.phase() === 'AIProcessing';
  });

  getHpPercentage(u: Unit): number {
      return (u.hp / u.maxHp) * 100;
  }

  getHpStatus(u: Unit): string {
      const pct = u.hp / u.maxHp;
      if (pct >= 0.8) return 'FULL STRENGTH';
      if (pct >= 0.5) return 'COMBAT READY';
      if (pct >= 0.3) return 'HEAVY LOSSES';
      return 'CRITICAL';
  }

  getHpColor(u: Unit): string {
      const pct = u.hp / u.maxHp;
      if (pct >= 0.5) return 'text-[#15803d]';
      if (pct >= 0.3) return 'text-[#b45309]';
      return 'text-[#991b1b] animate-pulse';
  }

  // New strict HP Color Helper for Target List
  getTargetHpClass(t: Unit): string {
      if (t.category === 'Civilian') return 'bg-[#9ca3af]'; // Gray 400
      if (t.owner === 'Red') return 'bg-[#dc2626]'; // Red 600
      if (t.owner === 'Blue') return 'bg-[#2563eb]'; // Blue 600
      return 'bg-[#57534e]'; // Stone
  }

  getCombatGrade(u: Unit): string {
      const hpPct = u.hp / u.maxHp;
      const mrl = u.morale;
      
      if (hpPct > 0.8 && mrl > 80) return 'A';
      if (hpPct > 0.6 && mrl > 60) return 'B';
      if (hpPct > 0.4 && mrl > 40) return 'C';
      return 'F';
  }

  getDetailedEvaluation(u: Unit): string {
      const parts = [];
      if (u.morale >= 90) parts.push("部队士气极度高昂，求战欲望强烈，可执行高难度突击任务。");
      else if (u.morale >= 60) parts.push("部队保持正常作战状态，纪律严明。");
      else if (u.morale >= 30) parts.push("部队士气低落，出现厌战情绪，甚至有逃兵现象。需严加督战。");
      else parts.push("部队已处于崩溃边缘，随时可能溃散！建议立即撤往后方重整。");

      if (u.supplyState === 'Supplied') parts.push("弹药粮秣补给充足，可持续作战。");
      else parts.push("补给线被切断！弹药匮乏，战斗力严重受损 (战力减半)。");

      if (u.fatigue > 80) parts.push("官兵极度疲劳，动作迟缓，急需休整。");
      else if (u.fatigue > 40) parts.push("连续作战导致体力下降，注意轮换。");
      
      return parts.join("<br>");
  }

  getCasualtyReport(u: Unit): string {
      const pct = u.hp / u.maxHp;
      const loss = 1 - pct;
      const lossPct = Math.floor(loss * 100);
      
      let text = `当前战损率: <span class="font-mono text-lg font-bold">${lossPct}%</span><br>`;
      
      if (loss < 0.1) text += "建制完整。仅有少量轻伤员，不影响战斗力。";
      else if (loss < 0.3) text += "承受一定损失。部分基层军官伤亡，班排级建制需临时合并。";
      else if (loss < 0.6) text += "伤亡过半！主力营级单位失去战斗力，急需补充兵员。建议转入防御。";
      else if (loss < 0.9) text += "毁灭性打击！仅存少量残部，实际上已失去作战能力。";
      else text += "全军覆没。番号已名存实亡。";
      
      return text;
  }

  sortedTargets() {
    const u = this.game.selectedUnit();
    if (!u) return [];
    const targets = [...this.game.attackableUnits()];
    return targets.sort((a, b) => {
        // Priority 1: Enemy First
        const aIsEnemy = a.owner !== u.owner;
        const bIsEnemy = b.owner !== u.owner;
        if (aIsEnemy && !bIsEnemy) return -1; 
        if (!aIsEnemy && bIsEnemy) return 1;  
        
        // Priority 2: HP Ascending (Easier to kill)
        if (a.hp !== b.hp) return a.hp - b.hp;
        
        // Priority 3: Max HP Descending (High Value)
        return b.maxHp - a.maxHp;
    });
  }

  calculateOddsDisplay(u: Unit, t: Unit): string {
      const att = u.combatStrength * (u.hp / u.maxHp);
      const def = t.combatStrength * (t.hp / t.maxHp);
      const ratio = att / Math.max(0.1, def);
      if (ratio >= 3) return '3:1';
      if (ratio >= 2) return '2:1';
      if (ratio >= 1) return '1:1';
      return '1:2';
  }

  getOddsColor(u: Unit, t: Unit): string {
      const att = u.combatStrength;
      const def = t.combatStrength;
      if (att >= def * 2) return 'text-green-500 font-bold';
      if (att >= def) return 'text-yellow-500';
      return 'text-red-500';
  }

  fire(a: Unit, d: Unit) { 
      this.game.performAttack(a, d); 
  }

  getRegionId(u: Unit): string {
      return this.game.hexMap().get(`${u.q},${u.r}`)?.region || 'Unknown';
  }
}
