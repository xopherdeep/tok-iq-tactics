'use client';

import {useState} from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Backpack,
  Check,
  Coins,
  ShoppingBag,
  Swords,
  UserPlus,
  Users,
} from 'lucide-react';
import {ArmoryItemIcon} from '@/components/atoms/ArmoryItemIcon';
import {UnitSpritePortrait} from '@/components/atoms/UnitSpritePortrait';
import {ArmoryShopPanel} from '@/components/molecules/ArmoryShopPanel';
import {getChapterById} from '@/lib/tactics/chapters';
import {
  INITIAL_UPGRADE_EFFECTS,
  UNIT_ARCHETYPES,
} from '@/lib/tactics/constants';
import type {HudSummary} from '@/lib/tactics/gameController';
import {
  canUnitEquipItem,
  describeEquipmentBonuses,
  getEquipmentById,
  getUnitEffectiveStats,
  groupInventoryEquipment,
  TAVERN_RECRUITS,
} from '@/lib/tactics/rpgCatalog';
import type {
  ConsumableType,
  EquipmentSlot,
  Unit,
} from '@/lib/tactics/types';

type PrepTab = 'party' | 'armory' | 'tavern';

interface PartyPrepScreenProps {
  hud: HudSummary;
  onBackToMap: () => void;
  onDeployChapter: () => void;
  onToggleDeploy: (unitId: string) => void;
  onMoveDeployOrder: (unitId: string, direction: -1 | 1) => void;
  onEquipItem: (unitId: string, equipmentId: string) => void;
  onUnequipSlot: (unitId: string, slot: EquipmentSlot) => void;
  onBuyEquipment: (equipmentId: string) => void;
  onBuyAndEquip: (unitId: string, equipmentId: string) => void;
  onBuyConsumable: (consumableId: ConsumableType) => void;
  onRecruitHero: (offerId: string) => void;
}


export function PartyPrepScreen({
  hud,
  onBackToMap,
  onDeployChapter,
  onToggleDeploy,
  onMoveDeployOrder,
  onEquipItem,
  onUnequipSlot,
  onBuyEquipment,
  onBuyAndEquip,
  onBuyConsumable,
  onRecruitHero,
}: PartyPrepScreenProps) {
  const [activeTab, setActiveTab] = useState<PrepTab>('party');
  const [selectedHeroId, setSelectedHeroId] = useState<string>(
    hud.campaignRoster[0]?.id ?? 'p-commander-x',
  );

  const chapter = getChapterById(hud.activeChapterId);
  const selectedHero: Unit | undefined =
    hud.campaignRoster.find((unit) => unit.id === selectedHeroId) ??
    hud.campaignRoster[0];

  const orderedRoster = [...hud.campaignRoster].sort((a, b) => {
    const indexA = hud.deployedUnitIds.indexOf(a.id);
    const indexB = hud.deployedUnitIds.indexOf(b.id);
    const deployedA = indexA >= 0;
    const deployedB = indexB >= 0;
    if (deployedA && deployedB) {
      return indexA - indexB;
    }
    if (deployedA) {
      return -1;
    }
    if (deployedB) {
      return 1;
    }
    return b.level - a.level;
  });

  return (
    <div className="flex-1 w-full max-w-[1160px] mx-auto flex flex-col min-h-0 px-3 sm:px-4 py-3 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToMap}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-50 leading-tight">
              Hall of the Gods · {chapter.chapterLabel}: {chapter.title}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Deployed {hud.deployedUnitIds.length} / {chapter.maxDeployCount}{' '}
              Champions · Twin Commanders X &amp; Sol Locked · Full Rest
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-400/35 px-3 py-1.5 text-xs font-mono font-bold text-amber-300">
            <Coins className="w-3.5 h-3.5" />
            <span>{hud.gold}g</span>
          </div>
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-300 font-mono">
            <Backpack className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Jars {hud.consumables.potion + hud.consumables.hiPotion} · Flasks{' '}
              {hud.consumables.powerTonic}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('party')}
          className={`min-h-[42px] rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'party'
              ? 'bg-sky-400/15 border-sky-400 text-sky-200'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Party & Gear</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('armory')}
          className={`min-h-[42px] rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'armory'
              ? 'bg-amber-400/15 border-amber-400 text-amber-200'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Armory & Items</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tavern')}
          className={`min-h-[42px] rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'tavern'
              ? 'bg-emerald-400/15 border-emerald-400 text-emerald-200'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>
            Hall Guests (
            {TAVERN_RECRUITS.length - hud.recruitedTavernIds.length})
          </span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2 tactics-scroll">
        {activeTab === 'party' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
            <div className="space-y-2">
              {orderedRoster.map((unit) => {
                const archetype = UNIT_ARCHETYPES[unit.unitClass];
                const deployIndex = hud.deployedUnitIds.indexOf(unit.id);
                const isDeployed = deployIndex >= 0;
                const isSovereign = unit.unitClass === 'sovereign';
                const isSelected = selectedHero?.id === unit.id;
                const stats = getUnitEffectiveStats(
                  unit,
                  INITIAL_UPGRADE_EFFECTS,
                );
                const weapon = getEquipmentById(unit.weaponId);
                const accessory = getEquipmentById(unit.accessoryId);

                return (
                  <div
                    key={unit.id}
                    onClick={() => setSelectedHeroId(unit.id)}
                    className={`rounded-2xl border p-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/95 border-sky-400/75'
                        : 'bg-slate-900/85 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-1">
                        <UnitSpritePortrait unitClass={unit.unitClass} size={52} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-amber-300 text-sm">
                            {archetype.trenChessSymbol}
                          </span>
                          <span className="font-bold text-sm sm:text-base text-slate-50 truncate">
                            {unit.name}
                          </span>
                          <span className="font-mono tabular-nums text-[11px] font-bold text-amber-300">
                            LV {unit.level}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span className="text-[11px] text-teal-300/90 font-medium">
                            {archetype.xadionTitle}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {archetype.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono text-slate-300 mt-1">
                          <span>HP {stats.maxHp}</span>
                          <span>ATK {stats.attack}</span>
                          <span>DEF {stats.defense}</span>
                          <span>MOV {stats.move}</span>
                          <span>
                            RNG{' '}
                            {unit.minRange === stats.maxRange
                              ? unit.minRange
                              : `${unit.minRange}-${stats.maxRange}`}
                          </span>
                          <span
                            className={
                              stats.critChance >= 30 ? 'text-amber-300' : undefined
                            }
                          >
                            CRIT {stats.critChance}%
                          </span>
                          {unit.canHeal && (
                            <span className="text-emerald-300">
                              MEND +{stats.healPower}
                            </span>
                          )}
                        </div>
                        {(weapon || accessory) && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px]">
                            {weapon && (
                              <span className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-400/30">
                                <ArmoryItemIcon
                                  itemId={weapon.id}
                                  itemName={weapon.name}
                                  size="xs"
                                />
                                <span>{weapon.name}</span>
                              </span>
                            )}
                            {accessory && (
                              <span className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                                <ArmoryItemIcon
                                  itemId={accessory.id}
                                  itemName={accessory.name}
                                  size="xs"
                                />
                                <span>{accessory.name}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1.5 shrink-0"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {isDeployed && (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={deployIndex <= 0}
                            onClick={() => onMoveDeployOrder(unit.id, -1)}
                            aria-label={`Move ${unit.name} up in formation`}
                            className="p-1 rounded-md bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={deployIndex >= hud.deployedUnitIds.length - 1}
                            onClick={() => onMoveDeployOrder(unit.id, 1)}
                            aria-label={`Move ${unit.name} down in formation`}
                            className="p-1 rounded-md bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={
                          isSovereign ||
                          (!isDeployed &&
                            hud.deployedUnitIds.length >= chapter.maxDeployCount)
                        }
                        onClick={() => onToggleDeploy(unit.id)}
                        className={`min-w-[82px] px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer disabled:opacity-50 ${
                          isDeployed
                            ? 'bg-sky-400/20 border-sky-400/60 text-sky-200 hover:bg-sky-400/30'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {isSovereign
                          ? 'Twin Pact'
                          : isDeployed
                            ? `Slot #${deployIndex + 1}`
                            : 'Deploy'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedHero && (
              <aside className="rounded-2xl bg-slate-900/95 border border-slate-800 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-1.5">
                    <UnitSpritePortrait
                      unitClass={selectedHero.unitClass}
                      size={64}
                    />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-50 flex items-center gap-1.5">
                      <span className="font-mono text-amber-300">
                        {UNIT_ARCHETYPES[selectedHero.unitClass].trenChessSymbol}
                      </span>
                      <span>{selectedHero.name}</span>
                    </h2>
                    <p className="text-xs text-teal-300/90 font-medium">
                      {UNIT_ARCHETYPES[selectedHero.unitClass].xadionTitle} ·{' '}
                      {UNIT_ARCHETYPES[selectedHero.unitClass].label}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                      LV {selectedHero.level} ({selectedHero.xp}/
                      {selectedHero.xpToNextLevel} XP)
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Equipped Gear
                  </div>
                  {(['weapon', 'accessory'] as EquipmentSlot[]).map((slot) => {
                    const equippedId =
                      slot === 'weapon'
                        ? selectedHero.weaponId
                        : selectedHero.accessoryId;
                    const equippedItem = getEquipmentById(equippedId);
                    return (
                      <div
                        key={slot}
                        className="rounded-xl bg-slate-950/90 border border-slate-800 px-3 py-2.5 flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ArmoryItemIcon
                            itemId={equippedItem?.id ?? null}
                            itemName={equippedItem?.name}
                            emptySlot={slot}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                              {slot}
                            </div>
                            {equippedItem ? (
                              <>
                                <div className="text-xs font-bold text-sky-300 truncate">
                                  {equippedItem.name}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {equippedItem.summary}
                                </div>
                              </>
                            ) : (
                              <div className="text-xs text-slate-500">Empty</div>
                            )}
                          </div>
                        </div>
                        {equippedItem && (
                          <button
                            type="button"
                            onClick={() =>
                              onUnequipSlot(selectedHero.id, slot)
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 cursor-pointer shrink-0"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Armory Chest ({hud.inventoryEquipmentIds.length})
                  </div>
                  {hud.inventoryEquipmentIds.length === 0 ? (
                    <p className="text-xs text-slate-500 rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
                      No spare gear in chest. Buy weapons or accessories in the
                      Armory tab, or clear chapters for treasure!
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {groupInventoryEquipment(hud.inventoryEquipmentIds).map(
                        ({item, count}) => {
                          const compatible = canUnitEquipItem(
                            selectedHero,
                            item,
                          );
                          const hasEquippedInSlot =
                            item.slot === 'weapon'
                              ? selectedHero.weaponId !== null
                              : selectedHero.accessoryId !== null;
                          const bonusLabels = describeEquipmentBonuses(item);
                          return (
                            <div
                              key={item.id}
                              className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 flex items-center justify-between gap-2.5"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ArmoryItemIcon
                                  itemId={item.id}
                                  itemName={item.name}
                                  size="md"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                                    <span className="truncate">{item.name}</span>
                                    {count > 1 && (
                                      <span className="font-mono tabular-nums text-[11px] text-slate-400 shrink-0">
                                        ×{count}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-mono tabular-nums text-emerald-300/90 truncate">
                                    {bonusLabels.join(' · ')}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={!compatible}
                                onClick={() =>
                                  onEquipItem(selectedHero.id, item.id)
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold disabled:bg-slate-800 disabled:text-slate-500 whitespace-nowrap cursor-pointer shrink-0"
                              >
                                {!compatible
                                  ? 'Class'
                                  : hasEquippedInSlot
                                    ? 'Swap'
                                    : 'Equip'}
                              </button>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        )}

        {activeTab === 'armory' && (
          <ArmoryShopPanel
            gold={hud.gold}
            roster={orderedRoster}
            deployedUnitIds={hud.deployedUnitIds}
            inventoryEquipmentIds={hud.inventoryEquipmentIds}
            consumables={hud.consumables}
            onBuyEquipment={onBuyEquipment}
            onBuyAndEquip={onBuyAndEquip}
            onEquipOwned={onEquipItem}
            onBuyConsumable={onBuyConsumable}
          />
        )}

        {activeTab === 'tavern' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TAVERN_RECRUITS.map((offer) => {
              const alreadyRecruited = hud.recruitedTavernIds.includes(offer.id);
              const canAfford = hud.gold >= offer.cost;
              const archetype = UNIT_ARCHETYPES[offer.unitClass];
              return (
                <div
                  key={offer.id}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-slate-950 border border-slate-800 p-1">
                      <UnitSpritePortrait unitClass={offer.unitClass} size={60} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-50 flex items-center gap-1.5">
                        <span className="font-mono text-amber-300">
                          {archetype.trenChessSymbol}
                        </span>
                        <span>{offer.name}</span>
                      </h3>
                      <p className="text-xs text-teal-300 font-medium">
                        {archetype.xadionTitle} · {archetype.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        {offer.summary}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={alreadyRecruited || !canAfford}
                    onClick={() => onRecruitHero(offer.id)}
                    className={`w-full min-h-[42px] rounded-xl font-bold text-xs px-3 py-2 inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                      alreadyRecruited
                        ? 'bg-slate-800/80 text-emerald-300 border border-emerald-400/30'
                        : 'bg-sky-400 hover:bg-sky-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950'
                    }`}
                  >
                    {alreadyRecruited ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Joined Roster</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Recruit · {offer.cost}g</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 pt-2 border-t border-slate-800/90 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBackToMap}
          className="min-h-[50px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm px-4 sm:px-6 cursor-pointer"
        >
          World Map
        </button>
        <button
          type="button"
          onClick={onDeployChapter}
          className="flex-1 min-h-[50px] rounded-xl bg-sky-400 hover:bg-sky-300 active:scale-[0.99] text-slate-950 font-bold text-sm sm:text-base px-5 inline-flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer"
        >
          <Swords className="w-5 h-5" />
          <span>
            Begin {chapter.chapterLabel} · Deploy ({hud.deployedUnitIds.length}/
            {chapter.maxDeployCount})
          </span>
        </button>
      </div>
    </div>
  );
}
