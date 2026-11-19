'use client';

import type {ReactNode} from 'react';

interface UnitStatTileProps {
  label: string;
  value: string;
  bonusText?: string;
  previewDelta?: number;
  previewUnit?: string;
  icon: ReactNode;
  accentClass?: string;
}

export function UnitStatTile({
  label,
  value,
  bonusText,
  previewDelta = 0,
  previewUnit = '',
  icon,
  accentClass = 'text-slate-100',
}: UnitStatTileProps) {
  const hasPreview = previewDelta !== 0;
  const isPositivePreview = previewDelta > 0;
  const formattedPreview = `${isPositivePreview ? '+' : ''}${previewDelta}${previewUnit}`;
  const borderClass = hasPreview
    ? isPositivePreview
      ? 'border-emerald-400/60 bg-emerald-950/25'
      : 'border-rose-400/60 bg-rose-950/25'
    : 'border-slate-800 bg-slate-900/90';

  return (
    <div
      className={`rounded-xl border px-3 py-2 flex flex-col gap-1 transition-colors ${borderClass}`}
    >
      <div className="flex items-center justify-between gap-1 text-[11px] font-semibold tracking-wide text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="shrink-0">{icon}</span>
          <span>{label}</span>
        </span>
        {hasPreview && (
          <span
            className={`font-mono tabular-nums text-[11px] font-bold ${
              isPositivePreview ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {formattedPreview}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
        <span
          className={`text-lg sm:text-xl font-bold leading-none ${accentClass}`}
        >
          {value}
        </span>
        {!hasPreview && bonusText && (
          <span className="text-xs font-semibold text-emerald-400">
            {bonusText}
          </span>
        )}
      </div>
    </div>
  );
}
