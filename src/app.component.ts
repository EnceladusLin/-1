
import { Component, inject, signal, OnInit, ElementRef, ViewChild, AfterViewChecked, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Ensure FormsModule is here if needed, but manual binding is safer in strict zoneless
import { HexGridComponent } from './components/hex-grid.component';
import { InfoPanelComponent } from './components/info-panel.component';
import { IntroComponent } from './components/intro.component';
import { MechanicsManualComponent } from './components/mechanics-manual.component';
import { TutorialOverlayComponent } from './components/tutorial-overlay.component';
import { GameService } from './services/game.service';
import { AiAdvisorService } from './services/ai-advisor.service';
import { PlayerId, ActiveBuff, PlayerSkill, GameEventType, Achievement, AchievementRarity, AchievementStats, AchievementNotification, SaveSlot } from './types';

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
  showIntro = signal(true);
  showManual = signal(false);
  battleLogs = signal<string[]>([]);
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

  // Computed: Skills sorted by cost (Low -> High)
  readonly sortedSkills = computed(() => {
      return [...this.game.playerSkills()].sort((a, b) => a.cost - b.cost);
  });

  // Data for the new faction selection screen
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

  getSegments(value: number) {
    return Array.from({ length: 10 }, (_, i) => i < value);
  }

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
      if (this.game.gameMode() !== 'MENU') {
          this.game.togglePause();
      }
  }

  ngOnInit() {
    const eventTypeMap: { [key in GameEventType]?: string } = {
        'ATTACK': '战斗',
        'EXPLOSION': '爆炸',
        'SCAN_PING': '情报',
        'RICOCHET': '跳弹',
        'DESTRUCTION': '单位摧毁',
        'REINFORCEMENT': '增援',
        'ATROCITY': '惨案',
        'ENCOUNTER': '遭遇',
        'REGION_UNLOCK': '区域解锁',
        'MORALE_BREAK': '士气崩溃',
        'WEATHER_CHANGE': '天气变化',
        'SUPPLY_CHECK': '补给检定',
        'SMOKE': '未命中'
    };

    this.game.event$.subscribe(evt => {
       if (evt.type === 'MOVE') {
           return; // Suppress move events from log
       }
       const ts = new Date().toLocaleTimeString();
       const eventName = eventTypeMap[evt.type] || evt.type;
       const msg = `[${ts}] ${eventName}: ${evt.message || '行动记录'}`;
       this.battleLogs.update(logs => [...logs.slice(-50), msg]);
    });

    // Achievement Subscription
    this.game.notification$.subscribe(notif => {
        this.currentNotification.set(notif);
        // Auto dismiss after 4 seconds
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
    // Allows horizontal scrolling of the skill bar with the mouse wheel
    event.preventDefault();
    this.skillContainer.nativeElement.scrollLeft += event.deltaY;
  }

  private skillNeedsTarget(skill: PlayerSkill): boolean {
    if (skill.type === 'TACTICAL' || skill.type === 'REINFORCE') {
        return true;
    }
    // Specific BUFF skills that need a target unit
    const targetedBuffs = ['SIHANG_FLAG', 'AIR_DROP'];
    if (skill.type === 'BUFF' && targetedBuffs.includes(skill.id)) {
        return true;
    }
    return false;
  }

  // --- SKILL SYSTEM ---
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
  
  // Helpers for the tooltip template
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
        if (action === 'END_TURN') {
            return tutorial.currentStep.key !== 'END_TURN';
        }
        if (action === 'SKILL') {
            // Allow if step specifically asks for SKILL action
            return tutorial.currentStep.waitForAction !== 'SKILL';
        }
    }
    return false;
  }

  closeAiModal() {
      this.showAiResultModal.set(false);
  }

  // --- ACHIEVEMENT UI LOGIC ---
  openAchievementModal() {
      this.showAchievementModal.set(true);
      this.selectedRarity.set('COMMON'); // Default
      this.selectedAchievement.set(null);
  }

  closeAchievementModal() {
      this.showAchievementModal.set(false);
  }

  selectRarity(r: AchievementRarity) {
      this.selectedRarity.set(r);
      this.selectedAchievement.set(null);
  }

  selectAchievement(a: Achievement) {
      this.selectedAchievement.set(a);
  }

  // Computed helper for the achievements grid
  readonly filteredAchievements = computed(() => {
      return this.game.achievements().filter(a => a.rarity === this.selectedRarity());
  });

  readonly rarityStats = computed(() => {
      const all = this.game.achievements();
      
      const getStats = (r: AchievementRarity, label: string, color: string, bg: string, border: string, text: string, rate: string, desc: string): AchievementStats => {
          const subset = all.filter(a => a.rarity === r);
          const unlocked = subset.filter(a => a.isUnlocked).length;
          return { total: subset.length, unlocked, globalRate: rate, desc, color, bgClass: bg, borderClass: border, textClass: text };
      };

      return {
          'COMMON': getStats('COMMON', '普通', '#d6d3d1', 'bg-[#d6d3d1]', 'border-[#a8a29e]', 'text-[#292524]', '70%', '基础战术动作与累计数据'),
          'UNCOMMON': getStats('UNCOMMON', '罕见', '#4ade80', 'bg-[#22c55e]', 'border-[#16a34a]', 'text-[#052e16]', '30%', '特定战役目标与微操技巧'),
          'RARE': getStats('RARE', '稀有', '#60a5fa', 'bg-[#3b82f6]', 'border-[#2563eb]', 'text-[#172554]', '10%', '以弱胜强与战术博弈'),
          'EPIC': getStats('EPIC', '史诗', '#c084fc', 'bg-[#a855f7]', 'border-[#9333ea]', 'text-[#3b0764]', '3%', '极难达成的历史节点'),
          'LEGENDARY': getStats('LEGENDARY', '传说', '#fbbf24', 'bg-[#fbbf24]', 'border-[#d97706]', 'text-[#451a03]', '0.5%', '逆天改命的战略奇迹'),
      };
  });

  // --- SAVE/LOAD SYSTEM ---
  openSaveLoad(mode: 'SAVE' | 'LOAD') {
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
          // In save mode, we always select to potentially overwrite or fill
          this.selectedSaveSlot.set(slot);
      } else {
          // In load mode, can only select if not empty
          if (!slot.isEmpty) {
              this.selectedSaveSlot.set(slot);
          }
      }
  }

  doSave() {
      const slot = this.selectedSaveSlot();
      if (!slot) return;
      const nameInput = this.saveNameInput?.nativeElement.value.trim() || `Save Slot ${slot.id + 1}`;
      
      const success = this.game.saveGame(slot.id, nameInput);
      if (success) {
          this.closeSaveLoadModal();
      }
  }

  doLoad() {
      const slot = this.selectedSaveSlot();
      if (!slot || slot.isEmpty) return;
      
      const success = this.game.loadGame(slot.id);
      if (success) {
          this.closeSaveLoadModal();
          this.game.isPaused.set(false); // Resume after load
      }
  }

  doDelete() {
      const slot = this.selectedSaveSlot();
      if (!slot || slot.isEmpty) return;
      if (confirm('确认删除此存档？此操作不可逆。')) {
          this.game.deleteSave(slot.id);
          this.saveSlots.set(this.game.getSlots()); // Refresh
          this.selectedSaveSlot.set(null);
      }
  }
}
