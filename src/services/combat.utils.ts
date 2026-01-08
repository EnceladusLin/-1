
import { Unit, TerrainRule, CombatResult, CrtResultType, ActiveBuff, CombatContext } from '../types';
import { CRT_2D6, CRT_COLUMNS } from '../mechanics';

/**
 * Calculates the Odds Ratio string (e.g. "1:2", "3:1")
 */
function calculateOdds(attackStr: number, defenseStr: number): string {
    if (defenseStr <= 0) return '4:1'; // Overrun
    
    const rawRatio = attackStr / defenseStr;
    
    if (rawRatio >= 4) return '4:1';
    if (rawRatio >= 3) return '3:1';
    if (rawRatio >= 2) return '2:1';
    if (rawRatio >= 1.5) return '3:2'; // New column
    if (rawRatio >= 1) return '1:1';
    if (rawRatio >= 0.5) return '1:2';
    if (rawRatio >= 0.33) return '1:3';
    return '1:3'; // Min column
}

/**
 * RESOLVE COMBAT (2D6 SYSTEM)
 */
export function resolveCombat(
    attacker: Unit, 
    defender: Unit, 
    terrain: TerrainRule, 
    ctx: CombatContext,
    activeBuffs: ActiveBuff[] = []
): CombatResult {
    const log: string[] = [];
    
    // --- STEP 0: RICOCHET CHECK (PHYSICS RULE) ---
    // If Attacker Penetration <= Defender Armor, damage is negated (Ricochet)
    // This is the absolute first check in the physics engine.
    if (attacker.penetration <= defender.armor) {
        log.push(`跳弹判定: 穿深${attacker.penetration} <= 装甲${defender.armor}`);
        log.push(`攻击无效! (No Effect)`);
        
        return {
            attackerId: attacker.id,
            defenderId: defender.id,
            odds: 'N/A',
            dieRoll: 0,
            modifiers: 0,
            resultType: 'NE',
            attackerLoss: 0,
            defenderLoss: 0,
            attackerRetreat: 0,
            defenderRetreat: 0,
            defenderMoraleLoss: 0,
            log
        };
    }

    // --- STEP 1: SELECT ATTACK TYPE & CALCULATE BASE STRENGTH ---
    // Determine if we use Soft Attack or Hard Attack based on target Armor
    // Simplified Rule: If Armor > 0, use Hard Attack. Otherwise Soft Attack.
    const isHardTarget = defender.armor > 0;
    const baseAttackValue = isHardTarget ? attacker.hardAttack : attacker.softAttack;
    
    // NEW FORMULA: Efficiency = 0.6 + 0.4 * (HP%)
    // Units retain at least 60% effectiveness as long as they are alive.
    const getEfficiency = (u: Unit) => 0.6 + 0.4 * (u.hp / u.maxHp);

    const attEff = getEfficiency(attacker);
    const defEff = getEfficiency(defender);
    
    let attStr = baseAttackValue * attEff;
    let defStr = defender.combatStrength * defEff; // Defense always uses generic Combat Strength (Defense Value)

    log.push(`目标类型: ${isHardTarget ? '硬目标 (装甲)' : '软目标 (步兵/轻型)'}`);
    log.push(`基础战力: 攻${attStr.toFixed(1)} / 防${defStr.toFixed(1)}`);
    log.push(`效能衰减: 攻${(attEff*100).toFixed(0)}% / 防${(defEff*100).toFixed(0)}%`);

    // --- STEP 2: APPLY MULTIPLIERS (Terrain, Supply, Morale, Buffs) ---
    
    // Buff Multipliers (General & Specific)
    activeBuffs.forEach(buff => {
        // 1. Generic Event Buffs
        if (attacker.owner === 'Blue' && buff.blueBuffMultiplier?.combatStrength) {
            attStr *= buff.blueBuffMultiplier.combatStrength;
            log.push(`${buff.title}: 战力 x${buff.blueBuffMultiplier.combatStrength}`);
        }
        if (attacker.owner === 'Red' && buff.redBuffMultiplier?.combatStrength) {
            attStr *= buff.redBuffMultiplier.combatStrength;
            log.push(`${buff.title}: 战力 x${buff.redBuffMultiplier.combatStrength}`);
        }
        
        // 2. Skill Specific: SIHANG_FLAG (Blue) - Massive Defense Multiplier
        if (buff.sourceEvent === 'SIHANG_FLAG' && buff.targetUnitId === defender.id) {
            const multi = buff.data?.defenseMultiplier || 3;
            defStr *= multi;
            log.push(`四行孤军: 防御 x${multi}`);
        }
    });

    // Terrain Multiplier (Defender only)
    let terrainMod = terrain.defenseMultiplier;
    
    // Skill Specific: JP_IRON_WALL (Red) - Ignore Terrain
    const ironWall = activeBuffs.some(b => b.sourceEvent === 'JP_IRON_WALL' && attacker.owner === 'Red');
    if (ironWall) {
        terrainMod = 1.0;
        log.push(`铁壁攻坚: 无视地形加成`);
    }

    // Cap Terrain Mod at 2.5 (unless Sihang Flag applied earlier)
    if (terrainMod > 2.5) terrainMod = 2.5;
    
    defStr *= terrainMod;
    if (terrainMod !== 1) log.push(`地形修正: x${terrainMod.toFixed(1)}`);

    // Supply Multiplier
    const getSupplyMod = (u: Unit) => u.supplyState === 'Unsupplied' ? 0.5 : 1.0;
    attStr *= getSupplyMod(attacker);
    defStr *= getSupplyMod(defender);
    if (getSupplyMod(attacker) < 1) log.push(`攻击方缺补给 (x0.5)`);
    if (getSupplyMod(defender) < 1) log.push(`防御方缺补给 (x0.5)`);

    // Morale Multiplier
    // Range 0-100 maps to 0.5 - 1.5
    // Formula: (Morale/10 - 5) * 0.1 + 1
    const getMoraleMod = (m: number) => {
        const val = (m / 10 - 5) * 0.1 + 1;
        return Math.max(0.5, Math.min(1.5, val));
    };
    
    attStr *= getMoraleMod(attacker.morale);
    defStr *= getMoraleMod(defender.morale);
    
    // --- STEP 2.5: SPECIAL COMBAT CONTEXT MODIFIERS ---
    if (ctx.isCoastalAssault) {
        // Only apply penalty if the attacker is NOT on Coastal terrain
        // This implies they are attacking FROM water or non-prepared position into defense
        // But if Land attacks Sea, and ctx says coastal assault (set by game service logic), check direction
        
        // If Attacker is Ground and Defender is Naval, and Attacker is on Coast (logic handled in service to NOT set flag, or check here)
        // Actually, let's trust the flag, but assume GameService sets it only when penalty applies.
        // However, standard logic is:
        const roll = Math.random();
        const modifier = roll < 0.3 ? 0.45 : 0.30;
        attStr *= modifier;
        log.push(`登陆/攻击水面惩罚 (x${modifier.toFixed(2)})`);
    } else if (attacker.category === 'Ground' && defender.category === 'Naval') {
        // Coastal Defense Logic: No penalty, but log it
        log.push(`岸防阵地射击 (标准伤害)`);
    }

    // --- STEP 3: ADDITIVE BONUSES (Skills/Buffs) ---
    activeBuffs.forEach(buff => {
        // Generic C-Value buffs from events
        if (attacker.owner === 'Blue' && buff.blueBuff?.combatStrength) attStr += buff.blueBuff.combatStrength;
        if (attacker.owner === 'Red' && buff.redBuff?.combatStrength) attStr += buff.redBuff.combatStrength;
        
        if (defender.owner === 'Blue' && buff.blueBuff?.combatStrength) defStr += buff.blueBuff.combatStrength;
        if (defender.owner === 'Red' && buff.redBuff?.combatStrength) defStr += buff.redBuff.combatStrength;

        // Skill Specific: JP_ENCIRCLE
        if (buff.sourceEvent === 'JP_ENCIRCLE') {
            if (attacker.owner === 'Red') {
                attStr += 2;
                log.push('三面合围: 攻击+2');
            }
            if (defender.owner === 'Blue') {
                defStr = Math.max(0.1, defStr - 2); // Prevent negative
                log.push('三面合围: 防御-2');
            }
        }

        // Skill Specific: LUODIAN_OATH (Blue) - Defense Bonus in Region
        if (buff.sourceEvent === 'LUODIAN_OATH' && defender.owner === 'Blue') {
            if (buff.data?.defenseBonus) {
                 defStr += buff.data.defenseBonus;
                 log.push(`罗店血誓: 防御+${buff.data.defenseBonus}`);
            }
        }
        
        // Skill Specific: JP_ARMORED_WEDGE
        if (buff.sourceEvent === 'JP_ARMORED_WEDGE' && attacker.owner === 'Red' && attacker.visuals.natoSymbol === 'armor') {
             attStr += (buff.data?.armorAttackBonus || 5);
             log.push('装甲楔形: 攻击+5');
        }
    });

    // --- STEP 4: CALCULATE ODDS ---
    attStr = Math.max(0.1, attStr);
    defStr = Math.max(0.1, defStr);
    const odds = calculateOdds(attStr, defStr);
    log.push(`最终战力: ${attStr.toFixed(1)} vs ${defStr.toFixed(1)}`);
    log.push(`战斗比: ${odds}`);

    // --- STEP 5: DICE MODIFIERS ---
    let diceMod = 0;
    
    // Attacker Bonuses
    if (ctx.hasArmorSupport) { diceMod += 1; log.push('装甲支援 (+1)'); }
    
    if (ctx.hasAirSupport) {
        if (ctx.weather === 'Typhoon') {
            log.push('台风: 无航空支援');
        } else if (ctx.weather === 'Rain') {
            diceMod += 1;
            log.push('航空支援 (雨天, +1)');
        } else {
            diceMod += 2;
            log.push('航空支援 (+2)');
        }
    }

    if (ctx.hasNavalSupport) { 
        diceMod += 2; 
        log.push('舰炮支援 (+2)'); 
    } else {
        // Skill Specific: JP_NAVAL_GUN (Global Naval Support)
        const globalNaval = activeBuffs.some(b => b.sourceEvent === 'JP_NAVAL_GUN' && attacker.owner === 'Red');
        if (globalNaval) {
            diceMod += 2;
            log.push('全域舰炮 (+2)');
        }
    }
    
    // Defender Bonuses / Attacker Penalties
    if (ctx.isBackToRiver) { diceMod -= 1; log.push('背水一战 (-1)'); } 
    
    if (defender.ammo > 5) { diceMod -= 1; log.push('顽强抵抗 (-1)'); }

    if (ctx.isUrbanAssaultNoEng) { diceMod -= 1; log.push('缺乏工兵 (-1)'); }
    if (ctx.isNight) { diceMod -= 2; log.push('夜间战斗 (-2)'); }
    
    if (ctx.weather === 'Rain') {
        diceMod -= 1;
        log.push('雨天 (-1)');
    }

    // Cap Modifiers (+4 / -2)
    diceMod = Math.max(-2, Math.min(4, diceMod));
    log.push(`骰修正: ${diceMod > 0 ? '+' : ''}${diceMod}`);

    // --- STEP 6: ROLL 2D6 ---
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const rawRoll = d1 + d2;
    const finalRoll = Math.max(2, Math.min(12, rawRoll + diceMod));
    
    log.push(`骰点: ${d1}+${d2} = ${rawRoll} -> ${finalRoll}`);

    // --- STEP 7: LOOKUP RESULT ---
    const resultType = CRT_2D6[finalRoll][CRT_COLUMNS.indexOf(odds)];
    log.push(`结果: ${resultType}`);

    // --- STEP 8: PARSE RESULT ---
    let attackerLoss = 0;
    let defenderLoss = 0;
    let attackerRetreat = 0;
    let defenderRetreat = 0;
    let defenderMoraleLoss = 0;

    switch (resultType) {
        case 'AE': 
            attackerLoss = 4; // Elim
            break;
        case 'AR2':
            attackerLoss = 2; attackerRetreat = 2;
            break;
        case 'AR1':
            attackerLoss = 1; attackerRetreat = 1;
            break;
        case 'DR1':
            defenderLoss = 1; defenderRetreat = 1;
            break;
        case 'DD1': // Defender Disrupted 1
            defenderLoss = 1; 
            defenderMoraleLoss = 10; // -1 on 0-10 scale = -10 on 0-100
            break;
        case 'DD2': // Defender Disrupted 2
            defenderLoss = 2;
            defenderMoraleLoss = 20;
            break;
        case 'DE':
            defenderLoss = 4; // Elim
            break;
        case 'NE':
        default:
            break;
    }

    return {
        attackerId: attacker.id,
        defenderId: defender.id,
        odds,
        dieRoll: finalRoll,
        modifiers: diceMod,
        resultType,
        attackerLoss,
        defenderLoss,
        attackerRetreat,
        defenderRetreat,
        defenderMoraleLoss,
        log
    };
}
