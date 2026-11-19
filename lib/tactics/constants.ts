import type {
  PlaystyleProfile,
  TerrainType,
  Unit,
  UnitClass,
  UpgradeEffects,
  UpgradeOption,
} from './types';

export const BOARD_SIZE = 8;

export const PALETTE = {
  background: '#0f172a',
  boardFrame: '#0b1222',
  gridBorder: '#1e293b',
  plainsLight: '#162238',
  plainsDark: '#121d31',
  forestBase: '#102928',
  forestAccent: '#1f544e',
  fortressBase: '#1e293b',
  fortressAccent: '#475569',
  fortressEmblem: '#d97706',
  chasmBase: '#070d19',
  chasmContour: '#13223b',
  playerPrimary: '#38bdf8',
  playerHighlight: '#e0f2fe',
  playerDeep: '#0c4a6e',
  enemyPrimary: '#fb7185',
  enemyHighlight: '#ffe4e6',
  enemyAmber: '#fbbf24',
  enemyDeep: '#881337',
  moveFill: 'rgba(56, 189, 248, 0.25)',
  moveStroke: 'rgba(56, 189, 248, 0.72)',
  attackFill: 'rgba(251, 113, 133, 0.3)',
  attackStroke: 'rgba(251, 113, 133, 0.85)',
  healFill: 'rgba(52, 211, 153, 0.28)',
  healStroke: 'rgba(52, 211, 153, 0.88)',
  auraColor: '#fbbf24',
  xpColor: '#a78bfa',
  healColor: '#34d399',
  rangerColor: '#4ade80',
  marksmanColor: '#38bdf8',
  healerColor: '#2dd4bf',
  critColor: '#facc15',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  panelSurface: 'rgba(15, 23, 42, 0.95)',
  panelBorder: '#334155',
} as const;

export const INITIAL_XP_TO_LEVEL = 50;

export interface TerrainMetadata {
  label: string;
  battlefieldTitle: string;
  moveCost: number;
  defenseBonus: number;
  evasionBonus: number;
  healRatio: number;
  groundPassable: boolean;
  summary: string;
}

export const TERRAIN_CONFIG: Record<TerrainType, TerrainMetadata> = {
  plains: {
    label: 'Red-Rock Flats',
    battlefieldTitle: 'SONORAN RED-ROCK FLATS',
    moveCost: 1,
    defenseBonus: 0,
    evasionBonus: 0,
    healRatio: 0,
    groundPassable: true,
    summary: 'Open desert · 1 MOV',
  },
  forest: {
    label: 'Saguaro Grove',
    battlefieldTitle: 'SAGUARO & MESQUITE GROVE',
    moveCost: 2,
    defenseBonus: 1,
    evasionBonus: 20,
    healRatio: 0,
    groundPassable: true,
    summary: '+1 DEF · +20% EVA · 2 MOV',
  },
  fortress: {
    label: 'Waystation Stone',
    battlefieldTitle: 'HALL OF THE GODS MASONRY',
    moveCost: 1,
    defenseBonus: 2,
    evasionBonus: 0,
    healRatio: 0.15,
    groundPassable: true,
    summary: '+2 DEF · Heals 15% HP',
  },
  chasm: {
    label: 'Flooded Wash',
    battlefieldTitle: 'MONSOON ARROYO WASH',
    moveCost: 1,
    defenseBonus: 0,
    evasionBonus: 0,
    healRatio: 0,
    groundPassable: false,
    summary: 'Impassable · Flyers & Ranged only',
  },
};

export interface UnitArchetypeConfig {
  label: string;
  chessAnalogue: string;
  traitSummary: string;
  maxHp: number;
  attack: number;
  defense: number;
  move: number;
  minRange: number;
  maxRange: number;
  critChance: number;
  canFly: boolean;
  ignoresTerrainDefense: boolean;
  ignoresTerrainEvasion: boolean;
  exertsZoneOfControl: boolean;
  canHeal: boolean;
  healPower: number;
  bonusVsFlyers: number;
}

export const UNIT_ARCHETYPES: Record<UnitClass, UnitArchetypeConfig> = {
  vanguard: {
    label: 'Vanguard',
    chessAnalogue: 'Pawn / Knight',
    traitSummary: 'Zone of Control · Strong vs Striker & Marksman',
    maxHp: 24,
    attack: 8,
    defense: 3,
    move: 3,
    minRange: 1,
    maxRange: 1,
    critChance: 5,
    canFly: false,
    ignoresTerrainDefense: false,
    ignoresTerrainEvasion: false,
    exertsZoneOfControl: true,
    canHeal: false,
    healPower: 0,
    bonusVsFlyers: 0,
  },
  striker: {
    label: 'Striker',
    chessAnalogue: 'Bishop / Rook',
    traitSummary: 'Flyer · Piercing Dash · Strong vs Arcanist & Healer',
    maxHp: 17,
    attack: 9,
    defense: 1,
    move: 5,
    minRange: 1,
    maxRange: 1,
    critChance: 15,
    canFly: true,
    ignoresTerrainDefense: false,
    ignoresTerrainEvasion: false,
    exertsZoneOfControl: false,
    canHeal: false,
    healPower: 0,
    bonusVsFlyers: 0,
  },
  arcanist: {
    label: 'Arcanist',
    chessAnalogue: 'Queen / Mage',
    traitSummary: 'Range 2–3 · Ignores Terrain · Strong vs Vanguard',
    maxHp: 15,
    attack: 9,
    defense: 1,
    move: 3,
    minRange: 2,
    maxRange: 3,
    critChance: 10,
    canFly: false,
    ignoresTerrainDefense: true,
    ignoresTerrainEvasion: true,
    exertsZoneOfControl: false,
    canHeal: false,
    healPower: 0,
    bonusVsFlyers: 0,
  },
  sovereign: {
    label: 'Commander',
    chessAnalogue: 'Twin Pact Leader',
    traitSummary:
      'Twin Pact · If either falls, pact breaks · Adjacent bond grants +ATK & +1 DEF',
    maxHp: 26,
    attack: 8,
    defense: 2,
    move: 3,
    minRange: 1,
    maxRange: 1,
    critChance: 15,
    canFly: false,
    ignoresTerrainDefense: false,
    ignoresTerrainEvasion: false,
    exertsZoneOfControl: false,
    canHeal: false,
    healPower: 0,
    bonusVsFlyers: 0,
  },
  cleric: {
    label: 'Cleric',
    chessAnalogue: 'Dawn Oracle',
    traitSummary: 'Heals allies (Rng 1–2) · Radiant Bolt',
    maxHp: 18,
    attack: 6,
    defense: 2,
    move: 3,
    minRange: 1,
    maxRange: 2,
    critChance: 5,
    canFly: false,
    ignoresTerrainDefense: false,
    ignoresTerrainEvasion: false,
    exertsZoneOfControl: false,
    canHeal: true,
    healPower: 11,
    bonusVsFlyers: 0,
  },
  ranger: {
    label: 'Ranger',
    chessAnalogue: 'Longbow Sentinel',
    traitSummary: 'Range 2–4 · Anti-Air (+3 vs Flyers) · True Sight',
    maxHp: 16,
    attack: 8,
    defense: 1,
    move: 3,
    minRange: 2,
    maxRange: 4,
    critChance: 15,
    canFly: false,
    ignoresTerrainDefense: false,
    ignoresTerrainEvasion: true,
    exertsZoneOfControl: false,
    canHeal: false,
    healPower: 0,
    bonusVsFlyers: 3,
  },
  marksman: {
    label: 'Marksman',
    chessAnalogue: 'Sniper / Siege',
    traitSummary:
      'Range 3–5 · Deadeye Focus (+20% CRIT if stationary) · Strong vs Arcanist & Striker',
    maxHp: 14,
    attack: 10,
    defense: 1,
    move: 2,
    minRange: 3,
    maxRange: 5,
    critChance: 35,
    canFly: false,
    ignoresTerrainDefense: false,
    ignoresTerrainEvasion: true,
    exertsZoneOfControl: false,
    canHeal: false,
    healPower: 0,
    bonusVsFlyers: 2,
  },
  healer: {
    label: 'Healer',
    chessAnalogue: 'Life Weaver',
    traitSummary:
      'Sanctuary Pulse (Rng 1–3, +4 HP splash to adjacent allies) · Low DEF',
    maxHp: 15,
    attack: 4,
    defense: 0,
    move: 3,
    minRange: 1,
    maxRange: 3,
    critChance: 5,
    canFly: false,
    ignoresTerrainDefense: false,
    ignoresTerrainEvasion: false,
    exertsZoneOfControl: false,
    canHeal: true,
    healPower: 15,
    bonusVsFlyers: 0,
  },
};

export const INITIAL_UPGRADE_EFFECTS: UpgradeEffects = {
  vanguardBonusMove: 0,
  counterBonusDamage: 0,
  arcanistBonusAttack: 0,
  sovereignAuraAttack: 1,
  strikerPierceBonus: 2,
  clericBonusHeal: 0,
  rangerBonusAttack: 0,
  marksmanBonusAttack: 0,
  marksmanBonusCrit: 0,
  forestStrideEnabled: false,
  bonusMaxHp: 0,
};

export const INITIAL_PLAYSTYLE: PlaystyleProfile = {
  arcanistAttacks: 0,
  strikerAttacks: 0,
  vanguardAttacks: 0,
  rangerAttacks: 0,
  marksmanAttacks: 0,
  clericHeals: 0,
  forestEndTurns: 0,
  fortressEndTurns: 0,
  totalPlayerActions: 0,
};

export function createUnitFromArchetype(
  id: string,
  name: string,
  unitClass: UnitClass,
  faction: 'player' | 'enemy',
  col: number,
  row: number,
  effects: UpgradeEffects,
  hpBonus = 0,
  attackBonus = 0,
): Unit {
  const config = UNIT_ARCHETYPES[unitClass];
  const isPlayerUnit = faction === 'player';
  const extraMove =
    isPlayerUnit && unitClass === 'vanguard' ? effects.vanguardBonusMove : 0;
  const classAttackBonus =
    isPlayerUnit && unitClass === 'arcanist'
      ? effects.arcanistBonusAttack
      : isPlayerUnit && unitClass === 'ranger'
        ? effects.rangerBonusAttack
        : isPlayerUnit && unitClass === 'marksman'
          ? effects.marksmanBonusAttack
          : 0;
  const extraAttack = classAttackBonus + attackBonus;
  const isSupportHealer = unitClass === 'cleric' || unitClass === 'healer';
  const extraHeal =
    isPlayerUnit && isSupportHealer ? effects.clericBonusHeal : 0;
  const extraCrit =
    isPlayerUnit && unitClass === 'marksman' ? effects.marksmanBonusCrit : 0;
  const extraMaxHp = (isPlayerUnit ? effects.bonusMaxHp : 0) + hpBonus;
  const totalMaxHp = config.maxHp + extraMaxHp;

  return {
    id,
    name,
    unitClass,
    faction,
    col,
    row,
    renderX: col,
    renderY: row,
    hp: totalMaxHp,
    maxHp: totalMaxHp,
    attack: config.attack + extraAttack,
    defense: config.defense,
    move: config.move + extraMove,
    minRange: config.minRange,
    maxRange: config.maxRange,
    canFly: config.canFly,
    ignoresTerrainDefense: config.ignoresTerrainDefense,
    ignoresTerrainEvasion: config.ignoresTerrainEvasion,
    exertsZoneOfControl: config.exertsZoneOfControl,
    canHeal: config.canHeal,
    healPower: config.healPower + extraHeal,
    bonusVsFlyers: config.bonusVsFlyers,
    critChance: config.critChance + extraCrit,
    level: 1,
    xp: 0,
    xpToNextLevel: INITIAL_XP_TO_LEVEL,
    hasMoved: false,
    hasActed: false,
    tilesMovedThisTurn: 0,
    hitFlashTimer: 0,
    lungeOffsetX: 0,
    lungeOffsetY: 0,
    weaponId: null,
    accessoryId: null,
    tempAttackBonus: 0,
  };
}

export const UPGRADE_CATALOG: UpgradeOption[] = [
  {
    id: 'vanguard-march',
    title: 'Basin Vanguard Stride',
    summary: '+1 Move range for all Vanguards across the red-rock wash.',
    tag: 'Mobility',
    apply: (units, effects, nextUnitCounter) => {
      const updatedEffects: UpgradeEffects = {
        ...effects,
        vanguardBonusMove: effects.vanguardBonusMove + 1,
      };
      const updatedUnits = units.map((unit) => {
        const isPlayerVanguard =
          unit.faction === 'player' && unit.unitClass === 'vanguard';
        return isPlayerVanguard ? {...unit, move: unit.move + 1} : unit;
      });
      return {units: updatedUnits, effects: updatedEffects, nextUnitCounter};
    },
  },
  {
    id: 'riposte-doctrine',
    title: 'Lantern Counterstrike',
    summary: 'Your counter-attacks deal +2 bonus damage.',
    tag: 'Defense',
    apply: (units, effects, nextUnitCounter) => {
      const updatedEffects: UpgradeEffects = {
        ...effects,
        counterBonusDamage: effects.counterBonusDamage + 2,
      };
      return {units, effects: updatedEffects, nextUnitCounter};
    },
  },
  {
    id: 'field-triage',
    title: 'Cistern Respite',
    summary: 'Heal all surviving Brotherhood units for 50% of Max HP.',
    tag: 'Recovery',
    apply: (units, effects, nextUnitCounter) => {
      const updatedUnits = units.map((unit) => {
        if (unit.faction !== 'player') {
          return unit;
        }
        const healAmount = Math.ceil(unit.maxHp * 0.5);
        return {...unit, hp: Math.min(unit.maxHp, unit.hp + healAmount)};
      });
      return {units: updatedUnits, effects, nextUnitCounter};
    },
  },
  {
    id: 'arcane-focus',
    title: "Infinidee's Chrono Focus",
    summary: '+2 Attack for all Arcanists channeling Xadion runes.',
    tag: 'Time',
    apply: (units, effects, nextUnitCounter) => {
      const updatedEffects: UpgradeEffects = {
        ...effects,
        arcanistBonusAttack: effects.arcanistBonusAttack + 2,
      };
      const updatedUnits = units.map((unit) => {
        const isPlayerArcanist =
          unit.faction === 'player' && unit.unitClass === 'arcanist';
        return isPlayerArcanist ? {...unit, attack: unit.attack + 2} : unit;
      });
      return {units: updatedUnits, effects: updatedEffects, nextUnitCounter};
    },
  },
  {
    id: 'hawkeye-volley',
    title: 'Cholla-Spine Volley',
    summary: '+2 Attack for all Rangers and +1 Anti-Air mastery.',
    tag: 'Precision',
    apply: (units, effects, nextUnitCounter) => {
      const updatedEffects: UpgradeEffects = {
        ...effects,
        rangerBonusAttack: effects.rangerBonusAttack + 2,
      };
      const updatedUnits = units.map((unit) => {
        const isPlayerRanger =
          unit.faction === 'player' && unit.unitClass === 'ranger';
        return isPlayerRanger
          ? {
              ...unit,
              attack: unit.attack + 2,
              bonusVsFlyers: unit.bonusVsFlyers + 1,
            }
          : unit;
      });
      return {units: updatedUnits, effects: updatedEffects, nextUnitCounter};
    },
  },
  {
    id: 'radiant-grace',
    title: "River's Monsoon Grace",
    summary: '+4 Heal Power and +1 Max Heal Range for Clerics & Healers.',
    tag: 'Water',
    apply: (units, effects, nextUnitCounter) => {
      const updatedEffects: UpgradeEffects = {
        ...effects,
        clericBonusHeal: effects.clericBonusHeal + 4,
      };
      const updatedUnits = units.map((unit) => {
        const isPlayerSupport =
          unit.faction === 'player' &&
          (unit.unitClass === 'cleric' || unit.unitClass === 'healer');
        return isPlayerSupport
          ? {
              ...unit,
              healPower: unit.healPower + 4,
              maxRange: Math.min(4, unit.maxRange + 1),
            }
          : unit;
      });
      return {units: updatedUnits, effects: updatedEffects, nextUnitCounter};
    },
  },
  {
    id: 'deadeye-optics',
    title: 'Astral Crescent Sight',
    summary: '+2 Attack and +15% Critical Chance for all Marksmen.',
    tag: 'Astral',
    apply: (units, effects, nextUnitCounter) => {
      const updatedEffects: UpgradeEffects = {
        ...effects,
        marksmanBonusAttack: effects.marksmanBonusAttack + 2,
        marksmanBonusCrit: effects.marksmanBonusCrit + 15,
      };
      const updatedUnits = units.map((unit) => {
        const isPlayerMarksman =
          unit.faction === 'player' && unit.unitClass === 'marksman';
        return isPlayerMarksman
          ? {
              ...unit,
              attack: unit.attack + 2,
              critChance: Math.min(90, unit.critChance + 15),
            }
          : unit;
      });
      return {units: updatedUnits, effects: updatedEffects, nextUnitCounter};
    },
  },
  {
    id: 'sovereign-banner',
    title: 'Brotherhood Pact Oath',
    summary: 'Twin Commander aura grants an extra +1 Attack to adjacent allies.',
    tag: 'Twin Pact',
    apply: (units, effects, nextUnitCounter) => {
      const updatedEffects: UpgradeEffects = {
        ...effects,
        sovereignAuraAttack: effects.sovereignAuraAttack + 1,
      };
      return {units, effects: updatedEffects, nextUnitCounter};
    },
  },
  {
    id: 'lancer-momentum',
    title: 'Duststep Momentum',
    summary: 'Striker dash attacks (3+ tiles) deal +2 extra damage.',
    tag: 'Wind',
    apply: (units, effects, nextUnitCounter) => {
      const updatedEffects: UpgradeEffects = {
        ...effects,
        strikerPierceBonus: effects.strikerPierceBonus + 2,
      };
      return {units, effects: updatedEffects, nextUnitCounter};
    },
  },
  {
    id: 'iron-bastion',
    title: 'Hall of the Gods Ward',
    summary: 'All Brotherhood units gain +4 Max HP and restore 4 HP.',
    tag: 'Earth',
    apply: (units, effects, nextUnitCounter) => {
      const updatedEffects: UpgradeEffects = {
        ...effects,
        bonusMaxHp: effects.bonusMaxHp + 4,
      };
      const updatedUnits = units.map((unit) => {
        if (unit.faction !== 'player') {
          return unit;
        }
        return {
          ...unit,
          maxHp: unit.maxHp + 4,
          hp: Math.min(unit.maxHp + 4, unit.hp + 4),
        };
      });
      return {units: updatedUnits, effects: updatedEffects, nextUnitCounter};
    },
  },
  {
    id: 'forest-stride',
    title: 'Saguaro Trailblazer',
    summary: 'Saguaro Grove tiles cost only 1 Movement for your squad.',
    tag: 'Terrain',
    apply: (units, effects, nextUnitCounter) => {
      const updatedEffects: UpgradeEffects = {
        ...effects,
        forestStrideEnabled: true,
      };
      return {units, effects: updatedEffects, nextUnitCounter};
    },
  },
  {
    id: 'recruit-ranger',
    title: 'Desert Guild Call',
    summary: 'Recruit an Ocotillo Scout (or +2 ATK to Rangers if at 6 units).',
    tag: 'Guild',
    apply: (units, effects, nextUnitCounter) => {
      const playerUnits = units.filter((unit) => unit.faction === 'player');
      const hasSquadRoom = playerUnits.length < 6;
      if (hasSquadRoom) {
        const freshRanger = createUnitFromArchetype(
          `p-${nextUnitCounter}`,
          'Ocotillo Scout',
          'ranger',
          'player',
          0,
          7,
          effects,
        );
        return {
          units: [...units, freshRanger],
          effects,
          nextUnitCounter: nextUnitCounter + 1,
        };
      }
      const buffedUnits = units.map((unit) => {
        const isPlayerRanger =
          unit.faction === 'player' && unit.unitClass === 'ranger';
        return isPlayerRanger ? {...unit, attack: unit.attack + 2} : unit;
      });
      return {units: buffedUnits, effects, nextUnitCounter};
    },
  },
];
