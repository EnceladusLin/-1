
import { Component, inject, signal, OnInit, ElementRef, ViewChild, AfterViewChecked, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HexGridComponent } from './components/hex-grid.component';
import { InfoPanelComponent } from './components/info-panel.component';
import { IntroComponent } from './components/intro.component';
import { MechanicsManualComponent } from './components/mechanics-manual.component';
import { TutorialOverlayComponent } from './components/tutorial-overlay.component';
import { GameService } from './services/game.service';
import { AiAdvisorService } from './services/ai-advisor.service';
import { AudioService } from './services/audio.service';
import { PlayerId, ActiveBuff, PlayerSkill, Achievement, AchievementRarity, AchievementStats, AchievementNotification, SaveSlot } from './types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HexGridComponent, InfoPanelComponent, IntroComponent, MechanicsManualComponent, TutorialOverlayComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewChecked {
  game = inject(GameService);
  ai = inject(AiAdvisorService);
  audio = inject(AudioService);
  showIntro = signal(true);
  showManual = signal(false);
  isPanelCollapsed = signal(false);
  
  // Modals & Tooltips
  selectedBuff = signal<ActiveBuff | null>(null);
  showAiResultModal = signal(false);
  showBuffList = signal(false);
  hoveredSkill = signal<PlayerSkill | null>(null); 
  
  // Achievement UI State
  showAchievementModal = signal(false);
  selectedRarity = signal<AchievementRarity>('COMMON');
  selectedAchievement = signal<Achievement | null>(null);
  
  // Save/Load UI State
  showSaveLoadModal = signal(false);
  saveLoadMode = signal<'SAVE' | 'LOAD'>('SAVE');
  saveSlots = signal<SaveSlot[]>([]);
  selectedSaveSlot = signal<SaveSlot | null>(null);
  
  // Notification Toast
  currentNotification = signal<AchievementNotification | null>(null);

  @ViewChild('logContainer') private logContainer!: ElementRef;
  @ViewChild('skillContainer') private skillContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('saveNameInput') private saveNameInput!: ElementRef<HTMLInputElement>;

  // Computed: Skills sorted by cost
  readonly sortedSkills = computed(() => {
      return [...this.game.playerSkills()].sort((a, b) => a.cost - b.cost);
  });

  // Computed: Should the HTML backdrop be visible?
  // FIX: Only show backdrop for purely informational steps ('ANY_KEY').
  // For ANY step requiring user interaction (Buttons, Map, Skills, End Turn), we hide the backdrop completely.
  // This prevents z-index trapping issues where UI elements (like the Footer) are below the backdrop stack.
  readonly shouldShowTutorialBackdrop = computed(() => {
      const state = this.game.tutorialState();
      if (!state.active || !state.currentStep) return false;
      
      const step = state.currentStep;
      
      // If the user needs to perform ANY action other than reading text, do not show the dark overlay.
      if (step.waitForAction !== 'ANY_KEY') {
          return false;
      }

      // Even for ANY_KEY, if we are specifically highlighting map elements, let the Canvas handle the dimming.
      const mapHighlights = ['map', 'player-unit', 'enemy-unit'];
      if (step.highlightUi && mapHighlights.includes(step.highlightUi)) return false;

      return true;
  });

  factionStats = {
    Blue: [
      { name: '兵力 (NUMBERS)', value: 10 },
      { name: '火力 (FIREPOWER)', value: 3 },
      { name: '士气 (MORALE)', value: 9 },
      { name: '支援 (SUPPORT)', value: 2 },
      { name: '机动 (MOBILITY)', value: 2 },
    ],
    Red: [
      { name: '兵力 (NUMBERS)', value: 3 },
      { name: '火力 (FIREPOWER)', value: 10 },
      { name: '士气 (MORALE)', value: 7 },
      { name: '支援 (SUPPORT)', value: 8 },
      { name: '机动 (MOBILITY)', value: 7 },
    ]
  };

  @HostListener('window:keydown.p', ['$event'])
  @HostListener('window:keydown.escape', ['$event'])
  onPauseKey(event: KeyboardEvent) {
      if (this.showSaveLoadModal()) {
          this.closeSaveLoadModal();
          return;
      }
      if (this.showAchievementModal()) {
          this.closeAchievementModal();
          return;
      }
      if (this.showManual()) {
          this.showManual.set(false);
          return;
      }
      if (this.game.gameMode() !== 'MENU') {
          this.game.togglePause();
      }
  }

  ngOnInit() {
    this.game.notification$.subscribe(notif => {
        this.currentNotification.set(notif);
        setTimeout(() => {
            if (this.currentNotification() === notif) {
                this.currentNotification.set(null);
            }
        }, 4000);
    });
  }

  ngAfterViewChecked() {
    if (this.logContainer) this.logContainer.nativeElement.scrollTop = this.logContainer.nativeElement.scrollHeight;
  }

  onIntroComplete() { this.showIntro.set(false); }
  selectFaction(side: PlayerId) { this.game.startGame(side); }
  
  togglePanel() {
    this.isPanelCollapsed.update(v => !v);
  }

  onSkillScroll(event: WheelEvent) {
    event.preventDefault();
    if (this.skillContainer?.nativeElement) {
        const delta = event.deltaY || event.deltaX;
        this.skillContainer.nativeElement.scrollLeft += delta;
    }
  }

  private skillNeedsTarget(skill: PlayerSkill): boolean {
    if (skill.type === 'TACTICAL' || skill.type === 'REINFORCE') return true;
    const targetedBuffs = ['SIHANG_FLAG', 'AIR_DROP'];
    if (skill.type === 'BUFF' && targetedBuffs.includes(skill.id)) return true;
    return false;
  }

  async useSkill(skill: PlayerSkill) {
     if (this.isTutorialActionDisallowed('SKILL')) {
         this.game.event$.next({ type: 'ENCOUNTER', q: 0, r: 0, message: '教程中已禁用此操作' });
         return;
     }
     if (this.game.isUiLocked() || skill.cost > this.game.commandPoints() && !this.skillNeedsTarget(skill)) {
        if(skill.cost > this.game.commandPoints()) {
            this.game.event$.next({ type: 'ENCOUNTER', q: 0, r: 0, message: `CP不足: ${skill.name}` });
        }
        return;
    }

     const cooldownEnd = this.game.skillCooldowns().get(skill.id) || 0;
     if (this.game.turn() < cooldownEnd) return;

     if (skill.maxUses) {
         const used = this.game.skillUses().get(skill.id) || 0;
         if (used >= skill.maxUses) return;
     }

     if (this.skillNeedsTarget(skill)) {
         this.game.setSkillTargetingMode(skill);
     } else {
         if (this.game.spendCommandPoints(skill.cost)) {
             if (skill.type === 'AI_ANALYSIS') {
                 this.showAiResultModal.set(true);
                 this.ai.analysisResult.set('正在请求最高指挥部指示...');
                 await this.ai.analyzeBattlefield(this.game.units(), this.game.hexMap(), this.game.playerFaction());
             } else {
                 this.game.applySkillEffect(skill);
             }
         }
     }
     
     if (this.game.tutorialState().active) {
         this.game.advanceTutorial('SKILL');
     }
  }

  getSkillState(skill: PlayerSkill): { status: 'READY' | 'COOLDOWN' | 'DEPLETED' | 'ACTIVE', label: string, colorClass: string } {
      if (this.game.activeDoctrines().has(skill.id)) {
          return { status: 'ACTIVE', label: '已激活', colorClass: 'text-amber-400 border-amber-500' };
      }
      if (skill.maxUses) {
          const used = this.game.skillUses().get(skill.id) || 0;
          if (used >= skill.maxUses) return { status: 'DEPLETED', label: '耗尽', colorClass: 'text-stone-600 border-stone-800' };
      }
      const cooldownEnd = this.game.skillCooldowns().get(skill.id) || 0;
      if (this.game.turn() < cooldownEnd) {
          return { status: 'COOLDOWN', label: `${cooldownEnd - this.game.turn()}T`, colorClass: 'text-red-500 border-red-900' };
      }
      return { status: 'READY', label: '就绪', colorClass: 'text-emerald-400 border-emerald-600' };
  }
  
  getSkillTypeLabel(type: string): string {
      switch(type) {
          case 'AI_ANALYSIS': return '战术辅助';
          case 'BUFF': return '战略增益';
          case 'REINFORCE': return '增援部署';
          case 'TACTICAL': return '战术打击';
          case 'PASSIVE': return '被动光环';
          default: return type;
      }
  }

  isTutorialActionDisallowed(action: 'END_TURN' | 'SKILL'): boolean {
    const tutorial = this.game.tutorialState();
    if (tutorial.active && tutorial.currentStep?.restrictInteraction) {
        if (action === 'END_TURN') return tutorial.currentStep.key !== 'END_TURN';
        if (action === 'SKILL') return tutorial.currentStep.waitForAction !== 'SKILL' && tutorial.currentStep.waitForAction !== 'SKILL_TARGET';
    }
    return false;
  }

  handleTutorialBackdropClick() {
      if (!this.game.tutorialState().active) return;
      this.audio.playSfx('ERROR');
      this.game.event$.next({ type: 'ENCOUNTER', q: 0, r: 0, message: '请点击高亮区域' });
  }

  closeAiModal() { this.showAiResultModal.set(false); }

  openAchievementModal() {
      this.audio.playSfx('MUFFLED_CANNON');
      this.showAchievementModal.set(true);
      this.selectedRarity.set('COMMON');
      this.selectedAchievement.set(null);
  }

  closeAchievementModal() { this.showAchievementModal.set(false); }

  selectRarity(r: AchievementRarity) {
      this.audio.playSfx('MUFFLED_CANNON');
      this.selectedRarity.set(r);
      this.selectedAchievement.set(null);
  }

  selectAchievement(a: Achievement) {
      this.audio.playSfx('MUFFLED_CANNON');
      this.selectedAchievement.set(a);
  }

  readonly filteredAchievements = computed(() => {
      return this.game.achievements().filter(a => a.rarity === this.selectedRarity());
  });

  readonly rarityStats = computed(() => {
      const all = this.game.achievements();
      const getStats = (r: AchievementRarity, displayName: string, color: string, rate: string, desc: string): AchievementStats => {
          const subset = all.filter(a => a.rarity === r);
          const unlocked = subset.filter(a => a.isUnlocked).length;
          return { total: subset.length, unlocked, globalRate: rate, desc, color, displayName };
      };
      return {
          'COMMON': getStats('COMMON', '标准军功', '#a8a29e', '70%', '基础战术动作与累计数据'),
          'UNCOMMON': getStats('UNCOMMON', '卓越功绩', '#4ade80', '30%', '特定战役目标与微操技巧'),
          'RARE': getStats('RARE', '英勇行为', '#60a5fa', '10%', '以弱胜强与战术博弈'),
          'LEGENDARY': getStats('LEGENDARY', '不朽传奇', '#fbbf24', '0.5%', '逆天改命的战略奇迹'),
      };
  });

  openSaveLoad(mode: 'SAVE' | 'LOAD') {
      this.audio.playSfx('MUFFLED_CANNON');
      this.showSaveLoadModal.set(true);
      this.saveLoadMode.set(mode);
      this.saveSlots.set(this.game.getSlots());
      this.selectedSaveSlot.set(null);
  }

  closeSaveLoadModal() {
      this.showSaveLoadModal.set(false);
      this.selectedSaveSlot.set(null);
  }

  selectSlot(slot: SaveSlot) {
      if (this.saveLoadMode() === 'SAVE') {
          this.selectedSaveSlot.set(slot);
      } else {
          if (!slot.isEmpty) this.selectedSaveSlot.set(slot);
      }
  }

  doSave() {
      const slot = this.selectedSaveSlot();
      if (!slot) return;
      this.audio.playSfx('MUFFLED_CANNON');
      const nameInput = this.saveNameInput?.nativeElement.value.trim() || `Save Slot ${slot.id + 1}`;
      const success = this.game.saveGame(slot.id, nameInput);
      if (success) this.closeSaveLoadModal();
  }

  doLoad() {
      const slot = this.selectedSaveSlot();
      if (!slot || slot.isEmpty) return;
      this.audio.playSfx('MUFFLED_CANNON');
      const success = this.game.loadGame(slot.id);
      if (success) {
          this.closeSaveLoadModal();
          this.game.isPaused.set(false);
      }
  }

  doDelete() {
      const slot = this.selectedSaveSlot();
      if (!slot || slot.isEmpty) return;
      this.audio.playSfx('MUFFLED_CANNON');
      if (confirm('确认删除此存档？此操作不可逆。')) {
          this.game.deleteSave(slot.id);
          this.saveSlots.set(this.game.getSlots());
          this.selectedSaveSlot.set(null);
      }
  }
}
