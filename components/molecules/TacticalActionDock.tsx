'use client';

import {useState} from 'react';
import {
  Backpack,
  Check,
  Heart,
  History,
  Play,
  Shuffle,
  SkipForward,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react';
import {TacticalCtaButton} from '@/components/atoms/TacticalCtaButton';
import type {HudSummary} from '@/lib/tactics/gameController';
import {CONSUMABLE_CATALOG} from '@/lib/tactics/rpgCatalog';
import type {ChampionSkillId, ConsumableType} from '@/lib/tactics/types';

interface TacticalActionDockProps {
  hud: HudSummary;
  onUndoMove: () => void;
  onWaitUnit: () => void;
  onEndTurn: () => void;
  onSelfHealUnit: () => void;
  onUseConsumable: (consumableId: ConsumableType) => void;
  onConfirmChiDeployment: () => void;
  onChronoRewind: () => void;
  onTriggerChampionSkill?: (skillId: ChampionSkillId) => void;
}

export function TacticalActionDock({
  hud,
  onUndoMove,
  onWaitUnit,
  onEndTurn,
  onSelfHealUnit,
  onUseConsumable,
  onConfirmChiDeployment,
  onChronoRewind,
  onTriggerChampionSkill,
}: TacticalActionDockProps) {
  const [isSatchelOpen, setIsSatchelOpen] = useState(false);

  const isPlaying = hud.screen === 'playing';
  if (!isPlaying) {
    return null;
  }

  if (hud.deploymentPhase === 'CHI_SWAP') {
    return (
      <section
        aria-label="Chi formation deployment"
        className="relative w-full max-w-[1160px] mx-auto px-2.5 sm:px-4 pt-2 pb-2.5 sm:py-2.5 border-t border-[#332924] bg-[#0b1021]/95"
      >
        <div className="w-full max-w-[820px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-300 min-w-0">
            <Shuffle className="w-4 h-4 text-teal-300 shrink-0" />
            <span className="truncate">
              <strong className="text-amber-300 font-semibold">
                χ Formation
              </strong>{' '}
              · Click two allies (or an open waystone) to swap starting positions
            </span>
          </div>
          <button
            type="button"
            onClick={onConfirmChiDeployment}
            className="w-full sm:w-auto min-h-[46px] rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-slate-950 font-bold text-sm px-5 py-2.5 inline-flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Begin Battle</span>
            <kbd className="hidden sm:inline-flex items-center justify-center rounded-md border border-slate-950/20 bg-slate-950/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase leading-none text-slate-950/85">
              Space
            </kbd>
          </button>
        </div>
      </section>
    );
  }

  const isPlayerTurn = hud.phase === 'player';
  const canEndTurn = isPlayerTurn && !hud.isAnimating;
  const allUnitsHaveActed =
    canEndTurn && hud.totalPlayerUnits > 0 && hud.readyPlayerUnits === 0;
  const showSatchelTray = isSatchelOpen && hud.canUseItemSelected;
  const totalConsumables =
    hud.consumables.potion +
    hud.consumables.hiPotion +
    hud.consumables.powerTonic;

  const handleSelectItem = (itemId: ConsumableType) => {
    setIsSatchelOpen(false);
    onUseConsumable(itemId);
  };

  return (
    <section
      aria-label="Turn actions"
      className="relative w-full max-w-[1160px] mx-auto px-2.5 sm:px-4 pt-1.5 pb-2.5 sm:py-2.5 border-t border-[#332924] bg-[#0b1021]/95"
    >
      {showSatchelTray && (
        <div className="w-full max-w-[820px] mx-auto mb-2 rounded-2xl bg-slate-950/95 border border-teal-400/40 p-2.5 shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300">
              Use Item on Selected Unit
            </span>
            <button
              type="button"
              onClick={() => setIsSatchelOpen(false)}
              aria-label="Close item satchel"
              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CONSUMABLE_CATALOG) as ConsumableType[]).map(
              (itemId) => {
                const spec = CONSUMABLE_CATALOG[itemId];
                const count = hud.consumables[itemId];
                const isHealItem = spec.healAmount > 0;
                const isUsable =
                  count > 0 && (!isHealItem || hud.selectedUnitNeedsHeal);
                return (
                  <button
                    key={itemId}
                    type="button"
                    disabled={!isUsable}
                    onClick={() => handleSelectItem(itemId)}
                    className="rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/90 px-2.5 py-2 text-left transition-colors disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {spec.name}
                      </span>
                      <span className="font-mono tabular-nums text-[11px] font-bold text-teal-300">
                        ×{count}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {isHealItem
                        ? `+${spec.healAmount} HP`
                        : `+${spec.tempAttackBonus} ATK`}
                    </div>
                  </button>
                );
              },
            )}
          </div>
        </div>
      )}

      {hud.canSelfHealSelected && (
        <div className="w-full max-w-[820px] mx-auto mb-2">
          <button
            type="button"
            onClick={onSelfHealUnit}
            className="w-full min-h-[44px] rounded-xl bg-teal-400 hover:bg-teal-300 active:scale-[0.99] text-slate-950 font-bold text-sm px-4 py-2 inline-flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 cursor-pointer"
          >
            <Heart className="w-4 h-4" />
            <span>Self-Mend</span>
          </button>
        </div>
      )}

      {hud.inspectedUnit?.canCommand &&
        (hud.inspectedUnit.skills?.length ?? 0) > 0 && (
          <div className="w-full max-w-[820px] mx-auto mb-2 rounded-2xl bg-slate-950/95 border border-purple-500/40 p-2 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
              <div className="flex items-center gap-1.5 text-xs text-purple-300 font-bold uppercase tracking-wider">
                <span className="font-serif text-sm">
                  {hud.inspectedUnit.trenChessGlyph ?? '♔'}
                </span>
                <span>{hud.inspectedUnit.name} · Champion Tactics</span>
              </div>
              {hud.inspectedUnit.hasBloodAndVoid && (
                <div className="text-[11px] font-mono text-amber-300 font-semibold">
                  Blood & Void: +
                  {Math.floor(
                    (1 -
                      hud.inspectedUnit.hp /
                        Math.max(1, hud.inspectedUnit.maxHp)) *
                      6,
                  )}{' '}
                  ATK
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {hud.inspectedUnit.skills?.map((skill) => {
                const isActive = hud.inspectedUnit?.activeSkillId === skill.id;
                const isBarrierActive =
                  skill.id === 'shadowBarrier' &&
                  (hud.inspectedUnit?.shadowBarrierTurns ?? 0) > 0;
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => onTriggerChampionSkill?.(skill.id)}
                    className={`rounded-xl px-2 py-1.5 text-left transition-all border cursor-pointer ${
                      isActive || isBarrierActive
                        ? 'bg-purple-950/90 border-purple-400 text-purple-100 shadow-md shadow-purple-900/40'
                        : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-200'
                    }`}
                    title={skill.description}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate">
                        {skill.name}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-mono px-1 rounded bg-purple-500/30 text-purple-200">
                          ON
                        </span>
                      )}
                      {isBarrierActive && (
                        <span className="text-[10px] font-mono px-1 rounded bg-amber-500/30 text-amber-200">
                          {hud.inspectedUnit?.shadowBarrierTurns}T
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {skill.hpCostPercent > 0
                        ? `Cost ${skill.hpCostPercent}% HP`
                        : skill.targetType === 'self'
                          ? 'Instant Self'
                          : 'On Attack'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      <div className="w-full max-w-[820px] mx-auto grid grid-cols-5 gap-1.5 sm:gap-2.5">
        <TacticalCtaButton
          label="Undo"
          hotkey="Z"
          tone="undo"
          onClick={onUndoMove}
          disabled={!hud.canUndoMove}
          icon={<Undo2 className="w-4 h-4" />}
          title="Free move undo before committing an action (Z)"
        />
        <TacticalCtaButton
          label={
            hud.chronoRewindCharges <= 0
              ? 'Used'
              : hud.maxChronoRewindCharges > 1
                ? `Chrono (${hud.chronoRewindCharges})`
                : 'Chrono'
          }
          hotkey={hud.chronoRewindCharges <= 0 ? undefined : '-10 IQ'}
          tone="chrono"
          onClick={onChronoRewind}
          disabled={!hud.canChronoRewind || !isPlayerTurn || hud.isAnimating}
          icon={<History className="w-4 h-4" />}
          title={
            hud.chronoRewindCharges <= 0
              ? 'Chrono Rewind already spent this battle'
              : `Chrono Rewind: undo last committed turn (-10 IQ, ${hud.chronoRewindCharges} charge remaining)`
          }
        />
        <TacticalCtaButton
          label={totalConsumables > 0 ? `Items (${totalConsumables})` : 'Items'}
          tone="wait"
          onClick={() => setIsSatchelOpen((prev) => !prev)}
          disabled={!hud.canUseItemSelected}
          icon={
            isSatchelOpen ? (
              <Sparkles className="w-4 h-4 text-teal-300" />
            ) : (
              <Backpack className="w-4 h-4" />
            )
          }
          title="Use a Rainwater Jar or Lightning Flask"
        />
        <TacticalCtaButton
          label="Wait"
          hotkey="Space"
          tone="wait"
          onClick={onWaitUnit}
          disabled={!hud.canWaitSelected}
          icon={<Check className="w-4 h-4" />}
          title="Hold position with selected unit (Space)"
        />
        <TacticalCtaButton
          label="End Turn"
          hotkey="E"
          tone="endTurn"
          emphasize={allUnitsHaveActed}
          onClick={onEndTurn}
          disabled={!canEndTurn}
          icon={<SkipForward className="w-4 h-4" />}
          title="End Player Phase (E)"
        />
      </div>
    </section>
  );
}
