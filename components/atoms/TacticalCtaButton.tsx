'use client';

import type {ReactNode} from 'react';

export type TacticalCtaTone = 'undo' | 'wait' | 'endTurn' | 'chrono';

interface TacticalCtaButtonProps {
  label: string;
  hotkey?: string;
  onClick: () => void;
  disabled?: boolean;
  tone: TacticalCtaTone;
  emphasize?: boolean;
  icon: ReactNode;
  title: string;
}

function getToneClasses(tone: TacticalCtaTone, emphasize: boolean): string {
  if (tone === 'endTurn') {
    const emphasisRing = emphasize
      ? 'ring-2 ring-amber-300/75 shadow-lg shadow-amber-400/25'
      : 'shadow-md shadow-amber-500/15';
    return `bg-amber-400 text-slate-950 hover:bg-amber-300 active:bg-amber-200 border border-amber-200/60 font-bold ${emphasisRing}`;
  }

  if (tone === 'chrono') {
    return 'bg-[#15132b] text-teal-200 hover:bg-[#1e1b3a] active:bg-[#262148] border border-violet-400/55 font-semibold shadow-sm shadow-violet-500/10';
  }

  if (tone === 'wait') {
    return 'bg-slate-900/95 text-slate-100 hover:bg-slate-800 active:bg-slate-700 border border-teal-400/45 font-semibold shadow-sm';
  }

  return 'bg-slate-900/95 text-slate-100 hover:bg-slate-800 active:bg-slate-700 border border-amber-400/45 font-semibold shadow-sm';
}

export function TacticalCtaButton({
  label,
  hotkey,
  onClick,
  disabled = false,
  tone,
  emphasize = false,
  icon,
  title,
}: TacticalCtaButtonProps) {
  const toneClasses = getToneClasses(tone, emphasize);
  const isEndTurn = tone === 'endTurn';
  const hotkeyClasses = isEndTurn
    ? 'bg-slate-950/20 text-slate-950/85 border-slate-950/20'
    : tone === 'chrono'
      ? 'bg-violet-950/80 text-teal-300 border-violet-500/40'
      : 'bg-slate-950/80 text-slate-400 border-slate-700/80';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      className={`group flex-1 min-h-[46px] sm:min-h-[50px] inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-2 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm tracking-tight leading-none transition-all duration-150 active:scale-[0.98] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:opacity-35 disabled:shadow-none disabled:border-slate-800 disabled:pointer-events-none cursor-pointer ${toneClasses}`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
      {hotkey && (
        <kbd
          className={`hidden md:inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase leading-none ${hotkeyClasses}`}
        >
          {hotkey}
        </kbd>
      )}
    </button>
  );
}
