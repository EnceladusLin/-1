
import { Injectable, computed, signal, effect, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { HexCell, Unit, TerrainType, UnitCategory, PlayerId, CombatResult, Visibility, GameEvent, HistoricalEvent, GamePhase, Scenario, SpawnConfig, ActiveBuff, UnitStats, RegionId, MapData, GameMode, TutorialState, TutorialStep, TutorialStepKey, WeatherCondition, SupplyState, VictoryReport, PlayerSkill, CombatContext, Achievement, AchievementRarity, AchievementNotification, SaveSlot, GameSaveState } from '../types';
import { TERRAIN_RULES, UNIT_TEMPLATES, CORE_SCENARIO, BASE_AP } from '../mechanics';
import { resolveCombat } from './combat.utils';
import { AudioService } from './audio.service';

// --- NRA SKILLS (BLUE) ---
const BLUE_SKILLS: PlayerSkill[] = [
    { id: 'CHIANG_MICRO', name: '校长手令', cost: 0, icon: 'CMD', description: '请求最高统帅部直接干预。获取基于当前战局的微操指令与战术申斥。', type: 'AI_ANALYSIS', cooldown: 0, maxUses: 99 },
    { id: 'LUODIAN_OATH', name: '罗店血誓', cost: 12, icon: 'DEF', description: '罗店区域防御等级提升(+3)，全员士气锁定，持续20回合。', type: 'BUFF', cooldown: 40, maxUses: 99 },
    { id: 'AIR_RAID_814', name: '八一四空袭', cost: 12, icon: 'AIR', description: '呼叫空军第4大队对指定坐标进行轰炸。造成直接伤害 (10-20 HP)。', type: 'TACTICAL', cooldown: 3, maxUses: 99 },
    { id: 'YAO_DEFENSE', name: '死守孤城', cost: 0, icon: 'PAS', description: '[被动协议] 被包围单位防御力大幅提升 (+4)，直至战至最后一人。', type: 'PASSIVE', cooldown: 0, maxUses: 1 },
    { id: 'SIHANG_FLAG', name: '四行孤军', cost: 15, icon: 'BST', description: '指定单位防御力 x3，每回合提供政治影响力 (VP+2)，持续12回合。', type: 'BUFF', cooldown: 999, maxUses: 1 },
    { id: 'SICHUAN_REINFORCE', name: '川军增援', cost: 12, icon: 'RF+', description: '紧急动员。在指定区域快速部署5个师级单位与2个旅级支援单位。', type: 'REINFORCE', cooldown: 50, maxUses: 99 },
    { id: 'FINAL_LINE', name: '最后防线', cost: 18, icon: 'FRT', description: '工兵紧急作业，将指定区域及周围地块升级为永久工事。', type: 'TACTICAL', cooldown: 999, maxUses: 1 },
    { id: 'STRAT_RETREAT', name: '战略转移', cost: 10, icon: 'MOV', description: '全军获得“急行军”状态 (AP+2)，且移动时无视敌军控制区 (ZOC)。', type: 'BUFF', cooldown: 999, maxUses: 1 },
    { id: 'BLOCK_RIVER', name: '沉船封江', cost: 10, icon: 'BLK', description: '在指定航道沉船。永久阻断日军舰船进入内河航道。', type: 'TACTICAL', cooldown: 999, maxUses: 2 },
    { id: 'RAIL_SABOTAGE', name: '破路战术', cost: 5, icon: 'SAB', description: '破坏铁路设施，阻断日军快速机动。', type: 'TACTICAL', cooldown: 15, maxUses: 99 },
    { id: 'SCORCHED_EARTH', name: '焦土抗战', cost: 15, icon: 'BRN', description: '将区域化为焦土。敌军在该区域内无法获得任何补给。', type: 'TACTICAL', cooldown: 999, maxUses: 1 },
    { id: 'INFILTRATION', name: '敌后渗透', cost: 8, icon: 'INF', description: '在敌军后方随机位置生成精锐游击队单位。', type: 'REINFORCE', cooldown: 20, maxUses: 99 },
    { id: 'AIR_DROP', name: '空投补给', cost: 10, icon: 'SPL', description: '为空投区内的被围困部队恢复补给状态，并恢复HP。', type: 'BUFF', cooldown: 5, maxUses: 99 },
    { id: 'TORPEDO_RAID', name: '雷艇夜袭', cost: 5, icon: 'NAV', description: '派遣史可法中队夜袭日军舰船。高几率重创装甲目标。', type: 'TACTICAL', cooldown: 10, maxUses: 99 },
    { id: 'EMERGENCY_SUPPLY', name: '紧急征粮', cost: 12, icon: 'LOG', description: '立即解决全军补给问题，全员恢复补给状态。', type: 'TACTICAL', cooldown: 30, maxUses: 99 },
    { id: 'GUERRILLA_PASSIVE', name: '全民皆兵', cost: 0, icon: 'PAS', description: '[被动协议] 每10回合在随机区域自动组建游击队。', type: 'PASSIVE', cooldown: 0, maxUses: 1 }
];

// --- IJA/IJN SKILLS (RED) ---
const RED_SKILLS: PlayerSkill[] = [
    { id: 'AI_ADVISOR', name: '参谋推演', cost: 0, icon: 'INT', description: '启动大本营战术计算机。分析敌军弱点并制定进攻路线。', type: 'AI_ANALYSIS', cooldown: 0, maxUses: 99 },
    { id: 'JP_ENCIRCLE', name: '三面合围', cost: 10, icon: 'TAC', description: '战术指令：全军攻击力+2，并压制敌军防御 (-2)，持续1回合。', type: 'BUFF', cooldown: 30, maxUses: 99 },
    { id: 'JP_HANGZHOU_SURPRISE', name: '金山卫登陆', cost: 20, icon: 'OPS', description: '战略级行动。第10军在杭州湾登陆，切断国军退路 (+10VP)。', type: 'REINFORCE', cooldown: 999, maxUses: 1 },
    { id: 'JP_AERIAL_STRANGLE', name: '航空绞杀', cost: 10, icon: 'AIR', description: '发动全面空袭。瘫痪敌军指挥与交通，下回合敌军AP减半。', type: 'TACTICAL', cooldown: 20, maxUses: 99 },
    { id: 'JP_IRON_WALL', name: '铁壁攻坚', cost: 15, icon: 'AMR', description: '步坦协同战术。无视敌军工事加成，对硬攻击大幅提升 (+5)。', type: 'BUFF', cooldown: 40, maxUses: 99 },
    { id: 'JP_PACIFICATION', name: '治安肃清', cost: 8, icon: 'SWP', description: '[主动] 强制侦察大范围区域 [被动] 自动攻击邻近游击队。', type: 'TACTICAL', cooldown: 15, maxUses: 99 },
    { id: 'JP_BRIDGE', name: '强渡作业', cost: 8, icon: 'ENG', description: '工兵架设浮桥。全军本回合获得“两栖”特性，无视河流惩罚。', type: 'BUFF', cooldown: 20, maxUses: 99 },
    { id: 'JP_ARMORED_WEDGE', name: '装甲楔形', cost: 8, icon: 'BLZ', description: '闪击战术。所有坦克单位AP回满，且本回合攻击力+5。', type: 'BUFF', cooldown: 15, maxUses: 99 },
    { id: 'JP_ARMORED_PATROL', name: '装甲巡逻', cost: 0, icon: 'PAS', description: '[被动协议] 所有装甲单位基础AP+2。', type: 'PASSIVE', cooldown: 0, maxUses: 1 },
    { id: 'JP_ARMORED_PINCER', name: '铁钳合围', cost: 15, icon: 'KIL', description: '歼灭战术。全歼敌军单位获得的VP翻倍，持续2回合。', type: 'BUFF', cooldown: 30, maxUses: 99 },
    { id: 'JP_SABOTAGE', name: '特工破坏', cost: 8, icon: 'SPY', description: '发动谍报网。随机削减国军 CP 或造成混乱。', type: 'TACTICAL', cooldown: 15, maxUses: 99 },
    { id: 'JP_PARATROOPER', name: '空挺突袭', cost: 20, icon: 'PRT', description: '空投精锐伞兵至指定位置。', type: 'REINFORCE', cooldown: 999, maxUses: 1 },
    { id: 'JP_CARRIER_STRIKE', name: '航母打击', cost: 5, icon: 'CVN', description: '针对沿海/沿江区域的饱和轰炸。对目标及周围造成伤害。', type: 'TACTICAL', cooldown: 5, maxUses: 99 },
    { id: 'JP_NAVAL_GUN', name: '舰炮延伸', cost: 5, icon: 'BMB', description: '校准舰炮射击诸元。全军获得舰炮支援加成(+2骰)，持续3回合。', type: 'BUFF', cooldown: 8, maxUses: 99 },
    { id: 'JP_BLOCKADE', name: '海上封锁', cost: 8, icon: 'BLK', description: '切断海上通道。极大降低敌军下回合的补给成功率。', type: 'TACTICAL', cooldown: 20, maxUses: 99 }
];

const TUTORIAL_PLAYER_Q = -27;
const TUTORIAL_PLAYER_R = -18;
const TUTORIAL_ENEMY_Q = -25;
const TUTORIAL_ENEMY_R = -18;

const TUTORIAL_STEPS: TutorialStep[] = [
    { key: 'WELCOME', title: '战术模拟：包围战', text: '欢迎指挥官。当前局势：<strong>我军 9 个作战单位 vs 敌军 4 个单位</strong>。您拥有绝对的兵力优势。<br>您的目标是利用人海战术，彻底歼灭入侵者。', waitForAction: 'ANY_KEY', actionButtonText: '开始部署', restrictInteraction: true },
    { key: 'CAMERA_PAN', title: '观察战场', text: '按住鼠标<strong>拖动</strong>以观察战局。请确保您能看到所有友军单位。', waitForAction: 'PAN', restrictInteraction: true },
    { key: 'CAMERA_ZOOM', title: '调整视野', text: '使用<strong>鼠标滚轮</strong>缩放视野。', waitForAction: 'ZOOM', restrictInteraction: true },
    { key: 'SELECT_UNIT', title: '选择指挥官', text: '点击中央的<strong>德械步兵师</strong>（带星标）。这是您的核心主力。', waitForAction: 'SELECT', panTo: { q: TUTORIAL_PLAYER_Q, r: TUTORIAL_PLAYER_R }, zoomTo: 2.5, highlightHex: { q: TUTORIAL_PLAYER_Q, r: TUTORIAL_PLAYER_R }, restrictInteraction: true },
    { key: 'MOVE', title: '机动包抄', text: '移动是战术的灵魂。请移动至<strong>高亮位置</strong>，与敌军形成接触。', waitForAction: 'MOVE', highlightUi: 'map', allowedHex: { q: -26, r: -18 }, restrictInteraction: true },
    { key: 'ZOC_INTRO', title: '控制区 (ZOC) 警告', text: '您已进入敌军控制区（ZOC）。通常这会耗尽AP，但精锐单位依然保留攻击能力。', waitForAction: 'ANY_KEY', actionButtonText: '准备战斗', restrictInteraction: true },
    { key: 'ATTACK', title: '火力试探', text: '敌军就在眼前。点击目标<strong>日军步兵</strong>发起第一轮攻击！', waitForAction: 'ATTACK', highlightUi: 'player-unit', restrictInteraction: true },
    { key: 'END_TURN', title: '结束回合', text: '战斗会消耗行动点 (AP)。当AP耗尽时，必须结束回合。<br>点击左下角的<strong>[执行 / EXECUTE]</strong>按钮。<br>在兵棋中，这代表<strong>“结束当前回合”</strong>并结算所有行动。', waitForAction: 'ANY_KEY', highlightUi: 'end-turn-btn', restrictInteraction: true, actionButtonText: '明白，准备结束回合' },
    { key: 'SKILL_BUFF', title: '状态增益 (Buffs)', text: '注意顶部栏的<strong>[效果]</strong>指示器。这里显示当前的<strong>全局被动加成</strong>（如士气高昂、天气影响）。<br>无需主动操作，它们会自动增加您的战斗骰点。', waitForAction: 'ANY_KEY', highlightUi: 'info-panel', restrictInteraction: true, actionButtonText: '收到' },
    { key: 'SKILL_INTRO', title: '指挥台权限解锁', text: '单纯的攻击效率太低。您已获得 <strong>100 指挥点数 (CP)</strong>。现在，我们将演练核心战术技能的使用。', waitForAction: 'ANY_KEY', highlightUi: 'command-deck', actionButtonText: '开启指挥台', restrictInteraction: true },
    { key: 'SKILL_AIR', title: '技能：八一四空袭', text: '呼叫空中支援！使用代号 <strong>[AIR]</strong> 的卡牌，直接对日军造成打击。', waitForAction: 'SKILL', highlightUi: 'command-deck', restrictInteraction: true },
    { key: 'FINAL_BATTLE', title: '总攻时刻', text: '战术教学结束。现在，<strong>利用您手中的一切力量，将剩余的日军全部歼灭！</strong><br><br>提示：每轮攻击后，记得点击左下角的“执行”来推进回合。', waitForAction: 'ANY_KEY', actionButtonText: '全军突击 (等待胜利)', restrictInteraction: false }
];

const RAW_ACHIEVEMENTS: Achievement[] = [
    { id: 'c_recruit', title: '新兵报到', desc: '完成新手教程战役', rarity: 'COMMON', isUnlocked: false, icon: '🪖', flavor: '欢迎来到淞沪绞肉机。' },
    { id: 'c_first_blood', title: '第一滴血', desc: '在战役中消灭任意敌军单位', rarity: 'COMMON', isUnlocked: false, icon: '🩸', flavor: '战争的残酷才刚刚开始。' },
    { id: 'c_move_master', title: '急行军', desc: '单回合内移动超过10个单位', rarity: 'COMMON', isUnlocked: false, icon: '👢', flavor: '兵贵神速。' },
    { id: 'c_artillery_barrage', title: '火力覆盖', desc: '使用火炮单位进行攻击', rarity: 'COMMON', isUnlocked: false, icon: '💥', flavor: '真理只在大炮射程之内。' },
    { id: 'c_reinforcement', title: '援军抵达', desc: '使用“增援”类技能召唤部队', rarity: 'COMMON', isUnlocked: false, icon: '🎺', flavor: '坚持住，援军到了！' },
    { id: 'c_skill_user', title: '战术指令', desc: '在一局游戏中使用5次指挥官技能', rarity: 'COMMON', isUnlocked: false, icon: '📡', flavor: '指挥若定。' },
    { id: 'c_logistics', title: '后勤补给', desc: '保持所有单位处于“补给充足”状态连续5回合', rarity: 'COMMON', isUnlocked: false, icon: '📦', flavor: '外行谈战略，内行谈后勤。' },
    { id: 'c_recon_star', title: '战场侦察', desc: '发现5个处于“隐藏”状态的敌军单位', rarity: 'COMMON', isUnlocked: false, icon: '🔭', flavor: '知己知彼。' },
    { id: 'c_defender', title: '阵地防御', desc: '成功防御一次敌军攻击且未撤退', rarity: 'COMMON', isUnlocked: false, icon: '🛡️', flavor: '这里就是我们的家园，一步也不能退。' },
    { id: 'c_medic', title: '战地医疗', desc: '使用技能或补给恢复单位HP', rarity: 'COMMON', isUnlocked: false, icon: '🩹', flavor: '保存有生力量。' },
    { id: 'c_night_ops', title: '夜间行动', desc: '在夜间回合发动一次攻击', rarity: 'COMMON', isUnlocked: false, icon: '🌑', flavor: '月黑风高。' },
    { id: 'c_rainy_day', title: '雨中行军', desc: '在雨天或台风天气下移动并攻击', rarity: 'COMMON', isUnlocked: false, icon: '🌧️', flavor: '泥泞无法阻挡我们的脚步。' },
    { id: 'c_survivor', title: '幸存者', desc: '一个单位HP降至10%以下但未被消灭', rarity: 'COMMON', isUnlocked: false, icon: '🤕', flavor: '死里逃生。' },
    { id: 'c_combined_arms', title: '多兵种协同', desc: '在同一回合内使用步兵、火炮和空军进行攻击', rarity: 'COMMON', isUnlocked: false, icon: '⚔️', flavor: '立体攻势。' },
    { id: 'c_casualty_light', title: '轻微伤亡', desc: '在一场局部战斗中以0伤亡获胜', rarity: 'COMMON', isUnlocked: false, icon: '🕊️', flavor: '完美的指挥。' },
    { id: 'u_sniper', title: '精准打击', desc: '使用空袭或重炮直接摧毁敌军满血单位', rarity: 'UNCOMMON', isUnlocked: false, icon: '🎯', flavor: '一击必杀。' },
    { id: 'u_iron_will', title: '东方凡尔登', desc: '在“罗店”区域坚守超过10回合不失守', rarity: 'UNCOMMON', isUnlocked: false, icon: '🧱', flavor: '罗店，血肉磨坊。' },
    { id: 'u_encirclement', title: '包饺子', desc: '在一个回合内包围并消灭敌军单位', rarity: 'UNCOMMON', isUnlocked: false, icon: '🥟', flavor: '完美的战术协同。' },
    { id: 'u_tank_hunter', title: '铁罐头', desc: '使用步兵单位击毁日军坦克', rarity: 'UNCOMMON', isUnlocked: false, icon: '🥫', flavor: '血肉之躯对抗钢铁洪流。' },
    { id: 'u_no_retreat', title: '寸土不让', desc: '在士气低于30的情况下赢得防守战', rarity: 'UNCOMMON', isUnlocked: false, icon: '🚫', flavor: '即使濒临崩溃，依然死战不退。' },
    { id: 'u_air_superiority', title: '长空利剑', desc: '使用防空火力或战机击落敌机', rarity: 'UNCOMMON', isUnlocked: false, icon: '🦅', flavor: '高志航精神永存！' },
    { id: 'u_urban_warfare', title: '巷战专家', desc: '在城市地形(Urban)消灭5个敌军单位', rarity: 'UNCOMMON', isUnlocked: false, icon: '🏙️', flavor: '每一栋楼都是堡垒。' },
    { id: 'u_river_crossing', title: '强渡苏州河', desc: '成功将3个单位机动至苏州河南岸并建立防线', rarity: 'UNCOMMON', isUnlocked: false, icon: '🌊', flavor: '背水一战。' },
    { id: 'u_counter_attack', title: '绝地反击', desc: '在VP落后的情况下反超并获得胜利', rarity: 'UNCOMMON', isUnlocked: false, icon: '📈', flavor: '逆转乾坤。' },
    { id: 'u_headhunter', title: '斩首行动', desc: '消灭敌军指挥部(HQ)单位', rarity: 'UNCOMMON', isUnlocked: false, icon: '🤴', flavor: '擒贼先擒王。' },
    { id: 'u_supply_raid', title: '断粮道', desc: '摧毁敌军补给基地', rarity: 'UNCOMMON', isUnlocked: false, icon: '🔥', flavor: '兵马未动，粮草先行。' },
    { id: 'u_diplomacy', title: '国际援助', desc: '触发“国际谴责”事件并获得CP奖励', rarity: 'UNCOMMON', isUnlocked: false, icon: '🤝', flavor: '道义在我也。' },
    { id: 'r_ace_pilot', title: '王牌飞行员', desc: '单一空军单位击杀3个敌军地面单位', rarity: 'RARE', isUnlocked: false, icon: '✈️', flavor: '天空是他们的坟墓。' },
    { id: 'r_artillery_god', title: '战争之神', desc: '使用重炮单位单局造成超过100点伤害', rarity: 'RARE', isUnlocked: false, icon: '🌋', flavor: '口径即正义。' },
    { id: 'r_spy_master', title: '谍报网', desc: '在一局游戏中成功预判并防御3次日军技能', rarity: 'RARE', isUnlocked: false, icon: '🕵️', flavor: '知己知彼，百战不殆。' },
    { id: 'r_iron_division', title: '德械风暴', desc: '第88师存活至第100回合且HP>50%', rarity: 'RARE', isUnlocked: false, icon: '🇩🇪', flavor: '中央军精锐的荣耀。' },
    { id: 'r_night_raid_master', title: '夜袭能手', desc: '在夜间/雨天对敌军造成超过3次暴击', rarity: 'RARE', isUnlocked: false, icon: '🌙', flavor: '月黑风高杀人夜。' },
    { id: 'r_kamikaze', title: '史可法中队', desc: '使用鱼雷艇对日军舰船造成伤害', rarity: 'RARE', isUnlocked: false, icon: '🚤', flavor: '视死如归的冲锋。' },
    { id: 'r_guangxi_wolf', title: '桂系狼兵', desc: '使用桂军单位进行5次成功的冲锋(近战)', rarity: 'RARE', isUnlocked: false, icon: '🐺', flavor: '强悍的战斗民族。' },
    { id: 'r_tax_police', title: '非正规军', desc: '使用税警总团歼灭日军一个联队', rarity: 'RARE', isUnlocked: false, icon: '👮', flavor: '名为税警，实为精锐。' },
    { id: 'r_sichuan_resolve', title: '川军死字旗', desc: '川军单位在被包围状态下坚持3回合不溃败', rarity: 'RARE', isUnlocked: false, icon: '🚩', flavor: '伤时拭血，死后裹尸。' },
    { id: 'r_perfect_logistics', title: '补给线畅通', desc: '整场战役没有任何单位陷入“断粮”状态', rarity: 'RARE', isUnlocked: false, icon: '🚚', flavor: '后勤是战争的血液。' },
    { id: 'e_sink_izumo', title: '击沉出云号', desc: '成功摧毁日军旗舰“出云号”装甲巡洋舰', rarity: 'EPIC', isUnlocked: false, icon: '⚓', flavor: '震惊中外的壮举！黄浦江上的恶魔沉没了。' },
    { id: 'e_eight_hundred', title: '八百壮士', desc: '仅凭“英雄营”在四行仓库坚守至第216回合', rarity: 'EPIC', isUnlocked: false, icon: '🏰', flavor: '中国不会亡！' },
    { id: 'e_wusong_fortress', title: '吴淞钢钉', desc: '阻止日军登陆部队攻占吴淞炮台超过50回合', rarity: 'EPIC', isUnlocked: false, icon: '🧱', flavor: '这就是我们的马奇诺防线，但它不会陷落。' },
    { id: 'e_blood_mill', title: '血肉磨坊主', desc: '在罗店区域歼灭日军超过5个师团/旅团级单位', rarity: 'EPIC', isUnlocked: false, icon: '🩸', flavor: '这里每一寸土地都浸透了鲜血。' },
    { id: 'e_kaga_sunk', title: '折断双翼', desc: '击伤或击沉加贺号航空母舰', rarity: 'EPIC', isUnlocked: false, icon: '🚢', flavor: '打破了日本海军不可战胜的神话。' },
    { id: 'e_general_killer', title: '摘星者', desc: '在一局游戏中击杀3个日军指挥部', rarity: 'EPIC', isUnlocked: false, icon: '⭐', flavor: '万军丛中取上将首级。' },
    { id: 'e_united_front', title: '真正统一', desc: '在同一战线上集结中央军、桂军、川军、西北军和红军游击队', rarity: 'EPIC', isUnlocked: false, icon: '🤝', flavor: '地无分南北，人无分老幼。' },
    { id: 'e_fortress_shanghai', title: '上海堡垒', desc: '直到第150回合，日军未能攻入闸北核心区一步', rarity: 'EPIC', isUnlocked: false, icon: '🏯', flavor: '固若金汤。' },
    { id: 'l_rewrite_history', title: '改写历史', desc: '作为国军(Blue)取得“完全胜利”(S+评价)', rarity: 'LEGENDARY', isUnlocked: false, icon: '📜', flavor: '你改变了时间线。淞沪大捷将永载史册。' },
    { id: 'l_blitzkrieg', title: '三月亡华？', desc: '作为日军(Red)在30回合内攻占所有目标', rarity: 'LEGENDARY', isUnlocked: false, icon: '⚡', flavor: '真正实现了那个狂妄的预言。' },
    { id: 'l_untouchable', title: '零伤亡奇迹', desc: '以一方全员存活的状态结束完整战役', rarity: 'LEGENDARY', isUnlocked: false, icon: '😇', flavor: '指挥的艺术达到了神之领域。' },
    { id: 'l_grand_slam', title: '大满贯', desc: '解锁除本成就外的所有其他49个成就', rarity: 'LEGENDARY', isUnlocked: false, icon: '🏆', flavor: '你是当之无愧的战争之神。' },
    { id: 'l_speed_run', title: '闪电反击', desc: '作为国军在第100回合前反攻并占领日军司令部', rarity: 'LEGENDARY', isUnlocked: false, icon: '🚀', flavor: '最好的防守就是进攻。' }
];

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private audioService = inject(AudioService);
  readonly notification$ = new Subject<AchievementNotification>();

  private currentScenario: Scenario = CORE_SCENARIO;
  readonly hexMap = signal<Map<string, HexCell>>(new Map());
  readonly units = signal<Unit[]>([]);
  readonly unlockedRegions = signal<Set<RegionId>>(new Set());
  readonly selectedUnitId = signal<string | null>(null);
  
  readonly turn = signal<number>(1);
  readonly weather = signal<WeatherCondition>('Sunny');
  readonly playerFaction = signal<PlayerId>('Blue'); 
  readonly currentPlayer = signal<PlayerId>('Blue'); 
  readonly phase = signal<GamePhase>('Setup');
  readonly gameMode = signal<GameMode>('MENU');
  
  readonly commandPoints = signal<number>(20);
  readonly maxCommandPoints = 100;
  
  readonly playerSkills = signal<PlayerSkill[]>([]);
  readonly skillCooldowns = signal<Map<string, number>>(new Map()); 
  readonly skillUses = signal<Map<string, number>>(new Map()); 
  readonly activeDoctrines = signal<Set<string>>(new Set()); 
  
  readonly accumulatedVp = signal<number>(0);
  readonly claimedCpRegions = signal<Set<string>>(new Set());

  readonly isPaused = signal<boolean>(false);
  readonly isAutoPlay = signal<boolean>(false); 
  readonly gameResult = signal<'WIN' | 'LOSS' | null>(null);
  readonly gameResultReason = signal<string>('');
  
  readonly blueCasualties = signal(0);
  readonly redCasualties = signal(0);
  readonly victoryReport = signal<VictoryReport | null>(null);
  
  readonly activeEvent = signal<HistoricalEvent | null>(null);
  readonly activeBuffs = signal<ActiveBuff[]>([]);
  readonly atrocityCount = signal<number>(0);
  readonly event$ = new Subject<GameEvent>();

  readonly tutorialState = signal<TutorialState>({ active: false, stepIndex: 0, currentStep: null });
  readonly cameraPanRequest = signal<{ q: number; r: number; zoom?: number } | null>(null);
  readonly skillTargetingMode = signal<PlayerSkill | null>(null);

  readonly achievements = signal<Achievement[]>(RAW_ACHIEVEMENTS);

  private sessionStats = {
      skillsUsed: 0,
      movesInTurn: 0,
      hiddenFound: 0,
      killsByAir: 0,
      heavyArtyDamage: 0,
      sihangTurnsHeld: 0,
      luodianTurnsHeld: 0,
      skillDefended: 0,
      isNoCasualty: true,
      artilleryUsed: false
  };

  readonly gameDateString = computed(() => {
    const t = this.turn();
    // Each turn is 6 hours. Day starts at Turn 1 = 08:00.
    const startDate = new Date('1937-08-13T08:00:00');
    startDate.setHours(startDate.getHours() + (t - 1) * 6);

    const year = startDate.getFullYear();
    const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
    const day = startDate.getDate().toString().padStart(2, '0');
    const hour = startDate.getHours().toString().padStart(2, '0');

    return `${year}.${month}.${day}:${hour}`;
  });

  isNight(): boolean {
      const offset = (this.turn() - 1) % 4;
      return offset >= 2; 
  }

  readonly selectedUnit = computed(() => this.units().find(u => u.id === this.selectedUnitId()) || null);

  readonly isUiLocked = computed(() => 
    this.phase() === 'AIProcessing' || 
    this.phase() === 'EventResolution' || 
    this.phase() === 'WeatherCheck' || 
    this.phase() === 'SupplyCheck' ||
    (this.isAutoPlay() && this.phase() === 'PlayerInput') || 
    this.currentPlayer() !== this.playerFaction() ||
    this.isPaused()
  );

  readonly zocHexes = computed(() => {
    const units = this.units();
    const current = this.currentPlayer();
    const zoc = new Set<string>();
    const ignoreZoc = this.activeBuffs().some(b => b.sourceEvent === 'STRAT_RETREAT');
    if (ignoreZoc && current === this.playerFaction()) return new Set<string>();

    units.filter(u => u.owner !== current && u.owner !== 'Neutral').forEach(u => {
      this.getNeighbors(u.q, u.r).forEach(n => {
        zoc.add(`${n.q},${n.r}`);
      });
    });
    return zoc;
  });

  readonly reachableHexes = computed(() => {
    const unit = this.selectedUnit();
    if (!unit || this.phase() !== 'PlayerInput') return new Set<string>();
    const tutorialStep = this.tutorialState().currentStep;
    if (tutorialStep?.key === 'MOVE' && tutorialStep.allowedHex) {
        return new Set([`${tutorialStep.allowedHex.q},${tutorialStep.allowedHex.r}`]);
    }
    return this.calculateReachableHexes(unit);
  });

  readonly attackableUnits = computed(() => {
    const unit = this.selectedUnit();
    if (!unit || unit.hasAttacked) return [];
    if (unit.ap < 5) return [];
    if (this.weather() === 'Typhoon' && (unit.category === 'Air' || unit.category === 'Naval')) return [];
    return this.units().filter(t => t.id !== unit.id && this.getDistance(unit, t) <= unit.range);
  });

  readonly victoryStatus = computed(() => this.currentScenario.victoryDesc[this.playerFaction()]);

  constructor() {
     effect(() => {
        const state = this.tutorialState();
        if (state.active) {
            const newStep = TUTORIAL_STEPS[state.stepIndex] || null;
            if (newStep !== state.currentStep) {
                this.tutorialState.update(s => ({...s, currentStep: newStep}));
                if (newStep?.panTo) {
                    this.cameraPanRequest.set({ q: newStep.panTo.q, r: newStep.panTo.r, zoom: newStep.zoomTo });
                }
            }
        }
     });

     this.event$.subscribe(evt => {
         switch(evt.type) {
             case 'ATTACK': this.audioService.playSfx('GUNSHOT'); break;
             case 'EXPLOSION': this.audioService.playSfx('EXPLOSION'); break;
             case 'DESTRUCTION': this.audioService.playSfx('EXPLOSION'); break;
             case 'MOVE': this.audioService.playSfx('MARCH'); break;
             case 'SCAN_PING': this.audioService.playSfx('TYPEWRITER'); break;
             case 'RICOCHET': this.audioService.playSfx('CLICK'); break;
         }
     });
  }

  // --- SAVE SYSTEM ---
  getSlots(): SaveSlot[] {
      const slots: SaveSlot[] = [];
      for (let i = 0; i < 5; i++) {
          const key = `red_strait_save_${i}`;
          const dataStr = localStorage.getItem(key);
          if (dataStr) {
              try {
                  const save = JSON.parse(dataStr) as GameSaveState;
                  const date = new Date(save.timestamp).toLocaleString();
                  slots.push({
                      id: i,
                      isEmpty: false,
                      name: save.name,
                      date: date,
                      timestamp: save.timestamp,
                      turn: save.turn,
                      faction: save.faction
                  });
              } catch (e) {
                  console.error('Save slot corrupted:', i);
                  slots.push({ id: i, isEmpty: true });
              }
          } else {
              slots.push({ id: i, isEmpty: true });
          }
      }
      return slots;
  }

  saveGame(slotId: number, name: string): boolean {
      if (this.gameMode() === 'TUTORIAL') return false; 
      
      const saveData: GameSaveState = {
          version: '0.9.7',
          timestamp: Date.now(),
          name: name || `Save ${slotId + 1}`,
          turn: this.turn(),
          faction: this.playerFaction(),
          gameMode: this.gameMode(),
          scenarioId: this.currentScenario.id,
          
          units: this.units(),
          hexMapData: Array.from(this.hexMap().entries()), // Map -> Array
          weather: this.weather(),
          commandPoints: this.commandPoints(),
          blueCasualties: this.blueCasualties(),
          redCasualties: this.redCasualties(),
          accumulatedVp: this.accumulatedVp(),
          activeBuffs: this.activeBuffs(),
          activeEvent: this.activeEvent(),
          
          unlockedRegions: Array.from(this.unlockedRegions()),
          claimedCpRegions: Array.from(this.claimedCpRegions()),
          activeDoctrines: Array.from(this.activeDoctrines()),
          skillCooldowns: Array.from(this.skillCooldowns().entries()),
          skillUses: Array.from(this.skillUses().entries())
      };

      try {
          localStorage.setItem(`red_strait_save_${slotId}`, JSON.stringify(saveData));
          this.event$.next({ type: 'SCAN_PING', q: 0, r: 0, message: '游戏进度已保存' });
          return true;
      } catch (e) {
          console.error('Save failed:', e);
          return false;
      }
  }

  loadGame(slotId: number): boolean {
      const dataStr = localStorage.getItem(`red_strait_save_${slotId}`);
      if (!dataStr) return false;

      try {
          const save = JSON.parse(dataStr) as GameSaveState;
          
          // Restore State
          this.gameMode.set(save.gameMode);
          if (save.scenarioId === 'core_sandbox') {
              this.currentScenario = CORE_SCENARIO;
          }
          
          this.turn.set(save.turn);
          this.playerFaction.set(save.faction);
          this.currentPlayer.set(save.faction); // Assume save on player turn start usually
          this.weather.set(save.weather);
          this.commandPoints.set(save.commandPoints);
          this.blueCasualties.set(save.blueCasualties);
          this.redCasualties.set(save.redCasualties);
          this.accumulatedVp.set(save.accumulatedVp);
          this.activeBuffs.set(save.activeBuffs);
          this.activeEvent.set(save.activeEvent);
          
          this.units.set(save.units);
          this.hexMap.set(new Map(save.hexMapData)); // Array -> Map
          
          this.unlockedRegions.set(new Set(save.unlockedRegions));
          this.claimedCpRegions.set(new Set(save.claimedCpRegions));
          this.activeDoctrines.set(new Set(save.activeDoctrines));
          this.skillCooldowns.set(new Map(save.skillCooldowns));
          this.skillUses.set(new Map(save.skillUses));
          
          // Re-init Skills based on faction
          if (save.faction === 'Blue') this.playerSkills.set(BLUE_SKILLS);
          else this.playerSkills.set(RED_SKILLS);

          this.phase.set('PlayerInput');
          this.isPaused.set(false);
          this.selectedUnitId.set(null);
          this.tutorialState.set({ active: false, stepIndex: 0, currentStep: null });
          
          this.event$.next({ type: 'SCAN_PING', q: 0, r: 0, message: '游戏进度已读取' });
          this.cameraPanRequest.set({ q: 0, r: 0, zoom: 1.2 });
          
          return true;
      } catch (e) {
          console.error('Load failed:', e);
          return false;
      }
  }

  deleteSave(slotId: number) {
      localStorage.removeItem(`red_strait_save_${slotId}`);
  }

  private unlockAchievement(id: string) {
      this.achievements.update(list => {
          return list.map(a => {
              if (a.id === id && !a.isUnlocked) {
                  this.audioService.playSfx('CLICK'); 
                  this.notification$.next({ achievement: a, timestamp: Date.now() });
                  return { ...a, isUnlocked: true, dateUnlocked: new Date().toLocaleDateString() };
              }
              return a;
          });
      });
      if (this.achievements().filter(a => a.isUnlocked && a.id !== 'l_grand_slam').length >= 49) {
          this.unlockAchievement('l_grand_slam');
      }
  }

  private checkMoveAchievements(unit: Unit) {
      if (unit.owner === this.playerFaction()) {
          this.sessionStats.movesInTurn++;
          if (this.sessionStats.movesInTurn >= 10) this.unlockAchievement('c_move_master');
      }
  }

  private checkCombatAchievements(attacker: Unit, defender: Unit, result: CombatResult) {
      if (attacker.owner !== 'Blue') return; 
      if (result.defenderLoss >= 4) this.unlockAchievement('c_first_blood');
  }

  startGame(faction: PlayerId) {
    this.audioService.playSfx('CLICK');
    this.loadScenario(CORE_SCENARIO);
    this.playerFaction.set(faction);
    this.activeDoctrines.set(new Set());
    if (faction === 'Blue') {
        this.playerSkills.set(BLUE_SKILLS);
        this.activeDoctrines.update(s => s.add('YAO_DEFENSE').add('GUERRILLA_PASSIVE'));
    } else {
        this.playerSkills.set(RED_SKILLS);
        this.activeDoctrines.update(s => s.add('JP_PACIFICATION').add('JP_ARMORED_PATROL'));
    }
    this.skillCooldowns.set(new Map());
    this.skillUses.set(new Map());
    this.turn.set(1);
    this.blueCasualties.set(0);
    this.redCasualties.set(0);
    this.accumulatedVp.set(0);
    this.claimedCpRegions.set(new Set());
    this.activeBuffs.set([]); 
    this.commandPoints.set(20); 
    this.currentPlayer.set('Blue');
    this.phase.set('WeatherCheck'); 
    
    this.sessionStats = { skillsUsed: 0, movesInTurn: 0, hiddenFound: 0, killsByAir: 0, heavyArtyDamage: 0, sihangTurnsHeld: 0, luodianTurnsHeld: 0, skillDefended: 0, isNoCasualty: true, artilleryUsed: false };
    this.resetTurnStats('Blue'); 
    this.resolvePhaseSequence();
  }

  loadScenario(scenario: Scenario) {
    this.currentScenario = scenario;
    this.unlockedRegions.set(new Set(scenario.initialUnlockedRegions));
    const map = new Map<string, HexCell>();
    const R = scenario.mapSize;
    for (let q = -R; q <= R; q++) {
      const r1 = Math.max(-R, -q - R);
      const r2 = Math.min(R, -q + R);
      for (let r = r1; r <= r2; r++) {
        const data = scenario.mapGenerator(q, r);
        map.set(`${q},${r}`, {
          q, r, s: -q-r,
          ...data,
          unitId: null
        });
      }
    }
    this.hexMap.set(map);
    this.units.set([]); 
    scenario.initialUnits.forEach(u => this.createUnit(u.template, u.owner, u.q, u.r, u.customName));
  }
  
  startTutorial() {
      this.loadScenario(CORE_SCENARIO);
      
      // Clear units from scenario
      this.units.set([]);
      this.hexMap.update(m => {
          const newMap = new Map(m);
          for (const cell of newMap.values()) {
              cell.unitId = null;
          }
          return newMap;
      });

      this.playerFaction.set('Blue');
      this.currentPlayer.set('Blue');
      this.commandPoints.set(100);
      this.turn.set(1);
      this.blueCasualties.set(0);
      this.redCasualties.set(0);
      this.accumulatedVp.set(0);
      this.activeBuffs.set([]);
      this.playerSkills.set(BLUE_SKILLS);
      this.phase.set('PlayerInput'); // Skip weather/supply for tutorial start

      // Spawn Tutorial Units
      // Main Player Unit
      this.createUnit('NRA_Elite_Infantry', 'Blue', TUTORIAL_PLAYER_Q, TUTORIAL_PLAYER_R, '德械教导队(玩家)');
      
      // Friendly Extras
      this.createUnit('NRA_Regular_Infantry', 'Blue', TUTORIAL_PLAYER_Q-1, TUTORIAL_PLAYER_R+1, '友军A');
      this.createUnit('NRA_Regular_Infantry', 'Blue', TUTORIAL_PLAYER_Q-1, TUTORIAL_PLAYER_R, '友军B');
      this.createUnit('NRA_Regular_Infantry', 'Blue', TUTORIAL_PLAYER_Q, TUTORIAL_PLAYER_R+1, '友军C');
      this.createUnit('NRA_Regular_Infantry', 'Blue', TUTORIAL_PLAYER_Q+1, TUTORIAL_PLAYER_R-1, '友军D');
      this.createUnit('NRA_Regular_Infantry', 'Blue', TUTORIAL_PLAYER_Q-2, TUTORIAL_PLAYER_R+1, '友军E');
      this.createUnit('NRA_Regular_Infantry', 'Blue', TUTORIAL_PLAYER_Q-2, TUTORIAL_PLAYER_R+2, '友军F');
      this.createUnit('NRA_Regular_Infantry', 'Blue', TUTORIAL_PLAYER_Q+2, TUTORIAL_PLAYER_R-2, '友军G');
      this.createUnit('NRA_Regular_Infantry', 'Blue', TUTORIAL_PLAYER_Q+1, TUTORIAL_PLAYER_R-2, '友军H');

      // Enemy Target
      this.createUnit('IJA_Infantry', 'Red', TUTORIAL_ENEMY_Q, TUTORIAL_ENEMY_R, '日军先锋');

      // More Enemies
      this.createUnit('IJA_Infantry', 'Red', TUTORIAL_ENEMY_Q+1, TUTORIAL_ENEMY_R, '日军步兵 A');
      this.createUnit('IJA_Infantry', 'Red', TUTORIAL_ENEMY_Q, TUTORIAL_ENEMY_R+1, '日军步兵 B');
      this.createUnit('IJA_Tank_Light', 'Red', TUTORIAL_ENEMY_Q+2, TUTORIAL_ENEMY_R-1, '九五式轻战车');

      // Initialize Tutorial State
      this.tutorialState.set({
          active: true,
          stepIndex: 0,
          currentStep: TUTORIAL_STEPS[0]
      });
      
      // Initial Camera Pan
      this.cameraPanRequest.set({ q: TUTORIAL_PLAYER_Q, r: TUTORIAL_PLAYER_R, zoom: 2.5 });
  }

  setGameMode(mode: GameMode) {
    this.audioService.playSfx('CLICK');
    this.gameMode.set(mode);
    if (mode === 'CLASSIC' || mode === 'MISSION') {
        this.tutorialState.set({ active: false, stepIndex: 0, currentStep: null });
        this.phase.set('Setup');
    }
    else if (mode === 'TUTORIAL') this.startTutorial();
  }

  private addCommandPoints(amount: number, reason: string) {
      if (amount === 0) return;
      this.commandPoints.update(cp => Math.min(this.maxCommandPoints, Math.max(0, cp + amount)));
      this.event$.next({ type: 'SCAN_PING', q: 0, r: 0, message: `${amount>0?'+':''}${amount} CP: ${reason}` });
  }

  private addVp(amount: number) {
      const oldVp = this.accumulatedVp();
      const newVp = oldVp + amount;
      this.accumulatedVp.set(newVp);
      if (Math.floor(newVp / 30) > Math.floor(oldVp / 30)) {
          this.addCommandPoints(3, 'VP里程碑达成');
      }
  }

  private async resolvePhaseSequence() {
      if (this.phase() === 'WeatherCheck') {
          if (this.currentPlayer() === 'Blue') {
             this.rollWeather();
             this.checkPassiveSkills(); 
             await this.wait(600);
          }
          this.phase.set('SupplyCheck');
      }
      if (this.phase() === 'SupplyCheck') {
          if (this.currentPlayer() === this.playerFaction()) {
              this.addCommandPoints(5, '后勤补给');
          }
          this.checkSupply();
          await this.wait(400);
          if (this.currentPlayer() === 'Blue') {
              const eventTriggered = this.resolveTurnEvents();
              if (eventTriggered) return;
          }
          this.phase.set('PlayerInput');
      }
      if (this.phase() === 'PlayerInput') {
          const isEnemyTurn = this.currentPlayer() !== this.playerFaction();
          const isAuto = this.isAutoPlay();
          if (isEnemyTurn || isAuto) {
              this.phase.set('AIProcessing');
              setTimeout(() => this.executeAiTurn(this.currentPlayer()), 500);
          }
      }
  }

  spendCommandPoints(amount: number): boolean {
      if (this.commandPoints() >= amount) {
          this.commandPoints.update(v => v - amount);
          return true;
      }
      return false;
  }
  
  setSkillTargetingMode(skill: PlayerSkill | null) {
    this.skillTargetingMode.set(skill);
    this.deselectUnit();
    if (skill) {
        this.event$.next({ type: 'SCAN_PING', q: 0, r: 0, message: `技能目标: ${skill.name}` });
    }
  }

  applySkillEffect(skill: PlayerSkill, target?: { q: number, r: number }) {
      this.audioService.playSfx('TYPEWRITER');
      if (skill.cooldown) {
          this.skillCooldowns.update(m => new Map(m).set(skill.id, this.turn() + skill.cooldown!));
      }
      if (skill.maxUses) {
          const used = this.skillUses().get(skill.id) || 0;
          this.skillUses.update(m => new Map(m).set(skill.id, used + 1));
      }
      this.sessionStats.skillsUsed++;
      
      const targetUnit = target ? this.getUnitAt(target.q, target.r) : null;
      const targetCell = target ? this.hexMap().get(`${target.q},${target.r}`) : null;
      
      this.event$.next({ type: 'SCAN_PING', q: 0, r: 0, message: `发动技能: ${skill.name}` });

      switch (skill.id) {
          case 'LUODIAN_OATH':
              this.activeBuffs.update(b => [...b, { title: '罗店血誓', desc: '罗店区域防御大幅提升 (+3)，士气锁定', expiryTurn: this.turn() + 20, sourceEvent: skill.id, targetRegion: 'West_Luodian', data: { defenseBonus: 3, moraleLock: true } }]);
              break;
          case 'AIR_RAID_814':
              if (target) {
                  this.event$.next({ type: 'EXPLOSION', q: target.q, r: target.r, message: '八一四空袭', intensity: 1.0 });
                  const tUnit = this.getUnitAt(target.q, target.r);
                  if (tUnit && tUnit.owner === 'Red') {
                      const isCrit = Math.random() > 0.6; 
                      const dmg = isCrit ? 20 : 10; 
                      const newHp = Math.max(0, tUnit.hp - dmg);
                      const newSteps = Math.ceil(newHp / 10);
                      this.units.update(us => us.map(u => u.id === tUnit.id ? { ...u, hp: newHp, steps: newSteps } : u));
                      this.event$.next({ type: 'DESTRUCTION', q: target.q, r: target.r, message: isCrit ? `暴击! -${dmg}HP` : `命中! -${dmg}HP` });
                      if (newSteps <= 0) { this.destroyUnit(tUnit); this.addVp(2); }
                  } else { this.event$.next({ type: 'SMOKE', q: target.q, r: target.r, message: '未命中' }); }
              }
              break;
          case 'SIHANG_FLAG':
              if (targetUnit && targetUnit.owner === 'Blue') {
                  this.activeBuffs.update(b => [...b, { title: '四行仓库', desc: `防御x3，每回合+2VP`, expiryTurn: this.turn() + 12, sourceEvent: skill.id, targetUnitId: targetUnit.id, data: { defenseMultiplier: 3, vpPerTurn: 2 } }]);
              }
              break;
          case 'SICHUAN_REINFORCE':
              if (target) {
                  this.createUnit('NRA_Sichuan', 'Blue', target.q, target.r, '川军增援指挥部');
                  const offsets = [{q:1,r:0}, {q:-1,r:0}, {q:0,r:1}, {q:0,r:-1}, {q:1,r:-1}, {q:-1,r:1}];
                  offsets.forEach((off, idx) => {
                      if(idx < 4) this.createUnit('NRA_Sichuan', 'Blue', target.q+off.q, target.r+off.r);
                      else this.createUnit('NRA_Brigade', 'Blue', target.q+off.q, target.r+off.r);
                  });
              }
              break;
          case 'FINAL_LINE':
              if (target) {
                  const neighbors = this.getNeighbors(target.q, target.r); neighbors.push({q: target.q, r: target.r});
                  this.hexMap.update(m => {
                      const newMap = new Map(m);
                      neighbors.forEach(n => { const cell = newMap.get(`${n.q},${n.r}`); if (cell) cell.isFortified = true; });
                      return newMap;
                  });
                  this.event$.next({ type: 'SCAN_PING', q: target.q, r: target.r, message: '防线已加固' });
              }
              break;
          case 'STRAT_RETREAT':
               this.activeBuffs.update(b => [...b, { title: '战略转移', desc: `全军AP+2，无视ZOC`, expiryTurn: this.turn() + 15, sourceEvent: skill.id }]);
               this.units.update(us => us.map(u => u.owner === 'Blue' ? { ...u, ap: u.ap + 2 } : u));
              break;
          case 'BLOCK_RIVER':
              if (targetCell && targetCell.isRiver) {
                  this.hexMap.update(m => { const cell = m.get(`${target.q},${target.r}`); if (cell) cell.isBlocked = true; return new Map(m); });
                   this.event$.next({ type: 'EXPLOSION', q: target.q, r: target.r, message: `航道已阻塞!` });
              }
              break;
          case 'RAIL_SABOTAGE':
              if (targetCell && targetCell.visualVariant?.includes('RAILWAY')) {
                  this.hexMap.update(m => { const cell = m.get(`${target.q},${target.r}`); if (cell) cell.isScorched = true; return new Map(m); });
                  this.event$.next({ type: 'EXPLOSION', q: target.q, r: target.r, message: '铁轨已破坏' });
              }
              break;
          case 'SCORCHED_EARTH':
              if (target) {
                  const neighbors = this.getNeighbors(target.q, target.r); neighbors.push({q: target.q, r: target.r});
                  this.hexMap.update(m => {
                      const newMap = new Map(m);
                      neighbors.forEach(n => { const cell = newMap.get(`${n.q},${n.r}`); if (cell) cell.isScorched = true; });
                      return newMap;
                  });
                  this.event$.next({ type: 'EXPLOSION', q: target.q, r: target.r, message: '焦土政策执行' });
              }
              break;
          case 'INFILTRATION':
              const randQ = Math.floor(Math.random() * 40) - 20; const randR = Math.floor(Math.random() * 40) - 20;
              this.createUnit('NRA_Guerrilla', 'Blue', randQ, randR, '敌后武工队');
              break;
          case 'AIR_DROP':
              if (targetUnit && targetUnit.owner === 'Blue') {
                  this.units.update(us => us.map(u => { if (u.id === targetUnit.id) { return { ...u, supplyState: 'Supplied', hp: Math.min(u.maxHp, u.hp + 5), morale: 100 }; } return u; }));
                  this.event$.next({ type: 'REINFORCEMENT', q: targetUnit.q, r: targetUnit.r, message: '空投补给送达' });
              }
              break;
          case 'TORPEDO_RAID':
              if (target) {
                  const tUnit = this.getUnitAt(target.q, target.r);
                  if (tUnit && tUnit.category === 'Naval' && tUnit.owner === 'Red') {
                      const dmg = 30; const newHp = Math.max(0, tUnit.hp - dmg); const newSteps = Math.ceil(newHp / 10);
                      this.units.update(us => us.map(u => u.id === tUnit.id ? { ...u, hp: newHp, steps: newSteps } : u));
                      this.event$.next({ type: 'EXPLOSION', q: target.q, r: target.r, message: '鱼雷命中! -30HP' });
                      this.unlockAchievement('r_kamikaze');
                      if (newSteps <= 0) this.destroyUnit(tUnit);
                  } else { this.event$.next({ type: 'SMOKE', q: target.q, r: target.r, message: '无效目标 (需海军)' }); }
              }
              break;
          case 'EMERGENCY_SUPPLY':
              this.units.update(us => us.map(u => u.owner === 'Blue' ? { ...u, supplyState: 'Supplied', morale: Math.min(100, u.morale + 10) } : u));
              this.event$.next({ type: 'SCAN_PING', q: 0, r: 0, message: '全军补给恢复' });
              break;
          case 'JP_ENCIRCLE':
              this.activeBuffs.update(b => [...b, { title: '三面合围', desc: `全军攻击+2，敌军防御-2`, expiryTurn: this.turn() + 1, sourceEvent: skill.id }]);
              break;
          case 'JP_HANGZHOU_SURPRISE':
              this.createUnit('IJA_Division_Heavy', 'Red', -40, 15, '第6师团');
              this.createUnit('IJA_Division_Standard', 'Red', -41, 16, '第18师团');
              this.units.update(us => us.map(u => u.owner === 'Blue' ? { ...u, morale: Math.max(0, u.morale - 30) } : u));
              this.addVp(10);
              break;
          case 'JP_AERIAL_STRANGLE':
               this.activeBuffs.update(b => [...b, { title: '航空绞杀', desc: `下回合国军AP减半`, expiryTurn: this.turn() + 2, sourceEvent: skill.id, data: { halfAp: 'Blue' } }]);
              break;
          case 'JP_IRON_WALL':
              this.activeBuffs.update(b => [...b, { title: '铁壁攻坚', desc: `步坦协同，无视工事，对硬攻击+5`, expiryTurn: this.turn() + 3, sourceEvent: skill.id }]);
              break;
          case 'JP_BRIDGE':
              this.activeBuffs.update(b => [...b, { title: '架桥强渡', desc: `全军获得两栖特性`, expiryTurn: this.turn() + 1, sourceEvent: skill.id }]);
              break;
          case 'JP_ARMORED_WEDGE':
              this.units.update(us => us.map(u => { if (u.owner === 'Red' && u.visuals.natoSymbol === 'armor') { return { ...u, ap: u.maxAp }; } return u; }));
              this.activeBuffs.update(b => [...b, { title: '装甲楔形', desc: `坦克攻击+5`, expiryTurn: this.turn() + 1, sourceEvent: skill.id, data: { armorAttackBonus: 5 } }]);
              break;
           case 'JP_ARMORED_PINCER':
              this.activeBuffs.update(b => [...b, { title: '装甲合围', desc: `全歼敌军收益翻倍 (+15VP)`, expiryTurn: this.turn() + 2, sourceEvent: skill.id }]);
              break;
           case 'JP_PACIFICATION':
              this.units.update(us => us.map(u => u.owner === 'Blue' && u.visibility === 'Hidden' ? { ...u, visibility: 'Identified' } : u));
              this.event$.next({ type: 'SCAN_PING', q: 0, r: 0, message: '敌军位置暴露' });
              break;
           case 'JP_SABOTAGE':
              if (this.commandPoints() > 5) this.addCommandPoints(-5, '特工破坏');
              else { this.units.update(us => us.map(u => (u.owner === 'Blue' && Math.random() > 0.7) ? { ...u, ap: 0 } : u)); this.event$.next({ type: 'SCAN_PING', q: 0, r: 0, message: '通讯线路中断' }); }
              break;
           case 'JP_PARATROOPER':
              if (target) { this.createUnit('IJA_Infantry', 'Red', target.q, target.r, '空挺突击队'); } else { this.createUnit('IJA_Infantry', 'Red', -10, -20, '空挺突击队'); }
              break;
           case 'JP_CARRIER_STRIKE':
              if (target) {
                  const neighbors = this.getNeighbors(target.q, target.r); neighbors.push({q: target.q, r: target.r});
                  this.units.update(us => us.map(u => { const inBlast = neighbors.some(n => n.q === u.q && n.r === u.r); if (inBlast && u.owner === 'Blue') { const dmg = 15; this.event$.next({ type: 'EXPLOSION', q: u.q, r: u.r, message: '-15HP' }); return { ...u, hp: Math.max(0, u.hp - dmg), steps: Math.ceil(Math.max(0, u.hp - dmg)/10) }; } return u; }));
                  this.units().filter(u => u.hp <= 0).forEach(u => this.destroyUnit(u));
              }
              break;
           case 'JP_NAVAL_GUN':
              this.activeBuffs.update(b => [...b, { title: '舰炮延伸', desc: '全域火力支援 (+2骰修正)', expiryTurn: this.turn() + 3, sourceEvent: skill.id }]);
              break;
           case 'JP_BLOCKADE':
              this.activeBuffs.update(b => [...b, { title: '海上封锁', desc: '国军补给判定极大概率失败', expiryTurn: this.turn() + 2, sourceEvent: skill.id }]);
              break;
          default:
             this.event$.next({ type: 'ENCOUNTER', q: 0, r: 0, message: `技能 [${skill.name}] 已部署` });
      }
  }

  moveUnit(unit: Unit, q: number, r: number) { 
    const oldKey = `${unit.q},${unit.r}`;
    const newKey = `${q},${r}`;
    const targetCell = this.hexMap().get(newKey);

    if (targetCell?.isBlocked) {
        this.event$.next({ type: 'MOVE', q: unit.q, r: unit.r, message: `航道阻塞!` });
        return;
    }

    const bridgeActive = this.activeBuffs().some(b => b.sourceEvent === 'JP_BRIDGE');
    
    if (targetCell?.isRiver && unit.category === 'Ground' && !bridgeActive) {
        const roll = Math.floor(Math.random() * 6) + 1;
        if (roll <= 2) {
            this.event$.next({ type: 'MOVE', q: unit.q, r: unit.r, message: `渡河失败! (骰数: ${roll})` });
            this.units.update(us => us.map(u => u.id === unit.id ? { ...u, ap: 0, hasMoved: true } : u));
            this.selectedUnitId.set(null);
            return;
        }
    }

    const existingUnitId = targetCell?.unitId;
    if (existingUnitId) {
        const existingUnit = this.units().find(u => u.id === existingUnitId);
        
        if (existingUnit && existingUnit.category === 'Civilian' && unit.owner !== existingUnit.owner) {
            if (unit.traits?.includes('Ruthless') || unit.category === 'Ground') {
                this.event$.next({ type: 'ATROCITY', q, r, message: `惨案: ${existingUnit.name} 遭到屠杀!` });
                this.event$.next({ type: 'DESTRUCTION', q, r });
                this.triggerInternationalCondemnation(unit, existingUnit);
                this.destroyUnit(existingUnit);
                this.atrocityCount.update(c => c + 1);
            } else {
                return;
            }
        } else if (existingUnit) {
            return; 
        }
    }

    const map = this.hexMap();
    const oldCell = map.get(oldKey)!;
    const newCell = map.get(newKey)!;
    
    if (unit.owner === this.playerFaction() && unit.category === 'Ground') {
        const region = newCell.region;
        const keyRegions = ['Core_Zhabei', 'West_Luodian', 'North_Wusong', 'Japanese_Sector'];
        if (keyRegions.includes(region)) {
            if (!this.claimedCpRegions().has(region)) {
                this.claimedCpRegions.update(s => new Set(s).add(region));
                this.addCommandPoints(3, `占领: ${region}`);
                this.addVp(5);
            }
        }
        
        this.checkMoveAchievements(unit);
    }

    this.event$.next({ type: 'MOVE', q, r, sourceQ: unit.q, sourceR: unit.r, unitCategory: unit.category, intensity: 0.5 });

    oldCell.unitId = null;
    newCell.unitId = unit.id; 
    this.hexMap.set(new Map(map));

    const enteredZoc = this.zocHexes().has(newKey);
    const terrainRule = TERRAIN_RULES[newCell.terrain];
    const cost = terrainRule.moveCost;
    
    let newAp = enteredZoc ? 0 : Math.max(0, unit.ap - cost); 
    
    if (this.gameMode() === 'TUTORIAL' && unit.owner === this.playerFaction()) {
        if (newAp < 5) newAp = 5;
    }

    this.units.update(us => us.map(u => u.id === unit.id ? { ...u, q, r, hasMoved: true, ap: newAp, fatigue: u.fatigue + 5 } : u));
    
    this.selectedUnitId.set(null);
    if (this.tutorialState().active) this.advanceTutorial('MOVE');
  }

  triggerInternationalCondemnation(attacker: Unit, victim: Unit) {
      if (attacker.owner === 'Red' && victim.category === 'Civilian') {
          if (this.playerFaction() === 'Blue') {
              this.addCommandPoints(10, '国际谴责: 获物资援助');
              this.activeBuffs.update(b => [...b, {
                  title: '国际谴责',
                  desc: '日军暴行激起国际愤慨，国军获得海外援助物资。',
                  expiryTurn: this.turn() + 2,
                  sourceEvent: 'Civilian Massacre',
                  internationalContext: '西方媒体头版报道日军暴行。'
              }]);
              this.unlockAchievement('u_diplomacy');
          } else {
              this.addCommandPoints(-5, '国际制裁');
          }
          this.addVp(-5); 
      }
  }

  performAttack(attacker: Unit, defender: Unit) {
    if (this.tutorialState().active) this.advanceTutorial('ATTACK');

    if (this.weather() === 'Typhoon' && (attacker.category === 'Air' || attacker.category === 'Naval')) {
        this.event$.next({ type: 'ENCOUNTER', q: attacker.q, r: attacker.r, message: '台风中无法攻击' });
        return;
    }

    if (attacker.ap < 5) {
        this.event$.next({ type: 'ENCOUNTER', q: attacker.q, r: attacker.r, message: '行动点不足 (需 5 AP)' });
        return;
    }

    if (attacker.category === 'Air' && attacker.owner === 'Red') {
         const groundDefenders = this.units().filter(u => 
             u.owner === 'Blue' && 
             u.category === 'Ground' && 
             u.hp > 0 &&
             this.getDistance(u, attacker) <= 2
         );

         let aaHits = 0;
         for (const aaUnit of groundDefenders) {
             if (Math.random() < 0.25) { // 25% chance
                 aaHits++;
                 this.event$.next({ type: 'SCAN_PING', q: aaUnit.q, r: aaUnit.r, message: '防空反击!' });
                 this.audioService.playSfx('AA_FIRE');
             }
         }

         if (aaHits > 0) {
             const dmg = aaHits * 10;
             const newHp = Math.max(0, attacker.hp - dmg);
             const newSteps = Math.ceil(newHp / 10);
             this.event$.next({ type: 'EXPLOSION', q: attacker.q, r: attacker.r, message: `遭到防空火力: -${dmg}HP` });
             
             attacker.hp = newHp;
             attacker.steps = newSteps;
             
             if (attacker.steps <= 0) {
                 this.destroyUnit(attacker);
                 this.event$.next({ type: 'DESTRUCTION', q: attacker.q, r: attacker.r, message: '被击落' });
                 this.unlockAchievement('u_air_superiority'); 
                 return; 
             }
         }
    }

    const defenderCell = this.hexMap().get(`${defender.q},${defender.r}`);
    const baseRule = defenderCell ? TERRAIN_RULES[defenderCell.terrain] : { moveCost: 1, defenseMultiplier: 1.0, attackPenalty: 0, stackLimit: 0, visionRange: 0, visionBlock: false };
    
    const ironWall = this.activeBuffs().some(b => b.sourceEvent === 'JP_IRON_WALL' && attacker.owner === 'Red');
    const fortMultiplier = (defenderCell?.isFortified && !ironWall) ? 0.5 : 0; 
    
    const rule = { ...baseRule, defenseMultiplier: baseRule.defenseMultiplier + fortMultiplier };

    const isNight = this.isNight(); 
    
    const attackerNeighbors = this.getNeighbors(defender.q, defender.r).filter(n => {
        const u = this.getUnitAt(n.q, n.r);
        return u && u.owner === attacker.owner;
    });
    const isFlanking = attackerNeighbors.length >= 2;

    const isBackToRiver = this.getNeighbors(defender.q, defender.r).some(n => {
        const cell = this.hexMap().get(`${n.q},${n.r}`);
        return cell?.isRiver || cell?.terrain === 'DeepOcean';
    });

    const isUrbanNoEng = (defenderCell?.terrain === 'Urban' || defenderCell?.region === 'Core_Zhabei') && 
                         !attacker.name.includes('工兵') && 
                         !attacker.traits?.includes('UrbanExpert');
    
    const isSurrounded = this.getNeighbors(defender.q, defender.r).every(n => {
        const u = this.getUnitAt(n.q, n.r);
        return u && u.owner !== defender.owner;
    });

    const ctx: CombatContext = {
        isNight,
        weather: this.weather(),
        isFlanking,
        isBackToRiver: !!isBackToRiver,
        isUrbanAssaultNoEng: !!isUrbanNoEng,
        hasArmorSupport: attacker.traits?.includes('ArmorBonus') || false,
        hasAirSupport: attacker.traits?.includes('AirSupport') || false,
        hasNavalSupport: attacker.traits?.includes('NavalGun') || false,
        isSurrounded
    };
    
    let defenderForCombat = { ...defender };
    if (defender.owner === 'Blue' && isSurrounded) {
        defenderForCombat = { ...defenderForCombat, combatStrength: defender.combatStrength + 4 };
        if (defender.name.includes('川军')) this.unlockAchievement('r_sichuan_resolve');
    }

    const result = resolveCombat(attacker, defenderForCombat, rule, ctx, this.activeBuffs());

    this.event$.next({ type: 'ATTACK', q: defender.q, r: defender.r, sourceQ: attacker.q, sourceR: attacker.r, message: `${result.resultType} (骰:${result.dieRoll})` });
    
    const newAttacker = { ...attacker, ap: attacker.ap - 5, hasAttacked: true };
    this.units.update(us => us.map(u => u.id === attacker.id ? newAttacker : u));

    this.applyCombatResult(newAttacker, defender, result);
    this.checkCombatAchievements(newAttacker, defender, result); 

    const isSplash = attacker.category === 'Naval' || attacker.visuals.natoSymbol === 'artillery';
    if (isSplash) {
        const splashDmg = Math.max(1, Math.floor(attacker.combatStrength * 0.15));
        const neighbors = this.getNeighbors(defender.q, defender.r);
        const currentUnits = this.units();
        const deadUnits: Unit[] = [];

        const updatedUnits = currentUnits.map(u => {
            const isNeighbor = neighbors.some(n => n.q === u.q && n.r === u.r);
            if (isNeighbor && u.id !== attacker.id && u.id !== defender.id) {
                
                const isTargetable = u.owner !== attacker.owner || u.category === 'Civilian';
                
                if (isTargetable) {
                    const newHp = u.hp - splashDmg;
                    const newSteps = Math.ceil(newHp / 10);
                    this.event$.next({ type: 'EXPLOSION', q: u.q, r: u.r, intensity: 0.2 });
                    
                    if (u.category === 'Civilian') {
                         this.event$.next({ type: 'ATROCITY', q: u.q, r: u.r, message: '平民伤亡 (溅射)' });
                         if (attacker.owner === 'Blue') {
                             this.addCommandPoints(-2, '误伤平民');
                         }
                    }

                    if (newHp <= 0) deadUnits.push(u);
                    return { ...u, hp: newHp, steps: newSteps };
                }
            }
            return u;
        });
        this.units.set(updatedUnits.filter(u => u.hp > 0));
        deadUnits.forEach(u => {
            this.event$.next({ type: 'DESTRUCTION', q: u.q, r: u.r, message: '溅射击杀' });
            if (u.owner !== this.playerFaction() && u.category !== 'Civilian') this.addVp(1);
            this.destroyUnit(u);
        });
    }
  }

  selectHex(q: number, r: number) {
    this.audioService.playSfx('CLICK');
    if (this.isUiLocked()) return;
    
    const skillToUse = this.skillTargetingMode();
    if (skillToUse) {
        if (this.spendCommandPoints(skillToUse.cost)) {
            this.applySkillEffect(skillToUse, { q, r });
        } else {
            this.event$.next({ type: 'ENCOUNTER', q, r, message: `CP不足: ${skillToUse.name}` });
        }
        this.setSkillTargetingMode(null);
        return;
    }
    
    const tutorial = this.tutorialState();
    if (tutorial.active && tutorial.currentStep?.restrictInteraction) {
        const step = tutorial.currentStep;
        const unitAtHex = this.getUnitAt(q, r);

        switch(step.key) {
            case 'SELECT_UNIT':
                if (!step.highlightHex || q !== step.highlightHex.q || r !== step.highlightHex.r) {
                    this.event$.next({ type: 'ENCOUNTER', q, r, message: '请点击高亮的单位' });
                    return;
                }
                break;
            case 'MOVE':
                const selUnit = this.selectedUnit();
                if (!selUnit) return; 
                if (!step.allowedHex || q !== step.allowedHex.q || r !== step.allowedHex.r) {
                    this.event$.next({ type: 'ENCOUNTER', q, r, message: '请移动到指定的黄色格子' });
                    return;
                }
                break;
            case 'ATTACK':
                 const enemyUnit = this.units().find(u => u.q === TUTORIAL_ENEMY_Q && u.r === TUTORIAL_ENEMY_R);
                 if (!unitAtHex || !enemyUnit || unitAtHex.id !== enemyUnit.id) {
                     this.event$.next({ type: 'ENCOUNTER', q, r, message: '请点击目标敌军进行攻击' });
                     return;
                 }
                break;
            case 'SKILL_INTRO':
            case 'SKILL_BUFF':
            case 'SKILL_AIR':
                 this.event$.next({ type: 'ENCOUNTER', q, r, message: '请使用指挥台卡牌' });
                 return;
            case 'END_TURN':
                 if (!unitAtHex) this.selectedUnitId.set(null);
                 this.event$.next({ type: 'ENCOUNTER', q, r, message: '请按照教程提示操作 UI' });
                 return;
            default:
                if (!unitAtHex) this.selectedUnitId.set(null);
                this.event$.next({ type: 'ENCOUNTER', q, r, message: '请先完成当前提示' });
                return;
        }
    }
    
    const unit = this.getUnitAt(q, r);
    const currentSel = this.selectedUnit();

    if (currentSel && unit && unit.id !== currentSel.id) {
       const dist = this.getDistance(currentSel, unit);
       const canAttack = unit.owner !== currentSel.owner || (currentSel.traits?.includes('Ruthless') && unit.category === 'Civilian');
       
       if (dist <= currentSel.range && !currentSel.hasAttacked && canAttack) {
          this.performAttack(currentSel, unit);
          return;
       }
    }
    if (unit) {
      if (this.tutorialState().active && this.tutorialState().currentStep?.key === 'FINAL_BATTLE') {
          if (unit.owner === 'Blue') {
              this.selectedUnitId.set(unit.id);
          } else if (currentSel && currentSel.owner === 'Blue') {
              this.performAttack(currentSel, unit);
          }
          return;
      }

      if (this.tutorialState().active && this.tutorialState().currentStep?.key === 'ATTACK' && unit.owner !== this.playerFaction()) {
        const playerUnit = this.units().find(u => u.owner === this.playerFaction());
        if(playerUnit) this.selectedUnitId.set(playerUnit.id);
        return;
      }

      if (unit.owner === this.playerFaction() || (unit.category === 'Civilian' && this.playerFaction() === 'Blue')) {
          this.selectedUnitId.set(unit.id);
          if (this.tutorialState().active) this.advanceTutorial('SELECT');
      } else {
          this.selectedUnitId.set(unit.id); 
      }
    } else {
      if (currentSel && currentSel.owner === this.currentPlayer()) {
         if (this.reachableHexes().has(`${q},${r}`)) {
             this.moveUnit(currentSel, q, r);
         } else {
             this.selectedUnitId.set(null);
         }
      } else {
         this.selectedUnitId.set(null);
      }
    }
  }
  
  deselectUnit() { this.selectedUnitId.set(null); }
  
  advanceTutorial(action: 'ANY_KEY' | 'SELECT' | 'MOVE' | 'ATTACK' | 'END_TURN' | 'PAN' | 'ZOOM' | 'SKILL') {
     const state = this.tutorialState();
     if (!state.active || !state.currentStep) return;
     
     if (state.currentStep.key === 'CONCLUSION' && action === 'ANY_KEY') {
        this.quitGame();
        return;
     }

     if (state.currentStep.waitForAction === action) {
         this.tutorialState.update(s => ({ ...s, stepIndex: s.stepIndex + 1 }));
     } else if (action === 'ANY_KEY' && state.currentStep.waitForAction === 'ANY_KEY') {
         this.tutorialState.update(s => ({ ...s, stepIndex: s.stepIndex + 1 }));
     }
  }

  private applyCombatResult(attacker: Unit, defender: Unit, res: CombatResult) {
      if (attacker.owner === 'Blue') this.blueCasualties.update(c => c + res.attackerLoss);
      else this.redCasualties.update(c => c + res.attackerLoss);

      if (defender.owner === 'Blue') this.blueCasualties.update(c => c + res.defenderLoss);
      else this.redCasualties.update(c => c + res.defenderLoss);

      if ((res.attackerRetreat > 0 && attacker.owner === this.playerFaction()) || 
          (res.defenderRetreat > 0 && defender.owner === this.playerFaction())) {
          this.addCommandPoints(-5, '部队溃退');
      }

      if (attacker.owner === this.playerFaction()) this.addVp(res.defenderLoss);
      if (defender.owner === this.playerFaction()) this.addVp(res.attackerLoss);

      let att = { ...attacker };
      att.hp -= res.attackerLoss * 10; 
      att.steps -= res.attackerLoss;
      
      // Tutorial: Blue units never retreat to prevent breaking the script flow
      const isTutorial = this.gameMode() === 'TUTORIAL';
      
      if (res.attackerRetreat > 0) {
          if (!(isTutorial && att.owner === 'Blue')) {
              this.retreatUnit(att, res.attackerRetreat);
          }
      }

      let def = { ...defender };
      def.hp -= res.defenderLoss * 10;
      def.steps -= res.defenderLoss;
      
      if (res.defenderMoraleLoss > 0) {
          def.morale = Math.max(0, def.morale - res.defenderMoraleLoss);
      }

      if (res.defenderRetreat > 0) {
          if (!(isTutorial && def.owner === 'Blue')) {
              this.retreatUnit(def, res.defenderRetreat);
          }
      }

      const units = this.units().map(u => {
          if (u.id === att.id) return att;
          if (u.id === def.id) return def;
          return u;
      });
      
      this.units.set(units.filter(u => u.steps > 0));

      const pincerActive = this.activeBuffs().some(b => b.sourceEvent === 'JP_ARMORED_PINCER');
      const killVpBonus = pincerActive && attacker.owner === 'Red' ? 15 : 0;

      if (def.steps <= 0) {
          this.event$.next({ type: 'DESTRUCTION', q: def.q, r: def.r });
          if (def.owner !== this.playerFaction() && (att.owner === this.playerFaction() || defender.owner !== this.playerFaction())) {
              this.addCommandPoints(5, '全歼敌军');
              this.addVp(5 + killVpBonus); 
          }
          if (def.owner === this.playerFaction()) {
              this.sessionStats.isNoCasualty = false; 
          }
          if (def.name.includes('88') || def.name.includes('87')) this.sessionStats.isNoCasualty = false; 

          this.destroyUnit(def);
          
          if (attacker.owner === this.playerFaction() && def.steps <= 0) {
              if (this.weather() === 'Rain' || this.isNight()) this.unlockAchievement('c_night_ops');
              if (this.reachableHexes().has(`${att.q},${att.r}`) && this.getNeighbors(def.q, def.r).filter(n => this.getUnitAt(n.q, n.r)?.owner === att.owner).length >= 4) {
                  this.unlockAchievement('u_encirclement');
              }
          }
      }
      if (att.steps <= 0) {
          this.event$.next({ type: 'DESTRUCTION', q: att.q, r: att.r });
          if (att.owner !== this.playerFaction() && def.owner === this.playerFaction()) {
              this.addCommandPoints(5, '全歼敌军');
              this.addVp(5 + killVpBonus);
              this.unlockAchievement('c_defender');
          }
          if (att.owner === this.playerFaction()) {
              this.sessionStats.isNoCasualty = false;
          }
          this.destroyUnit(att);
      }

      this.checkVictoryConditions();
  }

  private destroyUnit(unit: Unit) {
      const map = this.hexMap();
      const cell = map.get(`${unit.q},${unit.r}`);
      if (cell && cell.unitId === unit.id) cell.unitId = null;
      this.hexMap.set(new Map(map));
      this.units.update(us => us.filter(u => u.id !== unit.id));
      
      if (this.gameMode() === 'TUTORIAL') {
          const redUnits = this.units().filter(u => u.owner === 'Red');
          if (redUnits.length === 0) {
              this.unlockAchievement('c_recruit');
              this.declareAnnihilationVictory('Blue', 0);
              this.victoryReport.update(rep => {
                  if (rep) {
                      rep.title = '演习胜利';
                      rep.subTitle = '您已完全掌握指挥精髓';
                      rep.historyEval = '敌军已被彻底肃清！战场的命运现在掌握在您的手中。祝您武运昌隆，指挥官！';
                      rep.stats = [
                          { label: '歼灭敌军', value: '4个单位' },
                          { label: '训练评价', value: '优秀' }
                      ];
                      rep.nextOptions = [
                          { label: "返回主菜单", desc: "结束训练", action: "QUIT" }
                      ];
                  }
                  return rep;
              });
          }
      }
  }

  private retreatUnit(unit: Unit, distance: number) {
      if (unit.owner === 'Blue') unit.q -= distance;
      else unit.q += distance;
      this.event$.next({ type: 'MOVE', q: unit.q, r: unit.r, message: `${unit.name} 撤退 ${distance} 格` });
  }

  calculateReachableHexes(unit: Unit): Set<string> {
    if (this.weather() === 'Typhoon' && (unit.category === 'Air' || unit.category === 'Naval')) {
        return new Set<string>();
    }
    const reachable = new Set<string>();
    const maxAp = this.weather() === 'Typhoon' && unit.category === 'Ground'
        ? Math.floor(unit.ap / 2)
        : unit.ap;
    const frontier: {q: number, r: number, cost: number}[] = [{q: unit.q, r: unit.r, cost: 0}];
    const costSoFar = new Map<string, number>();
    costSoFar.set(`${unit.q},${unit.r}`, 0);
    const zoc = this.zocHexes();
    const enemies = this.units().filter(u => u.owner !== unit.owner && u.owner !== 'Neutral').map(u => `${u.q},${u.r}`);
    const bridgeActive = this.activeBuffs().some(b => b.sourceEvent === 'JP_BRIDGE');

    while (frontier.length > 0) {
       frontier.sort((a, b) => a.cost - b.cost);
       const current = frontier.shift()!;
       if (current.cost > maxAp) continue;
       const key = `${current.q},${current.r}`;
       if (key !== `${unit.q},${unit.r}`) reachable.add(key);
       if (zoc.has(key) && key !== `${unit.q},${unit.r}`) continue; 

       const neighbors = this.getNeighbors(current.q, current.r);
       for (const next of neighbors) {
           const nextKey = `${next.q},${next.r}`;
           const cell = this.hexMap().get(nextKey);
           if (!cell) continue;
           if (cell.isBlocked) continue;

           if (unit.category === 'Naval') {
               const isWater = cell.terrain === 'DeepOcean' || cell.terrain === 'Coastal' || (cell.isRiver && cell.riverType === 'Major');
               if (!isWater) continue;
           }
           if (unit.category === 'Ground') {
               if (cell.terrain === 'DeepOcean') continue;
           }

           let isBlocked = false;
           if (enemies.includes(nextKey)) isBlocked = true;
           const targetUnitId = cell.unitId;
           if (targetUnitId) {
               const targetUnit = this.units().find(u => u.id === targetUnitId);
               if (targetUnit) {
                   if (targetUnit.owner === unit.owner) isBlocked = true; 
                   else if (targetUnit.category === 'Civilian' && unit.traits?.includes('Ruthless')) isBlocked = false; 
                   else isBlocked = true; 
               }
           }
           if (isBlocked) continue; 
           
           const rule = TERRAIN_RULES[cell.terrain];
           let moveCost = rule.moveCost; 
           if (unit.category === 'Air') moveCost = 1;
           if (unit.category === 'Ground' && cell.visualVariant?.includes('RAILWAY')) moveCost = 2; 

           if (cell.isRiver && unit.category === 'Ground') {
               moveCost += (bridgeActive && unit.owner === 'Red') ? 0 : 8; 
           }

           if (this.weather() === 'Rain' && (cell.terrain === 'Plains' || cell.terrain === 'Mountains')) moveCost += 2;

           const newCost = costSoFar.get(key)! + moveCost;
           if (newCost <= maxAp && (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)!)) {
               costSoFar.set(nextKey, newCost);
               frontier.push({q: next.q, r: next.r, cost: newCost});
           }
       }
    }
    return reachable;
  }

  getNeighbors(q: number, r: number) {
      const dirs = [{q:1, r:0}, {q:1, r:-1}, {q:0, r:-1}, {q:-1, r:0}, {q:-1, r:1}, {q:0, r:1}];
      return dirs.map(d => ({q: q+d.q, r: r+d.r}));
  }

  getDistance(a: {q: number, r: number}, b: {q: number, r: number}) {
      return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs((-a.q-a.r) - (-b.q-b.r))) / 2;
  }

  getUnitAt(q: number, r: number) { return this.units().find(u => u.q === q && u.r === r); }

  private resolveTurnEvents(isStart: boolean = false) { 
      const event = this.currentScenario.events.find(e => !e.triggered && e.turn === this.turn());
      if (event) {
          event.triggered = true; 
          this.event$.next({ type: 'REGION_UNLOCK', q: 0, r: 0, message: event.title });
          this.addCommandPoints(2, '历史事件');
          if (event.specificSpawns) {
             let lastSpawnCoords: { q: number, r: number } | null = null;
             event.specificSpawns.forEach(s => {
                 const template = UNIT_TEMPLATES[s.template];
                 const isReinforcement = true;

                 this.createUnit(s.template, s.owner, s.q, s.r, s.name, isReinforcement);
                 lastSpawnCoords = { q: s.q, r: s.r };
                 
                 if (s.owner === 'Blue') {
                    const extraCount = 7;
                    if (template && template.category === 'Ground') {
                        const offsets = [
                          {q:1, r:-1}, {q:-1, r:1}, {q:1, r:0}, {q:-1, r:0}, {q:0, r:1}, {q:0, r:-1}, 
                          {q:2, r:-2}, {q:-2, r:2}, {q:2, r:-1}, {q:-2, r:1}, {q:1, r:1}, {q:-1, r:-1}
                        ];
                        let spawnedCount = 0;
                        for (const off of offsets) {
                            if (spawnedCount >= extraCount) break;
                            const nq = s.q + off.q;
                            const nr = s.r + off.r;
                            this.createUnit(s.template, s.owner, nq, nr, `${s.name} (增援${spawnedCount+1})`, isReinforcement);
                            spawnedCount++;
                        }
                    }
                 } else if (s.owner === 'Red') {
                    if (Math.random() < 0.5) {
                         const offsets = [{q:1, r:-1}, {q:-1, r:1}];
                         const off = offsets[Math.floor(Math.random() * offsets.length)];
                         const nq = s.q + off.q;
                         const nr = s.r + off.r;
                         this.createUnit(s.template, s.owner, nq, nr, `${s.name} (增援)`, isReinforcement);
                    }
                 }
             });
             if (lastSpawnCoords) {
                setTimeout(() => this.cameraPanRequest.set(lastSpawnCoords), 500);
             }
          }
          if (event.buffTitle) {
              const durationTurns = (event.duration || 1) * 4; 
              const newBuff: ActiveBuff = {
                  title: event.buffTitle,
                  desc: event.buffDesc || '',
                  internationalContext: event.internationalContext,
                  expiryTurn: this.turn() + durationTurns,
                  sourceEvent: event.title,
                  blueBuff: event.blueBuff,
                  redBuff: event.redBuff,
                  blueBuffMultiplier: event.blueBuffMultiplier, // Pass multiplier
                  redBuffMultiplier: event.redBuffMultiplier,   // Pass multiplier
              };
              this.activeBuffs.update(buffs => [...buffs, newBuff]);
              this.event$.next({ type: 'MORALE_BREAK', q: 0, r: 0, message: `战略变更: ${event.buffTitle}` });
          }
          if (event.silent) return false; 
          this.phase.set('EventResolution');
          this.activeEvent.set(event);
          return true; 
      }
      return false;
  }

  private createUnit(template: string, owner: PlayerId, q: number, r: number, name?: string, isReinforcement: boolean = false) { 
      const t = UNIT_TEMPLATES[template];
      if (!t) return;
      
      let templateWithBuffs = { ...t };
      let finalMaxHp = t.maxHp;
  
      if (isReinforcement && owner === 'Blue') {
          finalMaxHp = Math.round(t.maxHp * 1.5);
          templateWithBuffs = {
              ...templateWithBuffs,
              maxHp: finalMaxHp,
              steps: Math.round((t.maxSteps || 1) * 1.5),
              maxSteps: Math.round((t.maxSteps || 1) * 1.5),
              combatStrength: Math.round(t.combatStrength * 1.5),
              softAttack: Math.round(t.softAttack * 1.5),
              hardAttack: Math.round(t.hardAttack * 1.5),
              penetration: Math.round(t.penetration * 1.5),
              armor: Math.round(t.armor * 1.5),
          };
      }

      const validLoc = this.findValidSpawnHex(q, r, templateWithBuffs.category);
      if (!validLoc) return; 

      const unit: Unit = {
          id: Math.random().toString(36).substring(2, 11),
          ...templateWithBuffs,
          hp: finalMaxHp,
          ap: templateWithBuffs.maxAp, 
          fuel: templateWithBuffs.maxFuel, 
          ammo: templateWithBuffs.maxAmmo, 
          suppression: 0,
          name: name || templateWithBuffs.name,
          owner, 
          q: validLoc.q, r: validLoc.r,
          hasMoved: false, hasAttacked: false, visibility: 'Identified',
          morale: 100, fatigue: 0, supplyState: 'Supplied'
      };
      
      this.units.update(us => [...us, unit]);
      this.hexMap.update(m => {
          const cell = m.get(`${validLoc.q},${validLoc.r}`);
          if (cell) cell.unitId = unit.id;
          return new Map(m);
      });
      this.event$.next({ type: 'REINFORCEMENT', q: validLoc.q, r: validLoc.r, message: `增援: ${unit.name}` });
  }

  private findValidSpawnHex(q: number, r: number, category: UnitCategory): {q: number, r: number} | null { 
      const map = this.hexMap();
      const MAX_RADIUS = 3; 
      for (let dist = 0; dist <= MAX_RADIUS; dist++) {
          const candidates = this.getRing(q, r, dist);
          for (const c of candidates) {
              const cell = map.get(`${c.q},${c.r}`);
              if (!cell) continue; 
              if (cell.unitId) continue; 
              if (category === 'Ground' && cell.terrain === 'DeepOcean') continue;
              if (category === 'Naval' && !cell.isRiver && cell.terrain !== 'DeepOcean' && cell.terrain !== 'Coastal') continue;
              return {q: c.q, r: c.r};
          }
      }
      return null;
  }

  private getRing(q: number, r: number, radius: number): {q: number, r: number}[] { 
      if (radius === 0) return [{q, r}];
      const results: {q: number, r: number}[] = [];
      for (let dq = -radius; dq <= radius; dq++) {
          for (let dr = -radius; dr <= radius; dr++) {
              const ds = -dq - dr;
              if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds)) === radius) {
                  results.push({q: q + dq, r: r + dr});
              }
          }
      }
      return results;
  }
  
  toggleAutoPlay() { 
      this.audioService.playSfx('CLICK');
      this.isAutoPlay.update(v => !v); 
      if (this.isAutoPlay() && this.phase() === 'PlayerInput' && this.currentPlayer() === this.playerFaction()) {
          this.phase.set('AIProcessing'); 
          this.executeAiTurn(this.currentPlayer());
      }
  }

  checkVictoryConditions() {
      if (this.tutorialState().active) return; 
      const units = this.units();
      const isCombatUnit = (u: Unit) => {
          if (u.steps <= 0) return false;
          if (u.category === 'Civilian') return false;
          if (u.isHQ) return false;
          return true;
      };
      const redCombatants = units.filter(u => u.owner === 'Red' && isCombatUnit(u)).length;
      const blueCombatants = units.filter(u => u.owner === 'Blue' && isCombatUnit(u)).length;
      if (redCombatants === 0) {
          this.declareAnnihilationVictory('Blue', this.blueCasualties());
          return;
      }
      if (blueCombatants === 0) {
          this.declareAnnihilationVictory('Red', this.redCasualties());
          return;
      }
      if (this.turn() >= 216) {
          if (this.playerFaction() === 'Blue') {
             this.gameResult.set('WIN');
             this.gameResultReason.set('战略防守胜利 (S)');
             this.unlockAchievement('l_rewrite_history');
          } else {
             this.gameResult.set('LOSS');
             this.gameResultReason.set('未能按时攻占 - 战略失败');
          }
          this.isAutoPlay.set(false); 
          return;
      }
      const map = this.hexMap();
      let redInZhabei = 0;
      let blueInZhabei = 0;
      units.forEach(u => {
          const cell = map.get(`${u.q},${u.r}`);
          if (cell && cell.region === 'Core_Zhabei' && u.hp > 0) {
              if (u.owner === 'Red') redInZhabei++;
              if (u.owner === 'Blue') blueInZhabei++;
          }
      });
      if (redInZhabei >= 3 && blueInZhabei === 0) {
          if (this.playerFaction() === 'Blue') {
              this.gameResult.set('LOSS');
              this.gameResultReason.set('闸北阵地彻底失守');
          } else {
              this.gameResult.set('WIN');
              this.gameResultReason.set('成功攻占闸北核心区');
              if (this.turn() <= 30) this.unlockAchievement('l_blitzkrieg');
          }
          this.isAutoPlay.set(false); 
      }
  }

  private declareAnnihilationVictory(winner: PlayerId, casualties: number) { 
      const isBlueWin = winner === 'Blue';
      if (isBlueWin) this.unlockAchievement('l_rewrite_history');
      if (!isBlueWin && this.turn() <= 30) this.unlockAchievement('l_blitzkrieg');
      if (this.sessionStats.isNoCasualty) this.unlockAchievement('l_untouchable');

      const turn = this.turn();
      const durationDays = Math.ceil(turn / 4);
      let baseVp = 50;
      let speedBonus = 0;
      let speedRating = "常规歼灭";
      if (turn < 60) { speedBonus = 20; speedRating = "闪电歼灭"; }
      else if (turn < 120) { speedBonus = 10; speedRating = "快速歼灭"; }
      else if (turn < 180) { speedBonus = 0; speedRating = "战略歼灭"; }
      let survivalBonus = 0;
      let casualtyRating = "惨胜";
      let rank: 'S+' | 'S' | 'A' | 'B' | 'F' = 'B'; 
      if (casualties < 30) { survivalBonus = 15; casualtyRating = "完美包围"; rank = 'S+'; }
      else if (casualties < 60) { survivalBonus = 0; casualtyRating = "标准战损"; rank = 'A'; }
      else { survivalBonus = 0; casualtyRating = "浴血奋战"; rank = 'B'; }
      const totalVp = baseVp + speedBonus + survivalBonus;
      const report: VictoryReport = {
          winner,
          title: isBlueWin ? "压倒性胜利！" : "闪电战大胜！",
          subTitle: isBlueWin ? "中华民国国民革命军完成不可能的任务！" : "大日本帝国陆军完成战略歼灭！",
          turn,
          date: this.gameDateString(),
          durationDays,
          historyEval: isBlueWin 
              ? "这是淞沪会战历史上从未发生的奇迹。中国军队以顽强意志与卓越战术，彻底粉碎日本军队的侵略野心。国际社会对此感到震惊，日本大本营陷入混乱。"
              : "远超历史（实际耗时90天）。日军以迅雷不及耳之势，完成对中国军队的全面包围与歼灭。上海及周边地区完全落入日军控制，南京门户大开。",
          stats: [
              { label: isBlueWin ? "歼灭日军师团" : "歼灭中国军师", value: isBlueWin ? "12个" : "50个" }, 
              { label: "己方战损 (Steps)", value: casualties },
              { label: "持续时间", value: `${durationDays} 天` },
              { label: "历史还原度", value: isBlueWin ? "0% (完全改写)" : "10% (远超历史)" }
          ],
          vp: { base: baseVp, speed: speedBonus, casualty: survivalBonus, total: totalVp, speedRating, casualtyRating },
          rank: rank as 'S+' | 'S' | 'A' | 'B' | 'F',
          rankTitle: rank === 'S+' ? (isBlueWin ? "奇迹缔造者" : "完美胜利") : "传奇胜利",
          nextOptions: isBlueWin ? [
              { label: "结束游戏", desc: "查看详细战报并存档", action: "QUIT" },
              { label: "反攻作战 (DLC)", desc: "进军朝鲜与九州 (假想)", action: "DLC" },
              { label: "重新推演", desc: "回到第1回合", action: "REPLAY" }
          ] : [
              { label: "进军南京", desc: "历史战役 (1937.11)", action: "NEXT_LEVEL" },
              { label: "结束战役", desc: "查看最终统计", action: "QUIT" },
              { label: "全面侵华 (1938)", desc: "战略大地图模式", action: "DLC" }
          ]
      };
      this.victoryReport.set(report);
      this.gameResult.set(winner === this.playerFaction() ? 'WIN' : 'LOSS');
      this.gameResultReason.set(`${report.title} (${report.rank})`);
      this.isAutoPlay.set(false); 
  }

  checkAnnihilationWarning() { return; }
  closeEventPopup() { this.audioService.playSfx('CLICK'); this.activeEvent.set(null); if(this.phase() === 'EventResolution') this.phase.set('PlayerInput'); if(this.phase() === 'PlayerInput') this.resolvePhaseSequence(); }
  rollWeather() { const roll = Math.random(); let newWeather: WeatherCondition = 'Sunny'; if (roll < 0.15) newWeather = 'Typhoon'; else if (roll < 0.45) newWeather = 'Rain'; this.weather.set(newWeather); let msg = '天气晴朗'; if (newWeather === 'Rain') msg = '暴雨降临'; if (newWeather === 'Typhoon') msg = '台风过境'; if (newWeather !== 'Sunny') { this.event$.next({ type: 'WEATHER_CHANGE', q: 0, r: 0, message: msg }); } }
  
  checkSupply() { 
      const supplySources = new Set<string>();
      this.units().forEach(u => {
          if (u.traits?.includes('SupplySource') || u.isHQ) {
              supplySources.add(`${u.q},${u.r}`);
          }
      });
      
      this.units.update(units => units.map(u => {
          let supplied = false;
          for (const src of supplySources) {
               const [sq, sr] = src.split(',').map(Number);
               if (this.getDistance(u, {q: sq, r: sr}) <= 12) supplied = true;
          }
          if (u.owner === 'Red') supplied = true; 
          if (u.owner === 'Blue' && (u.r > 20 || u.q < -20)) supplied = true; 
          
          return { ...u, supplyState: supplied ? 'Supplied' : 'Unsupplied' };
      }));
  }
  
  checkPassiveSkills() { 
      if (this.activeDoctrines().has('GUERRILLA_PASSIVE') && this.turn() % 10 === 0 && this.currentPlayer() === 'Blue') {
          const randQ = Math.floor(Math.random() * 40) - 20; 
          const randR = Math.floor(Math.random() * 40) - 20;
          this.createUnit('NRA_Guerrilla', 'Blue', randQ, randR, '自动武工队');
      }
      if (this.activeDoctrines().has('JP_ARMORED_PATROL') && this.currentPlayer() === 'Red') {
          this.activeBuffs.update(b => [...b, {
              title: '装甲巡逻', desc: '装甲AP+2', expiryTurn: this.turn()+1, sourceEvent: 'JP_ARMORED_PATROL'
          }]);
      }
  }

  togglePause() {
      this.isPaused.update(v => !v);
      this.audioService.playSfx('CLICK');
  }

  quitGame() {
      this.gameMode.set('MENU');
      this.gameResult.set(null);
      this.victoryReport.set(null);
      this.tutorialState.set({ active: false, stepIndex: 0, currentStep: null });
      this.audioService.playSfx('CLICK');
      this.isAutoPlay.set(false);
  }

  resetTurnStats(faction: PlayerId) {
      const retreatBuff = this.activeBuffs().find(b => b.sourceEvent === 'STRAT_RETREAT');
      const patrolBuff = this.activeBuffs().find(b => b.sourceEvent === 'JP_ARMORED_PATROL');
      
      this.units.update(units => units.map(u => {
          if (u.owner !== faction) return u;

          let ap = u.maxAp;
          if (u.supplyState === 'Unsupplied') ap = Math.floor(ap * 0.5);
          else if (u.supplyState === 'Isolated') ap = 0;
          
          if (faction === 'Blue' && retreatBuff) ap += 2;
          if (faction === 'Red' && u.visuals.natoSymbol === 'armor' && patrolBuff) ap += 2;

          return {
              ...u,
              ap,
              hasMoved: false,
              hasAttacked: false,
              moveCount: 0
          };
      }));
  }

  async executeAiTurn(faction: PlayerId) {
      if (this.gameMode() === 'MENU') return;

      const myUnits = this.units().filter(u => u.owner === faction);
      const enemyUnits = this.units().filter(u => u.owner !== faction && u.owner !== 'Neutral' && u.visibility !== 'Hidden');

      for (const unit of myUnits) {
          if (unit.steps <= 0) continue;
          if (unit.ap < 3) continue;

          const enemiesInRange = enemyUnits.filter(e => this.getDistance(unit, e) <= unit.range);
          if (enemiesInRange.length > 0 && unit.ap >= 5) {
              const target = enemiesInRange.sort((a, b) => a.hp - b.hp)[0];
              this.performAttack(unit, target);
              await this.wait(300);
              if (unit.steps <= 0) continue;
          }

          if (unit.ap >= 3 && !unit.hasMoved) {
              let nearest: Unit | null = null;
              let minDst = 999;
              for (const e of enemyUnits) {
                  const d = this.getDistance(unit, e);
                  if (d < minDst) { minDst = d; nearest = e; }
              }

              if (nearest) {
                  const reachable = this.calculateReachableHexes(unit);
                  let bestHex = { q: unit.q, r: unit.r };
                  let bestHexDist = minDst;

                  for (const key of reachable) {
                      const [q, r] = key.split(',').map(Number);
                      const d = this.getDistance({q,r}, nearest);
                      if (d < bestHexDist) {
                          bestHexDist = d;
                          bestHex = {q,r};
                      }
                  }
                  
                  if (bestHex.q !== unit.q || bestHex.r !== unit.r) {
                      this.moveUnit(unit, bestHex.q, bestHex.r);
                      await this.wait(200);
                  }
              }
          }
          
           if (unit.ap >= 5 && !unit.hasAttacked) {
                const enemiesInRangeAfter = this.units().filter(u => u.owner !== faction && u.owner !== 'Neutral' && u.visibility !== 'Hidden' && this.getDistance(unit, u) <= unit.range);
                if (enemiesInRangeAfter.length > 0) {
                    const target = enemiesInRangeAfter.sort((a, b) => a.hp - b.hp)[0];
                    this.performAttack(unit, target);
                    await this.wait(300);
                }
           }
      }

      this.endTurn();
  }

  endPlayerTurn() {
      this.audioService.playSfx('CLICK');
      this.endTurn();
  }

  endTurn() {
      if (this.currentPlayer() === 'Blue') {
          this.currentPlayer.set('Red');
          this.resetTurnStats('Red');
          this.phase.set('PlayerInput');
          this.resolvePhaseSequence();
      } else {
          this.turn.update(t => t + 1);
          this.currentPlayer.set('Blue');
          this.resetTurnStats('Blue');
          this.phase.set('WeatherCheck');
          this.resolvePhaseSequence();
      }
  }

  private wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}