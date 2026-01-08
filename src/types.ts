
export type TerrainType = 'DeepOcean' | 'Coastal' | 'Plains' | 'Mountains' | 'Urban' | 'Marsh' | 'Road';
export type UnitCategory = 'Naval' | 'Air' | 'Ground' | 'Amphibious' | 'Civilian';
export type ArmorType = 'Soft' | 'Hard' | 'Air' | 'Naval';
export type PlayerId = 'Red' | 'Blue' | 'Neutral';
export type Visibility = 'Hidden' | 'Unknown' | 'Identified';
export type GamePhase = 'Setup' | 'WeatherCheck' | 'SupplyCheck' | 'PlayerInput' | 'AIProcessing' | 'NeutralActivity' | 'EventResolution' | 'GameOver';
export type GameMode = 'MENU' | 'CLASSIC' | 'MISSION' | 'TUTORIAL' | 'ACHIEVEMENTS'; // Added ACHIEVEMENTS
export type WeatherCondition = 'Sunny' | 'Rain' | 'Typhoon';
export type SupplyState = 'Supplied' | 'Unsupplied' | 'Isolated';

// New: Geographic Regions for phased unlocking
export type RegionId = 
  | 'Core_Zhabei'       // The main grinder (North of Creek)
  | 'Intl_Settlement'   // South of Creek (Protected/Urban)
  | 'French_Concession' // New
  | 'Japanese_Sector'   // Hongkou/Yangpu
  | 'Old_City'          // Nanshi
  | 'River_Huangpu'     // The water itself
  | 'East_Pudong'       // East bank
  | 'North_Wusong'      // Forts
  | 'West_Luodian'      // Blood mill
  | 'South_Jinshan'     // Landing zone
  | 'Yangtze_Estuary'   // Deep water
  | 'Railway_Zone'      // North Station Line
  | 'Rear_Dachang'      // New: Second Line
  | 'Rear_Nanxiang';    // New: Deep Rear

// NEW: Player Skills (Command Cards)
export interface PlayerSkill {
  id: string;
  name: string;
  cost: number; // Command Points cost
  icon: string; // Emoji or short code
  description: string;
  type: 'AI_ANALYSIS' | 'BUFF' | 'REINFORCE' | 'TACTICAL' | 'PASSIVE';
  cooldown?: number; // Turns until reusable
  maxUses?: number; // 99 for infinite
  effect?: string; // ID of the buff to apply
}

// --- SAVE SYSTEM TYPES ---
export interface SaveSlot {
  id: number;
  isEmpty: boolean;
  name?: string;
  date?: string; // Formatted date string
  timestamp?: number; // For sorting
  turn?: number;
  faction?: PlayerId;
  preview?: string; // E.g. "Turn 5 - Blue - Rain"
}

export interface GameSaveState {
  version: string;
  timestamp: number;
  name: string;
  turn: number;
  faction: PlayerId;
  gameMode: GameMode;
  scenarioId: string;
  
  // State Data
  units: Unit[];
  hexMapData: [string, HexCell][]; // Map converted to array
  weather: WeatherCondition;
  commandPoints: number;
  blueCasualties: number;
  redCasualties: number;
  accumulatedVp: number;
  activeBuffs: ActiveBuff[];
  activeEvent: HistoricalEvent | null;
  
  // Collections converted to arrays
  unlockedRegions: RegionId[];
  claimedCpRegions: string[];
  activeDoctrines: string[];
  skillCooldowns: [string, number][];
  skillUses: [string, number][];
  
  // NEW: Persist Region Control
  regionOwnership: [string, PlayerId][]; 
}

// --- NEW ACHIEVEMENT TYPES ---
export type AchievementRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface Achievement {
  id: string;
  title: string;
  desc: string; // How to unlock
  flavor?: string; // Historical context or flavor text
  rarity: AchievementRarity;
  isUnlocked: boolean;
  icon: string; // Character or symbol
  progress?: number; // Current progress
  maxProgress?: number; // Goal
  dateUnlocked?: string;
}

export interface AchievementStats {
    total: number;
    unlocked: number;
    desc: string;
    color: string;
    displayName: string;
    globalRate?: string;
}

export interface AchievementNotification {
    achievement: Achievement;
    timestamp: number;
}

export interface UnitVisuals {
  color: string;
  shape: 'square' | 'triangle' | 'hexagon' | 'circle';
  // New specific icon type for realistic silhouettes
  iconType: 'infantry' | 'tank_light' | 'tank_medium' | 'artillery' | 'at_gun' | 'plane' | 'ship_cruiser' | 'ship_boat' | 'civilian' | 'marine' | 'sword' | 'hq' | 'supply' | 'engineer' | 'aa_gun';
  natoSymbol: 'infantry' | 'armor' | 'recon' | 'artillery' | 'air' | 'naval' | 'amphib' | 'none';
  flag: 'roc' | 'japan' | 'none';
  textColor: string;
}

export interface UnitStats {
  hp: number; // Used as "Strength Points" (SP) now. 1 Step = 10 HP conceptually, or raw numbers.
  maxHp: number;
  steps: number; // Current Steps
  maxSteps: number; // Max Steps (e.g., 2 for Divisions, 1 for small units)
  
  ap: number;
  maxAp: number;
  fuel: number;
  maxFuel: number;
  ammo: number;
  maxAmmo: number;
  
  // Combat Strength (C-Value)
  combatStrength: number; // Full strength combat value (e.g. 8, 10, 12)
  
  // Detailed Combat Stats (New)
  softAttack: number;
  hardAttack: number;
  penetration: number;

  // Modifiers
  armor: number;      
  airDefense: number; 
  evasion: number;    

  // Electronic Warfare / Recon
  suppression: number; 
  stealth: number;     
  radarRange: number;  

  range: number;
  name: string;
  historicalName?: string; 
  historicalNote?: string; // New field for historical background
  category: UnitCategory;
  isHQ: boolean; // Is this a Headquarters unit?
  icon: string;
  
  // Special Abilities
  traits?: string[];
  
  // Rendering
  visuals: UnitVisuals;
  
  // Advanced Mechanics
  morale: number;   // 0-100. <30 = Panic
  fatigue: number;  // 0-100.
  supplyState: SupplyState;
}

export interface Unit extends UnitStats {
  id: string;
  owner: PlayerId;
  q: number;
  r: number;
  hasMoved: boolean;
  hasAttacked: boolean;
  visibility: Visibility;
  lastFiredTurn?: number;
  moveCount?: number;
}

export interface HexCell {
  q: number;
  r: number;
  s: number;
  terrain: TerrainType;
  unitId: string | null;
  stackIds?: string[]; // IDs of all units in this hex (max 4 or 8)
  region: RegionId; 
  label?: string; 
  vp?: number;
  visualVariant?: string; 
  isRiver?: boolean; // For crossing checks
  riverType?: 'Major' | 'Minor';
  
  // Dynamic Terrain States
  isFortified?: boolean; // Def +4
  isBlocked?: boolean;   // Impassable (Sunken ships) or Ruined Road
  isScorched?: boolean;  // No supply
  isBridged?: boolean;   // Pontoon bridge constructed
}

export interface MapData {
  terrain: TerrainType;
  region: RegionId;
  label?: string;
  vp?: number;
  visualVariant?: string; 
  isRiver?: boolean;
  riverType?: 'Major' | 'Minor';
}

export interface TerrainRule {
  moveCost: number; // AP Cost to enter
  defenseMultiplier: number; // New: x1.0, x1.5 etc
  attackPenalty: number; // New: -1, -2 etc
  stackLimit: number; // Max units
  visionRange: number;
  visionBlock: boolean;
}

// Combat Results (CRT)
// AE: Attacker Elim, AR: Attacker Retreat, DD: Defender Disrupted (No retreat, step loss + morale), DR: Defender Retreat, DE: Defender Elim
export type CrtResultType = 'AE' | 'AR2' | 'AR1' | 'DR1' | 'DD1' | 'DD2' | 'DE' | 'NE';

export interface CombatContext {
    isNight: boolean;
    weather: WeatherCondition;
    isBackToRiver: boolean;
    isUrbanAssaultNoEng: boolean;
    isFlanking: boolean;
    hasAirSupport: boolean;
    hasNavalSupport: boolean;
    hasArmorSupport: boolean;
    isSurrounded?: boolean;
    isCoastalAssault?: boolean;
}

export interface CombatResult {
  attackerId: string;
  defenderId: string;
  odds: string; // "3:1"
  dieRoll: number; // 2D6
  modifiers: number;
  resultType: CrtResultType;
  attackerLoss: number; // Steps lost
  defenderLoss: number; // Steps lost
  attackerRetreat: number; // Hexes
  defenderRetreat: number; // Hexes
  defenderMoraleLoss: number; 
  log: string[];
}

// VFX Events
export type GameEventType = 'MOVE' | 'ATTACK' | 'EXPLOSION' | 'SCAN_PING' | 'RICOCHET' | 'DESTRUCTION' | 'REINFORCEMENT' | 'ATROCITY' | 'ENCOUNTER' | 'REGION_UNLOCK' | 'MORALE_BREAK' | 'WEATHER_CHANGE' | 'SUPPLY_CHECK' | 'SMOKE' | 'SPAWN' | 'CONSTRUCTION' | 'TORPEDO' | 'BUFF' | 'TEXT';

export interface GameEvent {
  type: GameEventType;
  q: number; // Target coordinates
  r: number;
  sourceQ?: number; // Attacker coordinates (for tracers)
  sourceR?: number;
  intensity?: number; // 0.0 - 1.0 for shake magnitude
  message?: string; // For combat logs
  unitCategory?: UnitCategory; // For differentiated VFX
  owner?: PlayerId;
}

export interface SpawnConfig {
    owner: PlayerId;
    unitTemplate: string;
    count: number;
    region: 'wusong' | 'shanghai_docks' | 'baoshan' | 'center' | 'urban_random' | 'luodian' | 'pudong';
}

export interface HistoricalEvent {
  id: string;
  turn: number;
  title: string;
  desc: string;
  buffTitle?: string; 
  buffDesc?: string; 
  internationalContext?: string; // New field for International Impact
  silent?: boolean; 
  blueBuff?: Partial<UnitStats>;
  redBuff?: Partial<UnitStats>;
  blueBuffMultiplier?: Partial<{[K in keyof UnitStats]?: number}>; // Multiplicative buffs
  redBuffMultiplier?: Partial<{[K in keyof UnitStats]?: number}>;
  duration?: number; // Days (needs conversion to turns)
  
  // Reinforcements
  spawn?: SpawnConfig[]; 
  specificSpawns?: {     
      template: string;
      owner: PlayerId;
      q: number;
      r: number;
      name: string;
  }[];

  unlockRegions?: RegionId[]; 
  triggered: boolean;
  repeatEvery?: number; 
}

export interface ActiveBuff {
  title: string;
  desc: string;
  internationalContext?: string;
  expiryTurn: number;
  sourceEvent: string;
  blueBuff?: Partial<UnitStats>;
  redBuff?: Partial<UnitStats>;
  blueBuffMultiplier?: Partial<{[K in keyof UnitStats]?: number}>;
  redBuffMultiplier?: Partial<{[K in keyof UnitStats]?: number}>;
  targetUnitId?: string;
  targetRegion?: RegionId;
  data?: any;
}

export interface VictoryReport {
  winner: PlayerId;
  title: string;
  subTitle: string;
  turn: number;
  date: string;
  durationDays: number;
  historyEval: string;
  stats: { label: string; value: string | number }[];
  vp: { 
    base: number; 
    speed: number; 
    casualty: number; 
    total: number; 
    speedRating: string; // "闪电歼灭"
    casualtyRating: string; // "完美包围"
  };
  rank: 'S+' | 'S' | 'A' | 'B' | 'F';
  rankTitle: string; 
  nextOptions: { label: string; desc: string; action: string }[];
}

export interface Scenario {
  id: string;
  name: string;
  desc: string;
  mapSize: number; // Radius
  maxTurns: number;
  victoryDesc: {
    Blue: string;
    Red: string;
  };
  initialUnlockedRegions: RegionId[]; 
  initialUnits: {
     template: string;
     owner: PlayerId;
     q: number;
     r: number;
     customName?: string;
  }[];
  events: HistoricalEvent[];
  mapGenerator: (q: number, r: number) => MapData;
}

export type TutorialStepKey = 
  | 'WELCOME' | 'CAMERA' | 'SELECT_UNIT' | 'UI_INFO'
  | 'MOVE' | 'ZOC' | 'ATTACK_INF'
  | 'SELECT_ARTY' | 'EXPLAIN_ARMOR' | 'ATTACK_TANK'
  | 'UI_SKILLS' | 'USE_BUFF' | 'USE_TACTICAL'
  | 'END_TURN' | 'FREE_COMBAT' | 'CONCLUSION';

export interface TutorialStep {
  key: TutorialStepKey;
  title: string;
  text: string;
  highlightHex?: {q: number, r: number};
  highlightUi?: 'info-panel' | 'attack-btn' | 'end-turn-btn' | 'unit-stats' | 'map' | 'player-unit' | 'enemy-unit' | 'command-deck' | 'buff-btn';
  panTo?: {q: number, r: number};
  zoomTo?: number;
  waitForAction: 'ANY_KEY' | 'SELECT' | 'MOVE' | 'ATTACK' | 'END_TURN' | 'PAN' | 'ZOOM' | 'SKILL' | 'SKILL_TARGET' | 'VICTORY_CONDITION';
  actionButtonText?: string;
  allowedHex?: {q: number, r: number}; 
  restrictInteraction?: boolean; 
  requiredTargetId?: string; // If attacking, must target this
}

export interface TutorialState {
  active: boolean;
  stepIndex: number;
  currentStep: TutorialStep | null;
}
