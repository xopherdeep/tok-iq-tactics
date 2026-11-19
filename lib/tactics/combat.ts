import {TERRAIN_CONFIG, UNIT_ARCHETYPES} from './constants';
import {computeUnitEquipmentBonuses} from './rpgCatalog';
import type {
  CombatForecast,
  GridCoord,
  Tile,
  TriangleOutcome,
  Unit,
  UnitClass,
  UpgradeEffects,
} from './types';

export function getManhattanDistance(a: GridCoord, b: GridCoord): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

export function evaluateWeaponTriangle(
  attackerClass: UnitClass,
  defenderClass: UnitClass,
): TriangleOutcome {
  const vanguardBeatsStriker =
    attackerClass === 'vanguard' && defenderClass === 'striker';
  const vanguardBeatsMarksman =
    attackerClass === 'vanguard' && defenderClass === 'marksman';
  const strikerBeatsArcanist =
    attackerClass === 'striker' && defenderClass === 'arcanist';
  const strikerBeatsHealer =
    attackerClass === 'striker' && defenderClass === 'healer';
  const arcanistBeatsVanguard =
    attackerClass === 'arcanist' && defenderClass === 'vanguard';
  const rangerBeatsStriker =
    attackerClass === 'ranger' && defenderClass === 'striker';
  const marksmanBeatsArcanist =
    attackerClass === 'marksman' && defenderClass === 'arcanist';
  const marksmanBeatsStriker =
    attackerClass === 'marksman' && defenderClass === 'striker';
  const marksmanBeatsHealer =
    attackerClass === 'marksman' && defenderClass === 'healer';

  const hasAdvantage =
    vanguardBeatsStriker ||
    vanguardBeatsMarksman ||
    strikerBeatsArcanist ||
    strikerBeatsHealer ||
    arcanistBeatsVanguard ||
    rangerBeatsStriker ||
    marksmanBeatsArcanist ||
    marksmanBeatsStriker ||
    marksmanBeatsHealer;

  if (hasAdvantage) {
    return 'advantage';
  }

  const strikerLosesToVanguard =
    attackerClass === 'striker' && defenderClass === 'vanguard';
  const strikerLosesToMarksman =
    attackerClass === 'striker' && defenderClass === 'marksman';
  const arcanistLosesToStriker =
    attackerClass === 'arcanist' && defenderClass === 'striker';
  const arcanistLosesToMarksman =
    attackerClass === 'arcanist' && defenderClass === 'marksman';
  const vanguardLosesToArcanist =
    attackerClass === 'vanguard' && defenderClass === 'arcanist';
  const marksmanLosesToVanguard =
    attackerClass === 'marksman' && defenderClass === 'vanguard';
  const healerLosesToStriker =
    attackerClass === 'healer' && defenderClass === 'striker';
  const healerLosesToMarksman =
    attackerClass === 'healer' && defenderClass === 'marksman';

  const hasDisadvantage =
    strikerLosesToVanguard ||
    strikerLosesToMarksman ||
    arcanistLosesToStriker ||
    arcanistLosesToMarksman ||
    vanguardLosesToArcanist ||
    marksmanLosesToVanguard ||
    healerLosesToStriker ||
    healerLosesToMarksman;

  if (hasDisadvantage) {
    return 'disadvantage';
  }

  return 'neutral';
}

export function getTriangleDamageModifier(outcome: TriangleOutcome): number {
  if (outcome === 'advantage') {
    return 2;
  }
  if (outcome === 'disadvantage') {
    return -2;
  }
  return 0;
}

export function hasAdjacentSovereignAura(
  subject: Unit,
  subjectPos: GridCoord,
  units: Unit[],
): boolean {
  return units.some((ally) => {
    const isAlliedSovereign =
      ally.faction === subject.faction &&
      ally.unitClass === 'sovereign' &&
      ally.hp > 0 &&
      ally.id !== subject.id;
    if (!isAlliedSovereign) {
      return false;
    }
    return getManhattanDistance(subjectPos, ally) === 1;
  });
}

export function hasBrotherhoodPactBond(
  subject: Unit,
  subjectPos: GridCoord,
  units: Unit[],
): boolean {
  if (subject.unitClass !== 'sovereign') {
    return false;
  }
  return hasAdjacentSovereignAura(subject, subjectPos, units);
}

export function isDistanceInAttackRange(unit: Unit, distance: number): boolean {
  const gear = computeUnitEquipmentBonuses(unit);
  return distance >= unit.minRange && distance <= unit.maxRange + gear.rangeBonus;
}

export function getPiercingDashBonus(
  attacker: Unit,
  tilesMoved: number,
  effects: UpgradeEffects,
): number {
  const isQualifyingStrikerDash =
    attacker.unitClass === 'striker' && tilesMoved >= 3;
  if (!isQualifyingStrikerDash) {
    return 0;
  }
  return attacker.faction === 'player' ? effects.strikerPierceBonus : 2;
}

export function getDeadeyeCritBonus(
  attacker: Unit,
  isCounterAttack: boolean,
  tilesMoved: number,
): number {
  const isStationaryMarksman =
    attacker.unitClass === 'marksman' && !isCounterAttack && tilesMoved === 0;
  return isStationaryMarksman ? 20 : 0;
}

export function computeCriticalDamage(baseDamage: number): number {
  return Math.ceil(baseDamage * 1.5);
}

export function calculateSingleStrikeDamage(
  attacker: Unit,
  attackerPos: GridCoord,
  defender: Unit,
  defenderPos: GridCoord,
  board: Tile[][],
  units: Unit[],
  effects: UpgradeEffects,
  isCounterAttack: boolean,
  tilesMoved: number,
): {
  damage: number;
  hitChance: number;
  critChance: number;
  deadeyeBonus: number;
  outcome: TriangleOutcome;
  hasAura: boolean;
  pierceBonus: number;
  antiAirBonus: number;
  terrainDefense: number;
  terrainEvasion: number;
} {
  const defenderTile = board[defenderPos.row][defenderPos.col];
  const terrainMeta = TERRAIN_CONFIG[defenderTile.terrain];
  const outcome = evaluateWeaponTriangle(attacker.unitClass, defender.unitClass);
  const triangleBonus = getTriangleDamageModifier(outcome);
  const hasAura = hasAdjacentSovereignAura(attacker, attackerPos, units);
  const auraAmount = hasAura
    ? attacker.faction === 'player'
      ? effects.sovereignAuraAttack
      : 1
    : 0;
  const pierceBonus = isCounterAttack
    ? 0
    : getPiercingDashBonus(attacker, tilesMoved, effects);
  const antiAirBonus =
    defender.canFly && attacker.bonusVsFlyers > 0 ? attacker.bonusVsFlyers : 0;
  const counterBonus =
    isCounterAttack && attacker.faction === 'player'
      ? effects.counterBonusDamage
      : 0;
  const deadeyeBonus = getDeadeyeCritBonus(
    attacker,
    isCounterAttack,
    tilesMoved,
  );

  const effectiveTerrainDefense = attacker.ignoresTerrainDefense
    ? 0
    : terrainMeta.defenseBonus;
  const effectiveTerrainEvasion = attacker.ignoresTerrainEvasion
    ? 0
    : terrainMeta.evasionBonus;

  const attackerGear = computeUnitEquipmentBonuses(attacker);
  const defenderGear = computeUnitEquipmentBonuses(defender);
  const totalAttack =
    attacker.attack +
    attackerGear.attackBonus +
    (attacker.tempAttackBonus ?? 0) +
    triangleBonus +
    auraAmount +
    pierceBonus +
    antiAirBonus +
    counterBonus;
  const pactDefenseBonus = hasBrotherhoodPactBond(defender, defenderPos, units)
    ? 1
    : 0;
  const totalDefense =
    defender.defense +
    defenderGear.defenseBonus +
    effectiveTerrainDefense +
    pactDefenseBonus;
  const rawDamage = totalAttack - totalDefense;
  const clampedDamage = Math.max(1, rawDamage);
  const hitChance = Math.max(55, Math.min(100, 100 - effectiveTerrainEvasion));
  const baseCrit =
    attacker.critChance ?? UNIT_ARCHETYPES[attacker.unitClass].critChance;
  const critChance = Math.max(
    0,
    Math.min(95, baseCrit + attackerGear.critBonus + deadeyeBonus),
  );

  return {
    damage: clampedDamage,
    hitChance,
    critChance,
    deadeyeBonus,
    outcome,
    hasAura,
    pierceBonus,
    antiAirBonus,
    terrainDefense: effectiveTerrainDefense,
    terrainEvasion: effectiveTerrainEvasion,
  };
}

export function buildCombatForecast(
  attacker: Unit,
  attackerPos: GridCoord,
  defender: Unit,
  board: Tile[][],
  units: Unit[],
  effects: UpgradeEffects,
  tilesMoved: number,
): CombatForecast {
  const distance = getManhattanDistance(attackerPos, defender);
  const attackerStrike = calculateSingleStrikeDamage(
    attacker,
    attackerPos,
    defender,
    defender,
    board,
    units,
    effects,
    false,
    tilesMoved,
  );

  const defenderWillDie = defender.hp - attackerStrike.damage <= 0;
  const defenderInRange = isDistanceInAttackRange(defender, distance);
  const defenderCanCounter = !defenderWillDie && defenderInRange;

  const counterStrike = defenderCanCounter
    ? calculateSingleStrikeDamage(
        defender,
        defender,
        attacker,
        attackerPos,
        board,
        units,
        effects,
        true,
        0,
      )
    : null;

  const defenderDamage = counterStrike ? counterStrike.damage : 0;
  const defenderHitChance = counterStrike ? counterStrike.hitChance : 0;
  const defenderCritChance = counterStrike ? counterStrike.critChance : 0;
  const attackerWillDie =
    defenderCanCounter && attacker.hp - defenderDamage <= 0;

  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    attackerDamage: attackerStrike.damage,
    attackerHitChance: attackerStrike.hitChance,
    attackerCritChance: attackerStrike.critChance,
    attackerDeadeyeBonus: attackerStrike.deadeyeBonus,
    attackerOutcome: attackerStrike.outcome,
    attackerHasAura: attackerStrike.hasAura,
    attackerPierceBonus: attackerStrike.pierceBonus,
    attackerAntiAirBonus: attackerStrike.antiAirBonus,
    defenderCanCounter,
    defenderDamage,
    defenderHitChance,
    defenderCritChance,
    defenderWillDie,
    attackerWillDie,
    defenderTerrainDefense: attackerStrike.terrainDefense,
    defenderTerrainEvasion: attackerStrike.terrainEvasion,
    ignoresTerrain: attacker.ignoresTerrainDefense,
  };
}
