import type {
  ConsumableInventory,
  ConsumableItemSpec,
  ConsumableType,
  EquipmentItem,
  TavernRecruitOffer,
  Unit,
  UnitClass,
  UpgradeEffects,
} from './types';

export const STARTING_GOLD = 120;

export const INITIAL_CONSUMABLES: ConsumableInventory = {
  potion: 3,
  hiPotion: 1,
  powerTonic: 1,
};

export const INITIAL_EQUIPMENT_INVENTORY: string[] = [
  'iron-sword',
  'leather-shield',
  'leather-shield',
  'hawk-cloak',
  'dawn-censer',
];

export const CONSUMABLE_CATALOG: Record<ConsumableType, ConsumableItemSpec> = {
  potion: {
    id: 'potion',
    name: 'Rainwater Jar',
    price: 35,
    summary: 'Monsoon rainwater that restores 12 HP to the active unit.',
    healAmount: 12,
    tempAttackBonus: 0,
  },
  hiPotion: {
    id: 'hiPotion',
    name: 'Cistern Dew Flask',
    price: 70,
    summary: 'Blessed Hall cistern dew that restores 24 HP to the active unit.',
    healAmount: 24,
    tempAttackBonus: 0,
  },
  powerTonic: {
    id: 'powerTonic',
    name: 'Lightning Flask',
    price: 60,
    summary: 'Bottled telluric storm energy granting +3 ATK for this battle.',
    healAmount: 0,
    tempAttackBonus: 3,
  },
};

export const EQUIPMENT_CATALOG: EquipmentItem[] = [
  {
    id: 'iron-sword',
    name: "Keeper's Iron Blade",
    slot: 'weapon',
    price: 55,
    summary: '+2 ATK for front-line melee fighters and Commanders.',
    allowedClasses: ['sovereign', 'vanguard', 'striker'],
    attackBonus: 2,
    defenseBonus: 0,
    moveBonus: 0,
    maxHpBonus: 0,
    healBonus: 0,
    rangeBonus: 0,
  },
  {
    id: 'steel-broadsword',
    name: 'Solar Broadsword',
    slot: 'weapon',
    price: 110,
    summary: '+3 ATK and +5% CRIT forged in Sonoran sun-steel.',
    allowedClasses: ['sovereign', 'vanguard', 'striker'],
    attackBonus: 3,
    defenseBonus: 0,
    moveBonus: 0,
    maxHpBonus: 0,
    healBonus: 0,
    rangeBonus: 0,
    critBonus: 5,
  },
  {
    id: 'iron-halberd',
    name: "Warden's Wash Spear",
    slot: 'weapon',
    price: 80,
    summary: '+2 ATK and +1 DEF for holding the Hall footbridge.',
    allowedClasses: ['vanguard', 'striker', 'sovereign'],
    attackBonus: 2,
    defenseBonus: 1,
    moveBonus: 0,
    maxHpBonus: 0,
    healBonus: 0,
    rangeBonus: 0,
  },
  {
    id: 'sovereign-blade',
    name: 'Oathkeeper Edge',
    slot: 'weapon',
    price: 135,
    summary: '+3 ATK and +1 DEF for Twin Commanders X & Sol.',
    allowedClasses: ['sovereign'],
    attackBonus: 3,
    defenseBonus: 1,
    moveBonus: 0,
    maxHpBonus: 0,
    healBonus: 0,
    rangeBonus: 0,
  },
  {
    id: 'sunlit-lance',
    name: 'Starlight Glaive',
    slot: 'weapon',
    price: 145,
    summary: '+3 ATK and +1 MOV for Strikers & Vanguards.',
    allowedClasses: ['striker', 'vanguard'],
    attackBonus: 3,
    defenseBonus: 0,
    moveBonus: 1,
    maxHpBonus: 0,
    healBonus: 0,
    rangeBonus: 0,
  },
  {
    id: 'astral-grimoire',
    name: 'Infinity Staff',
    slot: 'weapon',
    price: 110,
    summary: '+3 ATK channeling Chrono & Telluric magic for Arcanists.',
    allowedClasses: ['arcanist'],
    attackBonus: 3,
    defenseBonus: 0,
    moveBonus: 0,
    maxHpBonus: 0,
    healBonus: 0,
    rangeBonus: 0,
  },
  {
    id: 'longshot-bow',
    name: 'Cholla Thornbow',
    slot: 'weapon',
    price: 125,
    summary: '+2 ATK and +1 Max Range for Rangers & Marksmen.',
    allowedClasses: ['ranger', 'marksman'],
    attackBonus: 2,
    defenseBonus: 0,
    moveBonus: 0,
    maxHpBonus: 0,
    healBonus: 0,
    rangeBonus: 1,
  },
  {
    id: 'sniper-arbalest',
    name: 'Crescent Moonbow',
    slot: 'weapon',
    price: 130,
    summary: '+3 ATK and +15% CRIT for Marksmen & Astral Rangers.',
    allowedClasses: ['marksman', 'ranger'],
    attackBonus: 3,
    defenseBonus: 0,
    moveBonus: 0,
    maxHpBonus: 0,
    healBonus: 0,
    rangeBonus: 0,
    critBonus: 15,
  },
  {
    id: 'dawn-censer',
    name: 'Monsoon Clay Censer',
    slot: 'weapon',
    price: 95,
    summary: '+4 Mend Power and +1 Max Range for Clerics & Healers.',
    allowedClasses: ['cleric', 'healer'],
    attackBonus: 1,
    defenseBonus: 0,
    moveBonus: 0,
    maxHpBonus: 0,
    healBonus: 4,
    rangeBonus: 1,
  },
  {
    id: 'seraph-staff',
    name: 'Living Oak Staff',
    slot: 'weapon',
    price: 115,
    summary: '+5 Mend Power and +1 Max Range steeped in Basin dew.',
    allowedClasses: ['healer', 'cleric'],
    attackBonus: 1,
    defenseBonus: 0,
    moveBonus: 0,
    maxHpBonus: 0,
    healBonus: 5,
    rangeBonus: 1,
  },
  {
    id: 'leather-shield',
    name: 'Lion Crest Buckler',
    slot: 'accessory',
    price: 50,
    summary: '+1 DEF and +3 Max HP for any hero.',
    attackBonus: 0,
    defenseBonus: 1,
    moveBonus: 0,
    maxHpBonus: 3,
    healBonus: 0,
    rangeBonus: 0,
  },
  {
    id: 'hawk-cloak',
    name: 'Dusty Work Coat',
    slot: 'accessory',
    price: 105,
    summary: '+10% CRIT and +1 DEF weathered by desert storms.',
    attackBonus: 0,
    defenseBonus: 1,
    moveBonus: 0,
    maxHpBonus: 0,
    healBonus: 0,
    rangeBonus: 0,
    critBonus: 10,
  },
  {
    id: 'aegis-buckler',
    name: 'Telluric Tower Shield',
    slot: 'accessory',
    price: 85,
    summary: '+2 DEF carved from red-rock basalt.',
    attackBonus: 0,
    defenseBonus: 2,
    moveBonus: 0,
    maxHpBonus: 0,
    healBonus: 0,
    rangeBonus: 0,
  },
  {
    id: 'vitality-charm',
    name: 'Chamber Lantern',
    slot: 'accessory',
    price: 90,
    summary: '+5 Max HP glowing with Sevens Night lantern gold.',
    attackBonus: 0,
    defenseBonus: 0,
    moveBonus: 0,
    maxHpBonus: 5,
    healBonus: 0,
    rangeBonus: 0,
  },
  {
    id: 'gale-boots',
    name: 'Arroyo Striders',
    slot: 'accessory',
    price: 120,
    summary: '+1 MOV across red-rock flats and canyon crossings.',
    attackBonus: 0,
    defenseBonus: 0,
    moveBonus: 1,
    maxHpBonus: 0,
    healBonus: 0,
    rangeBonus: 0,
  },
  {
    id: 'tactician-crest',
    name: 'Brotherhood Signet',
    slot: 'accessory',
    price: 115,
    summary: '+2 ATK and +1 DEF worn by Champions of Xadion.',
    attackBonus: 2,
    defenseBonus: 1,
    moveBonus: 0,
    maxHpBonus: 0,
    healBonus: 0,
    rangeBonus: 0,
  },
];

export const TAVERN_RECRUITS: TavernRecruitOffer[] = [
  {
    id: 'tavern-black-knight',
    name: 'Black Knight',
    title: 'Void Dread Knight · Champion',
    unitClass: 'vanguard',
    cost: 90,
    summary: 'Obsidian-armored juggernaut wielding a void greatsword who locks down the wash.',
  },
  {
    id: 'tavern-duststep',
    name: 'Duststep',
    title: 'Dual-Blade Scout · Desert Guild',
    unitClass: 'striker',
    cost: 100,
    summary: 'Swift canyon flanker who vaults flooded washes and cuts down storm casters.',
  },
  {
    id: 'tavern-sandcaller',
    name: 'Sandcaller',
    title: 'Telluric Shaman · Desert Guild',
    unitClass: 'arcanist',
    cost: 110,
    summary: 'Channels dust devils and earth spikes that shatter masonry and armor.',
  },
  {
    id: 'tavern-ocotillo',
    name: 'Ocotillo Bow',
    title: 'Ridge Watcher · Desert Guild',
    unitClass: 'ranger',
    cost: 100,
    summary: 'High-ground desert archer with True Sight and lethal anti-air volleys.',
  },
  {
    id: 'tavern-cistern-mender',
    name: 'Cistern Mender',
    title: 'Monsoon Carrier · Desert Guild',
    unitClass: 'cleric',
    cost: 95,
    summary: 'Pours blessed rainwater dew from clay jars while warding off wraiths.',
  },
  {
    id: 'tavern-canyon-deadeye',
    name: 'Mesa Deadeye',
    title: 'Red-Rock Arbalest · Desert Guild',
    unitClass: 'marksman',
    cost: 85,
    summary: 'Long-range sniper (Rng 3–5) who punishes storm spirits with critical bolts.',
  },
  {
    id: 'tavern-wash-herbalist',
    name: 'Basin Herbalist',
    title: 'Green-2014 Weaver · Desert Guild',
    unitClass: 'healer',
    cost: 80,
    summary: 'High-output Healer (Rng 1–3) whose Sanctuary Pulse mends clustered allies.',
  },
];

export function getEquipmentById(id: string | null): EquipmentItem | null {
  if (!id) {
    return null;
  }
  return EQUIPMENT_CATALOG.find((item) => item.id === id) ?? null;
}

export function canUnitClassEquipItem(
  unitClass: UnitClass,
  item: EquipmentItem,
): boolean {
  if (!item.allowedClasses || item.allowedClasses.length === 0) {
    return true;
  }
  return item.allowedClasses.includes(unitClass);
}

export function canUnitEquipItem(unit: Unit, item: EquipmentItem): boolean {
  return canUnitClassEquipItem(unit.unitClass, item);
}

export interface EquipmentStatDeltas {
  attack: number;
  defense: number;
  move: number;
  maxHp: number;
  healPower: number;
  maxRange: number;
  critChance: number;
}

export function computeEquipmentComparisonDeltas(
  candidateItem: EquipmentItem,
  currentlyEquippedItem: EquipmentItem | null,
): EquipmentStatDeltas {
  return {
    attack: candidateItem.attackBonus - (currentlyEquippedItem?.attackBonus ?? 0),
    defense:
      candidateItem.defenseBonus - (currentlyEquippedItem?.defenseBonus ?? 0),
    move: candidateItem.moveBonus - (currentlyEquippedItem?.moveBonus ?? 0),
    maxHp: candidateItem.maxHpBonus - (currentlyEquippedItem?.maxHpBonus ?? 0),
    healPower: candidateItem.healBonus - (currentlyEquippedItem?.healBonus ?? 0),
    maxRange: candidateItem.rangeBonus - (currentlyEquippedItem?.rangeBonus ?? 0),
    critChance:
      (candidateItem.critBonus ?? 0) - (currentlyEquippedItem?.critBonus ?? 0),
  };
}

export function describeEquipmentBonuses(item: EquipmentItem): string[] {
  const labels: string[] = [];
  if (item.attackBonus > 0) {
    labels.push(`+${item.attackBonus} ATK`);
  }
  if (item.defenseBonus > 0) {
    labels.push(`+${item.defenseBonus} DEF`);
  }
  if (item.maxHpBonus > 0) {
    labels.push(`+${item.maxHpBonus} HP`);
  }
  if (item.moveBonus > 0) {
    labels.push(`+${item.moveBonus} MOV`);
  }
  if (item.rangeBonus > 0) {
    labels.push(`+${item.rangeBonus} RNG`);
  }
  if ((item.critBonus ?? 0) > 0) {
    labels.push(`+${item.critBonus}% CRIT`);
  }
  if (item.healBonus > 0) {
    labels.push(`+${item.healBonus} MEND`);
  }
  return labels;
}

export interface GroupedInventoryEntry {
  item: EquipmentItem;
  count: number;
}

export function groupInventoryEquipment(
  equipmentIds: string[],
): GroupedInventoryEntry[] {
  const countById = new Map<string, number>();
  for (const id of equipmentIds) {
    countById.set(id, (countById.get(id) ?? 0) + 1);
  }

  const grouped: GroupedInventoryEntry[] = [];
  for (const [id, count] of countById.entries()) {
    const item = getEquipmentById(id);
    if (item) {
      grouped.push({item, count});
    }
  }

  return grouped.sort((a, b) => {
    if (a.item.slot !== b.item.slot) {
      return a.item.slot === 'weapon' ? -1 : 1;
    }
    return a.item.price - b.item.price;
  });
}

export type EquipmentBenefitVerdict =
  | 'upgrade'
  | 'tradeoff'
  | 'same'
  | 'downgrade'
  | 'incompatible';

export interface StatDeltaBadgeItem {
  label: string;
  value: number;
  isPositive: boolean;
}

export interface UnitEquipmentBenefit {
  compatible: boolean;
  currentlyEquipped: EquipmentItem | null;
  isAlreadyEquipped: boolean;
  deltas: EquipmentStatDeltas;
  deltaItems: StatDeltaBadgeItem[];
  verdict: EquipmentBenefitVerdict;
  benefitScore: number;
}

export function formatStatDeltaEntries(
  deltas: EquipmentStatDeltas,
): StatDeltaBadgeItem[] {
  const rawEntries: Array<{key: string; value: number; suffix?: string}> = [
    {key: 'ATK', value: deltas.attack},
    {key: 'DEF', value: deltas.defense},
    {key: 'HP', value: deltas.maxHp},
    {key: 'MOV', value: deltas.move},
    {key: 'RNG', value: deltas.maxRange},
    {key: 'CRIT', value: deltas.critChance, suffix: '%'},
    {key: 'MEND', value: deltas.healPower},
  ];

  return rawEntries
    .filter((entry) => entry.value !== 0)
    .map((entry) => ({
      label: `${entry.value > 0 ? '+' : ''}${entry.value}${entry.suffix ?? ''} ${entry.key}`,
      value: entry.value,
      isPositive: entry.value > 0,
    }));
}

export function evaluateEquipmentBenefitForUnit(
  unit: Unit,
  candidateItem: EquipmentItem,
): UnitEquipmentBenefit {
  const equippedId =
    candidateItem.slot === 'weapon' ? unit.weaponId : unit.accessoryId;
  const currentlyEquipped = getEquipmentById(equippedId);
  const compatible = canUnitEquipItem(unit, candidateItem);
  const isAlreadyEquipped = equippedId === candidateItem.id;

  if (!compatible) {
    return {
      compatible: false,
      currentlyEquipped,
      isAlreadyEquipped: false,
      deltas: {
        attack: 0,
        defense: 0,
        move: 0,
        maxHp: 0,
        healPower: 0,
        maxRange: 0,
        critChance: 0,
      },
      deltaItems: [],
      verdict: 'incompatible',
      benefitScore: -100,
    };
  }

  const deltas = computeEquipmentComparisonDeltas(
    candidateItem,
    currentlyEquipped,
  );
  const deltaItems = formatStatDeltaEntries(deltas);
  const positiveCount = deltaItems.filter((item) => item.isPositive).length;
  const negativeCount = deltaItems.filter((item) => !item.isPositive).length;

  const weightedScore =
    deltas.attack * 3 +
    deltas.defense * 2.5 +
    deltas.maxHp * 0.7 +
    deltas.move * 4.5 +
    deltas.maxRange * 4 +
    deltas.critChance * 0.35 +
    (unit.canHeal ? deltas.healPower * 2.2 : 0);

  if (isAlreadyEquipped || (positiveCount === 0 && negativeCount === 0)) {
    return {
      compatible: true,
      currentlyEquipped,
      isAlreadyEquipped,
      deltas,
      deltaItems,
      verdict: 'same',
      benefitScore: 0,
    };
  }

  if (positiveCount > 0 && negativeCount === 0) {
    return {
      compatible: true,
      currentlyEquipped,
      isAlreadyEquipped: false,
      deltas,
      deltaItems,
      verdict: 'upgrade',
      benefitScore: Math.max(1, weightedScore),
    };
  }

  if (positiveCount > 0 && negativeCount > 0) {
    return {
      compatible: true,
      currentlyEquipped,
      isAlreadyEquipped: false,
      deltas,
      deltaItems,
      verdict: 'tradeoff',
      benefitScore: weightedScore,
    };
  }

  return {
    compatible: true,
    currentlyEquipped,
    isAlreadyEquipped: false,
    deltas,
    deltaItems,
    verdict: 'downgrade',
    benefitScore: Math.min(-1, weightedScore),
  };
}

export function countPartyUpgradeRecipients(
  roster: Unit[],
  item: EquipmentItem,
): number {
  return roster.filter((unit) => {
    const evaluation = evaluateEquipmentBenefitForUnit(unit, item);
    return (
      evaluation.verdict === 'upgrade' ||
      (evaluation.verdict === 'tradeoff' && evaluation.benefitScore > 0)
    );
  }).length;
}

export interface ComputedEquipmentBonuses {
  attackBonus: number;
  defenseBonus: number;
  moveBonus: number;
  maxHpBonus: number;
  healBonus: number;
  rangeBonus: number;
  critBonus: number;
}

export function computeUnitEquipmentBonuses(unit: Unit): ComputedEquipmentBonuses {
  const weapon = getEquipmentById(unit.weaponId);
  const accessory = getEquipmentById(unit.accessoryId);

  return {
    attackBonus: (weapon?.attackBonus ?? 0) + (accessory?.attackBonus ?? 0),
    defenseBonus: (weapon?.defenseBonus ?? 0) + (accessory?.defenseBonus ?? 0),
    moveBonus: (weapon?.moveBonus ?? 0) + (accessory?.moveBonus ?? 0),
    maxHpBonus: (weapon?.maxHpBonus ?? 0) + (accessory?.maxHpBonus ?? 0),
    healBonus: (weapon?.healBonus ?? 0) + (accessory?.healBonus ?? 0),
    rangeBonus: (weapon?.rangeBonus ?? 0) + (accessory?.rangeBonus ?? 0),
    critBonus: (weapon?.critBonus ?? 0) + (accessory?.critBonus ?? 0),
  };
}

export function getUnitEffectiveStats(
  unit: Unit,
  effects: UpgradeEffects,
): {
  attack: number;
  defense: number;
  move: number;
  maxHp: number;
  healPower: number;
  maxRange: number;
  critChance: number;
  equipmentAttackBonus: number;
  equipmentDefenseBonus: number;
} {
  const gear = computeUnitEquipmentBonuses(unit);
  const isPlayer = unit.faction === 'player';
  const vanguardMoveBonus =
    isPlayer && unit.unitClass === 'vanguard' ? effects.vanguardBonusMove : 0;

  return {
    attack: unit.attack + gear.attackBonus + (unit.tempAttackBonus ?? 0),
    defense: unit.defense + gear.defenseBonus,
    move: unit.move + gear.moveBonus + vanguardMoveBonus,
    maxHp: unit.maxHp + gear.maxHpBonus,
    healPower: unit.healPower + gear.healBonus,
    maxRange: unit.maxRange + gear.rangeBonus,
    critChance: Math.min(95, (unit.critChance ?? 5) + gear.critBonus),
    equipmentAttackBonus: gear.attackBonus + (unit.tempAttackBonus ?? 0),
    equipmentDefenseBonus: gear.defenseBonus,
  };
}
