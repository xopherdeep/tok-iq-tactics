'use client';

import {
  Coins,
  Compass,
  Download,
  Home,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {ActionButton} from '@/components/atoms/ActionButton';
import type {HudSummary} from '@/lib/tactics/gameController';

interface TacticalHudBarProps {
  hud: HudSummary;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenWorldMap: () => void;
  onReturnTitle: () => void;
  onRestart: () => void;
}

const CLASS_GLYPHS: Record<string, string> = {
  vanguard: '♖',
  striker: '♘',
  arcanist: '♗',
  sovereign: '♔',
  cleric: '✦',
  ranger: '⟁',
  marksman: '◎',
  healer: '❀',
};

function getIqTextTone(iq: number): string {
  if (iq >= 150) {
    return 'text-teal-300';
  }
  if (iq >= 130) {
    return 'text-amber-300';
  }
  if (iq >= 115) {
    return 'text-sky-300';
  }
  if (iq >= 100) {
    return 'text-slate-100';
  }
  return 'text-rose-300';
}

export function TacticalHudBar({
  hud,
  isMuted,
  onToggleMute,
  onOpenWorldMap,
  onReturnTitle,
  onRestart,
}: TacticalHudBarProps) {
  const isPlayerTurn = hud.phase === 'player';
  const isChiSwap = hud.deploymentPhase === 'CHI_SWAP';
  const isInBattle = hud.screen === 'playing';
  const showWorldMapShortcut =
    hud.screen === 'playing' ||
    hud.screen === 'partyPrep' ||
    hud.screen === 'defeat';
  const iqToneClass = getIqTextTone(hud.iqCurrent);
  const deltaPrefix =
    hud.iqLastDelta !== null && hud.iqLastDelta > 0 ? '+' : '';

  return (
    <header className="w-full max-w-[1160px] mx-auto px-2.5 sm:px-4 py-1.5 sm:py-2 border-b border-[#332924] flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          <span className="text-sm sm:text-base font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0">
            Tales of Xadion
            <span className="hidden sm:inline text-amber-400 font-semibold">
              {' '}
              · IQ Tactics
            </span>
          </span>
          {isInBattle && (
            <>
              <div className="flex sm:hidden items-center gap-1.5 text-[11px] text-slate-400 font-mono tabular-nums truncate">
                <span
                  className={
                    isChiSwap
                      ? 'text-teal-300 font-semibold'
                      : isPlayerTurn
                        ? 'text-amber-300 font-semibold'
                        : 'text-rose-400 font-semibold'
                  }
                >
                  {isChiSwap
                    ? 'χ Swap'
                    : `T${hud.turnNumber} · ${isPlayerTurn ? 'Player' : 'Enemy'}`}
                </span>
                <span aria-hidden="true">·</span>
                <span className={`font-semibold ${iqToneClass}`}>
                  IQ {hud.iqCurrent}
                </span>
                {hud.iqLastDelta !== null && (
                  <span
                    className={
                      hud.iqLastDelta > 0
                        ? 'text-teal-300 font-semibold'
                        : 'text-rose-400 font-semibold'
                    }
                  >
                    {deltaPrefix}
                    {hud.iqLastDelta}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums truncate">
                <span className="text-slate-200 font-medium truncate">
                  {hud.stageTitle}
                </span>
                {hud.objectiveSummary && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-300/90 font-semibold truncate">
                      {hud.objectiveSummary}
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span
                  className={
                    isChiSwap
                      ? 'text-teal-300 font-semibold'
                      : isPlayerTurn
                        ? 'text-amber-300 font-semibold'
                        : 'text-rose-400 font-semibold'
                  }
                >
                  {isChiSwap
                    ? 'χ Formation'
                    : `T${hud.turnNumber} ${isPlayerTurn ? 'Player' : 'Enemy'}`}
                </span>
                {!isChiSwap && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {hud.readyPlayerUnits}/{hud.totalPlayerUnits}
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span
                  className={`font-bold ${iqToneClass}`}
                  title={
                    hud.iqLastReason
                      ? `Peak IQ ${hud.iqPeak} · Last: ${hud.iqLastReason}`
                      : `Peak IQ ${hud.iqPeak} · ${hud.iqRankLabel}`
                  }
                >
                  IQ {hud.iqCurrent}
                </span>
                {hud.iqLastDelta !== null && (
                  <span
                    className={
                      hud.iqLastDelta > 0
                        ? 'text-teal-300 font-semibold'
                        : 'text-rose-400 font-semibold'
                    }
                  >
                    ({deltaPrefix}
                    {hud.iqLastDelta})
                  </span>
                )}
                <span className="hidden xl:inline text-slate-400">
                  {hud.iqRankLabel}
                </span>
                {hud.twinCommanders.length >= 2 && (
                  <>
                    <span aria-hidden="true" className="hidden lg:inline">
                      ·
                    </span>
                    <span
                      className={`hidden lg:inline font-semibold ${
                        hud.twinCommanders.every((c) => c.bonded)
                          ? 'text-amber-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {hud.twinCommanders.every((c) => c.bonded)
                        ? 'Pact +1 DEF'
                        : 'Pact Split'}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {hud.screen !== 'title' && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-1 font-mono tabular-nums text-xs font-semibold text-amber-300 whitespace-nowrap shrink-0">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{hud.gold}g</span>
            </span>
          )}

          {showWorldMapShortcut && (
            <ActionButton
              label="World Map"
              onClick={onOpenWorldMap}
              variant="ghost"
              hideLabelOnMobile
              icon={<Compass className="w-3.5 h-3.5 text-teal-300" />}
              title="Return to World Map & Hall"
            />
          )}

          <ActionButton
            label={isMuted ? 'Muted' : 'Sound'}
            onClick={onToggleMute}
            variant="ghost"
            hideLabelOnMobile
            icon={
              isMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )
            }
            title="Toggle synthesized sound effects"
          />

          {hud.screen !== 'title' && (
            <>
              <ActionButton
                label="Title"
                onClick={onReturnTitle}
                variant="ghost"
                hideLabelOnMobile
                icon={<Home className="w-3.5 h-3.5" />}
                title="Return to Title Screen"
              />
              <ActionButton
                label="New Game"
                onClick={onRestart}
                variant="ghost"
                hideLabelOnMobile
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                title="Start a fresh campaign"
              />
            </>
          )}

          <a
            href="/tactics-64.html"
            download="index.html"
            className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            title="Download standalone single-file HTML5 game"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Single-File HTML</span>
          </a>
        </div>
      </div>

      {isInBattle && !isChiSwap && hud.initiativeQueue && hud.initiativeQueue.length > 0 && (
        <nav
          aria-label="Speed Initiative Timeline"
          className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none"
        >
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold px-1 shrink-0">
            Queue
          </span>
          {hud.initiativeQueue.map((item, idx) => {
            const isPlayer = item.faction === 'player';
            const glyph = CLASS_GLYPHS[item.unitClass] ?? '♟';
            return (
              <div
                key={`${item.unitId}-${idx}`}
                title={`${item.name} (${item.unitClass}) · Speed ${item.speed} · HP ${item.currentHp}/${item.maxHp}`}
                className={`relative flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-mono tabular-nums transition-all shrink-0 cursor-default ${
                  item.isActive
                    ? isPlayer
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200 ring-2 ring-amber-400/80 shadow-md shadow-amber-500/20 scale-105'
                      : 'bg-rose-500/25 border-rose-400 text-rose-200 ring-2 ring-rose-400/80 shadow-md shadow-rose-500/20 scale-105'
                    : isPlayer
                      ? 'bg-slate-900/80 border-amber-500/40 text-amber-300/80 hover:border-amber-400'
                      : 'bg-slate-900/80 border-rose-500/40 text-rose-300/80 hover:border-rose-400'
                }`}
              >
                <span className="text-xs font-bold">{glyph}</span>
                <span className="hidden sm:inline font-semibold truncate max-w-[65px]">
                  {item.name.split(' ')[0]}
                </span>
                <span className="text-[10px] opacity-75 font-mono">
                  {item.speed}
                </span>
              </div>
            );
          })}
        </nav>
      )}
    </header>
  );
}
