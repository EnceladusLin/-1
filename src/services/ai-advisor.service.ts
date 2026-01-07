
import { Injectable, signal, inject } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { Unit, HexCell, PlayerId } from '../types';
import { GameService } from './game.service';

@Injectable({
  providedIn: 'root'
})
export class AiAdvisorService {
  private game = inject(GameService);
  isAnalyzing = signal(false);
  analysisResult = signal<string>('');
  analysisTitle = signal('Tactical Analysis // 战术推演');

  private generateLocalChiangAdvice(units: Unit[], map: Map<string, HexCell>): string {
    const myUnits = units.filter(u => u.owner === 'Blue');
    const enemyUnits = units.filter(u => u.owner === 'Red');
    let admonishments: string[] = [];
    let directives: string[] = [];

    // --- 1. 娘希匹 Trigger (Ricochet / Inefficiency) ---
    for (const u of myUnits) {
        if (u.ap < 5) continue; 
        const attackableEnemies = enemyUnits.filter(e => this.game.getDistance(u, e) <= u.range);
        for (const e of attackableEnemies) {
            if (e.armor > 0 && u.penetration <= e.armor) {
                admonishments.push(`娘希匹！第${u.id.substring(0,4)}部的主官是饭桶吗？拿步枪去打日本人的铁王八！`);
                directives.push(`手令：${u.id.substring(0,4)}部即刻停止攻击装甲目标，寻找软肋，否则军法从事！`);
                break;
            }
        }
        if (admonishments.length > 0) break;
    }

    // --- 2. Low Morale (Cowardice) ---
    if (admonishments.length === 0) {
        const lowMoraleUnits = myUnits.filter(u => u.morale < 40);
        for (const u of lowMoraleUnits) {
            const isNearEnemy = enemyUnits.some(e => this.game.getDistance(u, e) <= 3);
            if (isNearEnemy) {
                admonishments.push(`我早就说过，平时多流汗，战时少流血。第${u.id.substring(0,4)}部竟敢临阵动摇，成何体统！`);
                directives.push(`手令：${u.id.substring(0,4)}部死守待援，敢有后退半步者，杀无赦。`);
                break;
            }
        }
    }
    
    // --- 3. Flanking Opportunity (Micro-management) ---
    if (admonishments.length === 0) {
        for (const enemy of enemyUnits) {
            const adjacentFriendlies = this.game.getNeighbors(enemy.q, enemy.r)
                .map(n => this.game.getUnitAt(n.q, n.r))
                .filter(u => u && u.owner === 'Blue');
            
            if (adjacentFriendlies.length === 1) { // Potential flank
                const potentialFlankers = myUnits.filter(u => 
                    u.id !== adjacentFriendlies[0]?.id &&
                    !u.hasMoved && 
                    u.ap > 3
                );
                for (const flanker of potentialFlankers) {
                    const reachable = this.game.calculateReachableHexes(flanker);
                    const flankingPositions = this.game.getNeighbors(enemy.q, enemy.r)
                        .filter(n => !this.game.getUnitAt(n.q, n.r)); // Empty neighbor hexes
                    
                    const possibleMove = flankingPositions.find(p => reachable.has(`${p.q},${p.r}`));
                    if (possibleMove) {
                        admonishments.push(`战机稍纵即逝！这种时候还要我亲自打电话来教怎么打仗吗？`);
                        directives.push(`手令：令${flanker.id.substring(0,4)}部火速机动至[${possibleMove.q},${possibleMove.r}]，务必形成夹击态势！`);
                        break;
                    }
                }
            }
            if (directives.length > 0) break;
        }
    }

    // --- 4. General Encouragement/Scolding ---
    if (admonishments.length === 0) {
        const turn = this.game.turn();
        if (turn < 10) {
            admonishments.push("上海是国际观瞻所系，只许胜，不许败！");
            directives.push("手令：各部严密监视日军动向，步步为营，构筑坚固工事。");
        } else if (turn > 50 && myUnits.length < 10) {
            admonishments.push("局势危急至此，全赖诸将士用命。");
            directives.push("手令：牺牲未到最后关头，决不轻言牺牲；和平未到绝望时期，决不放弃和平。");
        } else {
            admonishments.push("无论如何，要给我在闸北顶住！");
            directives.push("手令：集中优势兵力，各个击破。务必打出我革命军的威风来。");
        }
    }

    return `
<span class="text-red-900 font-bold block mb-2">【委员长训斥】</span>
${admonishments[0]}

<div class="my-4 border-t border-b border-red-900/30 py-2">
<span class="text-xl font-black block mb-1 text-center font-kaiti">国民政府军事委员会委员长手令</span>
<span class="font-kaiti text-lg leading-relaxed">${directives.join('\n')}</span>
</div>

<span class="text-sm text-[#5d4037] block mt-2 font-mono text-right">中正</span>
    `.trim();
  }

  async analyzeBattlefield(units: Unit[], map: Map<string, HexCell>, playerFaction: PlayerId) {
    this.isAnalyzing.set(true);

    if (playerFaction === 'Blue') {
        this.analysisTitle.set('南京专线 // 委员长侍从室');
        this.analysisResult.set('正在接通南京... 委员长正在披阅战报...');
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Suspense
        
        const advice = this.generateLocalChiangAdvice(units, map);
        this.analysisResult.set(advice);
        this.isAnalyzing.set(false);
        return;
    }

    // --- Red Player still uses Gemini ---
    this.analysisTitle.set('Tactical Analysis // 战术推演');
    let loadingMessage = '正在建立加密链路... 呼叫参谋本部...';
    let apiKeyErrorMessage = '⚠ 错误：战术电台离线 (API KEY MISSING)';
    let systemInstruction = `
角色：你是《赤色淞沪》这款硬核六角格兵棋的首席系统设计师和战术顾问。
你的目标：分析战场态势，并严格根据以下“游戏物理宪法”提供战术指导。

=== 《赤色淞沪》：核心机制库 (v3.5) ===

--- 第一章：战略目标 ---
1.1 (时间与胜利): 战争持续 **54天 (216回合)**，每回合代表6小时。
    - **国军 (Blue) 胜利**: 拖延时间，坚持到216回合结束。
    - **日军 (Red) 胜利**: 速战速决，在时限内攻占上海核心区（闸北 Core_Zhabei）。
1.2 (资源): 指挥点数 (CP) 通过占领关键区域、历史事件和达成VP里程碑获得，用于发动强大的指挥官技能。

--- 第二章：行动与机动 ---
2.1 (行动点 AP): 单位每回合恢复AP。攻击固定消耗 **5 AP**。移动消耗AP视地形而定（平原3 AP）。
2.2 (控制区 ZOC): 进入敌军单位的相邻格会强制停止移动 (AP清零)。部分技能可无视ZOC。
2.3 (补给 Supply): “未补给”单位的战斗力 **减半 (x0.5)**。补给线至关重要。
2.4 (天气 Weather): 晴/雨/台风。恶劣天气会降低移动力，并严重影响空军和海军的效率。

--- 第三章：战斗裁定 (Combat Resolution) ---
战斗裁定遵循严格的物理法则，优先度从高到低：

3.1 (法则零：跳弹) - **不可违背的最高法则**
    - 如果攻击方的 **[穿透 Penetration]** 值小于或等于防御方的 **[装甲 Armor]** 值，攻击必定 **跳弹 (Ricochet)**，伤害强制为0。
    - 指导AI时，这是最优先需要检查的事项。绝对不要建议单位攻击其无法击穿的目标。

3.2 (战力计算)
    - 基础战力受 **兵力损耗 (HP/Steps)**、**补给状态 (x0.5)** 和 **士气 (0.5x-1.5x)** 修正。
    - 如果防御方有装甲，攻击方使用 **对硬攻击 (Hard Attack)**，否则使用 **对软攻击 (Soft Attack)**。这是自动切换的。

3.3 (火力比与掷骰)
    - 双方修正后的战力决定火力比 (Odds)。
    - 投掷2D6，并加上修正值 (DRM)。
    - 支援（装甲+1/空军+2/海军+2）提供正面修正。
    - 恶劣环境（夜间-2/雨天-1/巷战无工兵-1/背水一战-1）提供负面修正。

3.4 (战果表 CRT)
    - 最终的骰子点数 (2-12) 和火力比，在战果表中共同决定战斗结果。

=== 输出格式 ===
- **语气**: 专业、冷静、紧急的军事指挥风格。类似电报。
- **结构**:
  1. **威胁评估**: 指出1-2个最直接、高风险的情况。必须首先检查 **跳弹风险**。
  2. **战术指令**: 提供2-3条精确、可行的命令（例如，“指令1：单位ID:1234移动至[q,r]建立侧翼火力”，“指令2：此单位AP不足，保留用于下回合防御”）。
  3. **战略目标**: 简要说明当前的首要目标（拖延时间 vs 快速推进）。
- **简洁性**: 150字以内。使用[方括号]表示坐标。
`;

    this.analysisResult.set(loadingMessage);

    try {
      const apiKey = process.env['API_KEY'];
      if (!apiKey) {
        this.analysisResult.set(apiKeyErrorMessage);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const myUnits = units.filter(u => u.owner === playerFaction);
      const enemyUnits = units.filter(u => u.owner !== playerFaction && u.visibility !== 'Hidden');

      const getTerrainInfo = (u: Unit) => {
        const cell = map.get(`${u.q},${u.r}`);
        return cell ? cell.terrain : 'Unknown';
      };

      const formatUnit = (u: Unit) => {
        return `[ID:${u.id.substring(0,4)} ${u.name}] ${u.category} | HP:${u.hp}/${u.maxHp} AP:${u.ap} | 士气:${u.morale} | 攻(软/硬):${u.softAttack}/${u.hardAttack} 穿深:${u.penetration} 装甲:${u.armor} | 坐标(${u.q},${u.r}) ${getTerrainInfo(u)}`;
      };
      
      const prompt = `
=== 战场态势报告 (SITREP) ===
当前回合: ${this.game.turn()} / 216 (第 ${Math.ceil(this.game.turn()/4)} 天)
当前回合方: 日军 (进攻方)
天气: ${this.game.weather()}

[我方部队]
${myUnits.map(formatUnit).join('\n')}

[敌方部队 (目视接触)]
${enemyUnits.length > 0 ? enemyUnits.map(formatUnit).join('\n') : '侦察范围内无敌军'}

=== 指令要求 ===
请基于《核心机制库 v3.5》分析当前战局。
重点检查：
1.  **AP管理**: 单位是否有足够的AP (5点) 发起攻击？
2.  **跳弹风险**: 严禁攻击装甲高于穿深的敌军。
3.  **火力效能**: 优先使用高软攻单位打击步兵，高硬攻单位打击坦克。
给出下一步最关键的行动建议。
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.2, // Low temp for tactical precision
        }
      });

      this.analysisResult.set(response.text || '指挥部无回应。');
    } catch (e) {
      this.analysisResult.set('通讯干扰... 无法连接指挥部。');
      console.error(e);
    } finally {
      this.isAnalyzing.set(false);
    }
  }
}
