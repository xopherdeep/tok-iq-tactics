'use client';

import {useState} from 'react';
import {
  ArrowUp,
  Backpack,
  Check,
  Coins,
  FlaskConical,
  Package,
  Shield,
  Swords,
} from 'lucide-react';
import {ArmoryItemIcon} from '@/components/atoms/ArmoryItemIcon';
import {UnitSpritePortrait} from '@/components/atoms/UnitSpritePortrait';
import {ArmoryHeroBenefitRow} from '@/components/molecules/ArmoryHeroBenefitRow';
import {UNIT_ARCHETYPES} from '@/lib/tactics/constants';
import {
  CONSUMABLE_CATALOG,
  countPartyUpgradeRecipients,
  describeEquipmentBonuses,
  EQUIPMENT_CATALOG,
  evaluateEquipmentBenefitForUnit,
  getEquipmentById,
} from '@/lib/tactics/rpgCatalog';
import type {
  ConsumableInventory,
  ConsumableItemSpec,
  ConsumableType,
  EquipmentItem,
  Unit,
} from '@/lib/tactics/types';

type ShopCategory = 'all' | 'weapon' | 'accessory' | 'consumable';

type SelectedShopEntry =
  | {kind: 'equipment'; id: string}
  | {kind: 'consumable'; id: ConsumableType};

interface ArmoryShopPanelProps {
  gold: number;
  roster: Unit[];
  deployedUnitIds: string[];
  inventoryEquipmentIds: string[];
  consumables: ConsumableInventory;
  onBuyEquipment: (equipmentId: string) => void;
  onBuyAndEquip: (unitId: string, equipmentId: string) => void;
  onEquipOwned: (unitId: string, equipmentId: string) => void;
  onBuyConsumable: (consumableId: ConsumableType) => void;
}

function countInInventory(ids: string[], targetId: string): number {
  return ids.filter((id) => id === targetId).length;
}

function countEquippedInParty(roster: Unit[], targetId: string): number {
  return roster.filter(
    (unit) => unit.weaponId === targetId || unit.accessoryId === targetId,
  ).length;
}

export function ArmoryShopPanel({
  gold,
  roster,
  deployedUnitIds,
  inventoryEquipmentIds,
  consumables,
  onBuyEquipment,
  onBuyAndEquip,
  onEquipOwned,
  onBuyConsumable,
}: ArmoryShopPanelProps) {
  const [category, setCategory] = useState<ShopCategory>('all');
  const [selected, setSelected] = useState<SelectedShopEntry>({
    kind: 'equipment',
    id: EQUIPMENT_CATALOG[0].id,
  });
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const consumableList = Object.values(CONSUMABLE_CATALOG);
  const showWeapons = category === 'all' || category === 'weapon';
  const showAccessories = category === 'all' || category === 'accessory';
  const showConsumables = category === 'all' || category === 'consumable';

  const visibleEquipment = EQUIPMENT_CATALOG.filter((item) => {
    if (item.slot === 'weapon') {
      return showWeapons;
    }
    return showAccessories;
  });

  const selectedEquipment: EquipmentItem | null =
    selected.kind === 'equipment' ? getEquipmentById(selected.id) : null;
  const selectedConsumable: ConsumableItemSpec | null =
    selected.kind === 'consumable' ? CONSUMABLE_CATALOG[selected.id] : null;

  const handleSelectCategory = (nextCategory: ShopCategory) => {
    setCategory(nextCategory);
    setFeedbackNotice(null);
    if (nextCategory === 'consumable') {
      setSelected({kind: 'consumable', id: consumableList[0].id});
      return;
    }
    if (nextCategory === 'weapon') {
      const firstWeapon = EQUIPMENT_CATALOG.find(
        (item) => item.slot === 'weapon',
      );
      if (firstWeapon) {
        setSelected({kind: 'equipment', id: firstWeapon.id});
      }
      return;
    }
    if (nextCategory === 'accessory') {
      const firstAccessory = EQUIPMENT_CATALOG.find(
        (item) => item.slot === 'accessory',
      );
      if (firstAccessory) {
        setSelected({kind: 'equipment', id: firstAccessory.id});
      }
    }
  };

  const triggerBuyAndEquip = (unitId: string, equipmentId: string) => {
    const hero = roster.find((unit) => unit.id === unitId);
    const item = getEquipmentById(equipmentId);
    onBuyAndEquip(unitId, equipmentId);
    if (hero && item) {
      setFeedbackNotice(`Bought & equipped ${item.name} on ${hero.name}.`);
    }
  };

  const triggerEquipOwned = (unitId: string, equipmentId: string) => {
    const hero = roster.find((unit) => unit.id === unitId);
    const item = getEquipmentById(equipmentId);
    onEquipOwned(unitId, equipmentId);
    if (hero && item) {
      setFeedbackNotice(`Equipped chest ${item.name} on ${hero.name}.`);
    }
  };

  const triggerBuyToChest = (equipmentId: string) => {
    const item = getEquipmentById(equipmentId);
    onBuyEquipment(equipmentId);
    if (item) {
      setFeedbackNotice(`Added ${item.name} to your Armory Chest.`);
    }
  };

  const triggerBuyConsumable = (consumableId: ConsumableType) => {
    const spec = CONSUMABLE_CATALOG[consumableId];
    onBuyConsumable(consumableId);
    if (spec) {
      setFeedbackNotice(`Stocked +1 ${spec.name} in your Battle Satchel.`);
    }
  };

  const evaluatedRoster = selectedEquipment
    ? roster
        .map((unit) => ({
          unit,
          isDeployed: deployedUnitIds.includes(unit.id),
          benefit: evaluateEquipmentBenefitForUnit(unit, selectedEquipment),
        }))
        .sort((a, b) => {
          if (a.benefit.compatible !== b.benefit.compatible) {
            return a.benefit.compatible ? -1 : 1;
          }
          if (b.benefit.benefitScore !== a.benefit.benefitScore) {
            return b.benefit.benefitScore - a.benefit.benefitScore;
          }
          if (a.isDeployed !== b.isDeployed) {
            return a.isDeployed ? -1 : 1;
          }
          return b.unit.level - a.unit.level;
        })
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_430px] gap-3.5 items-start">
      <div className="space-y-3 min-w-0">
        <div
          role="tablist"
          aria-label="Armory categories"
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800"
        >
          {(
            [
              {id: 'all', label: 'All Stock', icon: Package},
              {id: 'weapon', label: 'Weapons', icon: Swords},
              {id: 'accessory', label: 'Shields & Gear', icon: Shield},
              {id: 'consumable', label: 'Consumables', icon: FlaskConical},
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSelectCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          {visibleEquipment.map((item) => {
            const isSelected =
              selected.kind === 'equipment' && selected.id === item.id;
            const canAfford = gold >= item.price;
            const upgradeCount = countPartyUpgradeRecipients(roster, item);
            const inChest = countInInventory(inventoryEquipmentIds, item.id);
            const equippedCount = countEquippedInParty(roster, item.id);
            const bonusLabels = describeEquipmentBonuses(item);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelected({kind: 'equipment', id: item.id});
                  setFeedbackNotice(null);
                }}
                className={`w-full text-left rounded-xl border px-3 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/95 border-amber-400/75'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ArmoryItemIcon
                    itemId={item.id}
                    itemName={item.name}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100 truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
                        {item.slot === 'weapon' ? 'Weapon' : 'Shield & Gear'}
                      </span>
                    </div>
                    <div className="text-xs font-mono tabular-nums text-sky-300/90 truncate mt-0.5">
                      {bonusLabels.join(' · ')}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400 mt-0.5">
                      {upgradeCount > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-300 font-semibold">
                          <ArrowUp className="w-3 h-3" />
                          <span>
                            {upgradeCount}{' '}
                            {upgradeCount === 1 ? 'hero benefits' : 'heroes benefit'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          Party already matched
                        </span>
                      )}
                      {inChest > 0 && (
                        <span>
                          · In chest:{' '}
                          <span className="font-mono tabular-nums text-slate-200">
                            {inChest}
                          </span>
                        </span>
                      )}
                      {equippedCount > 0 && (
                        <span>
                          · Equipped:{' '}
                          <span className="font-mono tabular-nums text-slate-300">
                            {equippedCount}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`font-mono tabular-nums text-sm font-bold ${
                      canAfford ? 'text-amber-300' : 'text-slate-500'
                    }`}
                  >
                    {item.price}g
                  </div>
                  <div className="text-[10px] text-slate-500 whitespace-nowrap">
                    {isSelected ? 'Comparing' : 'Compare'}
                  </div>
                </div>
              </button>
            );
          })}

          {showConsumables &&
            consumableList.map((spec) => {
              const isSelected =
                selected.kind === 'consumable' && selected.id === spec.id;
              const canAfford = gold >= spec.price;
              const ownedCount = consumables[spec.id];

              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => {
                    setSelected({kind: 'consumable', id: spec.id});
                    setFeedbackNotice(null);
                  }}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/95 border-emerald-400/75'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ArmoryItemIcon
                      itemId={spec.id}
                      itemName={spec.name}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100 truncate">
                          {spec.name}
                        </span>
                        <span className="text-[11px] text-emerald-300/80 whitespace-nowrap shrink-0">
                          Battle Item
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {spec.summary}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Satchel stock:{' '}
                        <span className="font-mono tabular-nums text-emerald-300 font-semibold">
                          {ownedCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono tabular-nums text-sm font-bold ${
                        canAfford ? 'text-amber-300' : 'text-slate-500'
                      }`}
                    >
                      {spec.price}g
                    </div>
                    <div className="text-[10px] text-slate-500 whitespace-nowrap">
                      {isSelected ? 'Selected' : 'Inspect'}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      <aside className="rounded-2xl bg-slate-900/95 border border-slate-800 p-4 space-y-4 lg:sticky lg:top-0">
        {feedbackNotice && (
          <div className="rounded-xl bg-emerald-950/50 border border-emerald-400/40 px-3 py-2 flex items-center gap-2 text-xs font-medium text-emerald-200">
            <Check className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
        )}

        {selectedEquipment && (
          <>
            <div className="flex items-start gap-3">
              <ArmoryItemIcon
                itemId={selectedEquipment.id}
                itemName={selectedEquipment.name}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-50 truncate">
                    {selectedEquipment.name}
                  </h2>
                  <span className="font-mono tabular-nums text-sm font-bold text-amber-300 shrink-0">
                    {selectedEquipment.price}g
                  </span>
                </div>
                <p className="text-xs font-mono tabular-nums text-emerald-300 mt-0.5">
                  {describeEquipmentBonuses(selectedEquipment).join(' · ')}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedEquipment.allowedClasses
                    ? selectedEquipment.allowedClasses
                        .map((cls) => UNIT_ARCHETYPES[cls].label)
                        .join(' · ')
                    : 'Equippable by any class'}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-800/90">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-200">
                  Who Benefits (Buy &amp; Equip Instantly)
                </span>
                <span className="font-mono tabular-nums text-slate-400">
                  Chest: {countInInventory(inventoryEquipmentIds, selectedEquipment.id)}
                </span>
              </div>

              <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-2 tactics-scroll-gold">
                {evaluatedRoster.map(({unit, isDeployed, benefit}) => (
                  <ArmoryHeroBenefitRow
                    key={unit.id}
                    unit={unit}
                    item={selectedEquipment}
                    benefit={benefit}
                    isDeployed={isDeployed}
                    ownedInChestCount={countInInventory(
                      inventoryEquipmentIds,
                      selectedEquipment.id,
                    )}
                    canAfford={gold >= selectedEquipment.price}
                    onBuyAndEquip={triggerBuyAndEquip}
                    onEquipOwned={triggerEquipOwned}
                  />
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/90 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">
                Or stash for later in your shared chest
              </span>
              <button
                type="button"
                disabled={gold < selectedEquipment.price}
                onClick={() => triggerBuyToChest(selectedEquipment.id)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-45 border border-slate-700 text-xs font-bold text-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5 text-amber-300" />
                <span>Buy to Chest · {selectedEquipment.price}g</span>
              </button>
            </div>
          </>
        )}

        {selectedConsumable && (
          <>
            <div className="flex items-start gap-3">
              <ArmoryItemIcon
                itemId={selectedConsumable.id}
                itemName={selectedConsumable.name}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-50 truncate">
                    {selectedConsumable.name}
                  </h2>
                  <span className="font-mono tabular-nums text-sm font-bold text-amber-300 shrink-0">
                    {selectedConsumable.price}g
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {selectedConsumable.summary}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-mono tabular-nums mt-1.5">
                  <Backpack className="w-3.5 h-3.5" />
                  <span>
                    In Shared Satchel: {consumables[selectedConsumable.id]}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-800/90">
              <div className="text-xs font-semibold text-slate-200">
                Usable By All Deployed Heroes In Battle
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {roster.slice(0, 6).map((unit) => (
                  <div
                    key={unit.id}
                    className="rounded-xl bg-slate-950/75 border border-slate-800 px-2.5 py-2 flex items-center gap-2 min-w-0"
                  >
                    <UnitSpritePortrait unitClass={unit.unitClass} size={32} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {unit.name}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-emerald-300/90">
                        {selectedConsumable.healAmount > 0
                          ? `+${selectedConsumable.healAmount} HP`
                          : `+${selectedConsumable.tempAttackBonus} ATK`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={gold < selectedConsumable.price}
              onClick={() => triggerBuyConsumable(selectedConsumable.id)}
              className="w-full min-h-[44px] rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm px-4 py-2.5 inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              <span>
                Buy {selectedConsumable.name} · {selectedConsumable.price}g
              </span>
            </button>
          </>
        )}
      </aside>
    </div>
  );
}
