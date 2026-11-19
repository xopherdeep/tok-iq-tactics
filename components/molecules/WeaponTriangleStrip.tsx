'use client';

interface WeaponTriangleStripProps {
  adaptationNote: string;
  acquiredUpgradeTitles: string[];
  showActiveMeta: boolean;
}

export function WeaponTriangleStrip({
  adaptationNote,
  acquiredUpgradeTitles,
  showActiveMeta,
}: WeaponTriangleStripProps) {
  return (
    <footer className="hidden sm:flex w-full max-w-[1160px] mx-auto px-4 py-2 border-t border-slate-800/90 flex-wrap items-center justify-between gap-x-6 gap-y-1.5 text-xs text-slate-400">
      <div className="flex flex-wrap items-center gap-2 font-mono">
        <span className="text-sky-300 font-medium">Vanguard</span>
        <span aria-hidden="true">&gt;</span>
        <span className="text-sky-300 font-medium">Striker</span>
        <span aria-hidden="true">&gt;</span>
        <span className="text-sky-300 font-medium">Arcanist</span>
        <span aria-hidden="true">&gt;</span>
        <span className="text-sky-300 font-medium">Vanguard</span>
        <span aria-hidden="true" className="text-slate-600">
          ·
        </span>
        <span className="text-emerald-300/90">Ranger Anti-Air</span>
        <span aria-hidden="true" className="text-slate-600">
          ·
        </span>
        <span className="text-cyan-300/90">Marksman &gt; Caster/Flyer</span>
        <span aria-hidden="true" className="text-slate-600">
          ·
        </span>
        <span className="text-teal-300/90">Healer Pulse Mend 1–3</span>
        <span aria-hidden="true" className="text-slate-600">
          ·
        </span>
        <span className="text-amber-300/90">Twin Pact (+ATK · +1 DEF)</span>
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
                <span className="font-mono text-emerald-400/90">
                  Upgrades: {acquiredUpgradeTitles.join(', ')}
                </span>
              </>
            )}
          </>
        ) : (
          <span className="font-mono text-slate-500">
            Z Undo · Space Advance / Wait · E End Turn · Right-Click Cancel
          </span>
        )}
      </div>
    </footer>
  );
}
