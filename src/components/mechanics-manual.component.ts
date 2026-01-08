
import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type ManualSection = 'overview' | 'movement' | 'combat' | 'supply' | 'command' | 'events' | 'victory';

@Component({
  selector: 'app-mechanics-manual',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[6500] bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm animate-fade-in" (click)="close.emit()">
      <!-- Manual Container -->
      <div class="w-full max-w-6xl h-[90vh] bg-[#f5e6d3] border-[8px] border-[#2f1b14] relative shadow-2xl overflow-hidden flex" (click)="$event.stopPropagation()">
         
         <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-80 pointer-events-none z-0"></div>
         <div class="absolute top-24 right-16 border-8 border-red-800 text-red-800 p-4 transform rotate-12 opacity-30 z-0 pointer-events-none">
            <h2 class="text-8xl font-black font-calligraphy">绝 密</h2>
         </div>

         <!-- Sidebar Navigation -->
         <nav class="w-64 bg-[#2f1b14]/80 p-6 flex flex-col shrink-0 relative z-10 border-r-2 border-black">
            <header class="mb-8">
              <h1 class="text-2xl font-black uppercase tracking-widest mb-1 font-calligraphy text-amber-50">战地手册</h1>
              <div class="text-xs font-mono text-[#a8a29e] uppercase tracking-[0.2em]">v3.5</div>
            </header>
            <button (click)="activeSection.set('overview')" [class.active]="activeSection() === 'overview'">1. 概要</button>
            <button (click)="activeSection.set('movement')" [class.active]="activeSection() === 'movement'">2. 机动</button>
            <button (click)="activeSection.set('combat')" [class.active]="activeSection() === 'combat'">3. 战斗</button>
            <button (click)="activeSection.set('supply')" [class.active]="activeSection() === 'supply'">4. 补给</button>
            <button (click)="activeSection.set('command')" [class.active]="activeSection() === 'command'">5. 指挥</button>
            <button (click)="activeSection.set('events')" [class.active]="activeSection() === 'events'">6. 事件与增援</button>
            <button (click)="activeSection.set('victory')" [class.active]="activeSection() === 'victory'">7. 胜利条件</button>
            <div class="flex-1"></div>
            <button (click)="close.emit()" class="mt-auto !bg-red-800/50 hover:!bg-red-700 !text-amber-50">关闭 [ESC]</button>
         </nav>

         <!-- Main Content -->
         <main class="flex-1 overflow-y-auto p-12 font-serif text-[#3e2723] leading-relaxed relative z-10 custom-scrollbar text-base">
            @switch (activeSection()) {
              @case ('overview') {
                <section>
                  <h2 class="section-title">第一节：游戏目标与回合结构</h2>
                  <p>《赤色淞沪》是一款高拟真度的兵棋推演。胜利并非总是意味着歼灭所有敌人，更重要的是在历史的框架下达成战略目标。您的目标取决于您所选择的阵营：</p>
                  <ul class="list-disc space-y-2 pl-6 mt-4">
                      <li><strong>国民革命军 (Blue):</strong> 您的核心目标是 <strong>拖延时间</strong>。日军计划在三个月内占领上海，您必须不惜一切代价，坚守 <strong>54天 (216回合)</strong>。在此期间，任何对日军有生力量的消耗都将为您赢得宝贵的战略分数 (VP)。</li>
                      <li><strong>大日本帝国 (Red):</strong> 您的核心目标是 <strong>速战速决</strong>。必须在 216 回合的时限内，彻底击溃国军主力，并占领其指挥中枢所在的 <strong>闸北核心区 (Core_Zhabei)</strong>。</li>
                  </ul>
                  <h3 class="subsection-title">回合结构</h3>
                  <p>每回合代表 <strong>6小时</strong> 的真实时间。每天分为4个回合。其中，后两个回合为 <strong>夜间</strong>，会对所有单位的视野和战斗效率产生负面影响。一个完整的游戏日包含以下阶段：</p>
                  <ol class="list-decimal space-y-2 pl-6 mt-2 text-sm">
                      <li><strong>天气阶段:</strong> 系统随机判定天气（晴/雨/台风）。</li>
                      <li><strong>补给阶段:</strong> 系统判定所有单位是否处于补给状态。</li>
                      <li><strong>事件阶段:</strong> 触发与当前回合相关的历史事件。</li>
                      <li><strong>玩家行动阶段:</strong> 玩家指挥己方单位进行移动、攻击或使用技能。</li>
                      <li><strong>AI行动阶段:</strong> 电脑对手执行其回合。</li>
                  </ol>
                </section>
              }
              @case ('movement') {
                <section>
                  <h2 class="section-title">第二节：机动与控制</h2>
                  <p>机动是战术的灵魂。单位的移动能力由其 <strong>行动点 (AP)</strong> 决定。</p>
                  <ul class="list-disc space-y-4 pl-6 mt-4">
                      <li>
                        <strong>行动点 (AP):</strong> 每个单位在己方回合开始时恢复至最大AP。移动和攻击都会消耗AP。攻击固定消耗 <strong>5 AP</strong>。移动消耗的AP取决于地形。
                        <table class="manual-table">
                          <thead><tr><th>地形</th><th>AP消耗</th><th>备注</th></tr></thead>
                          <tbody>
                            <tr><td>平原</td><td>3</td><td>标准地形</td></tr>
                            <tr><td>城市</td><td>5</td><td>移动缓慢，但提供高防御</td></tr>
                            <tr><td>山地/丘陵</td><td>6</td><td>移动困难</td></tr>
                            <tr><td>沼泽</td><td>9</td><td>极度影响机动</td></tr>
                            <tr><td>铁路</td><td>2</td><td>战略运输线，机动速度快</td></tr>
                          </tbody>
                        </table>
                      </li>
                      <li>
                        <strong>控制区 (Zone of Control - ZOC):</strong> 任何单位的周围6个六角格均为其“控制区”。当一个敌方单位进入您的ZOC时，其 <strong>移动将强制停止</strong> (AP清零)，即使它仍有剩余AP。ZOC是构筑防线、阻止敌军突破的关键。部分精锐单位或特殊技能可以无视ZOC。
                      </li>
                      <li>
                        <strong>河流与障碍:</strong> 渡河会消耗大量AP，并有失败风险。部分技能可以在河流上架设浮桥，或通过沉船来永久性地阻塞航道。
                      </li>
                  </ul>
                </section>
              }
              @case ('combat') {
                <section>
                  <h2 class="section-title">第三节：战斗裁定流程 (v3.5)</h2>
                  <p class="mb-4">所有战斗均遵循以下严格的物理法则进行裁定。</p>
                  <div class="border-l-4 border-red-800 pl-4 py-2 bg-red-800/10 mb-4">
                    <h3 class="text-lg font-bold text-red-900">第零法则：跳弹 (不可违背)</h3>
                    <p class="text-sm">战斗裁定的第一步是检查物理穿透。若攻击方单位的 <strong>[穿透]</strong> 值小于或等于防御方单位的 <strong>[装甲]</strong> 值，则本次攻击判定为“跳弹”，防御方不会受到任何伤害。<strong>这是最高优先级的规则。</strong></p>
                  </div>
                  <ol class="list-decimal space-y-4 pl-6">
                      <li><strong>计算修正后战力:</strong> 根据兵力损耗、地形加成、补给状态和士气，计算双方的最终战力。</li>
                      <li><strong>判定火力比 (Odds):</strong> 双方战力比值决定了使用战果表的哪一列。</li>
                      <li><strong>掷骰并计算修正 (DRM):</strong> 投掷2D6，并加上支援、天气、地形等修正值。</li>
                      <li><strong>查询战果表 (CRT):</strong> 结合最终骰子点数和火力比，查找战斗结果。</li>
                      <li><strong>应用战果:</strong> 根据结果（如：攻击方后退、防御方受损等）更新单位状态。</li>
                  </ol>
                   <h3 class="subsection-title">掷骰修正 (DRM)</h3>
                    <p>在投掷2D6后，会根据战场态势加上修正值。这至关重要。</p>
                    <ul class="list-disc space-y-2 pl-6 mt-2 text-sm">
                      <li><strong class="text-green-800">正面修正 (对攻击方有利):</strong>
                        <ul class="list-circle pl-5">
                          <li>装甲支援 (+1)</li>
                          <li>航空支援 (+1 to +2)</li>
                          <li>海军舰炮支援 (+2)</li>
                          <li>侧翼夹击 (自动计算，效果显著)</li>
                        </ul>
                      </li>
                      <li><strong class="text-red-800">负面修正 (对攻击方不利):</strong>
                        <ul class="list-circle pl-5">
                          <li>夜间作战 (-2)</li>
                          <li>雨天 (-1)</li>
                          <li>背水一战 (-1)</li>
                          <li>巷战缺乏工兵 (-1)</li>
                        </ul>
                      </li>
                    </ul>
                   <div class="overflow-x-auto w-full mt-6">
                    <table class="manual-table text-xs">
                        <thead>
                            <tr><th>2D6</th><th>1:3</th><th>1:2</th><th>1:1</th><th>3:2</th><th>2:1</th><th>3:1</th><th>4:1</th></tr>
                        </thead>
                        <tbody>
                            @for(row of crtRows; track row.roll) {
                                <tr>
                                    <td>{{row.roll}}</td>
                                    @for(result of row.results; track $index) {
                                        <td [class]="getResultClass(result)">{{result}}</td>
                                    }
                                </tr>
                            }
                        </tbody>
                    </table>
                     <div class="mt-4 text-xs space-y-1">
                        <p><strong>战果代码释义:</strong></p>
                        <p><span class="font-bold text-red-800">AE</span>: Attacker Eliminated (攻击方被全歼)</p>
                        <p><span class="font-bold text-red-800">AR1/2</span>: Attacker Retreats (攻击方后退1或2格并受损)</p>
                        <p><span class="font-bold text-blue-800">DE</span>: Defender Eliminated (防御方被全歼)</p>
                        <p><span class="font-bold text-blue-800">DR1</span>: Defender Retreats (防御方后退1格并受损)</p>
                        <p><span class="font-bold text-blue-800">DD1/2</span>: Defender Disrupted (防御方原地受损并士气下降)</p>
                        <p><span class="font-bold text-stone-700">NE</span>: No Effect (无效果)</p>
                    </div>
                  </div>
                </section>
              }
              @case ('supply') {
                <section>
                  <h2 class="section-title">第四节：后勤与补给</h2>
                  <p>“外行谈战略，内行谈后勤。” 补给是维持军队战斗力的命脉。</p>
                   <ul class="list-disc space-y-4 pl-6 mt-4">
                      <li>
                        <strong>补给来源:</strong> 补给来源于 <strong>指挥部 (HQ)</strong> 或 <strong>补给基地 (Supply Depot)</strong>。
                      </li>
                      <li>
                        <strong>补给线:</strong> 单位只要与一个有效的补给来源之间存在一条不超过 <strong>12个六角格</strong> 且未被敌军ZOC阻断的路径，即被视为“已补给”。
                      </li>
                       <li>
                        <strong>补给惩罚:</strong> 处于“未补给”状态的单位，其 <strong>全部作战效能（攻防战力）均减半 (x0.5)</strong>。连续3回合未补给，单位将开始损失兵力。
                      </li>
                       <li>
                        <strong>焦土战术:</strong> 部分技能允许您摧毁某个区域的补给能力（焦土），进入该区域的任何敌军都将立即陷入“未补给”状态。
                      </li>
                  </ul>
                </section>
              }
              @case ('command') {
                <section>
                  <h2 class="section-title">第五节：指挥与战术</h2>
                  <p>作为指挥官，您可以通过消耗 <strong>指挥点数 (Command Points - CP)</strong> 来发动强大的指挥官技能，扭转战局。</p>
                   <ul class="list-disc space-y-4 pl-6 mt-4">
                      <li>
                        <strong>获取指挥点数 (CP):</strong>
                        <ul class="list-circle pl-5 mt-2 space-y-1">
                          <li>每回合开始时自动获得少量CP。</li>
                          <li>占领地图上带有VP标记的关键区域。</li>
                          <li>达成特定战术目标（如全歼敌军、触发历史事件）。</li>
                          <li>由特定单位或技能提供。</li>
                        </ul>
                      </li>
                      <li>
                        <strong>使用技能:</strong> 游戏界面下方的指挥台会显示您当前可用的技能卡牌。点击卡牌即可发动。技能种类繁多，包括：
                        <ul class="list-circle pl-5 mt-2 space-y-1">
                          <li><strong>战术打击 (Tactical):</strong> 如呼叫“八一四空袭”对指定地点进行轰炸。</li>
                          <li><strong>战略增益 (Buff):</strong> 如发动“罗店血誓”，强化特定区域的防御。</li>
                          <li><strong>增援 (Reinforce):</strong> 如使用“川军增援”，在地图上召唤新的作战单位。</li>
                          <li><strong>战术辅助 (AI Analysis):</strong> 如“校长手令”，请求AI对当前局势进行分析并提供建议。</li>
                        </ul>
                      </li>
                  </ul>
                </section>
              }
               @case ('events') {
                <section>
                  <h2 class="section-title">第六节：历史事件与增援</h2>
                  <p>战争的进程并非完全由您掌控。在特定回合，游戏将触发与真实历史进程相对应的 <strong>历史事件</strong>，这可能会极大地改变战场局势。</p>
                  <ul class="list-disc space-y-4 pl-6 mt-4">
                    <li>
                      <strong>触发机制:</strong> 事件根据 <strong>回合数</strong> 自动触发。例如，“八一四空战”会在游戏初期发生，而“金山卫登陆”则会在后期出现。
                    </li>
                    <li>
                      <strong>事件影响:</strong>
                      <ul class="list-circle pl-5 mt-2 space-y-2">
                        <li><strong>战略增益 (Buffs):</strong> 许多事件会为一方提供有时限的强大增益。例如，“国共合作”事件会在前几回合为国军提供 <strong class="text-green-800">全属性加成</strong>。</li>
                        <li><strong>战略减益 (Debuffs):</strong> 事件也可能带来负面影响，如“大场失守”会导致国军 <strong class="text-red-800">全线撤退</strong>，防御力下降。</li>
                        <li><strong>改变局势:</strong> 部分事件会解锁新的地图区域，或改变地形（如“沉船封江”）。</li>
                      </ul>
                    </li>
                    <li>
                      <strong>增援 (Reinforcements):</strong> 许多关键事件会伴随着 <strong>援军</strong> 的到来。这些单位会作为历史增援，在地图上的特定地点（如吴淞口、金山卫）或您指定的区域出现，为您的战线注入新的力量。密切关注事件预告，以便为援军的到来做好准备。
                    </li>
                  </ul>
                </section>
              }
              @case ('victory') {
                <section>
                  <h2 class="section-title">第七节：胜利与失败</h2>
                  <p>您的最终成败取决于您是否达成了阵营的战略目标。</p>
                  
                  <h3 class="subsection-title">国民革命军 (Blue) 胜利条件</h3>
                  <ul class="list-disc space-y-2 pl-6 mt-2">
                    <li><strong>战略胜利 (时间):</strong> 核心目标是生存。如果您能成功阻止日军的速攻计划，坚守至 <strong>第216回合</strong> 结束，您就获得了战略上的胜利。</li>
                    <li><strong>歼灭胜利:</strong> 极其困难，但如果您能彻底消灭地图上所有的日军作战单位，您将获得压倒性的完胜。</li>
                  </ul>

                  <h3 class="subsection-title">大日本帝国 (Red) 胜利条件</h3>
                  <ul class="list-disc space-y-2 pl-6 mt-2">
                    <li><strong>战术胜利 (目标):</strong> 您的核心目标是在 <strong>216回合内</strong> 攻占并肃清国军在上海的指挥核心区 <strong>“闸北 (Core_Zhabei)”</strong>。一旦达成，国军指挥系统崩溃，您即获得胜利。</li>
                    <li><strong>歼灭胜利:</strong> 如果您能在时限内全歼国军所有作战单位，同样视为胜利。</li>
                  </ul>

                  <h3 class="subsection-title">胜利点数 (VP) 与评价</h3>
                  <p class="mt-2">除了基本的胜负，您的表现将通过 <strong>胜利点数 (VP)</strong> 进行评价。VP主要通过以下方式获得：</p>
                  <ul class="list-disc space-y-2 pl-6 mt-2 text-sm">
                    <li>摧毁敌方单位（高价值单位提供更多VP）。</li>
                    <li>占领并控制地图上标有VP符号的关键地点。</li>
                    <li>完成特定技能或事件的目标。</li>
                  </ul>
                  <p class="mt-2">战役结束时，VP将决定您的最终评级，从 B 到 S+ 不等。改写历史，达成不可能的奇迹，将为您赢得最高荣誉。</p>
                </section>
              }
            }
         </main>

      </div>
    </div>
  `,
  styles: [`
    nav button {
      display: block; width: 100%; text-align: left;
      padding: 0.75rem 1rem; margin-bottom: 0.5rem;
      font-family: 'Courier Prime', monospace; font-weight: bold;
      color: #a8a29e;
      border-left: 4px solid transparent;
      transition: all 0.2s;
    }
    nav button:hover {
      background-color: rgba(255,255,255,0.05);
      color: #fff;
    }
    nav button.active {
      background-color: rgba(251, 191, 36, 0.1);
      color: #fbbf24;
      border-left-color: #fbbf24;
    }
    .section-title {
      font-size: 1.75rem; font-weight: 900;
      text-transform: uppercase; color: #7f1d1d;
      border-bottom: 2px solid rgba(127, 29, 29, 0.5);
      padding-bottom: 0.5rem; margin-bottom: 1rem;
    }
    .subsection-title {
      font-size: 1.25rem; font-weight: 700;
      color: #5d4037; margin-top: 1.5rem; margin-bottom: 0.5rem;
    }
    .manual-table {
      width: 100%; margin-top: 0.5rem; font-size: 0.8rem;
      border-collapse: collapse; border: 1px solid #8d6e63;
    }
    .manual-table th, .manual-table td {
      border: 1px solid #8d6e63; padding: 0.5rem;
    }
    .manual-table thead { background-color: #eaddcf; font-weight: bold; }
    .manual-table tbody tr:nth-child(even) { background-color: rgba(0,0,0,0.02); }

    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #d7ccc8; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #5d4037; border: 1px solid #2f1b14; }

    /* For list styling inside manual content */
    .list-circle { list-style-type: circle; }
  `]
})
export class MechanicsManualComponent {
  @Output() close = new EventEmitter<void>();

  activeSection = signal<ManualSection>('overview');

  protected readonly crtRows = Object.entries({
      2:  ['AE',  'AE',  'AR2', 'DR1', 'DR1', 'DD2', 'DE'],
      3:  ['AE',  'AR2', 'AR1', 'DR1', 'DR1', 'DD2', 'DE'],
      4:  ['AE',  'AR2', 'AR1', 'DR1', 'DR1', 'DD2', 'DE'],
      5:  ['AR2', 'AR1', 'DR1', 'DR1', 'DD1', 'DD2', 'DE'],
      6:  ['AR2', 'AR1', 'DR1', 'DR1', 'DD1', 'DD2', 'DE'],
      7:  ['AR1', 'DR1', 'DR1', 'DD1', 'DD1', 'DD2', 'DE'],
      8:  ['AR1', 'DR1', 'DR1', 'DD1', 'DD1', 'DD2', 'DE'],
      9:  ['DR1', 'DR1', 'DD1', 'DD1', 'DD2', 'DE',  'DE'],
      10: ['DR1', 'DR1', 'DD1', 'DD1', 'DD2', 'DE',  'DE'],
      11: ['DR1', 'DD1', 'DD1', 'DD2', 'DE',  'DE',  'DE'],
      12: ['DD1', 'DD1', 'DD2', 'DE',  'DE',  'DE',  'DE']
  }).map(([roll, results]) => ({ roll: parseInt(roll), results }));

  protected getResultClass(result: string): string {
    if (result.startsWith('A')) return 'bg-red-800/20 text-red-900 font-bold';
    if (result.startsWith('D')) return 'bg-blue-800/20 text-blue-900 font-bold';
    return 'text-stone-700';
  }
}
