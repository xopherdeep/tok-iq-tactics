'use client';

import dynamic from 'next/dynamic';

const TacticsGameArena = dynamic(
  () =>
    import('@/components/organisms/TacticsGameArena').then(
      (mod) => mod.TacticsGameArena,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

export function TacticsClientShell() {
  return (
    <div
      suppressHydrationWarning
      className="min-h-screen h-dvh w-full bg-[#0f172a]"
    >
      <TacticsGameArena />
    </div>
  );
}
