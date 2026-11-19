'use client';

import type {BoardMode} from '@/lib/tactics/types';

interface WeaponTriangleStripProps {
  adaptationNote: string;
  acquiredUpgradeTitles: string[];
  showActiveMeta: boolean;
  boardMode: BoardMode;
  iqCurrent: number;
}

export function WeaponTriangleStrip({
  adaptationNote,
  acquiredUpgradeTitles,
  showActiveMeta,
  boardMode,
  iqCurrent,
}: WeaponTriangleStripProps) {
  const doctrineLabel =
    boardMode === 'classic64' ? 'τ Tau 64' : 'χ Campaign Wash';
  const iqOverdriveText =
    iqCurrent >= 130
      ? 'IQ 130+ Overdrive (+10% Hit/Crit · Sightlines)'
      : iqCurrent >= 115
        ? 'IQ 115+ Tactical Read (Hover Foe)'
        : 'IQ 115+ Read · 130+ +10% Hit/Crit';

  return (
    <footer className="hidden sm:flex w-full max-w-[1160px] mx-auto px-4 py-2 border-t border-[#332924] flex-wrap items-center justify-between gap-x-5 gap-y-1 text-xs text-slate-400">
      <div className="flex flex-wrap items-center gap-2 font-mono">
        <span className="text-amber-300 font-medium">Vanguard</span>
        <span aria-hidden="true">&gt;</span>
        <span className="text-amber-300 font-medium">Striker</span>
        <span aria-hidden="true">&gt;</span>
        <span className="text-amber-300 font-medium">Arcanist</span>
        <span aria-hidden="true">&gt;</span>
        <span className="text-amber-300 font-medium">Vanguard</span>
        <span aria-hidden="true" className="text-slate-600">
          ·
        </span>
        <span className="text-teal-300/90">{doctrineLabel}</span>
        <span aria-hidden="true" className="text-slate-600">
          ·
        </span>
        <span
          className={
            iqCurrent >= 130
              ? 'text-amber-300 font-semibold'
              : iqCurrent >= 115
                ? 'text-teal-300 font-semibold'
                : 'text-slate-400'
          }
        >
          {iqOverdriveText}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-slate-400">
        {showActiveMeta ? (
          <>
            <span className="text-slate-300">{adaptationNote}</span>
            {acquiredUpgradeTitles.length > 0 && (
              <>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="font-mono text-teal-300/90">
                  Relics: {acquiredUpgradeTitles.join(', ')}
                </span>
              </>
            )}
          </>
        ) : (
          <span className="font-mono text-slate-500">
            Z Free Undo · Space Begin / Wait · E End Turn · Right-Click Cancel
          </span>
        )}
      </div>
    </footer>
  );
}
