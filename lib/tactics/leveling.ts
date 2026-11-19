import type {Unit, UnitClass} from './types';

export interface LevelUpBonus {
  newLevel: number;
  bonusAttack: number;
  bonusHp: number;
  bonusHeal: number;
  bonusCrit: number;
  label: string;
}

export interface XpAwardResult {
  xpGained: number;
  levelUps: LevelUpBonus[];
}

export function calculateCombatXp(
  damageDealt: number,
  didKillTarget: boolean,
): number {
  const damageXp = Math.max(0, damageDealt) * 4;
  const killBonusXp = didKillTarget ? 30 : 0;
  return damageXp + killBonusXp;
}

export function calculateSupportHealXp(amountHealed: number): number {
  return Math.max(16, Math.min(34, 14 + amountHealed * 2));
}

export function determineLevelUpBonus(
  unitClass: UnitClass,
  newLevel: number,
): LevelUpBonus {
  const isEvenLevel = newLevel % 2 === 0;

  if (unitClass === 'healer') {
    if (isEvenLevel) {
      return {
        newLevel,
        bonusAttack: 0,
        bonusHp: 1,
        bonusHeal: 3,
        bonusCrit: 0,
        label: `LV ${newLevel} · +3 HEAL / +1 HP`,
      };
    }
    return {
      newLevel,
      bonusAttack: 0,
      bonusHp: 2,
      bonusHeal: 2,
      bonusCrit: 0,
      label: `LV ${newLevel} · +2 HP / +2 HEAL`,
    };
  }

  if (unitClass === 'cleric') {
    if (isEvenLevel) {
      return {
        newLevel,
        bonusAttack: 1,
        bonusHp: 0,
        bonusHeal: 2,
        bonusCrit: 0,
        label: `LV ${newLevel} · +2 HEAL / +1 ATK`,
      };
    }
    return {
      newLevel,
      bonusAttack: 0,
      bonusHp: 2,
      bonusHeal: 1,
      bonusCrit: 0,
      label: `LV ${newLevel} · +2 HP / +1 HEAL`,
    };
  }

  if (unitClass === 'marksman') {
    if (isEvenLevel) {
      return {
        newLevel,
        bonusAttack: 1,
        bonusHp: 0,
        bonusHeal: 0,
        bonusCrit: 4,
        label: `LV ${newLevel} · +1 ATK / +4% CRIT`,
      };
    }
    return {
      newLevel,
      bonusAttack: 0,
      bonusHp: 2,
      bonusHeal: 0,
      bonusCrit: 2,
      label: `LV ${newLevel} · +2 HP / +2% CRIT`,
    };
  }

  const isOffenseArchetype =
    unitClass === 'striker' ||
    unitClass === 'arcanist' ||
    unitClass === 'ranger';
  const grantsAttack = isOffenseArchetype ? isEvenLevel : !isEvenLevel;

  if (grantsAttack) {
    return {
      newLevel,
      bonusAttack: 1,
      bonusHp: 0,
      bonusHeal: 0,
      bonusCrit: 0,
      label: `LV ${newLevel} · +1 ATK`,
    };
  }

  return {
    newLevel,
    bonusAttack: 0,
    bonusHp: 2,
    bonusHeal: 0,
    bonusCrit: 0,
    label: `LV ${newLevel} · +2 HP`,
  };
}

function awardXpAndProcessLevels(unit: Unit, xpGained: number): XpAwardResult {
  if (xpGained <= 0 || unit.hp <= 0) {
    return {xpGained: 0, levelUps: []};
  }

  unit.xp += xpGained;
  const levelUps: LevelUpBonus[] = [];

  while (unit.xp >= unit.xpToNextLevel) {
    unit.xp -= unit.xpToNextLevel;
    unit.level += 1;
    unit.xpToNextLevel = Math.round(unit.xpToNextLevel * 1.35);

    const bonus = determineLevelUpBonus(unit.unitClass, unit.level);
    unit.attack += bonus.bonusAttack;
    unit.maxHp += bonus.bonusHp;
    unit.hp = Math.min(unit.maxHp, unit.hp + bonus.bonusHp);
    if (unit.canHeal) {
      unit.healPower += bonus.bonusHeal;
    }
    if (bonus.bonusCrit > 0) {
      unit.critChance = Math.min(90, (unit.critChance ?? 5) + bonus.bonusCrit);
    }
    levelUps.push(bonus);
  }

  return {xpGained, levelUps};
}

export function applyCombatXpToUnit(
  unit: Unit,
  damageDealt: number,
  didKillTarget: boolean,
): XpAwardResult {
  const xpGained = calculateCombatXp(damageDealt, didKillTarget);
  return awardXpAndProcessLevels(unit, xpGained);
}

export function applySupportXpToUnit(
  unit: Unit,
  amountHealed: number,
): XpAwardResult {
  const xpGained = calculateSupportHealXp(amountHealed);
  return awardXpAndProcessLevels(unit, xpGained);
}
