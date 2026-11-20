import type {ChampionSkillId, ChampionSkillSpec, Unit, UnitClass} from './types';

export const MAX_LEVEL = 10;

export interface LevelUpBonus {
  newLevel: number;
  bonusAttack: number;
  bonusHp: number;
  bonusHeal: number;
  bonusCrit: number;
  label: string;
  unlockedSkill?: ChampionSkillSpec;
}

export interface XpAwardResult {
  xpGained: number;
  levelUps: LevelUpBonus[];
}

export const CHAMPION_SKILL_CATALOG: Record<string, ChampionSkillSpec[]> = {
  'black-knight': [
    {
      id: 'abyssalStrike',
      name: 'Abyssal Strike',
      description: 'Single-target void cleave (+4 damage, costs 10% current HP).',
      hpCostPercent: 10,
      targetType: 'singleEnemy',
      unlockedAtLevel: 1,
    },
    {
      id: 'soulDrain',
      name: 'Soul Drain',
      description: 'Siphons life force, restoring 50% of damage dealt as HP.',
      hpCostPercent: 0,
      targetType: 'singleEnemy',
      unlockedAtLevel: 3,
    },
    {
      id: 'shadowBarrier',
      name: 'Shadow Barrier',
      description: 'Taunts nearby foes for 1 turn and reduces incoming physical damage by 40%.',
      hpCostPercent: 0,
      targetType: 'self',
      unlockedAtLevel: 6,
    },
    {
      id: 'voidNova',
      name: 'Void Nova',
      description: '3x3 void burst centered on self (costs 15% current HP).',
      hpCostPercent: 15,
      targetType: 'aoeSelf3x3',
      unlockedAtLevel: 9,
    },
  ],
  'gaea': [
    {
      id: 'sanctuaryPulse',
      name: 'Sanctuary Pulse',
      description: 'Mends target ally and splashes +4 HP to adjacent companions.',
      hpCostPercent: 0,
      targetType: 'singleEnemy',
      unlockedAtLevel: 1,
    },
  ],
  'x-keeper': [
    {
      id: 'lanternRally',
      name: 'Lantern Rally',
      description: 'Grants +2 ATK and +10% HIT to adjacent allies.',
      hpCostPercent: 0,
      targetType: 'self',
      unlockedAtLevel: 1,
    },
  ],
};

export function getUnlockedSkillsForUnit(unit: Unit): ChampionSkillSpec[] {
  if (!unit.heroId) {
    return [];
  }
  const catalog = CHAMPION_SKILL_CATALOG[unit.heroId] ?? [];
  return catalog.filter((skill) => unit.level >= skill.unlockedAtLevel);
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
  unit: Unit,
  newLevel: number,
): LevelUpBonus {
  const isEvenLevel = newLevel % 2 === 0;
  const unitClass = unit.unitClass;
  let bonusAttack = 0;
  let bonusHp = 1;
  let bonusHeal = 0;
  let bonusCrit = 0;
  let label = `LV ${newLevel} · Level Up`;

  if (unitClass === 'healer') {
    bonusHeal = isEvenLevel ? 3 : 2;
    bonusHp = isEvenLevel ? 1 : 2;
    label = `LV ${newLevel} · +${bonusHeal} HEAL / +${bonusHp} HP`;
  } else if (unitClass === 'cleric') {
    bonusAttack = isEvenLevel ? 1 : 0;
    bonusHeal = isEvenLevel ? 2 : 1;
    bonusHp = isEvenLevel ? 0 : 2;
    label = `LV ${newLevel} · +${bonusHeal} HEAL / +${bonusAttack} ATK`;
  } else if (unitClass === 'marksman') {
    bonusAttack = isEvenLevel ? 1 : 0;
    bonusCrit = isEvenLevel ? 4 : 2;
    bonusHp = isEvenLevel ? 0 : 2;
    label = `LV ${newLevel} · +${bonusAttack} ATK / +${bonusCrit}% CRIT`;
  } else if (unitClass === 'vanguard') {
    bonusAttack = isEvenLevel ? 1 : 0;
    bonusHp = isEvenLevel ? 2 : 3;
    label = `LV ${newLevel} · +${bonusHp} HP / +${bonusAttack} ATK`;
  } else {
    const isOffense = unitClass === 'striker' || unitClass === 'arcanist' || unitClass === 'ranger';
    bonusAttack = (isOffense ? isEvenLevel : !isEvenLevel) ? 1 : 0;
    bonusHp = bonusAttack > 0 ? 1 : 2;
    label = `LV ${newLevel} · +${bonusAttack} ATK / +${bonusHp} HP`;
  }

  const catalog = unit.heroId ? CHAMPION_SKILL_CATALOG[unit.heroId] : undefined;
  const milestoneSkill = catalog?.find((skill) => skill.unlockedAtLevel === newLevel);
  if (milestoneSkill) {
    label = `LV ${newLevel} · NEW SKILL: ${milestoneSkill.name}!`;
  }

  return {
    newLevel,
    bonusAttack,
    bonusHp,
    bonusHeal,
    bonusCrit,
    label,
    unlockedSkill: milestoneSkill,
  };
}

export function awardXpAndProcessLevels(unit: Unit, xpGained: number): XpAwardResult {
  if (xpGained <= 0 || unit.hp <= 0 || unit.level >= MAX_LEVEL) {
    return {xpGained: 0, levelUps: []};
  }

  unit.xp += xpGained;
  const levelUps: LevelUpBonus[] = [];

  while (unit.xp >= unit.xpToNextLevel && unit.level < MAX_LEVEL) {
    unit.xp -= unit.xpToNextLevel;
    unit.level += 1;
    unit.xpToNextLevel = Math.round(unit.xpToNextLevel * 1.35);

    const bonus = determineLevelUpBonus(unit, unit.level);
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

  if (unit.level >= MAX_LEVEL) {
    unit.xp = 0;
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

export function applySharedSquadXp(
  squad: Unit[],
  actorUnitId: string,
  baseXp: number,
  leaderLevel?: number,
): Array<{unit: Unit; result: XpAwardResult}> {
  const results: Array<{unit: Unit; result: XpAwardResult}> = [];
  const sharedBase = Math.max(6, Math.round(baseXp * 0.45));
  const resolvedLeaderLevel =
    leaderLevel ??
    squad.find((u) => u.heroId === 'black-knight')?.level ??
    Math.max(...squad.map((u) => u.level), 1);

  for (const ally of squad) {
    if (ally.id === actorUnitId || ally.hp <= 0 || ally.level >= MAX_LEVEL) {
      continue;
    }
    const isTrailing = ally.level < resolvedLeaderLevel - 1;
    const multiplier = isTrailing ? 1.75 : 1.0;
    const finalXp = Math.round(sharedBase * multiplier);
    const award = awardXpAndProcessLevels(ally, finalXp);
    if (award.xpGained > 0) {
      results.push({unit: ally, result: award});
    }
  }

  return results;
}
