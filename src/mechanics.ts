
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
    moveCost: INF, // Impassable for ground
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
  Road: { // Highways/Paved Roads (NEW)
    moveCost: 1, // VERY FAST
    defenseMultiplier: 0.9, // Exposed
    attackPenalty: 0,
    stackLimit: 5, visionRange: 6, visionBlock: false
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
  Marsh: { // Yunzao Bin / Rice Paddies
    moveCost: 9, // Very slow
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

export const REGION_COLORS: Record<string, string> = {
    BG: '#222222',           
    WATER: '#1a2b3c',        
    RURAL: '#334d38',        
    SETTLEMENT: '#546e7a',   
    FRENCH: '#6d5e4f',       
    ZHABEI: '#4e4239',       
    OLD_CITY: '#8d6e63',     
    JAPANESE: '#8c3b3b',     
    DOCKS: '#3e352f',        
    RAILWAY: '#2c2c2c',      
    RAILWAY_NS: '#2c2c2c',
    RAILWAY_EW: '#2c2c2c',
    AIRFIELD: '#78909c',     
    ROAD: '#b0b0b0',
    MARSH: '#4a5d23',        
    VOID: '#000000'
};

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

export function toHex(x: number, y: number): {q: number, r: number} {
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

const WATER_TEXT_COLOR = 'rgba(255, 255, 255, 0.1)';

const RAW_LANDMARKS = [
    { text: "公共租界", x: 155, y: 215, size: 34, color: '#b0bec5', font: "Microsoft YaHei", weight: "900", spacing: 3 },
    { text: "法租界", x: 150, y: 240, size: 28, color: '#a1887f', font: "Microsoft YaHei", weight: "900", spacing: 3 },
    { text: "闸北", x: 120, y: 150, size: 50, color: '#757575', font: "Microsoft YaHei", weight: "900", spacing: 5 },
    { text: "虹口", x: 190, y: 150, size: 36, color: '#e57373', font: "Microsoft YaHei", weight: "900", spacing: 3 },
    { text: "龙华机场", x: 100, y: 295, size: 18, bg: true, color: '#fff', bgColor: '#1e3a8a' }, 
    { text: "汇山码头", x: 220, y: 175, size: 16, bg: true, color: '#fff', bgColor: '#b71c1c' }, 
    { text: "吴淞口", x: 305, y: 35, size: 24, bg: true, color: '#fff', bgColor: '#b71c1c' }, 
    { text: "宝山", x: 280, y: 20, size: 28, color: '#ef5350', weight: "900" },
    { text: "罗店", x: 60, y: 50, size: 28, bg: true, color: '#fff', bgColor: '#8a0000' }, 
    { text: "大场", x: 110, y: 100, size: 24, bg: true, color: '#000', bgColor: '#ffca28' }, 
    { text: "南翔", x: 30, y: 130, size: 24, color: '#8d6e63', weight: "bold" },
    { text: "真如", x: 80, y: 150, size: 24, color: '#8d6e63', weight: "bold" },
    { text: "江湾", x: 200, y: 90, size: 24, color: '#bdbdbd', weight: "bold" },
    { text: "北站", x: 158, y: 170, size: 20, bg: true, color: '#fff', bgColor: '#3e2723' }, 
    { text: "四行仓库", x: 165, y: 195, size: 16, bg: true, color: '#fff', bgColor: '#424242' },
    { text: "八字桥", x: 140, y: 155, size: 16, bg: true, color: '#fff', bgColor: '#b71c1c' }, 
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

// SCALING FACTORS
const BLUE_FACTOR = 0.9;
const RED_FACTOR = 1.25;

export const UNIT_TEMPLATES: Record<string, Omit<UnitStats, 'hp' | 'ap' | 'fuel' | 'ammo' | 'suppression' | 'morale' | 'fatigue' | 'supplyState'>> = {
  // NRA UNITS (Blue) - Stats reduced by ~10%
  'Civilian_Refugee': { maxHp: 10, steps: 1, maxSteps: 1, maxAp: 2, combatStrength: 0, softAttack: 0, hardAttack: 0, penetration: 0, armor: 0, airDefense: 0, evasion: 0.0, stealth: 0.0, radarRange: 1, range: 0, maxFuel: 0, maxAmmo: 0, name: '难民', category: 'Civilian', icon: '民', isHQ: false, historicalNote: `...`, traits: [], visuals: { color: '#9ca3af', shape: 'circle', iconType: 'civilian', natoSymbol: 'none', flag: 'none', textColor: '#000' } },
  'NRA_Elite_Infantry': { maxHp: 20, steps: 2, maxSteps: 2, maxAp: 16, maxFuel: 99, maxAmmo: 10, combatStrength: 8.1, softAttack: 8.1, hardAttack: 2.7, penetration: 4.5, armor: 0, airDefense: 1.8, evasion: 0.18, stealth: 0.4, radarRange: 2, range: 1, name: '德械师步兵', category: 'Ground', icon: '88', isHQ: false, historicalNote: `...`, traits: ['Elite', 'UrbanExpert', 'EntrenchExpert'], visuals: { color: '#2563eb', shape: 'square', iconType: 'infantry', natoSymbol: 'infantry', flag: 'roc', textColor: '#fbbf24' } },
  'NRA_Regular_Infantry': { maxHp: 20, steps: 2, maxSteps: 2, maxAp: 16, maxFuel: 99, maxAmmo: 8, combatStrength: 7.2, softAttack: 7.2, hardAttack: 1.8, penetration: 2.7, armor: 0, airDefense: 0.9, evasion: 0.13, stealth: 0.3, radarRange: 2, range: 1, name: '正规军步兵', category: 'Ground', icon: '步', isHQ: false, traits: [], historicalNote: `...`, visuals: { color: '#2563eb', shape: 'square', iconType: 'infantry', natoSymbol: 'infantry', flag: 'roc', textColor: '#fff' } },
  'NRA_Army_Group': { maxHp: 30, steps: 3, maxSteps: 3, maxAp: 16, maxFuel: 99, maxAmmo: 10, combatStrength: 8.1, softAttack: 7.2, hardAttack: 2.7, penetration: 3.6, armor: 0, airDefense: 0.9, evasion: 0.09, stealth: 0.1, radarRange: 3, range: 1, name: '集团军', category: 'Ground', icon: '军', isHQ: true, traits: ['Coordinator'], historicalNote: `...`, visuals: { color: '#1e40af', shape: 'square', iconType: 'hq', natoSymbol: 'infantry', flag: 'roc', textColor: '#fbbf24' } },
  'NRA_Hawk': { maxHp:8, steps:1, maxSteps:1, maxAp:17, maxFuel:20, maxAmmo:1, combatStrength:9, softAttack:12.6, hardAttack:7.2, penetration:22.5, armor:0, airDefense:7.2, evasion:0.81, stealth:0.0, radarRange:8, range:2, name:'霍克III', category:'Air', icon:'空', isHQ:false, historicalNote:`...`, traits:['AirSupport'], visuals:{color:'#60a5fa', shape:'triangle', iconType:'plane', natoSymbol:'air', flag:'roc', textColor:'#fff'} },
  'NRA_Torpedo_Boat': { maxHp:10, steps:1, maxSteps:1, maxAp:20, combatStrength:6.3, softAttack:1.8, hardAttack:13.5, penetration:45, armor:0, airDefense:0, evasion:0.54, stealth:0.5, radarRange:4, range:1, maxFuel:20, maxAmmo:2, name:'鱼雷艇', category:'Naval', icon:'鱼', isHQ:false, traits:[], historicalNote:`...`, visuals:{color:'#1e3a8a', shape:'hexagon', iconType:'ship_boat', natoSymbol:'naval', flag:'roc', textColor:'#fff'} },
  'NRA_Tax_Police': { maxHp:30, steps:3, maxSteps:3, maxAp:16, combatStrength:6.3, softAttack:6.3, hardAttack:1.8, penetration:3.6, armor:0, airDefense:0.9, evasion:0.18, stealth:0.3, radarRange:2, range:1, maxFuel:99, maxAmmo:12, name:'税警总团', category:'Ground', icon:'税', isHQ:false, traits:['Elite'], historicalNote:`...`, visuals:{color:'#1e40af', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} },
  'NRA_Guard': { maxHp:10, steps:1, maxSteps:1, maxAp:16, combatStrength:4.5, softAttack:4.5, hardAttack:0.9, penetration:1.8, armor:0, airDefense:0, evasion:0.09, stealth:0.5, radarRange:2, range:1, maxFuel:99, maxAmmo:8, name:'宪兵团', category:'Ground', icon:'宪', isHQ:false, traits:[], historicalNote:`...`, visuals:{color:'#334155', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} },
  'NRA_Super_Arty': { maxHp:10, steps:1, maxSteps:1, maxAp:8, combatStrength:13.5, softAttack:32.4, hardAttack:13.5, penetration:54, armor:0, airDefense:0, evasion:0, stealth:0.1, radarRange:4, range:8, maxFuel:10, maxAmmo:6, name:'150mm重炮(精锐)', category:'Ground', icon:'150', isHQ:false, traits:['ArtillerySupport'], historicalNote:`...`, visuals:{color:'#172554', shape:'square', iconType:'artillery', natoSymbol:'artillery', flag:'roc', textColor:'#fbbf24'} },
  'NRA_Engineer': { maxHp:10, steps:1, maxSteps:1, maxAp:16, combatStrength:1.8, softAttack:1.8, hardAttack:0.9, penetration:0.9, armor:0, airDefense:0, evasion:0.18, stealth:0.4, radarRange:2, range:1, maxFuel:99, maxAmmo:5, name:'工兵营', category:'Ground', icon:'工', isHQ:false, traits:[], historicalNote:`...`, visuals:{color:'#475569', shape:'square', iconType:'engineer', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} },
  'NRA_AA': { maxHp:10, steps:1, maxSteps:1, maxAp:12, combatStrength:3.6, softAttack:3.6, hardAttack:1.8, penetration:4.5, armor:0, airDefense:7.2, evasion:0.09, stealth:0.2, radarRange:4, range:2, maxFuel:99, maxAmmo:10, name:'高炮营', category:'Ground', icon:'AA', isHQ:false, traits:['AirDefense'], historicalNote:`...`, visuals:{color:'#475569', shape:'square', iconType:'aa_gun', natoSymbol:'artillery', flag:'roc', textColor:'#fff'} },
  'NRA_HQ': { maxHp:10, steps:1, maxSteps:1, maxAp:12, combatStrength:0, softAttack:0, hardAttack:0, penetration:0, armor:0, airDefense:0, evasion:0.09, stealth:0.2, radarRange:6, range:0, maxFuel:99, maxAmmo:0, name:'司令部', category:'Ground', icon:'HQ', isHQ:true, traits:['Coordinator'], historicalNote:`...`, visuals:{color:'#1e40af', shape:'square', iconType:'hq', natoSymbol:'none', flag:'roc', textColor:'#fff'} },
  'Supply_Depot': { maxHp:10, steps:1, maxSteps:1, maxAp:0, combatStrength:0, softAttack:0, hardAttack:0, penetration:0, armor:0, airDefense:0, evasion:0, stealth:0, radarRange:0, range:0, maxFuel:0, maxAmmo:0, name:'补给基地', category:'Civilian', icon:'补', isHQ:false, traits:['SupplySource'], historicalNote:`...`, visuals:{color:'#6b7280', shape:'circle', iconType:'supply', natoSymbol:'none', flag:'none', textColor:'#000'} },
  'NRA_Security': { maxHp:10, steps:1, maxSteps:1, maxAp:12, combatStrength:3.6, softAttack:2.7, hardAttack:0, penetration:0.9, armor:0, airDefense:0, evasion:0, stealth:0.3, radarRange:2, range:1, maxFuel:99, maxAmmo:4, name:'保安团', category:'Ground', icon:'安', isHQ:false, traits:[], historicalNote:`...`, visuals:{color:'#475569', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} },
  'NRA_Brigade': { maxHp:10, steps:1, maxSteps:1, maxAp:16, combatStrength:3.6, softAttack:3.6, hardAttack:0.9, penetration:1.8, armor:0, airDefense:0, evasion:0.09, stealth:0.2, radarRange:2, range:1, maxFuel:99, maxAmmo:6, name:'独立旅', category:'Ground', icon:'旅', isHQ:false, traits:[], historicalNote:`...`, visuals:{color:'#60a5fa', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} },
  'NRA_Guangxi': { maxHp:30, steps:3, maxSteps:3, maxAp:16, combatStrength:7.2, softAttack:5.4, hardAttack:0.9, penetration:0.9, armor:0, airDefense:0, evasion:0.09, stealth:0.4, radarRange:2, range:1, maxFuel:99, maxAmmo:6, name:'桂军', category:'Ground', icon:'桂', isHQ:false, traits:['ChargeBonus'], historicalNote:`...`, visuals:{color:'#3b82f6', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} },
  'NRA_Sichuan': { maxHp:30, steps:3, maxSteps:3, maxAp:16, combatStrength:5.4, softAttack:4.5, hardAttack:0.9, penetration:0.9, armor:0, airDefense:0, evasion:0.09, stealth:0.5, radarRange:2, range:1, maxFuel:99, maxAmmo:5, name:'川军', category:'Ground', icon:'川', isHQ:false, traits:['EntrenchExpert'], historicalNote:`...`, visuals:{color:'#3b82f6', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} },
  'NRA_Hero_Bn': { maxHp:10, steps:1, maxSteps:1, maxAp:16, combatStrength:5.4, softAttack:7.2, hardAttack:1.8, penetration:2.7, armor:0, airDefense:0, evasion:0.27, stealth:0.5, radarRange:2, range:1, maxFuel:99, maxAmmo:20, name:'英雄营', category:'Ground', icon:'勇', isHQ:false, traits:['Elite', 'UrbanExpert', 'EntrenchExpert'], historicalNote:`...`, visuals:{color:'#2563eb', shape:'square', iconType:'sword', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} },
  'NRA_Replacement': { maxHp:10, steps:1, maxSteps:1, maxAp:14, combatStrength:2.7, softAttack:2.7, hardAttack:0, penetration:0.9, armor:0, airDefense:0, evasion:0.045, stealth:0.1, radarRange:1, range:1, maxFuel:99, maxAmmo:4, name:'补充团', category:'Ground', icon:'补', isHQ:false, traits:[], historicalNote:`...`, visuals:{color:'#93c5fd', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#000'} },
  'NRA_Teaching_Corps': { maxHp:20, steps:2, maxSteps:2, maxAp:20, combatStrength:8.1, softAttack:8.1, hardAttack:3.6, penetration:5.4, armor:0, airDefense:2.7, evasion:0.225, stealth:0.4, radarRange:2, range:1, maxFuel:99, maxAmmo:15, name:'教导总队', category:'Ground', icon:'教', isHQ:false, traits:['Elite'], historicalNote:`...`, visuals:{color:'#1d4ed8', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fbbf24'} },
  'NRA_Guerrilla': { maxHp:10, steps:1, maxSteps:1, maxAp:24, combatStrength:2.7, softAttack:3.6, hardAttack:0.9, penetration:0.9, armor:0, airDefense:0, evasion:0.54, stealth:0.8, radarRange:3, range:1, maxFuel:99, maxAmmo:5, name:'游击队', category:'Ground', icon:'游', isHQ:false, traits:['Recon'], historicalNote:`...`, visuals:{color:'#475569', shape:'square', iconType:'infantry', natoSymbol:'recon', flag:'roc', textColor:'#fff'} },
  'NRA_Xiang': { maxHp:30, steps:3, maxSteps:3, maxAp:16, combatStrength:5.4, softAttack:5.4, hardAttack:0.9, penetration:0.9, armor:0, airDefense:0, evasion:0.09, stealth:0.3, radarRange:2, range:1, maxFuel:99, maxAmmo:5, name:'湘军', category:'Ground', icon:'湘', isHQ:false, traits:[], historicalNote:`...`, visuals:{color:'#3b82f6', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} },
  'NRA_Northwest': { maxHp:20, steps:2, maxSteps:2, maxAp:18, combatStrength:4.5, softAttack:6.3, hardAttack:0.9, penetration:0.9, armor:0, airDefense:0, evasion:0.09, stealth:0.2, radarRange:2, range:1, maxFuel:99, maxAmmo:5, name:'西北军', category:'Ground', icon:'西', isHQ:false, traits:['ChargeBonus'], historicalNote:`...`, visuals:{color:'#4b5563', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} },
  'NRA_Northeast': { maxHp:20, steps:2, maxSteps:2, maxAp:16, combatStrength:5.4, softAttack:5.4, hardAttack:1.8, penetration:1.8, armor:0, airDefense:0, evasion:0.09, stealth:0.2, radarRange:2, range:1, maxFuel:99, maxAmmo:8, name:'东北军', category:'Ground', icon:'东', isHQ:false, traits:[], historicalNote:`...`, visuals:{color:'#4b5563', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'roc', textColor:'#fff'} },
  'NRA_Heavy_Arty': { maxHp:10, steps:1, maxSteps:1, maxAp:8, combatStrength:4.5, softAttack:10.8, hardAttack:4.5, penetration:18, armor:0, airDefense:0, evasion:0, stealth:0.1, radarRange:4, range:8, maxFuel:10, maxAmmo:6, name:'150mm重炮', category:'Ground', icon:'150', isHQ:false, traits:['ArtillerySupport'], historicalNote:`...`, visuals:{color:'#334155', shape:'square', iconType:'artillery', natoSymbol:'artillery', flag:'roc', textColor:'#fff'} },

  // IJA UNITS (Red) - Stats increased by ~25%
  'IJA_Infantry': { maxHp: 20, steps: 2, maxSteps: 2, maxAp: 16, maxFuel: 99, maxAmmo: 12, combatStrength: 10, softAttack: 10, hardAttack: 5, penetration: 6.25, armor: 0, airDefense: 1.25, evasion: 0.25, stealth: 0.3, radarRange: 2, range: 1, name: '陆军步兵', category: 'Ground', icon: '步', isHQ: false, historicalNote: `...`, traits: ['PlainsExpert', 'Coordinator', 'Ruthless'], visuals: { color: '#ea580c', shape: 'square', iconType: 'infantry', natoSymbol: 'infantry', flag: 'japan', textColor: '#fff' } },
  'IJN_Marine': { maxHp: 20, steps: 2, maxSteps: 2, maxAp: 20, maxFuel: 99, maxAmmo: 12, combatStrength: 12.5, softAttack: 12.5, hardAttack: 6.25, penetration: 10, armor: 0, airDefense: 2.5, evasion: 0.375, stealth: 0.4, radarRange: 2, range: 1, name: '海军特别陆战队', category: 'Amphibious', icon: 'SNLF', isHQ: false, historicalNote: `...`, traits: ['AmphibiousExpert', 'UrbanExpert', 'Ruthless'], visuals: { color: '#9a3412', shape: 'square', iconType: 'marine', natoSymbol: 'amphib', flag: 'japan', textColor: '#fff' } },
  'IJN_Marine_2': { maxHp:20, steps:2, maxSteps:2, maxAp:20, combatStrength:11.25, softAttack:11.25, hardAttack:6.25, penetration:10, armor:0, airDefense:2.5, evasion:0.375, stealth:0.4, radarRange:2, range:1, maxFuel:99, maxAmmo:12, name:'海军特别陆战队', category:'Amphibious', icon:'SNLF', isHQ:false, historicalNote:`...`, traits:['AmphibiousExpert', 'UrbanExpert', 'Ruthless'], visuals:{color:'#9a3412', shape:'square', iconType:'marine', natoSymbol:'amphib', flag:'japan', textColor:'#fff'} },
  'IJA_HQ': { maxHp:10, steps:1, maxSteps:1, maxAp:12, combatStrength:0, softAttack:0, hardAttack:0, penetration:0, armor:0, airDefense:0, evasion:0.125, stealth:0.2, radarRange:8, range:0, maxFuel:99, maxAmmo:0, name:'司令部', category:'Ground', icon:'HQ', isHQ:true, traits:['Coordinator'], historicalNote:`...`, visuals:{color:'#c2410c', shape:'square', iconType:'hq', natoSymbol:'none', flag:'japan', textColor:'#fff'} },
  'IJN_Cruiser': { maxHp: 40, steps: 4, maxSteps: 4, maxAp: 9, maxFuel: 50, maxAmmo: 99, combatStrength: 25, softAttack: 31.25, hardAttack: 25, penetration: 125, armor: 6.25, airDefense: 6.25, evasion: 0.0, stealth: 0.0, radarRange: 6, range: 7, name: '出云号装甲巡洋舰', category: 'Naval', icon: '出云', isHQ: true, historicalNote: `...`, traits: ['NavalGun', 'SupplySource', 'Ruthless'], visuals: { color: '#c2410c', shape: 'hexagon', iconType: 'ship_cruiser', natoSymbol: 'naval', flag: 'japan', textColor: '#fff' } },
  'IJN_Carrier': { maxHp:50, steps:5, maxSteps:5, maxAp:12, combatStrength:31.25, softAttack:31.25, hardAttack:25, penetration:62.5, armor:5, airDefense:12.5, evasion:0.0, stealth:0.0, radarRange:10, range:4, maxFuel:99, maxAmmo:99, name:'加贺号航空母舰', category:'Naval', icon:'航', isHQ:true, historicalNote:`...`, traits:['SupplySource', 'AirSupport', 'Ruthless'], visuals:{color:'#c2410c', shape:'hexagon', iconType:'ship_cruiser', natoSymbol:'naval', flag:'japan', textColor:'#fff'} },
  'IJN_Bomber': { maxHp:10, steps:1, maxSteps:1, maxAp:17, maxFuel:20, maxAmmo:2, combatStrength:11.25, softAttack:18.75, hardAttack:6.25, penetration:25, armor:0, airDefense:2.5, evasion:0.625, stealth:0.0, radarRange:8, range:2, name:'96式轰炸机', category:'Air', icon:'Bmb', isHQ:false, historicalNote:`...`, traits:['AirSupport', 'Bombardment'], visuals:{color:'#fb923c', shape:'triangle', iconType:'plane', natoSymbol:'air', flag:'japan', textColor:'#fff'} },
  'IJA_Division_Heavy': { maxHp:30, steps:3, maxSteps:3, maxAp:16, combatStrength:11.25, softAttack:11.25, hardAttack:6.25, penetration:7.5, armor:0, airDefense:1.25, evasion:0.25, stealth:0.2, radarRange:2, range:1, maxFuel:99, maxAmmo:15, name:'甲种师团', category:'Ground', icon:'师', isHQ:false, traits:['Coordinator', 'Ruthless'], historicalNote:`...`, visuals:{color:'#c2410c', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'japan', textColor:'#fff'} },
  'IJA_Division_Standard': { maxHp:30, steps:3, maxSteps:3, maxAp:16, combatStrength:10, softAttack:10, hardAttack:5, penetration:6.25, armor:0, airDefense:1.25, evasion:0.25, stealth:0.2, radarRange:2, range:1, maxFuel:99, maxAmmo:14, name:'乙种师团', category:'Ground', icon:'乙', isHQ:false, traits:['Ruthless'], historicalNote:`...`, visuals:{color:'#ea580c', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'japan', textColor:'#fff'} },
  'IJA_Division_Light': { maxHp:30, steps:3, maxSteps:3, maxAp:16, combatStrength:8.75, softAttack:8.75, hardAttack:3.75, penetration:5, armor:0, airDefense:1.25, evasion:0.25, stealth:0.2, radarRange:2, range:1, maxFuel:99, maxAmmo:12, name:'特设师团', category:'Ground', icon:'特', isHQ:false, traits:['Ruthless'], historicalNote:`...`, visuals:{color:'#f97316', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'japan', textColor:'#fff'} },
  'IJA_Kunisaki': { maxHp:20, steps:2, maxSteps:2, maxAp:20, combatStrength:10, softAttack:10, hardAttack:5, penetration:6.25, armor:0, airDefense:1.25, evasion:0.25, stealth:0.3, radarRange:2, range:1, maxFuel:99, maxAmmo:12, name:'国崎支队', category:'Ground', icon:'支', isHQ:false, traits:['AmphibiousExpert', 'Ruthless'], historicalNote:`...`, visuals:{color:'#f97316', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'japan', textColor:'#fff'} },
  'IJA_Brigade': { maxHp:20, steps:2, maxSteps:2, maxAp:16, combatStrength:8.75, softAttack:8.75, hardAttack:3.75, penetration:5, armor:0, airDefense:0, evasion:0.25, stealth:0.2, radarRange:2, range:1, maxFuel:99, maxAmmo:10, name:'混成旅团', category:'Ground', icon:'旅', isHQ:false, traits:[], historicalNote:`...`, visuals:{color:'#ea580c', shape:'square', iconType:'infantry', natoSymbol:'infantry', flag:'japan', textColor:'#fff'} },
  'IJA_Tank_Med': { maxHp:10, steps:1, maxSteps:1, maxAp:24, maxFuel:20, maxAmmo:15, combatStrength:15, softAttack:15, hardAttack:12.5, penetration:50, armor:3.75, airDefense:1.25, evasion:0.125, stealth:0.0, radarRange:3, range:2, name: '八九式中战车', category: 'Ground', icon: 'Tk', isHQ: false, historicalNote: `...`, traits: ['Overrun', 'ArmorBonus', 'Ruthless'], visuals: { color: '#c2410c', shape: 'square', iconType: 'tank_medium', natoSymbol: 'armor', flag: 'japan', textColor: '#fff' } },
  'IJA_Tank_Heavy': { maxHp:10, steps:1, maxSteps:1, maxAp:24, combatStrength:17.5, softAttack:17.5, hardAttack:15, penetration:56.25, armor:5, airDefense:1.25, evasion:0.125, stealth:0.0, radarRange:3, range:2, maxFuel:20, maxAmmo:20, name:'战车联队', category:'Ground', icon:'Tk', isHQ:false, traits:['Overrun', 'ArmorBonus', 'Ruthless'], historicalNote: `...`, visuals:{color:'#9a3412', shape:'square', iconType: 'tank_medium', natoSymbol:'armor', flag:'japan', textColor:'#fff'} },
  'IJA_Tank_Light': { maxHp:10, steps:1, maxSteps:1, maxAp:28, combatStrength:15, softAttack:12.5, hardAttack:7.5, penetration:31.25, armor:2.5, airDefense:0, evasion:0.375, stealth:0.1, radarRange:3, range:2, maxFuel:25, maxAmmo:15, name:'九五式轻战车', category:'Ground', icon:'Lt', isHQ:false, historicalNote: `...`, traits:['Recon', 'ArmorBonus', 'Ruthless'], visuals:{color:'#ea580c', shape:'square', iconType:'tank_light', natoSymbol:'recon', flag:'japan', textColor:'#fff'} },
  'IJA_Heavy_Arty': { maxHp:10, steps:1, maxSteps:1, maxAp:8, combatStrength:10, softAttack:17.5, hardAttack:10, penetration:31.25, armor:0, airDefense:0, evasion:0, stealth:0.1, radarRange:4, range:7, maxFuel:10, maxAmmo:6, name:'重炮兵联队', category:'Ground', icon:'炮', isHQ:false, historicalNote: `...`, traits:['ArtillerySupport'], visuals:{color:'#ea580c', shape:'square', iconType:'artillery', natoSymbol:'artillery', flag:'japan', textColor:'#fff'} }
};

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

    const offset_r = r - OFF_R;
    const wx = (q - OFF_Q) + (offset_r % 2) * 0.5;
    const wy = offset_r;
    
    const vX = (wx / GRID_W) * REF_W;
    const vY = (wy / GRID_H) * REF_H;

    let mapType = 0; 
    let isRiver = false;
    let riverType: 'Major' | 'Minor' | undefined = undefined;

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

    const RAIL_WIDTH = 3.5; 
    
    // Railways
    if (distToSegment(vX, vY, 0, 165, 160, 165) < RAIL_WIDTH) { mapType = 22; }
    else if (distToSegment(vX, vY, 150, 175, 100, 400) < RAIL_WIDTH) { mapType = 21; }
    else if (distToSegment(vX, vY, 160, 165, 290, 40) < RAIL_WIDTH) { mapType = 21; }

    // --- ROAD NETWORK (NEW: High Mobility Corridors) ---
    // Highway 1: Zhabei -> Dachang -> Luodian
    else if (distToSegment(vX, vY, 120, 150, 110, 100) < 3) { mapType = 40; } // Zhabei -> Dachang
    else if (distToSegment(vX, vY, 110, 100, 60, 50) < 3) { mapType = 40; } // Dachang -> Luodian
    else if (distToSegment(vX, vY, 60, 50, 20, 20) < 3) { mapType = 40; } // Luodian -> Liuhe
    
    // Highway 2: Zhabei -> Jiangwan -> Wusong
    else if (distToSegment(vX, vY, 120, 150, 200, 90) < 3) { mapType = 40; } // Zhabei -> Jiangwan
    else if (distToSegment(vX, vY, 200, 90, 305, 35) < 3) { mapType = 40; } // Jiangwan -> Wusong
    
    // Highway 3: Zhabei -> Chenru -> Nanxiang
    else if (distToSegment(vX, vY, 120, 150, 80, 150) < 3) { mapType = 40; } // Zhabei -> Chenru
    else if (distToSegment(vX, vY, 80, 150, 30, 130) < 3) { mapType = 40; } // Chenru -> Nanxiang

    // Rivers
    let riverX;
    if (vY > 250) riverX = 190 + (vY-250)*0.2;
    else if (vY > 180) { const t = (250 - vY) / 70; riverX = 190 - Math.sin(t * Math.PI) * 15; } 
    else { const t = (180 - vY) / 180; riverX = 190 + t * 200; }
    riverX += Math.sin(vY * 0.05) * 3; 

    let riverW = 9; 
    if (vY > 170 && vY < 230) riverW = 14; 

    if (Math.abs(vX - riverX) < riverW) { isRiver = true; riverType = 'Major'; mapType = 1; }

    const suzhouY = 195 + Math.sin((205-vX)/30)*10 + (205-vX)*0.1;
    if (vX < riverX + 5 && Math.abs(vY - suzhouY) < 6.0) { isRiver = true; if (!riverType) riverType = 'Minor'; mapType = 1; }

    // Bridges (Crucial Choke Points)
    // 1. Waibaidu Bridge (Near Bund)
    if (Math.abs(vX - 170) < 3 && Math.abs(vY - 195) < 3) { isRiver = false; mapType = 22; } // Treat as Rail for visual bridge
    // 2. Bazi Bridge
    if (Math.abs(vX - 140) < 3 && Math.abs(vY - 155) < 3) { mapType = 40; }

    if (!isRiver && mapType !== 21 && mapType !== 22 && mapType !== 40) {
        if (vX > riverX) { 
            if (Math.abs(vX - riverX) < 25 && vY > 150 && vY < 250) mapType = 10; else mapType = 0; 
        } else {
            if (vY < suzhouY - 3) {
                if (vX > riverX - 50) mapType = 5; else if (vX > 180) mapType = 5; else mapType = 4;
            } else {
                if (vY < 225) mapType = 2; else if (vY < 255) mapType = 3; else {
                    const dx = vX - 200; const dy = vY - 265; if (dx*dx + dy*dy < 600) mapType = 7; else mapType = 9; 
                }
            }
        }
        
        // Tactical Points (Airfields/Towns)
        if (vX > 95 && vX < 115 && vY > 285 && vY < 300) mapType = 30; // Longhua
        if (distToSegment(vX, vY, 220, 170, 230, 175) < 5) mapType = 10; 
        if (distToSegment(vX, vY, 300, 35, 310, 40) < 8) mapType = 10; 
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
        case 21: return { terrain: 'Road', region: 'Railway_Zone', visualVariant: 'RAILWAY_NS', isRiver: riverFlag, riverType };
        case 22: return { terrain: 'Road', region: 'Railway_Zone', visualVariant: 'RAILWAY_EW', isRiver: riverFlag, riverType };
        case 30: return { terrain: 'Plains', region: 'Rear_Dachang', visualVariant: 'AIRFIELD', isRiver: riverFlag, riverType }; 
        case 40: return { terrain: 'Road', region: 'Rear_Dachang', visualVariant: 'ROAD', isRiver: riverFlag, riverType }; // Road
        case 0:
        case 9:
        default: 
            // Distinguish regions based on location for depth
            let region: RegionId = 'West_Luodian';
            if (vX < 90 && vY > 120) region = 'Rear_Nanxiang';
            else if (vX < 130 && vY < 120) region = 'Rear_Dachang';
            return { terrain: 'Plains', region, visualVariant: 'RURAL', isRiver: riverFlag, riverType };
    }
}

const generateRefugees = () => {
    const refs = [];
    for(let i=0; i<3; i++) refs.push(u('Civilian_Refugee', 'Blue', 180 + i*2, 260, '南市难民群'));
    for(let i=0; i<4; i++) refs.push(u('Civilian_Refugee', 'Blue', 125 + i*3, 160 + (i%2)*2, '闸北难民群'));
    for(let i=0; i<3; i++) refs.push(u('Civilian_Refugee', 'Blue', 160 + i*2, 220, '租界外难民'));
    return refs;
};

const ev = (turn: number, title: string, desc: string, opts: Partial<HistoricalEvent> = {}): HistoricalEvent => ({ 
    id: `evt_${turn}`, turn, title, desc, triggered: false, silent: false, ...opts 
});

export const CORE_SCENARIO: Scenario = {
  id: 'core_sandbox',
  name: '淞沪会战 (全史)',
  desc: '1937年8月13日至11月12日。在日军压倒性的攻势下，坚守上海三个月。',
  mapSize: 50, 
  maxTurns: 216, 
  victoryDesc: {
    Blue: '坚守上海三个月 (216回合)，或消耗日军有生力量。',
    Red: '在时限内彻底击溃国军主力并攻占闸北核心区。',
  },
  initialUnlockedRegions: ['Yangtze_Estuary', 'Core_Zhabei', 'Intl_Settlement', 'Japanese_Sector', 'French_Concession', 'Old_City', 'North_Wusong', 'South_Jinshan', 'West_Luodian', 'Railway_Zone', 'East_Pudong', 'River_Huangpu', 'Rear_Dachang', 'Rear_Nanxiang'],
  initialUnits: [
    ...generateRefugees(),
    // --- BLUE DEPLOYMENT (Staggered Depth) ---
    // 1. Frontline: Zhabei (Elite) - 88th & 87th Divisions
    u('NRA_Elite_Infantry', 'Blue', 120, 150, '第88师 A'), 
    u('NRA_Elite_Infantry', 'Blue', 122, 148, '第88师 B'), 
    u('NRA_Elite_Infantry', 'Blue', 118, 152, '第88师 C'),
    u('NRA_Elite_Infantry', 'Blue', 185, 140, '第87师 A'), 
    u('NRA_Elite_Infantry', 'Blue', 183, 142, '第87师 B'), 
    u('NRA_Elite_Infantry', 'Blue', 180, 140, '第87师 C'),
    
    // 2. Flank/Support: Tax Police & Guards
    u('NRA_Tax_Police', 'Blue', 140, 180, '税警总团 A'), 
    u('NRA_Tax_Police', 'Blue', 142, 178, '税警总团 B'), 
    u('NRA_Guard', 'Blue', 150, 210, '宪兵第3团'),

    // 3. Second Line: Dachang & Jiangwan (Regulars & Reserves)
    u('NRA_Regular_Infantry', 'Blue', 110, 100, '第36师 A (预备)'), 
    u('NRA_Regular_Infantry', 'Blue', 112, 98, '第36师 B (预备)'),
    u('NRA_Teaching_Corps', 'Blue', 105, 105, '教导总队 (预备)'), // Strategic Reserve
    
    // 4. Rear Area: Nanxiang & Chenru (HQs, Artillery, Logistics) - MOVED BACK
    u('NRA_HQ', 'Blue', 30, 130, '第9集团军司令部'), // Nanxiang
    u('NRA_HQ', 'Blue', 80, 150, '上海警备司令部'), // Chenru (Railway Hub)
    
    u('Supply_Depot', 'Blue', 32, 132, '南翔补给站'),
    u('Supply_Depot', 'Blue', 82, 152, '真如补给站'),
    
    u('NRA_Super_Arty', 'Blue', 35, 128, '重炮第10团'), // Safe in rear
    u('NRA_Super_Arty', 'Blue', 78, 148, '重炮第14团'),
    
    u('NRA_AA', 'Blue', 85, 150, '高炮第1营'), // Protecting Hub
    u('NRA_Engineer', 'Blue', 125, 155, '工兵第1营'),

    // 5. Outlying Defenses (Wusong/Baoshan/Pudong) - Thinly manned
    u('NRA_Security', 'Blue', 300, 20, '宝山保安队'), 
    u('NRA_Regular_Infantry', 'Blue', 280, 25, '第98师一部 (吴淞)'),
    u('NRA_Guerrilla', 'Blue', 250, 180, '浦东游击支队'),
    u('NRA_Heavy_Arty', 'Blue', 260, 200, '浦东岸炮连'),

    // --- RED DEPLOYMENT (Historical Start: Limited Ground, Heavy Naval) ---
    // 1. Hongkou Fortress (Marines) - Digging in
    u('IJN_Marine', 'Red', 190, 150, '陆战队第1联队群'),
    u('IJN_Marine', 'Red', 192, 148, '陆战队第2联队群'),
    u('IJA_HQ', 'Red', 195, 145, '海军陆战队司令部'),
    u('IJN_Marine_2', 'Red', 230, 140, '杨树浦守备队'),
    
    // 2. Naval Power (River)
    u('IJN_Cruiser', 'Red', 225, 180, '出云号 (第三舰队旗舰)'),
    u('IJN_Cruiser', 'Red', 300, 80, '第11战队 (炮击支援)'),
    u('IJN_Carrier', 'Red', 366, 20, '加贺号航空母舰'),
    
    // 3. Air Power
    u('IJN_Bomber', 'Red', 360, 25, '第12航空队 A'), 
    u('IJN_Bomber', 'Red', 362, 23, '第12航空队 B'),

    // NOTE: Army main force (3rd/11th Div) spawns via EVENT at Turn 10 to simulate landing!
  ],
  events: [
      ev(1, '国共合作 - 统一战线', '在民族危亡之际，国共两党达成第二次合作，共同抗日。全军士气高涨，凝聚力空前。', {
          buffTitle: '统一战线',
          buffDesc: '前3回合，国军单位核心作战属性(战力/软攻/硬攻)提升15%，士气+15。',
          blueBuffMultiplier: { combatStrength: 1.15, softAttack: 1.15, hardAttack: 1.15 },
          blueBuff: { morale: 15 },
          duration: 3,
          internationalContext: '第二次国共合作的建立获得了共产国际和部分西方国家的积极评价。'
      }),
      ev(2, '八一四空战', '中国空军主动出击，在杭州湾上空痛击日机。高志航首开纪录。', {
          buffTitle: '制空权争夺',
          buffDesc: '国军空军单位攻击力大幅提升，日军空军命中率下降。',
          blueBuffMultiplier: { airDefense: 2.0 },
          redBuffMultiplier: { airDefense: 0.5 },
          duration: 2,
          internationalContext: '列强观察员对中国空军的表现感到意外。'
      }),
      ev(5, '停泊的巨兽', '日军旗舰“出云号”持续以重炮轰击国军阵地。', {
          buffTitle: '巨舰威胁',
          buffDesc: '日军海军单位攻击力+20%。',
          redBuffMultiplier: { combatStrength: 1.2 },
          duration: 5,
      }),
      ev(8, '铁拳计划', '张治中将军发起“铁拳计划”，试图一举将日军赶下黄浦江。', {
          buffTitle: '全面反击',
          buffDesc: '国军全线攻击力+2，但防御力-1。',
          blueBuff: { combatStrength: 2, armor: -1 },
          duration: 3
      }),
      ev(10, '吴淞登陆', '日军第3、第11师团在吴淞炮台附近强行登陆，开辟第二战场。', {
          spawn: [
              {owner: 'Red', unitTemplate: 'IJA_Division_Standard', count: 2, region: 'wusong'}, 
              {owner: 'Red', unitTemplate: 'IJA_Division_Light', count: 2, region: 'wusong'},
              {owner: 'Red', unitTemplate: 'IJA_Tank_Light', count: 1, region: 'wusong'},
              {owner: 'Red', unitTemplate: 'IJA_HQ', count: 1, region: 'wusong'},
              {owner: 'Red', unitTemplate: 'Supply_Depot', count: 1, region: 'wusong'}
          ],
          internationalContext: '日军增兵上海，战事升级为全面会战。'
      }),
      ev(15, '汇山码头突袭', '国军以战车引导步兵突袭汇山码头，试图切断日军。', {
          specificSpawns: [{template: 'NRA_Tax_Police', owner: 'Blue', q: -26, r: 27, name: '税警突击队'}], 
          buffTitle: '决死突击',
          buffDesc: '突击部队士气+20。',
          blueBuff: { morale: 20 },
          duration: 2
      }),
      ev(18, '封锁江阴', '海军决定沉船封锁江阴要塞，阻止日军沿江西进。', {
          buffTitle: '长江封锁',
          buffDesc: '阻止日军大型舰艇进入内河。',
          duration: 99
      }),
      ev(22, '精锐抵达', '第36师等德械精锐部队投入战场。', {
          spawn: [{owner: 'Blue', unitTemplate: 'NRA_Elite_Infantry', count: 2, region: 'center'}],
          buffTitle: '生力军',
          buffDesc: '国军士气小幅回升。',
          blueBuff: { morale: 10 },
          duration: 1
      }),
      ev(24, '宝山孤城', '姚子青营在宝山孤城血战至最后一刻，全员殉国。', {
          buffTitle: '哀兵必胜',
          buffDesc: '全军士气锁定为100，防御力+1，持续3回合。',
          blueBuff: { morale: 100, combatStrength: 1 },
          duration: 3,
          internationalContext: '宝山守军的壮烈牺牲震惊中外。'
      }),
      ev(28, '南站惨案', '日机轰炸上海南站，造成大量平民伤亡。', {
          buffTitle: '悲愤',
          buffDesc: '国军对软攻击+2，但国际舆论压力迫使日军暂停轰炸一回合。',
          blueBuff: { softAttack: 2 },
          redBuffMultiplier: { airDefense: 0.1 },
          duration: 1,
          internationalContext: '南站婴儿哭泣的照片登上了全球报纸头条。'
      }),
      ev(30, '血肉磨坊', '罗店争夺战进入白热化。双方投入重兵，反复拉锯。', {
          buffTitle: '消耗战',
          buffDesc: '罗店区域内所有单位每回合自动扣除5HP。',
          duration: 10
      }),
      ev(35, '制空权易手', '随着战损增加和日军新锐战机投入，中国空军逐渐失去制空权。', {
          buffTitle: '制空权丧失',
          buffDesc: '国军遭受空袭概率增加，日军空军攻击力+20%。',
          redBuffMultiplier: { combatStrength: 1.2 },
          duration: 99
      }),
      ev(40, '毒气阴云', '日军在久攻不下时开始使用毒气弹。', {
          buffTitle: '化学武器',
          buffDesc: '国军防御力-2，士气-10。',
          blueBuff: { combatStrength: -2, morale: -10 },
          duration: 2,
          internationalContext: '违反国际公约的行为受到谴责。'
      }),
      ev(45, '广西狼兵', '李宗仁、白崇禧率领广西子弟兵抵达战场。', {
          spawn: [{owner: 'Blue', unitTemplate: 'NRA_Guangxi', count: 3, region: 'center'}],
          buffTitle: '桂军增援',
          buffDesc: '近战伤害提升。',
          blueBuff: { softAttack: 2 },
          duration: 5
      }),
      ev(50, '蕴藻浜反攻', '国军集结兵力在蕴藻浜发动大规模反击。', {
          buffTitle: '背水反击',
          buffDesc: '国军攻击力+3，但受到的伤害增加20%。',
          blueBuff: { combatStrength: 3 },
          blueBuffMultiplier: { armor: 0.8 },
          duration: 4
      }),
      ev(58, '川军出川', '穿着草鞋的川军部队历经长途跋涉抵达前线。', {
          spawn: [{owner: 'Blue', unitTemplate: 'NRA_Sichuan', count: 4, region: 'center'}],
          buffTitle: '死字旗',
          buffDesc: '川军单位防御力+2。',
          duration: 99
      }),
      ev(65, '重炮轰鸣', '日军从本土调集的重炮兵联队抵达。', {
          spawn: [{owner: 'Red', unitTemplate: 'IJA_Heavy_Arty', count: 2, region: 'wusong'}],
          buffTitle: '火力压制',
          buffDesc: '日军远程火力大幅增强。',
          duration: 99
      }),
      ev(72, '秋雨连绵', '上海进入秋雨季节，道路泥泞。', {
          buffTitle: '泥泞',
          buffDesc: '所有机械化单位移动力减半，空军无法出动。',
          blueBuffMultiplier: { ap: 0.5 },
          redBuffMultiplier: { ap: 0.5 },
          duration: 4
      }),
      ev(78, '前线慰问', '宋美龄亲赴前线慰问伤兵。', {
          buffTitle: '第一夫人',
          buffDesc: '全军恢复10点士气，少量恢复HP。',
          blueBuff: { morale: 10, hp: 5 },
          duration: 1
      }),
      ev(85, '特攻战车', '日军投入更多轻型战车进行自杀式突击。', {
          buffTitle: '玉碎冲锋',
          buffDesc: '日军战车攻击力+5，但自身受到反噬伤害。',
          redBuff: { hardAttack: 5 },
          duration: 3
      }),
      ev(90, '双十国庆', '在战火中迎来了国庆日。', {
          buffTitle: '勿忘国耻',
          buffDesc: '国军全军士气+20，AP恢复速度提升。',
          blueBuff: { morale: 20, ap: 5 },
          duration: 2
      }),
      ev(95, '东北军增援', '吴克仁率领第67军赶到，决心洗刷不抵抗的耻辱。', {
          spawn: [{owner: 'Blue', unitTemplate: 'NRA_Northeast', count: 2, region: 'center'}],
          buffTitle: '雪耻',
          buffDesc: '东北军单位攻击力+2。',
          duration: 99
      }),
      ev(100, '大场失守', '大场阵地被突破，国军侧翼暴露，被迫全线撤退至苏州河南岸。', {
          buffTitle: '全线撤退',
          buffDesc: '国军全军撤退移动力增加，但防御力下降。',
          blueBuff: { ap: 4, combatStrength: -2 },
          duration: 2
      }),
      ev(104, '四行孤军', '谢晋元率部死守四行仓库，掩护主力撤退。', {
          specificSpawns: [{template: 'NRA_Hero_Bn', owner: 'Blue', q: -8, r: -1, name: '谢晋元团'}], 
          buffTitle: '精神堡垒',
          buffDesc: '英雄营单位获得极高防御，每回合提供VP。',
          duration: 12,
          internationalContext: '租界内的外媒全程直播了这场战斗，中国军人的勇气赢得了世界的尊重。'
      }),
      ev(108, '难民潮', '数十万难民涌入租界。', {
          buffTitle: '人道主义危机',
          buffDesc: '非租界区域移动消耗增加。',
          duration: 5
      }),
      ev(115, '杭州湾迷雾', '大雾笼罩杭州湾，侦察报告中断。', {
          buffTitle: '情报盲区',
          buffDesc: '国军无法侦测杭州湾方向的动态。',
          duration: 2
      }),
      ev(120, '金山卫登陆', '日军第10军在杭州湾北岸金山卫偷袭登陆，国军防线彻底崩溃。', {
          spawn: [{owner: 'Red', unitTemplate: 'IJA_Division_Heavy', count: 3, region: 'pudong'}],
          buffTitle: '总崩盘',
          buffDesc: '国军士气-50，陷入混乱。',
          blueBuff: { morale: -50 },
          duration: 99,
          internationalContext: '日军的侧翼包抄战术彻底改变了战局。'
      }),
      ev(130, '松江阻击', '为了掩护大部队撤退，少量部队在松江死守。', {
          spawn: [{owner: 'Blue', unitTemplate: 'NRA_Regular_Infantry', count: 2, region: 'pudong'}], 
          buffTitle: '最后阻击',
          buffDesc: '阻击部队防御力+3。',
          duration: 5
      }),
      ev(140, '突破苏州河', '日军强渡苏州河，进入租界以外的市区。', {
          buffTitle: '防线瓦解',
          buffDesc: '苏州河防线失效，日军移动不再受河流惩罚。',
          duration: 99
      }),
      ev(150, '告别上海', '国军主力向南京方向总撤退。上海沦陷。', {
          buffTitle: '战役结束',
          buffDesc: '进入战役结算阶段。',
          duration: 1
      })
  ],
  mapGenerator: generateShanghaiMap
};

function generateTutorialMap(q: number, r: number): MapData {
    if (Math.abs(q) > 8 || Math.abs(r) > 8) return { terrain: 'DeepOcean', region: 'Yangtze_Estuary' };

    // Water to the far East only (for Ship placement)
    if (q >= 4) return { terrain: 'DeepOcean', region: 'Yangtze_Estuary', visualVariant: 'WATER' };

    // Specific Land setup for tutorial flow
    if (q === 0 && r === 0) return { terrain: 'Urban', region: 'Core_Zhabei', visualVariant: 'ZHABEI', label: "起始点" };
    if (q === 1 && r === 0) return { terrain: 'Plains', region: 'Core_Zhabei', visualVariant: 'RURAL' }; // Move Target
    if (q === 2 && r === 0) return { terrain: 'Urban', region: 'Core_Zhabei', visualVariant: 'RUINS' }; // Enemy Inf
    if (q === 2 && r === 1) return { terrain: 'Plains', region: 'Core_Zhabei', visualVariant: 'RURAL' }; // Enemy Tank
    
    // Default Land
    return { terrain: 'Plains', region: 'West_Luodian', visualVariant: 'RURAL' };
}

export const TUTORIAL_SCENARIO: Scenario = {
    id: 'tutorial_basic',
    name: '基础战术训练',
    desc: '模拟战场环境，熟悉指挥系统。',
    mapSize: 8,
    maxTurns: 99,
    victoryDesc: { Blue: '完成训练目标', Red: '无' },
    initialUnlockedRegions: ['Core_Zhabei', 'Yangtze_Estuary', 'West_Luodian', 'East_Pudong', 'River_Huangpu'],
    initialUnits: [], // Handled dynamically
    events: [],
    mapGenerator: generateTutorialMap
};
