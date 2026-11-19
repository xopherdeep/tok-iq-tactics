'use client';

import {useState} from 'react';
import {
  Check,
  Crosshair,
  Footprints,
  Heart,
  Mountain,
  Shield,
  Sparkles,
  Swords,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {ArmoryItemIcon} from '@/components/atoms/ArmoryItemIcon';
import {UnitSpriteShowcase} from '@/components/atoms/UnitSpriteShowcase';
import {UnitStatTile} from '@/components/atoms/UnitStatTile';
import {UnitEquipPanel} from '@/components/molecules/UnitEquipPanel';
import {TERRAIN_CONFIG, UNIT_ARCHETYPES} from '@/lib/tactics/constants';
import {
  canUnitClassEquipItem,
  getEquipmentById,
  type EquipmentStatDeltas,
} from '@/lib/tactics/rpgCatalog';
import type {
  EquipmentSlot,
  InspectedUnitDetails,
  UnitClass,
} from '@/lib/tactics/types';

type UnitDetailTab = 'overview' | 'equip';

interface CharacterInfoModalProps {
  unit: InspectedUnitDetails | null;
  inventoryEquipmentIds: string[];
  onDismiss: () => void;
  onWaitUnit: () => void;
  onSelfHealUnit: () => void;
  onEquipItem: (unitId: string, equipmentId: string) => void;
  onUnequipSlot: (unitId: string, slot: EquipmentSlot) => void;
}

function getMatchupSummary(unitClass: UnitClass): string {
  if (unitClass === 'vanguard') {
    return 'Strong vs Striker & Marksman · Weak vs Arcanist';
  }
  if (unitClass === 'striker') {
    return 'Strong vs Arcanist & Healer · Weak vs Vanguard, Ranger & Marksman';
  }
  if (unitClass === 'arcanist') {
    return 'Strong vs Vanguard · Weak vs Striker & Marksman';
  }
  if (unitClass === 'ranger') {
    return 'Anti-Air (+3 ATK vs Flyers) · Ignores Forest EVA';
  }
  if (unitClass === 'marksman') {
    return 'Strong vs Arcanist, Striker & Healer · Weak vs Vanguard';
  }
  if (unitClass === 'cleric') {
    return 'Restores Ally HP (Rng 1–2) · Radiant Bolt';
  }
  if (unitClass === 'healer') {
    return 'Sanctuary Pulse Mend (Rng 1–3) · Weak vs Striker & Marksman';
  }
  return 'Twin Commander Pact (+ATK to Adjacent Allies · +1 DEF when X & Sol Link)';
}

function formatRangeText(minRange: number, maxRange: number): string {
  return minRange === maxRange ? `${minRange}` : `${minRange}–${maxRange}`;
}

export function CharacterInfoModal({
  unit,
  inventoryEquipmentIds,
  onDismiss,
  onWaitUnit,
  onSelfHealUnit,
  onEquipItem,
  onUnequipSlot,
}: CharacterInfoModalProps) {
  return (
    <AnimatePresence>
      {unit && (
        <motion.div
          key="character-info-backdrop"
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          transition={{duration: 0.16}}
          onClick={onDismiss}
          role="dialog"
          aria-modal="true"
          aria-label={`${unit.name} character details`}
          className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
        >
          <motion.div
            key={unit.id}
            initial={{opacity: 0, scale: 0.94, y: 12}}
            animate={{opacity: 1, scale: 1, y: 0}}
            exit={{opacity: 0, scale: 0.95, y: 8}}
            transition={{duration: 0.18, ease: 'easeOut'}}
            onClick={(event) => event.stopPropagation()}
            className={`relative w-full max-w-[760px] max-h-[90dvh] overflow-y-auto tactics-scroll-sm rounded-2xl bg-[#0d1629] border shadow-2xl ${
              unit.faction === 'player'
                ? 'border-sky-400/50 shadow-sky-950/60'
                : 'border-rose-400/50 shadow-rose-950/60'
            }`}
          >
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close character info"
              className="absolute top-3 right-3 z-20 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <CharacterInfoBody
              key={unit.id}
              unit={unit}
              inventoryEquipmentIds={inventoryEquipmentIds}
              onDismiss={onDismiss}
              onWaitUnit={onWaitUnit}
              onSelfHealUnit={onSelfHealUnit}
              onEquipItem={onEquipItem}
              onUnequipSlot={onUnequipSlot}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface CharacterInfoBodyProps {
  unit: InspectedUnitDetails;
  inventoryEquipmentIds: string[];
  onDismiss: () => void;
  onWaitUnit: () => void;
  onSelfHealUnit: () => void;
  onEquipItem: (unitId: string, equipmentId: string) => void;
  onUnequipSlot: (unitId: string, slot: EquipmentSlot) => void;
}

function CharacterInfoBody({
  unit,
  inventoryEquipmentIds,
  onDismiss,
  onWaitUnit,
  onSelfHealUnit,
  onEquipItem,
  onUnequipSlot,
}: CharacterInfoBodyProps) {
  const [activeTab, setActiveTab] = useState<UnitDetailTab>('overview');
  const [previewDeltas, setPreviewDeltas] =
    useState<EquipmentStatDeltas | null>(null);

  const archetype = UNIT_ARCHETYPES[unit.unitClass];
  const terrainMeta = TERRAIN_CONFIG[unit.terrain];
  const isPlayer = unit.faction === 'player';

  const hasTwinPactShield = unit.unitClass === 'sovereign' && unit.hasAura;
  const effectiveAttack = unit.attack + unit.bonusAttack;
  const totalDefenseBonus =
    unit.equipmentDefenseBonus +
    unit.terrainDefense +
    (hasTwinPactShield ? 1 : 0);
  const effectiveDefense = unit.defense + totalDefenseBonus;
  const previewMaxHpDelta = previewDeltas?.maxHp ?? 0;

  const hpPercent = Math.max(
    0,
    Math.min(100, Math.round((unit.hp / Math.max(1, unit.maxHp)) * 100)),
  );
  const xpPercent = Math.max(
    0,
    Math.min(100, Math.round((unit.xp / Math.max(1, unit.xpToNextLevel)) * 100)),
  );
  const statusLabel = isPlayer
    ? unit.hasActed
      ? 'Turn Spent'
      : 'Ready'
    : 'Enemy';

  const compatibleChestCount = isPlayer
    ? inventoryEquipmentIds.filter((itemId) => {
        const item = getEquipmentById(itemId);
        return item !== null && canUnitClassEquipItem(unit.unitClass, item);
      }).length
    : 0;

  const attackBonusText =
    unit.bonusAttack > 0 ? `+${unit.bonusAttack}` : undefined;
  const defenseBonusText =
    totalDefenseBonus > 0 ? `+${totalDefenseBonus}` : undefined;
  const moveBonusText =
    unit.equipmentMoveBonus > 0 ? `+${unit.equipmentMoveBonus}` : undefined;
  const rangeBonusText =
    unit.equipmentRangeBonus > 0 ? `+${unit.equipmentRangeBonus}` : undefined;
  const critBonusText =
    unit.equipmentCritBonus > 0 ? `+${unit.equipmentCritBonus}%` : undefined;
  const healBonusText =
    unit.equipmentHealBonus > 0 ? `+${unit.equipmentHealBonus}` : undefined;

  const handleTabChange = (nextTab: UnitDetailTab) => {
    setPreviewDeltas(null);
    setActiveTab(nextTab);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[250px_1fr]">
      <div className="relative border-b sm:border-b-0 sm:border-r border-slate-800/90">
        <UnitSpriteShowcase
          unitClass={unit.unitClass}
          faction={unit.faction}
          terrain={unit.terrain}
        />
        <div className="absolute top-3 left-3 flex items-center gap-2 text-[11px] font-semibold bg-slate-950/80 px-2.5 py-1 rounded-lg backdrop-blur-sm">
          <span className={isPlayer ? 'text-sky-300' : 'text-rose-300'}>
            {isPlayer ? 'Ally' : 'Enemy'}
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="font-mono tabular-nums text-amber-300">
            Lv {unit.level}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-[11px] font-medium text-slate-300/90">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-sm">
            <Mountain className="w-3.5 h-3.5 text-slate-400" />
            <span>{terrainMeta.label}</span>
          </span>
          {unit.canFly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/80 text-sky-300 backdrop-blur-sm">
              <Wind className="w-3.5 h-3.5" />
              <span>Flyer</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col justify-between gap-4">
        <div className="space-y-3.5">
          <div className="pr-10 space-y-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-0.5">
                <span className="font-semibold text-slate-300">
                  {archetype.label}
                </span>
                <span aria-hidden="true">·</span>
                <span>{archetype.chessAnalogue}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    isPlayer
                      ? unit.hasActed
                        ? 'text-slate-400'
                        : 'text-sky-300 font-medium'
                      : 'text-rose-300 font-medium'
                  }
                >
                  {statusLabel}
                </span>
              </div>
              <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-50 leading-tight">
                {unit.name}
              </h2>
            </div>

            <div
              role="tablist"
              aria-label="Unit detail sections"
              className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-950/90 border border-slate-800"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'overview'}
                onClick={() => handleTabChange('overview')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-sky-400 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'equip'}
                onClick={() => handleTabChange('equip')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTab === 'equip'
                    ? 'bg-sky-400 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <span>Equip</span>
                {compatibleChestCount > 0 && unit.canEditEquipment && (
                  <span
                    className={`font-mono tabular-nums text-[11px] ${
                      activeTab === 'equip'
                        ? 'text-slate-900'
                        : 'text-emerald-300'
                    }`}
                  >
                    ({compatibleChestCount})
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Vitality</span>
                <span className="font-mono tabular-nums text-slate-100 inline-flex items-center gap-1.5">
                  <span>
                    HP {unit.hp} / {unit.maxHp}
                  </span>
                  {previewMaxHpDelta !== 0 ? (
                    <span
                      className={
                        previewMaxHpDelta > 0
                          ? 'text-emerald-300 font-bold'
                          : 'text-rose-300 font-bold'
                      }
                    >
                      ({previewMaxHpDelta > 0 ? '+' : ''}
                      {previewMaxHpDelta} Max)
                    </span>
                  ) : (
                    unit.equipmentMaxHpBonus > 0 && (
                      <span className="text-emerald-400 font-semibold">
                        (+{unit.equipmentMaxHpBonus})
                      </span>
                    )
                  )}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    isPlayer ? 'bg-sky-400' : 'bg-rose-400'
                  }`}
                  style={{width: `${hpPercent}%`}}
                />
              </div>
            </div>

            {activeTab === 'overview' && isPlayer && (
              <div>
                <div className="flex items-center justify-between text-xs font-medium mb-1">
                  <span className="text-violet-300">Experience</span>
                  <span className="font-mono tabular-nums text-violet-200">
                    {unit.xp} / {unit.xpToNextLevel} XP
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-400 transition-all duration-200"
                    style={{width: `${xpPercent}%`}}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <UnitStatTile
              label="ATK"
              value={`${effectiveAttack}`}
              bonusText={attackBonusText}
              previewDelta={previewDeltas?.attack ?? 0}
              icon={<Swords className="w-3.5 h-3.5 text-rose-300" />}
            />
            <UnitStatTile
              label="DEF"
              value={`${effectiveDefense}`}
              bonusText={defenseBonusText}
              previewDelta={previewDeltas?.defense ?? 0}
              icon={<Shield className="w-3.5 h-3.5 text-sky-300" />}
            />
            <UnitStatTile
              label="MOV"
              value={`${unit.move}`}
              bonusText={moveBonusText}
              previewDelta={previewDeltas?.move ?? 0}
              icon={<Footprints className="w-3.5 h-3.5 text-amber-300" />}
            />
            <UnitStatTile
              label="RNG"
              value={formatRangeText(unit.minRange, unit.maxRange)}
              bonusText={rangeBonusText}
              previewDelta={previewDeltas?.maxRange ?? 0}
              icon={<Crosshair className="w-3.5 h-3.5 text-emerald-300" />}
            />
            <UnitStatTile
              label="CRIT"
              value={`${unit.critChance}%`}
              bonusText={critBonusText}
              previewDelta={previewDeltas?.critChance ?? 0}
              previewUnit="%"
              accentClass={unit.critChance >= 30 ? 'text-amber-300' : undefined}
              icon={<Zap className="w-3.5 h-3.5 text-amber-300" />}
            />
            {unit.canHeal && (
              <UnitStatTile
                label="MEND"
                value={`+${unit.healPower}`}
                bonusText={healBonusText}
                previewDelta={previewDeltas?.healPower ?? 0}
                accentClass="text-emerald-300"
                icon={<Heart className="w-3.5 h-3.5 text-emerald-400" />}
              />
            )}
          </div>

          {activeTab === 'overview' ? (
            <div className="rounded-xl bg-slate-900/75 border border-slate-800 p-3 space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-100">
                    {getMatchupSummary(unit.unitClass)}
                  </p>
                  <p className="text-slate-400">{archetype.traitSummary}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/90 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  {unit.weaponName || unit.accessoryName ? (
                    <>
                      {unit.weaponName && (
                        <span className="inline-flex items-center gap-1.5 text-sky-300 font-semibold">
                          <ArmoryItemIcon
                            itemId={unit.weaponId}
                            itemName={unit.weaponName}
                            size="xs"
                          />
                          <span>{unit.weaponName}</span>
                        </span>
                      )}
                      {unit.accessoryName && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold">
                          <ArmoryItemIcon
                            itemId={unit.accessoryId}
                            itemName={unit.accessoryName}
                            size="xs"
                          />
                          <span>{unit.accessoryName}</span>
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-500">No gear equipped</span>
                  )}
                  {unit.tempAttackBonus > 0 && (
                    <span className="text-amber-300 font-semibold">
                      Lightning Flask +{unit.tempAttackBonus} ATK
                    </span>
                  )}
                </div>
                {isPlayer && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('equip')}
                    className="text-xs font-semibold text-sky-300 hover:text-sky-200 underline underline-offset-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Manage Gear
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800/90 flex items-center justify-between gap-2 text-slate-400">
                <span className="font-medium text-slate-300">
                  Terrain: {terrainMeta.label}
                </span>
                <span className="font-mono text-[11px] text-slate-300">
                  {terrainMeta.summary}
                </span>
              </div>
            </div>
          ) : (
            <UnitEquipPanel
              unit={unit}
              inventoryEquipmentIds={inventoryEquipmentIds}
              onEquipItem={onEquipItem}
              onUnequipSlot={onUnequipSlot}
              onPreviewDeltasChange={setPreviewDeltas}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {unit.canCommand ? (
            <>
              <button
                type="button"
                onClick={onDismiss}
                className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-sky-400 hover:bg-sky-300 active:scale-[0.99] text-slate-950 font-bold text-sm sm:text-[15px] px-4 py-2.5 transition-all whitespace-nowrap cursor-pointer shadow-lg shadow-sky-500/20"
              >
                <span>Command Unit</span>
              </button>
              {unit.canSelfHeal && (
                <button
                  type="button"
                  onClick={onSelfHealUnit}
                  className="min-h-[46px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 active:scale-[0.99] text-slate-950 font-bold text-sm px-4 py-2.5 transition-all whitespace-nowrap cursor-pointer"
                >
                  <Heart className="w-4 h-4" />
                  <span>Self-Mend</span>
                </button>
              )}
              <button
                type="button"
                onClick={onWaitUnit}
                className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.99] border border-emerald-400/45 text-slate-100 font-semibold text-sm px-4 py-2.5 transition-all whitespace-nowrap cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Wait</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full min-h-[46px] inline-flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.99] border border-slate-700 text-slate-100 font-semibold text-sm sm:text-[15px] px-4 py-2.5 transition-all whitespace-nowrap cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
