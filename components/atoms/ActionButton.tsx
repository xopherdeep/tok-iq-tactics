'use client';

import type {ReactNode} from 'react';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: ReactNode;
  title?: string;
  hideLabelOnMobile?: boolean;
}

export function ActionButton({
  label,
  onClick,
  disabled = false,
  variant = 'secondary',
  icon,
  title,
  hideLabelOnMobile = false,
}: ActionButtonProps) {
  const variantClasses =
    variant === 'primary'
      ? 'bg-sky-400 text-slate-950 hover:bg-sky-300 border border-sky-300/40 font-semibold'
      : variant === 'ghost'
        ? 'bg-transparent text-slate-300 hover:text-slate-100 hover:bg-slate-800/70 border border-transparent'
        : 'bg-slate-800/80 text-slate-100 hover:bg-slate-700/80 border border-slate-700';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs leading-none transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${variantClasses}`}
    >
      {icon}
      <span className={hideLabelOnMobile ? 'hidden sm:inline' : undefined}>
        {label}
      </span>
    </button>
  );
}
