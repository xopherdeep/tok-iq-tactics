'use client';

import Image from 'next/image';
import {
  Check,
  Coins,
  Compass,
  Lock,
  Shield,
  Sparkles,
  Swords,
  Users,
  X,
} from 'lucide-react';
import {ArmoryItemIcon} from '@/components/atoms/ArmoryItemIcon';
import {
  CAMPAIGN_CHAPTERS,
  getChapterById,
  isChapterUnlocked,
} from '@/lib/tactics/chapters';
import type {HudSummary} from '@/lib/tactics/gameController';
import {getEquipmentById} from '@/lib/tactics/rpgCatalog';
import type {BoardMode, DifficultyMode} from '@/lib/tactics/types';
import overworldMapAsset from '@/src/assets/images/xadion_world_map_1795126867661.jpg';

interface WorldMapScreenProps {
  hud: HudSummary;
  onSelectChapter: (chapterId: string) => void;
  onOpenPartyPrep: (chapterId?: string) => void;
  onDeployActiveChapter: () => void;
  onSetDifficulty: (difficulty: DifficultyMode) => void;
  onSetBoardMode: (mode: BoardMode) => void;
  onDismissRewardBanner: () => void;
}

export function WorldMapScreen({
  hud,
  onSelectChapter,
  onOpenPartyPrep,
  onDeployActiveChapter,
  onSetDifficulty,
  onSetBoardMode,
  onDismissRewardBanner,
}: WorldMapScreenProps) {
  const activeChapter = getChapterById(hud.activeChapterId);
  const isChapterAlreadyCleared = hud.completedChapterIds.includes(
    activeChapter.id,
  );
  const rewardEquipment = activeChapter.rewardEquipmentId
    ? getEquipmentById(activeChapter.rewardEquipmentId)
    : null;
  const completedStoryCount = CAMPAIGN_CHAPTERS.filter(
    (chapter) =>
      !chapter.isSkirmish && hud.completedChapterIds.includes(chapter.id),
  ).length;
  const totalStoryCount = CAMPAIGN_CHAPTERS.filter(
    (chapter) => !chapter.isSkirmish,
  ).length;

  return (
    <div className="flex-1 w-full max-w-[1160px] mx-auto overflow-y-auto tactics-scroll px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-[#111936]/90 border border-[#332924] px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <Compass className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-50 leading-tight">
              Xadion · Hall of the Gods
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-mono tabular-nums">
              Chapters {completedStoryCount}/{totalStoryCount} · IQ{' '}
              <span className="text-teal-300 font-semibold">
                {hud.iqCurrent}
              </span>{' '}
              ({hud.iqRankLabel}) · {hud.campaignRoster.length} Champions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono tabular-nums font-bold text-amber-300">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{hud.gold}g</span>
          </div>

          <div
            role="group"
            aria-label="Board doctrine"
            className="inline-flex rounded-xl bg-slate-950 border border-[#332924] p-0.5 text-xs"
          >
            <button
              type="button"
              onClick={() => onSetBoardMode('dynamic')}
              title="Campaign of the Wash: expanding grids (8x8 to 12x10)"
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                hud.boardMode === 'dynamic'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              χ Wash
            </button>
            <button
              type="button"
              onClick={() => onSetBoardMode('classic64')}
              title="Tau Doctrine: strict 8x8 64-waystone TrenChess board"
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                hud.boardMode === 'classic64'
                  ? 'bg-teal-400 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              τ 64
            </button>
          </div>

          <div
            role="group"
            aria-label="Campaign difficulty"
            className="inline-flex rounded-xl bg-slate-950 border border-[#332924] p-0.5 text-xs"
          >
            <button
              type="button"
              onClick={() => onSetDifficulty('story')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                hud.difficulty === 'story'
                  ? 'bg-teal-400 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Story
            </button>
            <button
              type="button"
              onClick={() => onSetDifficulty('tactical')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                hud.difficulty === 'tactical'
                  ? 'bg-rose-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tactical
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenPartyPrep()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Hall &amp; Armory</span>
          </button>
        </div>
      </div>

      {hud.lastVictoryReward && (
        <div className="rounded-2xl bg-emerald-950/50 border border-emerald-400/45 px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm space-y-0.5">
              <p className="font-bold text-emerald-200">
                Victory! {hud.lastVictoryReward.chapterTitle} Cleared
              </p>
              <p className="text-slate-200">
                Earned{' '}
                <span className="font-mono font-bold text-amber-300">
                  +{hud.lastVictoryReward.goldEarned}g
                </span>
                {hud.lastVictoryReward.rewardItemName && (
                  <>
                    {' · Looted '}
                    <span className="font-semibold text-sky-300">
                      {hud.lastVictoryReward.rewardItemName}
                    </span>
                  </>
                )}
                {hud.lastVictoryReward.recruitName && (
                  <>
                    {' · '}
                    <span className="font-semibold text-emerald-300">
                      {hud.lastVictoryReward.recruitName} joined your party!
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismissRewardBanner}
            aria-label="Dismiss reward banner"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3 sm:gap-4 items-start">
        <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-slate-700/90 bg-slate-950 shadow-2xl">
          <Image
            src={overworldMapAsset}
            alt="Tales of Xadion Sonoran Desert World Map"
            fill
            priority
            referrerPolicy="no-referrer"
            className="object-cover select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-slate-950/30 pointer-events-none" />

          {CAMPAIGN_CHAPTERS.map((chapter) => {
            const unlocked = isChapterUnlocked(
              chapter,
              hud.completedChapterIds,
            );
            const completed = hud.completedChapterIds.includes(chapter.id);
            const isSelected = hud.activeChapterId === chapter.id;

            const nodeClasses = !unlocked
              ? 'bg-slate-900/90 border-slate-600/80 text-slate-500'
              : isSelected
                ? 'bg-sky-400 border-white text-slate-950 scale-110 ring-4 ring-sky-400/45 shadow-lg shadow-sky-400/40'
                : completed
                  ? 'bg-amber-400/95 border-amber-100 text-slate-950 hover:scale-105'
                  : chapter.isSkirmish
                    ? 'bg-emerald-400/95 border-emerald-100 text-slate-950 hover:scale-105'
                    : 'bg-sky-500/95 border-sky-100 text-slate-950 hover:scale-105';

            return (
              <button
                key={chapter.id}
                type="button"
                disabled={!unlocked}
                onClick={() => onSelectChapter(chapter.id)}
                style={{left: `${chapter.mapX}%`, top: `${chapter.mapY}%`}}
                aria-label={`${chapter.chapterLabel}: ${chapter.title}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center gap-1 transition-all duration-150 ${
                  unlocked ? 'cursor-pointer z-10' : 'cursor-not-allowed z-0'
                } ${isSelected ? 'z-20' : ''}`}
              >
                <span
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center font-bold transition-transform ${nodeClasses}`}
                >
                  {!unlocked ? (
                    <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : completed ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.75]" />
                  ) : chapter.isSkirmish ? (
                    <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <span className="text-xs sm:text-sm font-mono">
                      {chapter.stageNumber}
                    </span>
                  )}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold whitespace-nowrap shadow-md border ${
                    isSelected
                      ? 'bg-slate-950/95 text-sky-200 border-sky-400/70'
                      : unlocked
                        ? 'bg-slate-950/85 text-slate-100 border-slate-700/80'
                        : 'bg-slate-950/75 text-slate-500 border-slate-800/80'
                  }`}
                >
                  {chapter.chapterLabel}
                </span>
              </button>
            );
          })}
        </div>

        <aside className="rounded-2xl bg-slate-900/95 border border-slate-800 p-4 sm:p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${
                  activeChapter.isSkirmish
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                    : 'bg-sky-500/15 border-sky-400/40 text-sky-300'
                }`}
              >
                {activeChapter.chapterLabel}
              </span>
              {isChapterAlreadyCleared && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
                  <Check className="w-3.5 h-3.5" />
                  <span>Cleared</span>
                </span>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-50 leading-tight">
                {activeChapter.title}
              </h2>
              <p className="text-xs font-medium text-sky-300/90 mt-0.5">
                {activeChapter.region}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                {activeChapter.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2">
                <div className="text-slate-400">Recommended</div>
                <div className="font-mono font-bold text-slate-100 text-sm mt-0.5">
                  LV {activeChapter.recommendedLevel}+
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2">
                <div className="text-slate-400">Squad Slots</div>
                <div className="font-mono font-bold text-sky-300 text-sm mt-0.5">
                  Up to {activeChapter.maxDeployCount} Heroes
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/75 border border-slate-800 p-3 space-y-1.5 text-xs">
              <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Victory Rewards
              </div>
              <div className="flex items-center justify-between text-amber-300 font-mono font-semibold">
                <span>Battle Bounty</span>
                <span>+{activeChapter.goldReward}g</span>
              </div>
              {rewardEquipment && !isChapterAlreadyCleared && (
                <div className="flex items-center justify-between text-sky-300">
                  <span>First-Clear Gear</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <ArmoryItemIcon
                      itemId={rewardEquipment.id}
                      itemName={rewardEquipment.name}
                      size="xs"
                    />
                    <span>{rewardEquipment.name}</span>
                  </span>
                </div>
              )}
              {activeChapter.recruitReward && !isChapterAlreadyCleared && (
                <div className="flex items-center justify-between text-emerald-300">
                  <span>New Ally Joins</span>
                  <span className="font-semibold">
                    {activeChapter.recruitReward.name}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 border border-slate-800/80 px-3 py-2 text-[11px] text-slate-400">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {hud.difficulty === 'story'
                  ? 'Story Mode: Softer monsoon foes, full Hall rest, and Twin Commanders X & Sol deploy together.'
                  : 'Tactical Mode: Full-strength storm AI; link X & Sol for +ATK/+1 DEF, and keep both alive.'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onOpenPartyPrep(activeChapter.id)}
              className="w-full min-h-[48px] rounded-xl bg-sky-400 hover:bg-sky-300 active:scale-[0.99] text-slate-950 font-bold text-sm sm:text-[15px] px-4 py-3 inline-flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/20 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Prepare Party & Gear</span>
            </button>
            <button
              type="button"
              onClick={onDeployActiveChapter}
              className="w-full min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.99] border border-slate-700 text-slate-100 font-semibold text-sm px-4 py-2.5 inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Swords className="w-4 h-4 text-sky-300" />
              <span>Quick Deploy ({hud.deployedUnitIds.length} Ready)</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
