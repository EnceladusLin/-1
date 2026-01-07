
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mechanics-manual',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm" (click)="close.emit()">
      <!-- Manual Container -->
      <div class="w-full max-w-5xl h-[85vh] bg-[#f5e6d3] border-[8px] border-[#2f1b14] relative shadow-2xl overflow-hidden flex flex-col" (click)="$event.stopPropagation()">
         
         <!-- Paper Texture & Stamp -->
         <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-80 pointer-events-none z-0"></div>
         <div class="absolute inset-0 bg-noise opacity-10 pointer-events-none z-0"></div>
         <div class="absolute top-24 right-16 border-8 border-red-800 text-red-800 p-4 transform rotate-12 opacity-30 z-0 pointer-events-none">
            <h2 class="text-8xl font-black font-calligraphy">绝 密</h2>
         </div>

         <!-- Header -->
         <header class="bg-[#2f1b14] p-6 text-[#f5e6d3] relative z-10 border-b-4 border-[#b91c1c] shrink-0">
            <button (click)="close.emit()" class="absolute top-5 right-5 text-3xl font-black text-[#f5e6d3]/60 hover:text-white transition-colors">✕</button>
            <h1 class="text-4xl font-black uppercase tracking-widest mb-1 font-calligraphy">战场手册</h1>
            <div class="text-xs font-mono text-[#a8a29e] uppercase tracking-[0.3em]">核心战斗裁定流程 v3.5</div>
         </header>

         <!-- Content -->
         <div class="flex-1 overflow-y-auto p-12 font-serif text-[#3e2723] leading-relaxed relative z-10 custom-scrollbar text-base">
            
            <!-- SECTION 1: CORE COMBAT LOOP -->
            <section>
                <h2 class="text-3xl font-black uppercase text-[#8b0000] border-b-2 border-[#8b0000]/50 pb-2 mb-4">
                    第一节：战斗裁定流程
                </h2>
                <p>所有战斗均遵循以下严格的五步流程进行裁定，以确保模拟的真实性。指挥官必须熟悉每一步，才能做出最优决策。</p>
                <ol class="list-decimal space-y-4 pl-6 mt-4">
                    <li>
                        <strong>计算修正后战力 (C-Value)</strong>
                        <p class="text-sm">首先确定攻击方与防御方的基础战力，并根据战场态势进行修正：</p>
                        <ul class="list-disc pl-5 text-sm space-y-2 mt-2">
                            <li><strong>兵力损耗:</strong> 战力按剩余兵力步数 (Steps) 与最大步数的比例进行缩减。</li>
                            <li><strong>地形加成 (仅防御方):</strong> 防御方战力将乘以所在六角格的地形防御倍率 (例如：城市 x1.5)。</li>
                            <li><strong>补给状态:</strong> 任何“未补给”单位的最终战力 <strong>减半 (x0.5)</strong>。</li>
                            <li><strong>士气影响:</strong> 单位士气 (0-100) 会对战力产生 0.5x 至 1.5x 的动态修正。士气低落的部队不堪一击。</li>
                        </ul>
                    </li>
                    <li>
                        <strong>判定火力比 (Odds)</strong>
                        <p class="text-sm">将攻击方修正后战力除以防御方修正后战力，得出火力比，并将其归入最近的战果表 (CRT) 列。火力比越高，对攻击方越有利。</p>
                        <p class="text-xs font-mono bg-[#eaddcf]/70 p-2 border border-dashed border-[#8d6e63]">火力比列: [1:3], [1:2], [1:1], [3:2], [2:1], [3:1], [4:1]</p>
                    </li>
                    <li>
                        <strong>掷骰并计算修正 (DRM)</strong>
                        <p class="text-sm">投掷两枚六面骰 (2D6)，并将结果与以下骰子结果修正值 (DRM) 相加减。最终结果被限制在 2 到 12 之间。</p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 text-sm mt-2">
                            <div>
                                <h4 class="font-bold text-green-800">攻击方优势 (DRM为正)</h4>
                                <ul class="list-disc pl-5">
                                    <li>装甲支援: <strong>+1</strong></li>
                                    <li>航空支援: <strong>+2</strong></li>
                                    <li>舰炮支援: <strong>+2</strong></li>
                                </ul>
                            </div>
                            <div>
                                <h4 class="font-bold text-red-800">攻击方劣势 (DRM为负)</h4>
                                <ul class="list-disc pl-5">
                                    <li>防御方背水一战: <strong>-1</strong></li>
                                    <li>防御方顽强抵抗: <strong>-1</strong></li>
                                    <li>巷战无工兵支援: <strong>-1</strong></li>
                                    <li>夜间作战: <strong>-2</strong></li>
                                </ul>
                            </div>
                        </div>
                        <p class="text-xs font-mono bg-[#eaddcf]/70 p-2 border border-dashed border-[#8d6e63] mt-2">注意: 总修正值被限制在 <strong>-2</strong> 到 <strong>+4</strong> 之间。</p>
                    </li>
                    <li>
                        <strong>查询战果表 (CRT)</strong>
                        <p class="text-sm">使用“最终骰子结果”作为行，“火力比”作为列，在下面的标准战果表中查找战斗结果。</p>
                    </li>
                    <li>
                        <strong>最终裁定：跳弹法则 (不可违背)</strong>
                        <p class="text-base text-[#7f1d1d] font-bold mt-1 border-l-4 border-[#7f1d1d] pl-3">
                            无论CRT结果如何，若攻击方单位的 [穿透] 值小于或等于防御方单位的 [装甲] 值，则本次攻击判定为“跳弹”，防御方不会受到任何伤害、撤退或士气损失。
                        </p>
                    </li>
                </ol>
            </section>

            <!-- SECTION 2: DATA & EXAMPLES -->
            <section class="mt-12">
                <h2 class="text-3xl font-black uppercase text-[#8b0000] border-b-2 border-[#8b0000]/50 pb-2 mb-4">
                    第二节：数据指标详解
                </h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <!-- Column 1: Stats Definition -->
                    <div>
                        <h3 class="font-bold text-lg mb-2 text-[#5d4037]">核心数据定义</h3>
                        <ul class="space-y-4 text-sm">
                            <li class="bg-[#eaddcf] p-3 border-l-4 border-blue-800">
                                <strong class="text-blue-900 block">对软攻击 (Soft Attack)</strong>
                                <span>针对步兵、卡车、火炮等无防护目标的杀伤效率。绝大多数国军单位属于“软目标”。</span>
                            </li>
                            <li class="bg-[#eaddcf] p-3 border-l-4 border-red-800">
                                <strong class="text-red-900 block">对硬攻击 (Hard Attack)</strong>
                                <span>针对坦克、装甲车、掩体等重装甲目标的杀伤效率。只有反坦克炮、坦克主炮拥有较高的此数值。</span>
                            </li>
                            <li class="bg-[#eaddcf] p-3 border-l-4 border-[#1c1917]">
                                <strong class="text-[#1c1917] block">穿透 (Penetration) vs 装甲 (Armor)</strong>
                                <span>二元判定机制。如果攻击者的穿透值 <strong>&le;</strong> 防御者的装甲值，伤害强制为0（跳弹）。<br>
                                <em class="text-xs opacity-75">例：步枪（穿透1）无法击穿 九五式坦克（装甲2）。</em></span>
                            </li>
                            <li class="bg-[#eaddcf] p-3 border-l-4 border-yellow-700">
                                <strong class="text-yellow-900 block">行动点 (AP)</strong>
                                <span>移动与攻击的货币。攻击固定消耗 <strong>5 AP</strong>。这意味着大部分步兵（AP=16）在复杂地形移动后，往往没有足够的体力发起攻击。</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Column 2: Unit Roles -->
                    <div>
                        <h3 class="font-bold text-lg mb-2 text-[#5d4037]">兵种战术定位</h3>
                        <div class="space-y-3 text-sm">
                            <div>
                                <h4 class="font-bold border-b border-[#a1887f] mb-1">🛡️ 步兵 (Infantry)</h4>
                                <p><strong>战场骨干。</strong> 拥有均衡的软攻，是占领阵地和巷战的主力。但在开阔地面对火炮和坦克时极为脆弱。</p>
                            </div>
                            <div>
                                <h4 class="font-bold border-b border-[#a1887f] mb-1">🚜 装甲 (Armor)</h4>
                                <p><strong>突破之矛。</strong> 高装甲使其免疫轻武器伤害。必须在开阔地使用，进入城市或沼泽会失去优势。缺乏步兵掩护时易被侧袭。</p>
                            </div>
                            <div>
                                <h4 class="font-bold border-b border-[#a1887f] mb-1">💥 火炮 (Artillery)</h4>
                                <p><strong>火力之王。</strong> 极高的对软攻击，能瞬间蒸发步兵集群。由于自身极其脆弱（HP低），必须部署在战线后方。</p>
                            </div>
                            <div>
                                <h4 class="font-bold border-b border-[#a1887f] mb-1">🚢 海军 (Naval)</h4>
                                <p><strong>战略支柱。</strong> 提供覆盖全图的舰炮支援（增加骰子点数），且其自身无法被陆军攻击。切断日军补给线的关键。</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- SECTION 3: COMBAT SCENARIOS -->
            <section class="mt-12 bg-[#eaddcf] p-6 border border-[#5d4037] shadow-inner">
                <h2 class="text-2xl font-black uppercase text-[#8b0000] mb-4">
                    战术实例演算
                </h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <!-- Scenario A: Fail -->
                    <div>
                        <h4 class="font-bold text-base mb-2">案例 A：无效攻击 (跳弹)</h4>
                        <div class="text-xs font-mono space-y-1 mb-2 text-[#5d4037]">
                            <div>攻击方: 国军步兵师 (穿透: 1, 对硬: 2)</div>
                            <div>防御方: 日军89式中战车 (装甲: 3)</div>
                        </div>
                        <p class="text-sm">
                            国军步兵试图在平原攻击日军坦克。虽然步兵可能有兵力优势，但其 <strong>[穿透 1]</strong> 小于坦克的 <strong>[装甲 3]</strong>。
                            <br><br>
                            <span class="bg-red-200 text-red-900 px-1 font-bold">结果：</span> 攻击判定为跳弹。无论骰子点数多高，造成伤害均为 0。步兵白白消耗 5 AP。
                        </p>
                    </div>

                    <!-- Scenario B: Success -->
                    <div>
                        <h4 class="font-bold text-base mb-2">案例 B：毁灭性打击</h4>
                        <div class="text-xs font-mono space-y-1 mb-2 text-[#5d4037]">
                            <div>攻击方: 日军重炮联队 (对软: 15) + 航空支援</div>
                            <div>防御方: 国军步兵师 (无地形掩护)</div>
                        </div>
                        <p class="text-sm">
                            重炮轰击开阔地的步兵。步兵属于“软目标”，适用攻击方的 <strong>[对软 15]</strong>。
                            <br><br>
                            <span class="bg-red-200 text-red-900 px-1 font-bold">结果：</span> 极高的攻击力加上航空支援提供的 +2 骰子修正，极大概率掷出“10+”点数，导致防御方直接 <strong>[DE] (全军覆没)</strong> 或严重溃退。
                        </p>
                    </div>
                </div>
            </section>

            <!-- SECTION 4: CRT TABLE -->
            <section class="mt-12">
                <h2 class="text-3xl font-black uppercase text-[#8b0000] border-b-2 border-[#8b0000]/50 pb-2 mb-4">
                    附录：标准战果表 (CRT)
                </h2>
                <div class="overflow-x-auto w-full mt-4">
                    <table class="w-full text-center text-xs font-mono border-collapse border border-[#5d4037]">
                        <thead>
                            <tr class="bg-[#2f1b14] text-[#f5e6d3]">
                                <th class="border border-[#5d4037] p-2">2D6 掷骰</th>
                                @for(col of crtColumns; track col) {
                                    <th class="border border-[#5d4037] p-2">{{col}}</th>
                                }
                            </tr>
                        </thead>
                        <tbody class="bg-[#eaddcf]/50">
                            @for(row of crtRows; track row.roll) {
                                <tr class="hover:bg-[#d7ccc8]">
                                    <td class="border border-[#5d4037] p-2 font-bold">{{row.roll}}</td>
                                    @for(result of row.results; track $index) {
                                        <td class="border border-[#5d4037] p-2" [class]="getResultClass(result)">{{result}}</td>
                                    }
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
                <div class="mt-4 text-xs">
                    <h4 class="font-bold">结果代码说明:</h4>
                    <ul class="list-disc pl-5">
                        <li><span class="font-bold text-red-700">AE:</span> 攻击方被消灭 (Attacker Eliminated)</li>
                        <li><span class="font-bold text-red-700">AR1/2:</span> 攻击方后退1/2格并受损 (Attacker Retreat)</li>
                        <li><span class="font-bold text-blue-700">DR1:</span> 防御方后退1格并受损 (Defender Retreat)</li>
                        <li><span class="font-bold text-blue-700">DD1/2:</span> 防御方受损并士气打击，但不后退 (Defender Disrupted)</li>
                        <li><span class="font-bold text-blue-700">DE:</span> 防御方被消灭 (Defender Eliminated)</li>
                        <li><span class="font-bold">NE:</span> 无效果 (No Effect)</li>
                    </ul>
                </div>
            </section>
         </div>
         
         <!-- Footer -->
         <footer class="p-4 bg-[#d7ccc8]/80 border-t border-[#5d4037] text-center text-xs text-[#5d4037] italic relative z-10 shrink-0">
            "Flesh and blood against steel." // 血肉磨坊，钢铁洪流
         </footer>
      </div>
    </div>
  `,
  styles: [`
    .bg-noise {
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.1'/%3E%3C/svg%3E");
    }
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #d7ccc8; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #5d4037; border: 1px solid #2f1b14; }
  `]
})
export class MechanicsManualComponent {
  @Output() close = new EventEmitter<void>();

  // Expose data to the template
  protected readonly crtColumns = ['1:3', '1:2', '1:1', '3:2', '2:1', '3:1', '4:1'];
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

  // Helper to color-code results in the CRT
  protected getResultClass(result: string): string {
    if (result.startsWith('A')) return 'text-red-800 font-bold';
    if (result.startsWith('D')) return 'text-blue-800 font-bold';
    return 'text-stone-700';
  }
}