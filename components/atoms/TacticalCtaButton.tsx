'use client';

import type {ReactNode} from 'react';

export type TacticalCtaTone = 'undo' | 'wait' | 'endTurn';

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
      ? 'ring-2 ring-sky-300/70 shadow-lg shadow-sky-400/25'
      : 'shadow-md shadow-sky-500/15';
    return `bg-sky-400 text-slate-950 hover:bg-sky-300 active:bg-sky-200 border border-sky-200/60 font-bold ${emphasisRing}`;
  }

  if (tone === 'wait') {
    return 'bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-600 border border-emerald-400/45 font-semibold shadow-sm';
  }

  return 'bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-600 border border-amber-400/45 font-semibold shadow-sm';
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
    ? 'bg-slate-950/20 text-slate-950/80 border-slate-950/20'
    : 'bg-slate-900/80 text-slate-400 border-slate-700/80';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      className={`group flex-1 min-h-[48px] sm:min-h-[52px] inline-flex items-center justify-center gap-2 sm:gap-2.5 rounded-xl px-3 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-[15px] tracking-tight leading-none transition-all duration-150 active:scale-[0.98] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-35 disabled:shadow-none disabled:border-slate-700/70 disabled:pointer-events-none cursor-pointer ${toneClasses}`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
      {hotkey && (
        <kbd
          className={`hidden sm:inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase leading-none ${hotkeyClasses}`}
        >
          {hotkey}
        </kbd>
      )}
    </button>
  );
}
