'use client';

import {ArrowDown, ArrowLeftRight, ArrowUp, Check, Lock} from 'lucide-react';
import {UnitSpritePortrait} from '@/components/atoms/UnitSpritePortrait';
import {UNIT_ARCHETYPES} from '@/lib/tactics/constants';
import type {UnitEquipmentBenefit} from '@/lib/tactics/rpgCatalog';
import type {EquipmentItem, Unit} from '@/lib/tactics/types';

interface ArmoryHeroBenefitRowProps {
  unit: Unit;
  item: EquipmentItem;
  benefit: UnitEquipmentBenefit;
  isDeployed: boolean;
  ownedInChestCount: number;
  canAfford: boolean;
  onBuyAndEquip: (unitId: string, equipmentId: string) => void;
  onEquipOwned: (unitId: string, equipmentId: string) => void;
}

export function ArmoryHeroBenefitRow({
  unit,
  item,
  benefit,
  isDeployed,
  ownedInChestCount,
  canAfford,
  onBuyAndEquip,
  onEquipOwned,
}: ArmoryHeroBenefitRowProps) {
  const archetype = UNIT_ARCHETYPES[unit.unitClass];
  const hasOwnedCopy = ownedInChestCount > 0;
  const isUpgrade = benefit.verdict === 'upgrade';
  const isTradeoff = benefit.verdict === 'tradeoff';
  const isDowngrade = benefit.verdict === 'downgrade';
  const isIncompatible = !benefit.compatible;
  const isAlreadyEquipped = benefit.isAlreadyEquipped;

  const rowSurfaceClass = isIncompatible
    ? 'bg-slate-950/45 border-slate-800/60 opacity-60'
    : isUpgrade
      ? 'bg-emerald-950/20 border-emerald-500/35'
      : 'bg-slate-950/75 border-slate-800';

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2.5 transition-colors ${rowSurfaceClass}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-0.5 shrink-0">
          <UnitSpritePortrait unitClass={unit.unitClass} size={40} />
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-100">
            <span className="truncate">{unit.name}</span>
            <span className="font-mono tabular-nums text-[11px] text-amber-300 shrink-0">
              Lv {unit.level}
            </span>
            {isDeployed && (
              <span className="text-[11px] font-medium text-sky-300 shrink-0">
                · Active
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 truncate">
            <span>{archetype.label}</span>
            <span aria-hidden="true"> · </span>
            <span>
              Now:{' '}
              <span className="text-slate-300">
                {benefit.currentlyEquipped
                  ? benefit.currentlyEquipped.name
                  : 'Empty'}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono tabular-nums">
            {isIncompatible && (
              <span className="inline-flex items-center gap-1 text-slate-500 font-sans">
                <Lock className="w-3 h-3" />
                <span>Cannot equip</span>
              </span>
            )}

            {isAlreadyEquipped && (
              <span className="inline-flex items-center gap-1 text-sky-300 font-sans font-medium">
                <Check className="w-3 h-3" />
                <span>Already equipped</span>
              </span>
            )}

            {!isIncompatible &&
              !isAlreadyEquipped &&
              benefit.verdict === 'same' && (
                <span className="text-slate-400 font-sans">
                  Equal stats to current gear
                </span>
              )}

            {benefit.deltaItems.length > 0 && (
              <>
                {isUpgrade && (
                  <span className="inline-flex items-center gap-0.5 text-emerald-300 font-semibold font-sans">
                    <ArrowUp className="w-3 h-3" />
                    <span>Upgrade</span>
                  </span>
                )}
                {isTradeoff && (
                  <span className="inline-flex items-center gap-0.5 text-amber-300 font-semibold font-sans">
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>Tradeoff</span>
                  </span>
                )}
                {isDowngrade && (
                  <span className="inline-flex items-center gap-0.5 text-rose-300 font-semibold font-sans">
                    <ArrowDown className="w-3 h-3" />
                    <span>Lower</span>
                  </span>
                )}
                {benefit.deltaItems.map((entry) => (
                  <span
                    key={`${unit.id}-${entry.label}`}
                    className={
                      entry.isPositive
                        ? 'text-emerald-300 font-semibold'
                        : 'text-rose-300'
                    }
                  >
                    {entry.label}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!isIncompatible && !isAlreadyEquipped && hasOwnedCopy && (
          <button
            type="button"
            onClick={() => onEquipOwned(unit.id, item.id)}
            className="px-2.5 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Equip Owned
          </button>
        )}

        {!isIncompatible && !isAlreadyEquipped && (
          <button
            type="button"
            disabled={!canAfford}
            onClick={() => onBuyAndEquip(unit.id, item.id)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:bg-slate-800 disabled:text-slate-500 ${
              hasOwnedCopy
                ? 'bg-slate-800 hover:bg-slate-700 border border-amber-400/45 text-amber-200'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
            }`}
          >
            Buy &amp; Equip · {item.price}g
          </button>
        )}
      </div>
    </div>
  );
}
