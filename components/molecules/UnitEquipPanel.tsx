'use client';

import {useState} from 'react';
import {ArmoryItemIcon} from '@/components/atoms/ArmoryItemIcon';
import {EquipmentSlotRow} from '@/components/molecules/EquipmentSlotRow';
import {UNIT_ARCHETYPES} from '@/lib/tactics/constants';
import {
  canUnitClassEquipItem,
  computeEquipmentComparisonDeltas,
  describeEquipmentBonuses,
  getEquipmentById,
  groupInventoryEquipment,
  type EquipmentStatDeltas,
} from '@/lib/tactics/rpgCatalog';
import type {
  EquipmentItem,
  EquipmentSlot,
  InspectedUnitDetails,
} from '@/lib/tactics/types';

type InventoryFilter = 'compatible' | 'all';

interface UnitEquipPanelProps {
  unit: InspectedUnitDetails;
  inventoryEquipmentIds: string[];
  onEquipItem: (unitId: string, equipmentId: string) => void;
  onUnequipSlot: (unitId: string, slot: EquipmentSlot) => void;
  onPreviewDeltasChange: (deltas: EquipmentStatDeltas | null) => void;
}

function buildDeltaSummaryParts(deltas: EquipmentStatDeltas): Array<{
  label: string;
  isPositive: boolean;
}> {
  const entries: Array<{key: string; value: number; unit?: string}> = [
    {key: 'ATK', value: deltas.attack},
    {key: 'DEF', value: deltas.defense},
    {key: 'HP', value: deltas.maxHp},
    {key: 'MOV', value: deltas.move},
    {key: 'RNG', value: deltas.maxRange},
    {key: 'CRIT', value: deltas.critChance, unit: '%'},
    {key: 'MEND', value: deltas.healPower},
  ];

  return entries
    .filter((entry) => entry.value !== 0)
    .map((entry) => ({
      label: `${entry.value > 0 ? '+' : ''}${entry.value}${entry.unit ?? ''} ${entry.key}`,
      isPositive: entry.value > 0,
    }));
}

function buildUnequipDeltas(item: EquipmentItem): EquipmentStatDeltas {
  return {
    attack: -item.attackBonus,
    defense: -item.defenseBonus,
    move: -item.moveBonus,
    maxHp: -item.maxHpBonus,
    healPower: -item.healBonus,
    maxRange: -item.rangeBonus,
    critChance: -(item.critBonus ?? 0),
  };
}

export function UnitEquipPanel({
  unit,
  inventoryEquipmentIds,
  onEquipItem,
  onUnequipSlot,
  onPreviewDeltasChange,
}: UnitEquipPanelProps) {
  const [filter, setFilter] = useState<InventoryFilter>('compatible');

  const equippedWeapon = getEquipmentById(unit.weaponId);
  const equippedAccessory = getEquipmentById(unit.accessoryId);
  const groupedInventory = groupInventoryEquipment(inventoryEquipmentIds);
  const visibleEntries =
    filter === 'compatible'
      ? groupedInventory.filter((entry) =>
          canUnitClassEquipItem(unit.unitClass, entry.item),
        )
      : groupedInventory;
  const compatibleCount = groupedInventory.filter((entry) =>
    canUnitClassEquipItem(unit.unitClass, entry.item),
  ).length;
  const isPlayerUnit = unit.faction === 'player';

  const handlePreviewCandidate = (candidate: EquipmentItem | null) => {
    if (!candidate || !unit.canEditEquipment) {
      onPreviewDeltasChange(null);
      return;
    }
    const isCompatible = canUnitClassEquipItem(unit.unitClass, candidate);
    if (!isCompatible) {
      onPreviewDeltasChange(null);
      return;
    }
    const currentInSlot =
      candidate.slot === 'weapon' ? equippedWeapon : equippedAccessory;
    onPreviewDeltasChange(
      computeEquipmentComparisonDeltas(candidate, currentInSlot),
    );
  };

  const handlePreviewUnequip = (item: EquipmentItem | null) => {
    if (!item || !unit.canEditEquipment) {
      onPreviewDeltasChange(null);
      return;
    }
    onPreviewDeltasChange(buildUnequipDeltas(item));
  };

  const handleEquipClick = (itemId: string) => {
    onPreviewDeltasChange(null);
    onEquipItem(unit.id, itemId);
  };

  const handleUnequipClick = (slot: EquipmentSlot) => {
    onPreviewDeltasChange(null);
    onUnequipSlot(unit.id, slot);
  };

  return (
    <div className="space-y-3.5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-300">Active Loadout</span>
          <span className="text-slate-500">
            {unit.canEditEquipment
              ? 'Changes apply immediately'
              : isPlayerUnit
                ? 'Locked after acting this turn'
                : 'Enemy loadout'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <EquipmentSlotRow
            slot="weapon"
            item={equippedWeapon}
            canEdit={unit.canEditEquipment}
            onUnequip={handleUnequipClick}
            onPreviewUnequip={handlePreviewUnequip}
          />
          <EquipmentSlotRow
            slot="accessory"
            item={equippedAccessory}
            canEdit={unit.canEditEquipment}
            onUnequip={handleUnequipClick}
            onPreviewUnequip={handlePreviewUnequip}
          />
        </div>
      </div>

      {isPlayerUnit && (
        <div className="space-y-2 pt-2 border-t border-slate-800/90">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-300">
              Armory Chest ({inventoryEquipmentIds.length})
            </span>
            <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setFilter('compatible')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === 'compatible'
                    ? 'bg-sky-400/20 text-sky-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Usable ({compatibleCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === 'all'
                    ? 'bg-sky-400/20 text-sky-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({groupedInventory.length})
              </button>
            </div>
          </div>

          {visibleEntries.length === 0 ? (
            <p className="rounded-xl bg-slate-950/70 border border-slate-800/90 px-3 py-3 text-xs text-slate-400">
              {inventoryEquipmentIds.length === 0
                ? 'Your Armory Chest is empty. Buy weapons and shields at Camp or clear chapters for loot.'
                : `No compatible spare gear for ${UNIT_ARCHETYPES[unit.unitClass].label}. Switch to All or visit the Camp Armory.`}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[210px] overflow-y-auto pr-2 tactics-scroll-sm">
              {visibleEntries.map(({item, count}) => {
                const isCompatible = canUnitClassEquipItem(
                  unit.unitClass,
                  item,
                );
                const currentInSlot =
                  item.slot === 'weapon' ? equippedWeapon : equippedAccessory;
                const deltas = computeEquipmentComparisonDeltas(
                  item,
                  currentInSlot,
                );
                const deltaParts = buildDeltaSummaryParts(deltas);
                const bonusLabels = describeEquipmentBonuses(item);
                const canEquipNow = unit.canEditEquipment && isCompatible;
                const actionLabel = !isCompatible
                  ? 'Class'
                  : currentInSlot
                    ? 'Swap'
                    : 'Equip';

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => handlePreviewCandidate(item)}
                    onMouseLeave={() => handlePreviewCandidate(null)}
                    className="rounded-xl bg-slate-950/80 hover:bg-slate-900/90 border border-slate-800 px-3 py-2 flex items-center justify-between gap-2.5 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ArmoryItemIcon
                        itemId={item.id}
                        itemName={item.name}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-100">
                          <span className="truncate">{item.name}</span>
                          {count > 1 && (
                            <span className="font-mono tabular-nums text-[11px] text-slate-400 shrink-0">
                              ×{count}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-400 truncate">
                          {currentInSlot && isCompatible && deltaParts.length > 0 ? (
                            <span className="inline-flex flex-wrap items-center gap-x-1.5">
                              {deltaParts.map((part, idx) => (
                                <span
                                  key={`${item.id}-delta-${idx}`}
                                  className={
                                    part.isPositive
                                      ? 'text-emerald-300'
                                      : 'text-rose-300'
                                  }
                                >
                                  {part.label}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span>{bonusLabels.join(' · ')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canEquipNow}
                      onClick={() => handleEquipClick(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {actionLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
