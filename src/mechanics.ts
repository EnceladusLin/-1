
import { TerrainType, UnitCategory, UnitStats, TerrainRule, Scenario, MapData, RegionId, PlayerId, HistoricalEvent, CrtResultType } from './types';

// Infinity for impassable terrain
const INF = 999;

/**
 * MOVEMENT MODEL CALIBRATION (500m / hex, 6h / turn)
 * Base AP unit = 3 (Representing 1 hex of easy movement).
 */
export const BASE_AP = 12;

export const TERRAIN_RULES: Record<TerrainType, TerrainRule> = {
  DeepOcean: {
    moveCost: 1, 
    defenseMultiplier: 1.0, attackPenalty: 0,
    stackLimit: 0, visionRange: 99, visionBlock: false
  },
  Coastal: { // Beachhead/Docks
    moveCost: 4, 
    defenseMultiplier: 0.9, attackPenalty: -1, 
    stackLimit: 6, visionRange: 6, visionBlock: false
  },
  Plains: { // Kaikuo Di / Airfields
    moveCost: 3, 
    defenseMultiplier: 1.0, attackPenalty: 0,
    stackLimit: 4, visionRange: 5, visionBlock: false
  },
  Mountains: { // Hills/Rough
    moveCost: 6, 
    defenseMultiplier: 1.2, attackPenalty: -1,
    stackLimit: 3, visionRange: 3, visionBlock: true
  },
  Urban: { // Zhabei
    moveCost: 5, 
    defenseMultiplier: 1.5, attackPenalty: -2,
    stackLimit: 8, visionRange: 2, visionBlock: true
  },
  Marsh: { // Yunzao Bin
    moveCost: 9, 
    defenseMultiplier: 0.8, attackPenalty: -1, 
    stackLimit: 2, visionRange: 4, visionBlock: false
  }
};

// --- 2D6 COMBAT RESULTS TABLE (CRT) ---
export const CRT_COLUMNS = ['1:3', '1:2', '1:1', '3:2', '2:1', '3:1', '4:1'];

export const CRT_2D6: Record<number, CrtResultType[]> = {
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
};

// --- PREMIUM DARK WARGAME PALETTE (v3.5) ---
export const REGION_COLORS: Record<string, string> = {
    BG: '#222222',           // Dark Matte Background
    WATER: '#1a2b3c',        // Deep Navy
    RURAL: '#334d38',        // Desaturated Forest Green
    
    // Urban Areas
    SETTLEMENT: '#546e7a',   // Blue Grey
    FRENCH: '#6d5e4f',       // Warm Grey
    ZHABEI: '#4e4239',       // Dark Earth
    OLD_CITY: '#8d6e63',     // Aged Brick
    JAPANESE: '#8c3b3b',     // Muted Red
    
    // Infrastructure
    DOCKS: '#3e352f',        // Dark Wood
    RAILWAY: '#2c2c2c',      // Railway Bed
    RAILWAY_NS: '#2c2c2c',
    RAILWAY_EW: '#2c2c2c',
    AIRFIELD: '#78909c',     // Concrete
    ROAD: '#b0b0b0',
    
    MARSH: '#4a5d23',        // Swamp Green
    VOID: '#000000'
};

// --- MAP OVERLAYS ---
export interface MapOverlay {
  text: string;
  q: number;
  r: number;
  size: number;
  color: string;
  font?: string;
  bg?: boolean;
  bgColor?: string;
  rotate?: number;
  weight?: string;
  spacing?: number;
}

function toHex(x: number, y: number): {q: number, r: number} {
    const GRID_W = 88;
    const GRID_H = 87;
    const REF_W = 400;
    const REF_H = 400;
    const OFF_Q = -44;
    const OFF_R = -43;

    const wx = (x / REF_W) * GRID_W;
    const wy = (y / REF_H) * GRID_H;

    const r = Math.floor(wy) + OFF_R;
    const q = Math.floor(wx - (Math.floor(wy)%2) * 0.5) + OFF_Q;
    return {q, r};
}

const LAND_TEXT_COLOR = '#b0bec5'; 
const WATER_TEXT_COLOR = 'rgba(255, 255, 255, 0.1)';

// Coordinates adjusted to match generateShanghaiMap logic
const RAW_LANDMARKS = [
    // 核心租界区
    { text: "公共租界", x: 155, y: 215, size: 34, color: '#b0bec5', font: "Microsoft YaHei", weight: "900", spacing: 3 },
    { text: "法租界", x: 150, y: 240, size: 28, color: '#a1887f', font: "Microsoft YaHei", weight: "900", spacing: 3 },
    { text: "闸北", x: 120, y: 150, size: 50, color: '#757575', font: "Microsoft YaHei", weight: "900", spacing: 5 },
    { text: "虹口", x: 190, y: 150, size: 36, color: '#e57373', font: "Microsoft YaHei", weight: "900", spacing: 3 },
    
    // 战略点 (机场/码头 - 出生点)
    { text: "龙华机场", x: 100, y: 295, size: 18, bg: true, color: '#fff', bgColor: '#1e3a8a' }, // CN Airfield
    { text: "汇山码头", x: 220, y: 175, size: 16, bg: true, color: '#fff', bgColor: '#b71c1c' }, // JP Docks
    { text: "吴淞口", x: 305, y: 35, size: 24, bg: true, color: '#fff', bgColor: '#b71c1c' }, // JP Landing

    // 北部战区
    { text: "宝山", x: 280, y: 20, size: 28, color: '#ef5350', weight: "900" },
    { text: "罗店", x: 60, y: 50, size: 28, bg: true, color: '#fff', bgColor: '#8a0000' }, 
    
    // 中部战区
    { text: "大场", x: 110, y: 100, size: 24, bg: true, color: '#000', bgColor: '#ffca28' }, 
    { text: "江湾", x: 200, y: 90, size: 24, color: '#bdbdbd', weight: "bold" },
    { text: "北站", x: 158, y: 170, size: 20, bg: true, color: '#fff', bgColor: '#3e2723' }, 
    
    // 地标
    { text: "四行仓库", x: 165, y: 195, size: 16, bg: true, color: '#fff', bgColor: '#424242' },
    { text: "八字桥", x: 140, y: 155, size: 16, bg: true, color: '#fff', bgColor: '#b71c1c' }, 

    // 水域
    { text: "浦 东", x: 300, y: 250, size: 80, color: 'rgba(255, 255, 255, 0.05)', font: "Kaiti", weight: "900", spacing: 10 },
    { text: "黄 浦 江", x: 200, y: 280, size: 55, color: WATER_TEXT_COLOR, rotate: -0.2, font: "Kaiti", weight: "bold" },
    { text: "长 江", x: 350, y: 10, size: 55, color: WATER_TEXT_COLOR, font: "Kaiti", weight: "bold" },
    { text: "苏 州 河", x: 120, y: 212, size: 28, color: '#60a5fa', rotate: -0.1, font: "Kaiti", weight: "bold" },
];

function generateOverlays(): MapOverlay[] {
    return RAW_LANDMARKS.map(lm => {
        const coords = toHex(lm.x, lm.y);
        return { ...lm, q: coords.q, r: coords.r };
    });
}

export const MAP_OVERLAYS: MapOverlay[] = generateOverlays();

// ... (UNIT_TEMPLATES) ...
export const UNIT_TEMPLATES: Record<string, Omit<UnitStats, 'hp' | 'ap' | 'fuel' | 'ammo' | 'suppression' | 'morale' | 'fatigue' | 'supplyState'>> = {
  // --- CIVILIANS ---
  'Civilian_Refugee': { 
      maxHp: 10, steps: 1, maxSteps: 1, maxAp: 2, combatStrength: 0, softAttack: 0, hardAttack: 0, penetration: 0, armor: 0, airDefense: 0, evasion: 0.0, stealth: 0.0, radarRange: 1, range: 0, maxFuel: 0, maxAmmo: 0, 
      name: '难民', category: 'Civilian', icon: '民', isHQ: false, 
      historicalNote: `
      <div class="space-y-2">
        <div><span class="text-[#b45309] font-bold">【历史背景】</span> 战火下的无辜平民。数以十万计的上海市民在租界边缘聚集，寻求庇护。</div>
        <div><span class="text-[#b45309] font-bold">【战斗配置】</span> 无武装。极易成为日军暴行（如无差别轰炸）的受害者，其伤亡会引发国际舆论关注。</div>
        <div><span class="text-[#b45309] font-bold">【最终结局】</span> 大量难民涌入租界“孤岛”。</div>
      </div>`,
      traits: [], visuals: { color: '#9ca3af', shape: 'circle', iconType: 'civilian', natoSymbol: 'none', flag: 'none', textColor: '#000' } 
  },
  
  // --- BLUE UNITS (ROC) ---
  'NRA_Elite_Infantry': { 
      maxHp: 20, steps: 2, maxSteps: 2, maxAp: 16, maxFuel: 99, maxAmmo: 10, combatStrength: 9, softAttack: 9, hardAttack: 3, penetration: 5, armor: 0, airDefense: 2, evasion: 0.2, stealth: 0.4, radarRange: 2, range: 1, 
      name: '德械师步兵', category: 'Ground', icon: '88', isHQ: false, 
      historicalNote: `
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 国民革命军第87、88、36师。由德国顾问团按照“调整师”标准训练，头戴M35钢盔，是国军最精锐的战略预备队。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 辖两旅四团。配属75mm博福斯山炮营、20mm苏罗通机关炮连。单兵素质极高，擅长阵地战。</div>
        <div><span class="text-[#1e40af] font-bold">【主要将领】</span> 孙元良 (88师)、王敬久 (87师)、谢晋元 (524团)。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 淞沪会战主力，在三个月的血战中反复拉锯，后撤退至南京。在南京保卫战中损失殆尽，精锐火种基本熄灭。</div>
      </div>`,
      traits: ['Elite', 'UrbanExpert', 'EntrenchExpert'], visuals: { color: '#2563eb', shape: 'square', iconType: 'infantry', natoSymbol: 'infantry', flag: 'roc', textColor: '#fbbf24' } 
  },
  'NRA_Regular_Infantry': { 
      maxHp: 20, steps: 2, maxSteps: 2, maxAp: 16, maxFuel: 99, maxAmmo: 8, combatStrength: 8, softAttack: 8, hardAttack: 2, penetration: 3, armor: 0, airDefense: 1, evasion: 0.15, stealth: 0.3, radarRange: 2, range: 1, 
      name: '正规军步兵', category: 'Ground', icon: '步', isHQ: false, traits: [], 
      historicalNote: `
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 中央军旁系部队或未完全整编的调整师（如第58师）。装备与训练略逊于德械师，但仍是抗战中坚。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 以中正式步枪为主，缺乏重武器和统一的通讯指挥系统。</div>
        <div><span class="text-[#1e40af] font-bold">【主要将领】</span> 俞济时 (58师)、冯庸。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 承担了罗店、大场等绞肉机战场的防御任务，伤亡惨重。</div>
      </div>`,
      visuals: { color: '#2563eb', shape: 'square', iconType: 'infantry', natoSymbol: 'infantry', flag: 'roc', textColor: '#fff' } 
  },
  'NRA_Army_Group': { 
      maxHp: 30, steps: 3, maxSteps: 3, maxAp: 16, maxFuel: 99, maxAmmo: 10, combatStrength: 9, softAttack: 8, hardAttack: 3, penetration: 4, armor: 0, airDefense: 1, evasion: 0.1, stealth: 0.1, radarRange: 3, range: 1, 
      name: '集团军', category: 'Ground', icon: '军', isHQ: true, traits: ['Coordinator'], 
      historicalNote: `
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 第三战区前敌总指挥部及第九、第十五集团军司令部。负责协调数十万军队的调度。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 指挥中枢。不直接参与一线作战，但能提供大范围的士气光环和指挥点数 (CP)。</div>
        <div><span class="text-[#1e40af] font-bold">【主要将领】</span> 冯玉祥、顾祝同、陈诚、张治中。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 由于通讯落后和派系林立，指挥系统常陷入混乱。11月全线撤退时曾发生总崩盘。</div>
      </div>`,
      visuals: { color: '#1e40af', shape: 'square', iconType: 'hq', natoSymbol: 'infantry', flag: 'roc', textColor: '#fbbf24' } 
  },
  'NRA_Hawk': { 
      maxHp:8, steps:1, maxSteps:1, maxAp:17, maxFuel:20, maxAmmo:1, combatStrength:10, softAttack:14, hardAttack:8, penetration:25, armor:0, airDefense:8, evasion:0.9, stealth:0.0, radarRange:8, range:2, 
      name:'霍克III', category:'Air', icon:'空', isHQ:false, 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 中国空军第4大队（志航大队）。抗战初期中国空军的绝对主力。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 美制霍克III型双翼战斗机。虽略显过时，但格斗性能优异。</div>
        <div><span class="text-[#1e40af] font-bold">【主要将领】</span> 高志航（空军战神）、刘粹刚。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 8月14日首战告捷（6:0）。后因飞机损耗无法补充，且高志航、刘粹刚相继殉国，制空权逐渐丧失。</div>
      </div>`,
      traits:['AirSupport'], visuals:{color:'#60a5fa', shape:'triangle', iconType:'plane', natoSymbol:'air', flag:'roc', textColor:'#fff'} 
  },
  'NRA_Torpedo_Boat': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:20, combatStrength:7, softAttack:2, hardAttack:15, penetration:50, armor:0, airDefense:0, evasion:0.6, stealth:0.5, radarRange:4, range:1, maxFuel:20, maxAmmo:2, 
      name:'鱼雷艇', category:'Naval', icon:'鱼', isHQ:false, traits:[], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 江阴电雷学校所属“史可法”中队。中国海军在几乎全灭的情况下，仅存的进攻性力量。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 英/德制高速鱼雷快艇。</div>
        <div><span class="text-[#1e40af] font-bold">【主要将领】</span> 欧阳格。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 曾试图夜袭日军旗舰“出云号”，虽未击沉但重创其防雷网。后多在长江突围战中损失。</div>
      </div>`,
      visuals:{color:'#1e3a8a', shape:'hexagon', iconType:'ship_boat', natoSymbol:'naval', flag:'roc', textColor:'#fff'} 
  },
  'NRA_Tax_Police': { 
      maxHp:30, steps:3, maxSteps:3, maxAp:16, combatStrength:7, softAttack:7, hardAttack:2, penetration:4, armor:0, airDefense:1, evasion:0.2, stealth:0.3, radarRange:2, range:1, maxFuel:99, maxAmmo:12, 
      name:'税警总团', category:'Ground', icon:'税', isHQ:false, traits:['Elite'], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 财政部部长宋子文建立的私人武装，名为缉私，实为精锐野战军。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 全美/德式装备，甚至拥有独立的战车连。军官多为留美生。</div>
        <div><span class="text-[#1e40af] font-bold">【主要将领】</span> 孙立人（后来的丛林之狐）。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 在蕴藻浜血战中伤亡惨重。余部后来成为远征军新38师的基础。</div>
      </div>`,
      visuals:{color:'#1e40af', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} 
  },
  'NRA_Guard': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:16, combatStrength:5, softAttack:5, hardAttack:1, penetration:2, armor:0, airDefense:0, evasion:0.1, stealth:0.5, radarRange:2, range:1, maxFuel:99, maxAmmo:8, 
      name:'宪兵团', category:'Ground', icon:'宪', isHQ:false, traits:[], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 宪兵司令部所属部队，主要负责南京及大城市的警备与纠察。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 单兵素质极高，常作为督战队或最后预备队使用。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 在南京保卫战中表现英勇，但也遭受毁灭性打击。</div>
      </div>`,
      visuals:{color:'#334155', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} 
  },
  'NRA_Super_Arty': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:8, combatStrength:15, softAttack:36, hardAttack:15, penetration:60, armor:0, airDefense:0, evasion:0, stealth:0.1, radarRange:4, range:8, maxFuel:10, maxAmmo:6, 
      name:'150mm重炮(精锐)', category:'Ground', icon:'150', isHQ:false, traits:['ArtillerySupport'], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 炮兵第10团。国军唯一的机械化重炮团。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 德制sFH18 150mm榴弹炮。射程远，威力大，是摧毁日军工事的杀手锏。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 由于缺乏制空权，只能在夜间机动射击。撤退时因桥梁被炸，大量火炮被迫沉入江中。</div>
      </div>`,
      visuals:{color:'#172554', shape:'square', iconType:'artillery', natoSymbol:'artillery', flag:'roc', textColor:'#fbbf24'} 
  },
  'NRA_Engineer': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:16, combatStrength:2, softAttack:2, hardAttack:1, penetration:1, armor:0, airDefense:0, evasion:0.2, stealth:0.4, radarRange:2, range:1, maxFuel:99, maxAmmo:5, 
      name:'工兵营', category:'Ground', icon:'工', isHQ:false, traits:[], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 各师属工兵营及陆军工兵学校部队。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 负责布雷、筑垒及爆破。在巷战中作用关键。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 随大部队撤退，沿途破坏桥梁迟滞日军。</div>
      </div>`,
      visuals:{color:'#475569', shape:'square', iconType:'engineer', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} 
  },
  'NRA_AA': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:12, combatStrength:4, softAttack:4, hardAttack:2, penetration:5, armor:0, airDefense:8, evasion:0.1, stealth:0.2, radarRange:4, range:2, maxFuel:99, maxAmmo:10, 
      name:'高炮营', category:'Ground', icon:'AA', isHQ:false, traits:['AirDefense'], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 防空学校部队。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 20mm苏罗通机关炮或37mm高射炮。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 在日军绝对制空权下损失殆尽。</div>
      </div>`,
      visuals:{color:'#475569', shape:'square', iconType:'aa_gun', natoSymbol:'artillery', flag:'roc', textColor:'#fff'} 
  },
  'NRA_HQ': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:12, combatStrength:0, softAttack:0, hardAttack:0, penetration:0, armor:0, airDefense:0, evasion:0.1, stealth:0.2, radarRange:6, range:0, maxFuel:99, maxAmmo:0, 
      name:'司令部', category:'Ground', icon:'HQ', isHQ:true, traits:['Coordinator'], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 京沪警备司令部。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 战区指挥中心。</div>
        <div><span class="text-[#1e40af] font-bold">【主要将领】</span> 张治中。</div>
      </div>`,
      visuals:{color:'#1e40af', shape:'square', iconType:'hq', natoSymbol:'none', flag:'roc', textColor:'#fff'} 
  },
  'Supply_Depot': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:0, combatStrength:0, softAttack:0, hardAttack:0, penetration:0, armor:0, airDefense:0, evasion:0, stealth:0, radarRange:0, range:0, maxFuel:0, maxAmmo:0, 
      name:'补给基地', category:'Civilian', icon:'补', isHQ:false, traits:['SupplySource'], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【历史背景】</span> 战区兵站与物资集散地。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 囤积粮弹，无战斗力。一旦被毁，周围部队将陷入弹尽粮绝。</div>
      </div>`,
      visuals:{color:'#6b7280', shape:'circle', iconType:'supply', natoSymbol:'none', flag:'none', textColor:'#000'} 
  },
  'NRA_Security': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:12, combatStrength:4, softAttack:3, hardAttack:0, penetration:1, armor:0, airDefense:0, evasion:0, stealth:0.3, radarRange:2, range:1, maxFuel:99, maxAmmo:4, 
      name:'保安团', category:'Ground', icon:'安', isHQ:false, traits:[], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 上海市警察局及地方保安部队。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 轻武器为主，缺乏重火力。开战初期成功突袭了日军陆战队据点。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 随着正规军接防，逐渐转为辅助或被编入野战部队。</div>
      </div>`,
      visuals:{color:'#475569', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} 
  },
  'NRA_Brigade': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:16, combatStrength:4, softAttack:4, hardAttack:1, penetration:2, armor:0, airDefense:0, evasion:0.1, stealth:0.2, radarRange:2, range:1, maxFuel:99, maxAmmo:6, 
      name:'独立旅', category:'Ground', icon:'旅', isHQ:false, traits:[], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 独立第20旅等单位。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 灵活的轻步兵单位，常用于侧翼掩护。</div>
      </div>`,
      visuals:{color:'#60a5fa', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} 
  },
  'NRA_Guangxi': { 
      maxHp:30, steps:3, maxSteps:3, maxAp:16, combatStrength:8, softAttack:6, hardAttack:1, penetration:1, armor:0, airDefense:0, evasion:0.1, stealth:0.4, radarRange:2, range:1, maxFuel:99, maxAmmo:6, 
      name:'桂军', category:'Ground', icon:'桂', isHQ:false, traits:['ChargeBonus'], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 第21集团军。广西“狼兵”，以凶悍著称。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 英式钢盔，单兵战斗力强，擅长近战冲锋。但缺乏攻坚重武器。</div>
        <div><span class="text-[#1e40af] font-bold">【主要将领】</span> 白崇禧、廖磊。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 10月发动蕴藻浜大反攻，因不熟悉现代化火力网，数万精锐在一天内基本打光。</div>
      </div>`,
      visuals:{color:'#3b82f6', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} 
  },
  'NRA_Sichuan': { 
      maxHp:30, steps:3, maxSteps:3, maxAp:16, combatStrength:6, softAttack:5, hardAttack:1, penetration:1, armor:0, airDefense:0, evasion:0.1, stealth:0.5, radarRange:2, range:1, maxFuel:99, maxAmmo:5, 
      name:'川军', category:'Ground', icon:'川', isHQ:false, traits:['EntrenchExpert'], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 第20军、43军等。穿着草鞋出川抗战，装备极其简陋。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> “双枪兵”（步枪+烟枪），但意志顽强。擅长土工作业。</div>
        <div><span class="text-[#1e40af] font-bold">【主要将领】</span> 杨森、郭勋祺。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 在顿悟寺、大场等地死战不退，全军伤亡过半，用鲜血赢得了尊重。</div>
      </div>`,
      visuals:{color:'#3b82f6', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} 
  },
  'NRA_Hero_Bn': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:16, combatStrength:6, softAttack:8, hardAttack:2, penetration:3, armor:0, airDefense:0, evasion:0.3, stealth:0.5, radarRange:2, range:1, maxFuel:99, maxAmmo:20, 
      name:'英雄营', category:'Ground', icon:'勇', isHQ:false, traits:['Elite', 'UrbanExpert', 'EntrenchExpert'], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 第88师524团1营（八百壮士）。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 加强营编制。依托四行仓库坚固工事进行死守。</div>
        <div><span class="text-[#1e40af] font-bold">【主要将领】</span> 谢晋元。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 孤军奋战四昼夜，掩护主力撤退。后奉命退入租界，谢晋元后被汉奸刺杀。</div>
      </div>`,
      visuals:{color:'#2563eb', shape:'square', iconType:'sword', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} 
  },
  'NRA_Replacement': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:14, combatStrength:3, softAttack:3, hardAttack:0, penetration:1, armor:0, airDefense:0, evasion:0.05, stealth:0.1, radarRange:1, range:1, maxFuel:99, maxAmmo:4, 
      name:'补充团', category:'Ground', icon:'补', isHQ:false, traits:[], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 临时征召的壮丁和新兵。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 训练不足，甚至没有枪，仅负责填补战线缺口。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 消耗品。</div>
      </div>`,
      visuals:{color:'#93c5fd', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#000'} 
  },
  'NRA_Teaching_Corps': { 
      maxHp:20, steps:2, maxSteps:2, maxAp:20, combatStrength:9, softAttack:9, hardAttack:4, penetration:6, armor:0, airDefense:3, evasion:0.25, stealth:0.4, radarRange:2, range:1, maxFuel:99, maxAmmo:15, 
      name:'教导总队', category:'Ground', icon:'教', isHQ:false, traits:['Elite'], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 中央陆军军官学校教导总队。国军中的“御林军”，全德式装备。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 编制庞大，火力超越普通德械师。是当时中国最现代化的部队。</div>
        <div><span class="text-[#1e40af] font-bold">【主要将领】</span> 桂永清。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 淞沪后期投入战斗，后在南京保卫战紫金山一线血战，损失惨重。</div>
      </div>`,
      visuals:{color:'#1d4ed8', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fbbf24'} 
  },
  'NRA_Guerrilla': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:24, combatStrength:3, softAttack:4, hardAttack:1, penetration:1, armor:0, airDefense:0, evasion:0.6, stealth:0.8, radarRange:3, range:1, maxFuel:99, maxAmmo:5, 
      name:'游击队', category:'Ground', icon:'游', isHQ:false, traits:['Recon'], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 浦东游击支队及红军改编的敌后武装。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 灵活机动，袭扰日军后方。</div>
        <div><span class="text-[#1e40af] font-bold">【最终结局】</span> 坚持敌后抗战。</div>
      </div>`,
      visuals:{color:'#475569', shape:'square', iconType:'infantry', natoSymbol:'recon', flag:'roc', textColor:'#fff'} 
  },
  'NRA_Xiang': { 
      maxHp:30, steps:3, maxSteps:3, maxAp:16, combatStrength:6, softAttack:6, hardAttack:1, penetration:1, armor:0, airDefense:0, evasion:0.1, stealth:0.3, radarRange:2, range:1, maxFuel:99, maxAmmo:5, 
      name:'湘军', category:'Ground', icon:'湘', isHQ:false, traits:[], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 湖南部队。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 装备较好，作风硬朗。</div>
      </div>`,
      visuals:{color:'#3b82f6', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} 
  },
  'NRA_Northwest': { 
      maxHp:20, steps:2, maxSteps:2, maxAp:18, combatStrength:5, softAttack:7, hardAttack:1, penetration:1, armor:0, airDefense:0, evasion:0.1, stealth:0.2, radarRange:2, range:1, maxFuel:99, maxAmmo:5, 
      name:'西北军', category:'Ground', icon:'西', isHQ:false, traits:['ChargeBonus'], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 第19路军系统或宋哲元部。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 擅长大刀近战。</div>
      </div>`,
      visuals:{color:'#4b5563', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} 
  },
  'NRA_Northeast': { 
      maxHp:20, steps:2, maxSteps:2, maxAp:16, combatStrength:6, softAttack:6, hardAttack:2, penetration:2, armor:0, airDefense:0, evasion:0.1, stealth:0.2, radarRange:2, range:1, maxFuel:99, maxAmmo:8, 
      name:'东北军', category:'Ground', icon:'东', isHQ:false, traits:[], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【番号背景】</span> 第67军等。</div>
        <div><span class="text-[#1e40af] font-bold">【战斗配置】</span> 原本装备精良，但此时已残破。怀着打回老家的信念作战。</div>
        <div><span class="text-[#1e40af] font-bold">【主要将领】</span> 吴克仁（殉国）。</div>
      </div>`,
      visuals:{color:'#4b5563', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} 
  },
  'NRA_Heavy_Arty': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:8, combatStrength:5, softAttack:12, hardAttack:5, penetration:20, armor:0, airDefense:0, evasion:0, stealth:0.1, radarRange:4, range:8, maxFuel:10, maxAmmo:6, 
      name:'150mm重炮', category:'Ground', icon:'150', isHQ:false, traits:['ArtillerySupport'], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#1e40af] font-bold">【历史背景】</span> 稀缺的重火力支援。</div>
      </div>`,
      visuals:{color:'#334155', shape:'square', iconType:'artillery', natoSymbol:'artillery', flag:'roc', textColor:'#fff'} 
  },

  // --- RED UNITS (IJA/IJN) ---
  'IJA_Infantry': { 
      maxHp: 20, steps: 2, maxSteps: 2, maxAp: 16, maxFuel: 99, maxAmmo: 12, combatStrength: 8, softAttack: 8, hardAttack: 4, penetration: 5, armor: 0, airDefense: 1, evasion: 0.2, stealth: 0.3, radarRange: 2, range: 1, 
      name: '陆军步兵', category: 'Ground', icon: '步', isHQ: false, 
      historicalNote: `
      <div class="space-y-2">
        <div><span class="text-[#b91c1c] font-bold">【番号背景】</span> 上海派遣军主力。第3师团、第9师团等常备精锐师团。</div>
        <div><span class="text-[#b91c1c] font-bold">【战斗配置】</span> 单兵射术精准，配属掷弹筒（轻迫击炮），步炮协同娴熟。</div>
        <div><span class="text-[#b91c1c] font-bold">【主要将领】</span> 松井石根。</div>
        <div><span class="text-[#b91c1c] font-bold">【最终结局】</span> 虽付出巨大伤亡，但凭借火力优势最终攻占上海。</div>
      </div>`,
      traits: ['PlainsExpert', 'Coordinator', 'Ruthless'], visuals: { color: '#ea580c', shape: 'square', iconType: 'infantry', natoSymbol: 'infantry', flag: 'japan', textColor: '#fff' } 
  },
  'IJN_Marine': { 
      maxHp: 20, steps: 2, maxSteps: 2, maxAp: 20, maxFuel: 99, maxAmmo: 12, combatStrength: 10, softAttack: 10, hardAttack: 5, penetration: 8, armor: 0, airDefense: 2, evasion: 0.3, stealth: 0.4, radarRange: 2, range: 1, 
      name: '海军特别陆战队', category: 'Amphibious', icon: 'SNLF', isHQ: false, 
      historicalNote: `
      <div class="space-y-2">
        <div><span class="text-[#b91c1c] font-bold">【番号背景】</span> 上海海军特别陆战队。长期驻扎上海虹口，极其熟悉城市地形。</div>
        <div><span class="text-[#b91c1c] font-bold">【战斗配置】</span> 装备大量MP28冲锋枪和装甲车，巷战能力极强。</div>
        <div><span class="text-[#b91c1c] font-bold">【主要将领】</span> 大川内传七。</div>
        <div><span class="text-[#b91c1c] font-bold">【最终结局】</span> 战争初期独自硬抗国军三个德械师的进攻而不溃，坚持到了陆军增援抵达。</div>
      </div>`,
      traits: ['AmphibiousExpert', 'UrbanExpert', 'Ruthless'], visuals: { color: '#9a3412', shape: 'square', iconType: 'marine', natoSymbol: 'amphib', flag: 'japan', textColor: '#fff' } 
  },
  'IJN_Marine_2': { 
      maxHp:20, steps:2, maxSteps:2, maxAp:20, combatStrength:9, softAttack:9, hardAttack:5, penetration:8, armor:0, airDefense:2, evasion:0.3, stealth:0.4, radarRange:2, range:1, maxFuel:99, maxAmmo:12, 
      name:'海军特别陆战队', category:'Amphibious', icon:'SNLF', isHQ:false, 
      historicalNote:`<div class="space-y-2"><div>同上，后续增援部队。</div></div>`,
      traits:['AmphibiousExpert', 'UrbanExpert', 'Ruthless'], visuals:{color:'#9a3412', shape:'square', iconType:'marine', natoSymbol:'amphib', flag:'japan', textColor:'#fff'} 
  },
  'IJA_HQ': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:12, combatStrength:0, softAttack:0, hardAttack:0, penetration:0, armor:0, airDefense:0, evasion:0.1, stealth:0.2, radarRange:8, range:0, maxFuel:99, maxAmmo:0, 
      name:'司令部', category:'Ground', icon:'HQ', isHQ:true, traits:['Coordinator'], 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#b91c1c] font-bold">【番号背景】</span> 上海派遣军司令部。</div>
        <div><span class="text-[#b91c1c] font-bold">【战斗配置】</span> 位于虹口日租界核心。</div>
      </div>`,
      visuals:{color:'#c2410c', shape:'square', iconType:'hq', natoSymbol:'none', flag:'japan', textColor:'#fff'} 
  },
  'IJN_Cruiser': { 
      maxHp: 40, steps: 4, maxSteps: 4, maxAp: 9, maxFuel: 50, maxAmmo: 99, combatStrength: 20, softAttack: 25, hardAttack: 20, penetration: 100, armor: 5, airDefense: 5, evasion: 0.0, stealth: 0.0, radarRange: 6, range: 7, 
      name: '出云号装甲巡洋舰', category: 'Naval', icon: '出云', isHQ: true, 
      historicalNote: `
      <div class="space-y-2">
        <div><span class="text-[#b91c1c] font-bold">【番号背景】</span> 日本第三舰队旗舰。停泊在黄浦江上，是日军的移动堡垒和火力支柱。</div>
        <div><span class="text-[#b91c1c] font-bold">【战斗配置】</span> 203mm主炮。装甲厚重，且有防雷网保护。</div>
        <div><span class="text-[#b91c1c] font-bold">【主要将领】</span> 长谷川清。</div>
        <div><span class="text-[#b91c1c] font-bold">【最终结局】</span> 虽多次遭受国军鱼雷艇和飞机的自杀式攻击，但未被击沉，直至1945年被美军炸沉。</div>
      </div>`,
      traits: ['NavalGun', 'SupplySource', 'Ruthless'], visuals: { color: '#c2410c', shape: 'hexagon', iconType: 'ship_cruiser', natoSymbol: 'naval', flag: 'japan', textColor: '#fff' } 
  },
  'IJN_Carrier': { 
      maxHp:50, steps:5, maxSteps:5, maxAp:12, combatStrength:25, softAttack:25, hardAttack:20, penetration:50, armor:4, airDefense:10, evasion:0.0, stealth:0.0, radarRange:10, range:4, maxFuel:99, maxAmmo:99, 
      name:'加贺号航空母舰', category:'Naval', icon:'航', isHQ:true, 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#b91c1c] font-bold">【番号背景】</span> 侵华日军主力航母。停泊在长江口外海。</div>
        <div><span class="text-[#b91c1c] font-bold">【战斗配置】</span> 搭载大量96式舰攻、舰爆。提供全天候空中支援。</div>
        <div><span class="text-[#b91c1c] font-bold">【最终结局】</span> 在中途岛海战中被美军击沉。</div>
      </div>`,
      traits:['SupplySource', 'AirSupport', 'Ruthless'], visuals:{color:'#c2410c', shape:'hexagon', iconType:'ship_cruiser', natoSymbol:'naval', flag:'japan', textColor:'#fff'} 
  },
  'IJN_Bomber': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:17, maxFuel:20, maxAmmo:2, combatStrength:9, softAttack:15, hardAttack:5, penetration:20, armor:0, airDefense:2, evasion:0.5, stealth:0.0, radarRange:8, range:2, 
      name:'96式轰炸机', category:'Air', icon:'Bmb', isHQ:false, 
      historicalNote:`
      <div class="space-y-2">
        <div><span class="text-[#b91c1c] font-bold">【番号背景】</span> 木更津、鹿屋航空队。</div>
        <div><span class="text-[#b91c1c] font-bold">【战斗配置】</span> 双发中型轰炸机。初期越洋轰炸常遭国军拦截。</div>
      </div>`,
      traits:['AirSupport', 'Bombardment'], visuals:{color:'#fb923c', shape:'triangle', iconType:'plane', natoSymbol:'air', flag:'japan', textColor:'#fff'} 
  },
  'IJA_Division_Heavy': { 
      maxHp:30, steps:3, maxSteps:3, maxAp:16, combatStrength:9, softAttack:9, hardAttack:5, penetration:6, armor:0, airDefense:1, evasion:0.2, stealth:0.2, radarRange:2, range:1, maxFuel:99, maxAmmo:15, 
      name:'甲种师团', category:'Ground', icon:'师', isHQ:false, traits:['Coordinator', 'Ruthless'], 
      historicalNote:`<div class="space-y-2"><div><span class="text-[#b91c1c] font-bold">【配置】</span> 满编常备师团，配备独立野战重炮兵联队。</div></div>`,
      visuals:{color:'#c2410c', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'japan', textColor:'#fff'} 
  },
  'IJA_Division_Standard': { 
      maxHp:30, steps:3, maxSteps:3, maxAp:16, combatStrength:8, softAttack:8, hardAttack:4, penetration:5, armor:0, airDefense:1, evasion:0.2, stealth:0.2, radarRange:2, range:1, maxFuel:99, maxAmmo:14, 
      name:'乙种师团', category:'Ground', icon:'乙', isHQ:false, traits:['Ruthless'], 
      historicalNote:`<div class="space-y-2"><div><span class="text-[#b91c1c] font-bold">【配置】</span> 标准作战师团。</div></div>`,
      visuals:{color:'#ea580c', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'japan', textColor:'#fff'} 
  },
  'IJA_Division_Light': { 
      maxHp:30, steps:3, maxSteps:3, maxAp:16, combatStrength:7, softAttack:7, hardAttack:3, penetration:4, armor:0, airDefense:1, evasion:0.2, stealth:0.2, radarRange:2, range:1, maxFuel:99, maxAmmo:12, 
      name:'特设师团', category:'Ground', icon:'特', isHQ:false, traits:['Ruthless'], 
      historicalNote:`<div class="space-y-2"><div><span class="text-[#b91c1c] font-bold">【配置】</span> 战时临时动员的预备役师团，战斗力较弱。</div></div>`,
      visuals:{color:'#f97316', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'japan', textColor:'#fff'} 
  },
  'IJA_Kunisaki': { 
      maxHp:20, steps:2, maxSteps:2, maxAp:20, combatStrength:8, softAttack:8, hardAttack:4, penetration:5, armor:0, airDefense:1, evasion:0.2, stealth:0.3, radarRange:2, range:1, maxFuel:99, maxAmmo:12, 
      name:'国崎支队', category:'Ground', icon:'支', isHQ:false, traits:['AmphibiousExpert', 'Ruthless'], 
      historicalNote:`<div class="space-y-2"><div><span class="text-[#b91c1c] font-bold">【配置】</span> 第5师团第9旅团为基干的独立混成部队，擅长登陆作战。</div></div>`,
      visuals:{color:'#f97316', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'japan', textColor:'#fff'} 
  },
  'IJA_Brigade': { 
      maxHp:20, steps:2, maxSteps:2, maxAp:16, combatStrength:7, softAttack:7, hardAttack:3, penetration:4, armor:0, airDefense:0, evasion:0.2, stealth:0.2, radarRange:2, range:1, maxFuel:99, maxAmmo:10, 
      name:'混成旅团', category:'Ground', icon:'旅', isHQ:false, traits:[], 
      historicalNote:`<div class="space-y-2"><div><span class="text-[#b91c1c] font-bold">【配置】</span> 独立作战单位。</div></div>`,
      visuals:{color:'#ea580c', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'japan', textColor:'#fff'} 
  },
  'IJA_Tank_Med': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:24, maxFuel:20, maxAmmo:15, combatStrength:12, softAttack:12, hardAttack:10, penetration:40, armor:3, airDefense:1, evasion:0.1, stealth:0.0, radarRange:3, range:2, 
      name: '八九式中战车', category: 'Ground', icon: 'Tk', isHQ: false, 
      historicalNote: `
      <div class="space-y-2">
        <div><span class="text-[#b91c1c] font-bold">【番号背景】</span> 独立战车第5大队等。</div>
        <div><span class="text-[#b91c1c] font-bold">【战斗配置】</span> 89式乙型中型坦克。装甲虽薄，但在中国战场横行无忌，是突破国军防线的利器。</div>
      </div>`,
      traits: ['Overrun', 'ArmorBonus', 'Ruthless'], visuals: { color: '#c2410c', shape: 'square', iconType: 'tank_medium', natoSymbol: 'armor', flag: 'japan', textColor: '#fff' } 
  },
  'IJA_Tank_Heavy': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:24, combatStrength:14, softAttack:14, hardAttack:12, penetration:45, armor:4, airDefense:1, evasion:0.1, stealth:0.0, radarRange:3, range:2, maxFuel:20, maxAmmo:20, 
      name:'战车联队', category:'Ground', icon:'Tk', isHQ:false, traits:['Overrun', 'ArmorBonus', 'Ruthless'], 
      historicalNote: `
      <div class="space-y-2">
        <div><span class="text-[#b91c1c] font-bold">【配置】</span> 集中运用的装甲集群。</div>
      </div>`,
      visuals:{color:'#9a3412', shape:'square', iconType:'tank_medium', natoSymbol:'armor', flag:'japan', textColor:'#fff'} 
  },
  'IJA_Tank_Light': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:28, combatStrength:12, softAttack:10, hardAttack:6, penetration:25, armor:2, airDefense:0, evasion:0.3, stealth:0.1, radarRange:3, range:2, maxFuel:25, maxAmmo:15, 
      name:'九五式轻战车', category:'Ground', icon:'Lt', isHQ:false, 
      historicalNote: `
      <div class="space-y-2">
        <div><span class="text-[#b91c1c] font-bold">【配置】</span> 轻型快速坦克，用于侦察和追击。</div>
      </div>`,
      traits:['Recon', 'ArmorBonus', 'Ruthless'], visuals:{color:'#ea580c', shape:'square', iconType:'tank_light', natoSymbol:'recon', flag:'japan', textColor:'#fff'} 
  },
  'IJA_Heavy_Arty': { 
      maxHp:10, steps:1, maxSteps:1, maxAp:8, combatStrength:8, softAttack:14, hardAttack:8, penetration:25, armor:0, airDefense:0, evasion:0, stealth:0.1, radarRange:4, range:7, maxFuel:10, maxAmmo:6, 
      name:'重炮兵联队', category:'Ground', icon:'炮', isHQ:false, 
      historicalNote: `
      <div class="space-y-2">
        <div><span class="text-[#b91c1c] font-bold">【番号背景】</span> 野战重炮兵第10联队等。</div>
        <div><span class="text-[#b91c1c] font-bold">【战斗配置】</span> 150mm榴弹炮及105mm加农炮。火力密度远超国军。</div>
      </div>`,
      traits:['ArtillerySupport'], visuals:{color:'#ea580c', shape:'square', iconType:'artillery', natoSymbol:'artillery', flag:'japan', textColor:'#fff'} 
  }
};

// ... (Unit creation helpers)
function u(template: string, owner: PlayerId, x: number, y: number, name?: string) {
    const coords = toHex(x, y);
    return {
        template,
        owner,
        q: coords.q,
        r: coords.r,
        customName: name,
        name: name || ''
    };
}

function generateShanghaiMap(q: number, r: number): MapData {
    const GRID_W = 88;
    const GRID_H = 87;
    const REF_W = 400;
    const REF_H = 400;
    const OFF_Q = -44;
    const OFF_R = -43;

    // Reverse hex to reference coordinates (approximation)
    const offset_r = r - OFF_R;
    const wx = (q - OFF_Q) + (offset_r % 2) * 0.5;
    const wy = offset_r;
    
    const vX = (wx / GRID_W) * REF_W;
    const vY = (wy / GRID_H) * REF_H;

    let mapType = 0; 
    let isRiver = false;
    let riverType: 'Major' | 'Minor' | undefined = undefined;

    // Helper: Distance from Point (x,y) to Line Segment (x1,y1)-(x2,y2)
    const distToSegment = (x: number, y: number, x1: number, y1: number, x2: number, y2: number) => {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;
        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }
        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    };

    // --- CONTINUOUS RAILWAYS (Visual Straightening) ---
    // Increase width to 3.5 to ensure continuous hex chain
    const RAIL_WIDTH = 3.5; 
    
    // 1. Shanghai-Nanjing Railway (East-West): From West edge (0,165) to North Station (160, 165)
    if (distToSegment(vX, vY, 0, 165, 160, 165) < RAIL_WIDTH) {
        mapType = 22; // E-W Rail (Horizontal)
    }
    // 2. Shanghai-Hangzhou Railway (South): From Junction (150, 175) to South-West (100, 400)
    // Vertical-ish drop
    else if (distToSegment(vX, vY, 150, 175, 100, 400) < RAIL_WIDTH) {
        mapType = 21; // N-S Rail (Vertical)
    }
    // 3. Woosung Railway (North): From North Station (160, 165) to Wusong (290, 40)
    // This is diagonal. To "straighten" it visually in hex terms, we map it to vertical tracks 
    // or horizontal based on dominant direction, but here it's 45 degrees.
    // We will use N-S (21) as it visually looks like a "line" even if staggered.
    else if (distToSegment(vX, vY, 160, 165, 290, 40) < RAIL_WIDTH) {
        mapType = 21; // N-S Rail
    }

    // --- RIVERS ---
    // Huangpu River
    let riverX;
    if (vY > 250) riverX = 190 + (vY-250)*0.2;
    else if (vY > 180) { 
        const t = (250 - vY) / 70;
        riverX = 190 - Math.sin(t * Math.PI) * 15;
    } else { 
        const t = (180 - vY) / 180;
        riverX = 190 + t * 200; 
    }
    riverX += Math.sin(vY * 0.05) * 3; 

    let riverW = 9; 
    if (vY > 170 && vY < 230) riverW = 14; 

    if (Math.abs(vX - riverX) < riverW) {
        isRiver = true;
        riverType = 'Major';
        mapType = 1;
    }

    // Suzhou Creek
    const suzhouY = 195 + Math.sin((205-vX)/30)*10 + (205-vX)*0.1;
    if (vX < riverX + 5 && Math.abs(vY - suzhouY) < 6.0) {
        isRiver = true;
        if (!riverType) riverType = 'Minor';
        mapType = 1;
    }

    // --- REGIONS & LANDMARKS ---
    if (!isRiver && mapType !== 21 && mapType !== 22) {
        if (vX > riverX) { // Pudong
            if (Math.abs(vX - riverX) < 25 && vY > 150 && vY < 250) mapType = 10; // Docks
            else mapType = 0; 
        } else {
            // Puxi
            if (vY < suzhouY - 3) { // North of Suzhou Creek
                if (vX > riverX - 50) mapType = 5;       // Japanese Sector
                else if (vX > 180) mapType = 5;          
                else mapType = 4;                      // Zhabei
            } else { // South of Suzhou Creek
                if (vY < 225) mapType = 2;               // Intl Settlement
                else if (vY < 255) mapType = 3;          // French Concession
                else {
                    const dx = vX - 200;
                    const dy = vY - 265;
                    if (dx*dx + dy*dy < 600) mapType = 7; // Old City
                    else mapType = 9; 
                }
            }
        }
        
        // --- SPECIFIC STRATEGIC LOCATIONS (Spawn Points) ---
        // REMOVED: Gongda Airfield Terrain Logic (Japanese planes now carrier/ship based)
        
        // 2. Longhua Airport (South - Large) - Moved Left
        // Rectangular area around 100, 290 (was 130)
        if (vX > 95 && vX < 115 && vY > 285 && vY < 300) mapType = 30; // AIRFIELD

        // 3. Huishan Docks (North Bank - Specific Spot)
        // Strip along river
        if (distToSegment(vX, vY, 220, 170, 230, 175) < 5) mapType = 10; // DOCKS

        // 4. Wusong Forts Area / Docks (Top Right)
        if (distToSegment(vX, vY, 300, 35, 310, 40) < 8) mapType = 10; // DOCKS (Landing Zone)
    }

    const riverFlag = isRiver;

    switch (mapType) {
        case 1:  return { terrain: 'DeepOcean', region: 'River_Huangpu', visualVariant: 'WATER', isRiver: true, riverType };
        case 2:  return { terrain: 'Urban', region: 'Intl_Settlement', visualVariant: 'SETTLEMENT', isRiver: riverFlag, riverType };
        case 3:  return { terrain: 'Urban', region: 'French_Concession', visualVariant: 'FRENCH', isRiver: riverFlag, riverType };
        case 4:  return { terrain: 'Urban', region: 'Core_Zhabei', visualVariant: 'ZHABEI', isRiver: riverFlag, riverType };
        case 5:  return { terrain: 'Urban', region: 'Japanese_Sector', visualVariant: 'JAPANESE', isRiver: riverFlag, riverType };
        case 7:  return { terrain: 'Urban', region: 'Old_City', visualVariant: 'OLD_CITY', isRiver: riverFlag, riverType };
        case 10: return { terrain: 'Coastal', region: 'East_Pudong', visualVariant: 'DOCKS', isRiver: riverFlag, riverType };
        case 21: return { terrain: 'Plains', region: 'Railway_Zone', visualVariant: 'RAILWAY_NS', isRiver: riverFlag, riverType };
        case 22: return { terrain: 'Plains', region: 'Railway_Zone', visualVariant: 'RAILWAY_EW', isRiver: riverFlag, riverType };
        case 30: return { terrain: 'Plains', region: 'West_Luodian', visualVariant: 'AIRFIELD', isRiver: riverFlag, riverType }; // Use Plains stats for airfield
        case 0:
        case 9:
        default: return { terrain: 'Plains', region: 'West_Luodian', visualVariant: 'RURAL', isRiver: riverFlag, riverType };
    }
}

// Generate scattered refugees
const generateRefugees = () => {
    const refs = [];
    for(let i=0; i<3; i++) refs.push(u('Civilian_Refugee', 'Blue', 180 + i*2, 260, '南市难民群'));
    for(let i=0; i<4; i++) refs.push(u('Civilian_Refugee', 'Blue', 125 + i*3, 160 + (i%2)*2, '闸北难民群'));
    for(let i=0; i<3; i++) refs.push(u('Civilian_Refugee', 'Blue', 160 + i*2, 220, '租界外难民'));
    return refs;
};

export const CORE_SCENARIO: Scenario = {
  id: 'core_sandbox',
  name: '淞沪会战 (全史)',
  desc: '1937年8月13日至10月6日。在日军压倒性的攻势下，坚守上海54天。',
  mapSize: 50, 
  maxTurns: 216, 
  victoryDesc: {
    Blue: '坚守上海54天 (216回合)，或消耗日军有生力量。',
    Red: '在54天内彻底击溃国军主力并攻占闸北核心区。',
  },
  initialUnlockedRegions: ['Yangtze_Estuary', 'Core_Zhabei', 'Intl_Settlement', 'Japanese_Sector', 'French_Concession', 'Old_City', 'North_Wusong', 'South_Jinshan', 'West_Luodian', 'Railway_Zone', 'East_Pudong', 'River_Huangpu'],
  initialUnits: [
    ...generateRefugees(),
    // --- 88th Division (Zhabei Core / North Station Defense) ---
    u('NRA_Elite_Infantry', 'Blue', 120, 150, '第88师 A'), u('NRA_Elite_Infantry', 'Blue', 125, 150, '第88师 A (增援)'),
    u('NRA_Elite_Infantry', 'Blue', 122, 148, '第88师 B'), u('NRA_Elite_Infantry', 'Blue', 127, 148, '第88师 B (增援)'),
    u('NRA_Elite_Infantry', 'Blue', 118, 152, '第88师 C'), u('NRA_Elite_Infantry', 'Blue', 123, 152, '第88师 C (增援)'),
    
    // --- 87th Division (Forward deployed to Hongkou border) ---
    // Moved from rear (160, 100) to front (185, 140) to simulate early offensive
    u('NRA_Elite_Infantry', 'Blue', 185, 140, '第87师 A'), u('NRA_Elite_Infantry', 'Blue', 188, 138, '第87师 A (增援)'),
    u('NRA_Elite_Infantry', 'Blue', 183, 142, '第87师 B'), u('NRA_Elite_Infantry', 'Blue', 185, 138, '第87师 B (增援)'),
    u('NRA_Elite_Infantry', 'Blue', 180, 140, '第87师 C'), u('NRA_Elite_Infantry', 'Blue', 182, 138, '第87师 C (增援)'),

    u('NRA_Tax_Police', 'Blue', 140, 180, '税警总团 A'), u('NRA_Tax_Police', 'Blue', 145, 180, '税警总团 A (增援)'),
    u('NRA_Tax_Police', 'Blue', 142, 178, '税警总团 B'), u('NRA_Tax_Police', 'Blue', 147, 178, '税警总团 B (增援)'),
    u('NRA_Tax_Police', 'Blue', 138, 182, '税警总团 C'), u('NRA_Tax_Police', 'Blue', 143, 182, '税警总团 C (增援)'),
    u('NRA_Guard', 'Blue', 150, 210, '宪兵第3团 A'), u('NRA_Guard', 'Blue', 155, 210, '宪兵第3团 A (增援)'),
    u('NRA_Guard', 'Blue', 152, 208, '宪兵第3团 B'), u('NRA_Guard', 'Blue', 157, 208, '宪兵第3团 B (增援)'),
    u('NRA_Guard', 'Blue', 148, 212, '宪兵第3团 C'), u('NRA_Guard', 'Blue', 153, 212, '宪兵第3团 C (增援)'),
    u('NRA_Super_Arty', 'Blue', 100, 150, '重炮第10团'), 
    u('NRA_Regular_Infantry', 'Blue', 105, 150, '炮兵掩护营 A'),
    u('NRA_Super_Arty', 'Blue', 102, 148, '重炮第14团'), 
    u('NRA_Regular_Infantry', 'Blue', 107, 148, '炮兵掩护营 B'),
    u('NRA_Regular_Infantry', 'Blue', 98, 152, '预备步兵团 A'), 
    u('NRA_Regular_Infantry', 'Blue', 103, 152, '预备步兵团 B'),
    u('NRA_Super_Arty', 'Blue', 110, 160, '独立重炮团'), 
    u('NRA_Regular_Infantry', 'Blue', 115, 160, '辎重警卫团'),
    u('NRA_Regular_Infantry', 'Blue', 112, 158, '补充步兵团 A'), 
    u('NRA_Regular_Infantry', 'Blue', 117, 158, '补充步兵团 B'),
    u('NRA_Regular_Infantry', 'Blue', 108, 162, '补充步兵团 C'), 
    u('NRA_Regular_Infantry', 'Blue', 113, 162, '补充步兵团 D'),
    u('NRA_Engineer', 'Blue', 125, 155, '工兵第1营 A'), u('NRA_Engineer', 'Blue', 130, 155, '工兵第1营 A (增援)'),
    u('NRA_Engineer', 'Blue', 127, 153, '工兵第1营 B'), u('NRA_Engineer', 'Blue', 132, 153, '工兵第1营 B (增援)'),
    u('NRA_Engineer', 'Blue', 123, 157, '工兵第1营 C'), u('NRA_Engineer', 'Blue', 128, 157, '工兵第1营 C (增援)'),
    u('NRA_AA', 'Blue', 145, 175, '高炮第1营 A'), u('NRA_AA', 'Blue', 150, 175, '高炮第1营 A (增援)'),
    u('NRA_AA', 'Blue', 147, 173, '高炮第1营 B'), u('NRA_AA', 'Blue', 152, 173, '高炮第1营 B (增援)'),
    u('NRA_AA', 'Blue', 143, 177, '高炮第1营 C'), u('NRA_AA', 'Blue', 148, 177, '高炮第1营 C (增援)'),
    u('NRA_HQ', 'Blue', 140, 170, '上海警备司令部 A'), u('NRA_HQ', 'Blue', 145, 170, '上海警备司令部 B (增援)'),
    u('Supply_Depot', 'Blue', 135, 185, '上海补给基地 A'),
    u('Supply_Depot', 'Blue', 133, 187, '上海补给基地 C'),
    u('Supply_Depot', 'Blue', 105, 285, '龙华补给基地 A'), // Moved with airfield (was 135)
    u('Supply_Depot', 'Blue', 103, 287, '龙华补给基地 C'), // Moved with airfield (was 133)
    u('NRA_Regular_Infantry', 'Blue', 90, 160, '第58师 A'), u('NRA_Regular_Infantry', 'Blue', 95, 160, '第58师 A (增援)'),
    u('NRA_Regular_Infantry', 'Blue', 92, 158, '第58师 B'), u('NRA_Regular_Infantry', 'Blue', 97, 158, '第58师 B (增援)'),
    u('NRA_Regular_Infantry', 'Blue', 88, 162, '第58师 C'), u('NRA_Regular_Infantry', 'Blue', 93, 162, '第58师 C (增援)'),
    
    // --- UPDATED: Scattered Security Regiments (No formation) ---
    u('NRA_Security', 'Blue', 180, 280, '保安团 A'), // South of Old City
    u('NRA_Security', 'Blue', 220, 280, '保安团 B'), // Near River
    u('NRA_Security', 'Blue', 160, 240, '保安团 C'), // Near French Concession border
    
    u('NRA_Brigade', 'Blue', 80, 140, '独立第20旅 A'), u('NRA_Brigade', 'Blue', 85, 140, '独立第20旅 A (增援)'),
    u('NRA_Brigade', 'Blue', 82, 138, '独立第20旅 B'), u('NRA_Brigade', 'Blue', 87, 138, '独立第20旅 B (增援)'),
    u('NRA_Brigade', 'Blue', 78, 142, '独立第20旅 C'), u('NRA_Brigade', 'Blue', 83, 142, '独立第20旅 C (增援)'),
    
    // --- UPDATED: Hawks at correct Longhua Coords (100, 295 approx) ---
    u('NRA_Hawk', 'Blue', 100, 295, '空军第1大队 A'), 
    u('NRA_Hawk', 'Blue', 105, 295, '空军第1大队 B'), 
    u('NRA_Hawk', 'Blue', 95, 295, '空军第1大队 C'), 
    
    u('NRA_Hawk', 'Blue', 50, 200, '空军第2大队 A'), // Near Hongqiao
    u('NRA_Hawk', 'Blue', 52, 198, '空军第2大队 B'),
    u('NRA_Hawk', 'Blue', 48, 202, '空军第2大队 C'),
    u('NRA_Torpedo_Boat', 'Blue', 200, 250, '鱼雷艇支队 A'),
    u('NRA_Torpedo_Boat', 'Blue', 202, 248, '鱼雷艇支队 B'),
    u('NRA_Torpedo_Boat', 'Blue', 198, 252, '鱼雷艇支队 C'),
    // NEW: Pudong Defenders
    u('NRA_Guerrilla', 'Blue', 250, 180, '浦东游击支队'),
    u('NRA_Heavy_Arty', 'Blue', 260, 200, '浦东岸炮连'),
    
    // RED UNITS
    u('IJN_Marine', 'Red', 190, 150, '陆战队第1联队群 A'),
    u('IJN_Marine', 'Red', 192, 148, '陆战队第1联队群 B'),
    u('IJN_Marine', 'Red', 188, 152, '陆战队第1联队群 C'),
    u('IJN_Marine_2', 'Red', 230, 140, '陆战队第2联队群 A'),
    u('IJN_Marine_2', 'Red', 232, 138, '陆战队第2联队群 B'),
    u('IJN_Marine_2', 'Red', 228, 142, '陆战队第2联队群 C'),
    // NEW: Yangshupu Garrison
    u('IJN_Marine', 'Red', 240, 140, '杨树浦守备队'),
    
    // --- UPDATED: Extra 3 JP Army Units (Early Reinforcements) ---
    u('IJA_Infantry', 'Red', 200, 140, '第3师团先遣大队 A'),
    u('IJA_Infantry', 'Red', 210, 135, '第3师团先遣大队 B'),
    u('IJA_Infantry', 'Red', 220, 130, '第11师团先遣大队'),
    
    // NEW ADDED UNITS (Balance Patch)
    u('IJA_Infantry', 'Red', 205, 138, '第3师团先遣大队 C'),
    u('IJA_Infantry', 'Red', 215, 133, '第3师团先遣大队 D'),
    u('IJA_Infantry', 'Red', 225, 128, '第11师团先遣大队 B'),
    u('IJA_Infantry', 'Red', 202, 142, '第9师团先遣队 A'),
    u('IJA_Infantry', 'Red', 212, 137, '第9师团先遣队 B'),

    u('IJN_Carrier', 'Red', 366, 20, '加贺号航空母舰 (旗舰)'),
    // --- UPDATED: Izumo at Huishan Docks ---
    u('IJN_Cruiser', 'Red', 225, 180, '出云号 (第三舰队旗舰)'),
    
    u('IJN_Cruiser', 'Red', 300, 80, '舰炮支援群 A1'),
    u('IJN_Cruiser', 'Red', 302, 78, '舰炮支援群 A2'),
    // IJN Bombers moved to sea (Carrier/Estuary support) - No land base at start
    u('IJN_Bomber', 'Red', 360, 25, '第12航空队 A'), 
    u('IJN_Bomber', 'Red', 362, 23, '第12航空队 B'),
    u('IJN_Bomber', 'Red', 358, 27, '第12航空队 C'),
    u('IJA_HQ', 'Red', 195, 145, '海军陆战队司令部 A'),
    u('IJA_HQ', 'Red', 197, 143, '海军陆战队司令部 B'),
    u('IJA_HQ', 'Red', 193, 147, '海军陆战队司令部 C'),
    u('Supply_Depot', 'Red', 310, 50, '吴淞补给基地 A'),
    u('Supply_Depot', 'Red', 312, 48, '吴淞补给基地 B'),
    u('Supply_Depot', 'Red', 308, 52, '吴淞补给基地 C'),
  ],
  events: [
      // ... (Events kept same)
      { id: 'evt_united_front', turn: 1, title: '国共合作 - 统一战线', desc: '在民族危亡之际，国共两党达成第二次合作，共同抗日。全军士气高涨，凝聚力空前。', buffTitle: '统一战线', buffDesc: '前3回合，所有国军单位核心作战属性(战力/软攻/硬攻)提升15%，士气+15。', blueBuffMultiplier: { combatStrength: 1.15, softAttack: 1.15, hardAttack: 1.15 }, blueBuff: { morale: 15 }, duration: 0.75, triggered: false, silent: false, internationalContext: '第二次国共合作的建立获得了共产国际和部分西方国家的积极评价。' },
      { id: 'evt_air_raid', turn: 2, title: '八一四空战', desc: '中国空军主动出击，在杭州湾上空痛击日机。高志航首开纪录。', buffTitle: '制空权争夺', buffDesc: '国军空军单位攻击力大幅提升，日军空军命中率下降。', duration: 1, triggered: false, silent: false, internationalContext: '列强观察员对中国空军的表现感到意外。' },
      { id: 'evt_wusong_landing', turn: 10, title: '吴淞登陆', desc: '日军第3、第11师团在吴淞炮台附近强行登陆，开辟第二战场。', spawn: [{owner: 'Red', unitTemplate: 'IJA_Division_Standard', count: 2, region: 'wusong'}, {owner: 'Red', unitTemplate: 'IJA_Tank_Light', count: 1, region: 'wusong'}], triggered: false, silent: false },
      { id: 'evt_baoshan_fall', turn: 24, title: '宝山陷落', desc: '姚子青营在宝山孤城血战至最后一刻，全员殉国。', buffTitle: '哀兵必胜', buffDesc: '全军士气锁定为100，防御力+1，持续3回合。', blueBuff: { morale: 100, combatStrength: 1 }, duration: 0.75, triggered: false, silent: false },
      { id: 'evt_luodian_grinder', turn: 30, title: '血肉磨坊', desc: '罗店争夺战进入白热化。双方投入重兵，反复拉锯。', buffTitle: '消耗战', buffDesc: '罗店区域内所有单位每回合自动扣除5HP。', duration: 5, triggered: false, silent: false },
      { id: 'evt_dachang_fall', turn: 100, title: '大场失守', desc: '大场阵地被突破，国军侧翼暴露，被迫全线撤退至苏州河南岸。', buffTitle: '全线撤退', buffDesc: '国军全军撤退移动力增加，但防御力下降。', blueBuff: { ap: 4, combatStrength: -2 }, duration: 1, triggered: false, silent: false },
      { id: 'evt_sihang_warehouse', turn: 104, title: '四行孤军', desc: '谢晋元率部死守四行仓库，掩护主力撤退。', specificSpawns: [{template: 'NRA_Hero_Bn', owner: 'Blue', q: 165, r: 188, name: '谢晋元团'}], buffTitle: '精神堡垒', buffDesc: '英雄营单位获得无敌状态(暂定高防)，每回合提供VP。', duration: 2, triggered: false, silent: false, internationalContext: '租界内的外媒全程直播了这场战斗，中国军人的勇气赢得了世界的尊重。' },
      { id: 'evt_jinshanwei', turn: 120, title: '金山卫登陆', desc: '日军第10军在杭州湾北岸金山卫偷袭登陆，国军防线彻底崩溃。', spawn: [{owner: 'Red', unitTemplate: 'IJA_Division_Heavy', count: 3, region: 'pudong'}], buffTitle: '总崩盘', buffDesc: '国军士气-50，陷入混乱。', blueBuff: { morale: -50 }, duration: 99, triggered: false, silent: false }
  ],
  mapGenerator: generateShanghaiMap
};
