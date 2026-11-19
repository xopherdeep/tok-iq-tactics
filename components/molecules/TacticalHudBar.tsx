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

export function TacticalHudBar({
  hud,
  isMuted,
  onToggleMute,
  onOpenWorldMap,
  onReturnTitle,
  onRestart,
}: TacticalHudBarProps) {
  const isPlayerTurn = hud.phase === 'player';
  const isInBattle = hud.screen === 'playing';
  const showWorldMapShortcut =
    hud.screen === 'playing' ||
    hud.screen === 'partyPrep' ||
    hud.screen === 'defeat';

  return (
    <header className="w-full max-w-[1160px] mx-auto flex items-center justify-between gap-2 sm:gap-4 px-2.5 sm:px-4 py-1.5 sm:py-2.5 border-b border-slate-800/90">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <span className="text-sm sm:text-base font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0">
          Tales of Xadion
        </span>
        {isInBattle && (
          <>
            <div className="flex sm:hidden items-center gap-1.5 text-[11px] text-slate-400 font-mono tabular-nums truncate">
              <span
                className={
                  isPlayerTurn
                    ? 'text-sky-400 font-semibold'
                    : 'text-rose-400 font-semibold'
                }
              >
                T{hud.turnNumber} · {isPlayerTurn ? 'Player' : 'Enemy'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {hud.readyPlayerUnits}/{hud.totalPlayerUnits}
              </span>
              {hud.twinCommanders.length >= 2 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      hud.twinCommanders.every((c) => c.bonded)
                        ? 'text-amber-300 font-semibold'
                        : 'text-slate-400'
                    }
                  >
                    {hud.twinCommanders.every((c) => c.bonded)
                      ? 'Pact +1 DEF'
                      : 'Split'}
                  </span>
                </>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums truncate">
              <span className="text-slate-200 font-medium truncate">
                {hud.stageTitle}
              </span>
              <span aria-hidden="true">·</span>
              <span>Turn {hud.turnNumber}</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  isPlayerTurn
                    ? 'text-sky-400 font-semibold'
                    : 'text-rose-400 font-semibold'
                }
              >
                {isPlayerTurn ? 'Player Phase' : 'Enemy Phase'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Ready {hud.readyPlayerUnits}/{hud.totalPlayerUnits}
              </span>
              {hud.twinCommanders.length >= 2 && (
                <>
                  <span aria-hidden="true" className="hidden lg:inline">
                    ·
                  </span>
                  <span className="hidden lg:inline text-slate-300">
                    {hud.twinCommanders
                      .map((commander) => `${commander.name} ${commander.hp}/${commander.maxHp}`)
                      .join(' · ')}
                  </span>
                  <span aria-hidden="true" className="hidden md:inline">
                    ·
                  </span>
                  <span
                    className={`hidden md:inline font-semibold ${
                      hud.twinCommanders.every((c) => c.bonded)
                        ? 'text-amber-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {hud.twinCommanders.every((c) => c.bonded)
                      ? 'Twin Pact +1 DEF'
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
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-400/25 font-mono text-xs font-semibold text-amber-300">
            <Coins className="w-3.5 h-3.5" />
            <span>{hud.gold}g</span>
          </span>
        )}

        {showWorldMapShortcut && (
          <ActionButton
            label="World Map"
            onClick={onOpenWorldMap}
            variant="ghost"
            hideLabelOnMobile
            icon={<Compass className="w-3.5 h-3.5 text-sky-300" />}
            title="Return to World Map & Camp"
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
          className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          title="Download standalone single-file HTML5 game"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Single-File HTML</span>
        </a>
      </div>
    </header>
  );
}
