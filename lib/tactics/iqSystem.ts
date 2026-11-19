import {IQ_CONFIG, IQ_RANK_TIERS, TERRAIN_CONFIG} from './constants';
import {buildCombatForecast, getManhattanDistance} from './combat';
import {computeReachableTiles, isDistanceInRangeForThreat} from './iqThreatHelper';
import type {
  CombatForecast,
  DominantDoctrine,
  IqRankTier,
  IqRatingState,
  Tile,
  Unit,
  UpgradeEffects,
} from './types';

export function createInitialIqState(
  startingIq: number = IQ_CONFIG.startingIq,
  peakIq?: number,
): IqRatingState {
  const clamped = Math.max(IQ_CONFIG.minIq, Math.round(startingIq));
  return {
    current: clamped,
    peak: Math.max(clamped, Math.round(peakIq ?? clamped)),
    chronoUsedThisBattle: false,
    lastDelta: null,
    lastReason: null,
    history: [],
  };
}

export function getIqRankTier(iq: number): IqRankTier {
  for (const tier of IQ_RANK_TIERS) {
    if (iq >= tier.minIq) {
      return tier;
    }
  }
  return IQ_RANK_TIERS[IQ_RANK_TIERS.length - 1];
}

export function hasSharpStrategistSightline(iq: number): boolean {
  return iq >= IQ_CONFIG.sharpStrategistThreshold;
}

export function hasGrandmasterOverdrive(iq: number): boolean {
  return iq >= IQ_CONFIG.grandmasterThreshold;
}

export function getGrandmasterHitBonus(iq: number): number {
  return iq >= IQ_CONFIG.grandmasterThreshold ? 10 : 0;
}

export function getGrandmasterCritBonus(iq: number): number {
  return iq >= IQ_CONFIG.grandmasterThreshold ? 10 : 0;
}

export function recordIqDelta(
  state: IqRatingState,
  delta: number,
  reason: string,
  turnNumber: number,
): IqRatingState {
  const nextCurrent = Math.max(IQ_CONFIG.minIq, state.current + delta);
  const nextPeak = Math.max(state.peak, nextCurrent);
  const nextHistory = [
    ...state.history.slice(-24),
    {delta, reason, turnNumber},
  ];
  return {
    ...state,
    current: nextCurrent,
    peak: nextPeak,
    lastDelta: delta,
    lastReason: reason,
    history: nextHistory,
  };
}

export interface CombatIqEvaluation {
  delta: number;
  reason: string;
}

export function evaluatePlayerCombatIq(
  attacker: Unit,
  defender: Unit,
  forecast: CombatForecast,
  defenderDefeated: boolean,
  counterDamageTaken: number,
  attackerTile: Tile | undefined,
): CombatIqEvaluation | null {
  if (attacker.faction !== 'player') {
    return null;
  }

  if (defenderDefeated && counterDamageTaken === 0) {
    return {
      delta: IQ_CONFIG.cleanLethalBonus,
      reason: 'Clean Lethal',
    };
  }

  const usedTraitMastery =
    forecast.attackerOutcome === 'advantage' ||
    forecast.attackerPierceBonus > 0 ||
    forecast.attackerAntiAirBonus > 0 ||
    forecast.attackerDeadeyeBonus > 0 ||
    forecast.ignoresTerrain ||
    (attackerTile !== undefined &&
      TERRAIN_CONFIG[attackerTile.terrain].defenseBonus > 0) ||
    (attacker.unitClass === 'sovereign' && forecast.attackerHasAura);

  if (usedTraitMastery) {
    const label =
      forecast.attackerOutcome === 'advantage'
        ? 'Triangle Mastery'
        : forecast.attackerPierceBonus > 0
          ? 'Piercing Dash'
          : forecast.attackerAntiAirBonus > 0
            ? 'True Sight Anti-Air'
            : forecast.ignoresTerrain
              ? 'Arcane Piercing'
              : attacker.unitClass === 'sovereign' && forecast.attackerHasAura
                ? 'Twin Pact Strike'
                : 'Terrain Mastery';
    return {
      delta: IQ_CONFIG.masteryBonus,
      reason: label,
    };
  }

  return null;
}

export function evaluatePlayerHealIq(
  healer: Unit,
  ally: Unit,
  allyHpBeforeHeal: number,
): CombatIqEvaluation | null {
  if (healer.faction !== 'player' || ally.faction !== 'player') {
    return null;
  }
  const lowHealthRatio = allyHpBeforeHeal / Math.max(1, ally.maxHp);
  if (lowHealthRatio <= 0.35) {
    return {
      delta: IQ_CONFIG.tacticalSaveBonus,
      reason: 'Tactical Save',
    };
  }
  return null;
}

export function evaluatePlayerPositioningIq(
  unit: Unit,
  board: Tile[][],
  units: Unit[],
  effects: UpgradeEffects,
  playerIq: number,
): CombatIqEvaluation | null {
  if (unit.faction !== 'player' || unit.hp <= 0) {
    return null;
  }

  const standingTile = board[unit.row]?.[unit.col];
  const terrainMeta = standingTile
    ? TERRAIN_CONFIG[standingTile.terrain]
    : TERRAIN_CONFIG.plains;
  const hasDefensiveCover =
    terrainMeta.defenseBonus > 0 || terrainMeta.evasionBonus > 0;

  if (unit.exertsZoneOfControl) {
    const pinnedEnemy = units.some(
      (enemy) =>
        enemy.faction === 'enemy' &&
        enemy.hp > 0 &&
        getManhattanDistance(unit, enemy) === 1,
    );
    if (pinnedEnemy) {
      return {
        delta: IQ_CONFIG.zoneLockBonus,
        reason: 'Zone Lock Hold',
      };
    }
  }

  if (hasDefensiveCover) {
    return null;
  }

  const aliveEnemies = units.filter(
    (enemy) => enemy.faction === 'enemy' && enemy.hp > 0,
  );
  for (const enemy of aliveEnemies) {
    const enemyReach = computeReachableTiles(enemy, board, units, effects);
    for (const path of enemyReach.values()) {
      const dest = path[path.length - 1];
      const dist = getManhattanDistance(dest, unit);
      if (!isDistanceInRangeForThreat(enemy, dist)) {
        continue;
      }
      const forecast = buildCombatForecast(
        enemy,
        dest,
        unit,
        board,
        units,
        effects,
        Math.max(0, path.length - 1),
        playerIq,
      );
      if (forecast.defenderWillDie) {
        return {
          delta: IQ_CONFIG.recklessExposurePenalty,
          reason: 'Reckless Exposure',
        };
      }
    }
  }

  return null;
}

export function describeIqCounterDoctrine(
  doctrine: DominantDoctrine,
  currentIq: number,
): string {
  const tierPrefix =
    currentIq >= IQ_CONFIG.equinoxOracleThreshold
      ? 'Equinox Counter'
      : currentIq >= IQ_CONFIG.grandmasterThreshold
        ? 'Grandmaster Counter'
        : currentIq >= IQ_CONFIG.sharpStrategistThreshold
          ? 'Adaptive Storm'
          : 'Storm Doctrine';

  switch (doctrine) {
    case 'arcane':
      return `${tierPrefix}: Wraith Flank vs Casters`;
    case 'guerrilla':
      return `${tierPrefix}: Cantor Cover-Burn`;
    case 'blitz':
      return `${tierPrefix}: Anti-Air Pinning`;
    case 'phalanx':
      return `${tierPrefix}: Twin-Pact Breaker`;
    default:
      return `${tierPrefix}: Monsoon Combined Front`;
  }
}
