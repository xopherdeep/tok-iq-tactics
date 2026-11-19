'use client';

import {ArmoryItemIcon} from '@/components/atoms/ArmoryItemIcon';
import {describeEquipmentBonuses} from '@/lib/tactics/rpgCatalog';
import type {EquipmentItem, EquipmentSlot} from '@/lib/tactics/types';

interface EquipmentSlotRowProps {
  slot: EquipmentSlot;
  item: EquipmentItem | null;
  canEdit: boolean;
  onUnequip: (slot: EquipmentSlot) => void;
  onPreviewUnequip?: (item: EquipmentItem | null) => void;
}

function getSlotTitle(slot: EquipmentSlot): string {
  return slot === 'weapon' ? 'Weapon' : 'Shield & Gear';
}

export function EquipmentSlotRow({
  slot,
  item,
  canEdit,
  onUnequip,
  onPreviewUnequip,
}: EquipmentSlotRowProps) {
  const slotTitle = getSlotTitle(slot);
  const bonusLabels = item ? describeEquipmentBonuses(item) : [];

  return (
    <div
      onMouseEnter={() => onPreviewUnequip?.(item)}
      onMouseLeave={() => onPreviewUnequip?.(null)}
      className="rounded-xl bg-slate-950/90 border border-slate-800 px-3 py-2.5 flex items-center justify-between gap-2.5"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <ArmoryItemIcon
          itemId={item?.id ?? null}
          itemName={item?.name}
          emptySlot={slot}
          size="md"
        />
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-slate-500">
            {slotTitle}
          </div>
          {item ? (
            <>
              <div className="text-xs sm:text-sm font-semibold text-sky-200 truncate">
                {item.name}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-emerald-300/90 truncate">
                {bonusLabels.join(' · ')}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500">Empty slot</div>
          )}
        </div>
      </div>

      {item && canEdit && (
        <button
          type="button"
          onClick={() => onUnequip(slot)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Remove
        </button>
      )}
    </div>
  );
}
