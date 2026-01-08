
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-tutorial-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[6000] pointer-events-none">
      
      <!-- Vignette Effect - Reduced opacity -->
      <div class="absolute inset-0 bg-black/10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)] transition-all duration-500"></div>

      <!-- Main Tutorial Card (Field Manual Style - Compact Left Side) -->
      @if (game.tutorialState().currentStep; as step) {
        <div class="absolute top-28 left-6 w-[360px] bg-[#f3f0eb] shadow-[0_15px_30px_rgba(0,0,0,0.6)] pointer-events-auto animate-slide-in-left transform rotate-[-1deg] border border-[#d6d3d1] rounded-sm overflow-hidden">
          
          <!-- Realistic Paper Texture -->
          <div class="absolute inset-0 opacity-50 pointer-events-none z-0" 
               style="background-image: url('https://www.transparenttextures.com/patterns/old-paper.png'); mix-blend-mode: multiply;"></div>
          
          <!-- Coffee Stain / Dirt -->
          <div class="absolute -top-10 -right-10 w-24 h-24 bg-[#78350f] opacity-10 rounded-full blur-xl pointer-events-none"></div>

          <!-- Paperclip (Visual decoration) -->
          <div class="absolute -top-3 right-8 w-3 h-10 border-2 border-gray-500 rounded-full z-20 bg-transparent shadow-sm transform rotate-6"></div>

          <!-- Header Section -->
          <div class="relative z-10 px-6 pt-5 pb-3 border-b border-[#1c1917] flex justify-between items-start">
             <div>
                <div class="text-[9px] font-mono text-[#78716c] uppercase tracking-[0.15em] mb-1">
                    训练 // 第 {{ (game.tutorialState().stepIndex + 1).toString().padStart(2, '0') }} 节
                </div>
                <h3 class="text-xl font-black text-[#1c1917] leading-none font-typewriter">
                  {{ step.title }}
                </h3>
             </div>
             
             <!-- Stamp -->
             <div class="border border-red-800 text-red-800 px-1 py-0.5 transform -rotate-12 opacity-80 text-[8px] font-black uppercase tracking-widest mt-1">
                 强制
             </div>
          </div>
          
          <!-- Body Content -->
          <div class="relative z-10 p-6 pt-4">
             <div class="flex gap-3">
                 <!-- Vertical decorative line -->
                 <div class="w-0.5 bg-[#b91c1c] shrink-0 opacity-50"></div>
                 
                 <div class="text-sm leading-relaxed text-[#292524] font-mono" 
                      [innerHTML]="step.text">
                 </div>
             </div>
          </div>

          <!-- Action Footer -->
          <div class="relative z-10 p-3 bg-[#e5e5e5]/50 border-t border-dashed border-[#78716c] flex justify-between items-center">
             
             <!-- Status Indicator -->
             <div class="flex items-center gap-2 text-[10px] font-mono text-[#57534e]">
                 @if (step.waitForAction === 'ANY_KEY') {
                     <span class="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></span>
                     <span>等待确认</span>
                 } @else {
                     <span class="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse"></span>
                     <span>等待操作...</span>
                 }
             </div>

             <!-- Button (Only if Any Key) -->
             @if (step.waitForAction === 'ANY_KEY') {
                <button (click)="game.advanceTutorial('ANY_KEY')" 
                        class="group relative px-4 py-1.5 bg-[#1c1917] text-[#e5e5e5] font-bold font-mono text-xs tracking-widest uppercase hover:bg-[#b91c1c] transition-all shadow-md border-l-2 border-white active:translate-y-0.5">
                    {{ step.actionButtonText }} >
                </button>
             }
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-20px) rotate(-5deg); }
      to { opacity: 1; transform: translateX(0) rotate(-1deg); }
    }
    .animate-slide-in-left {
      animation: slideInLeft 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
  `]
})
export class TutorialOverlayComponent {
  game = inject(GameService);
}
