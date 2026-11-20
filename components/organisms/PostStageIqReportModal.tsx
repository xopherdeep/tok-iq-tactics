'use client';

import {Coins, Shield, Sparkles, Trophy, X} from 'lucide-react';
import type {VictoryRewardBanner} from '@/lib/tactics/gameController';

interface PostStageIqReportModalProps {
  report: VictoryRewardBanner | null;
  onDismiss: () => void;
}

export function PostStageIqReportModal({
  report,
  onDismiss,
}: PostStageIqReportModalProps) {
  if (!report) {
    return null;
  }

  const grade = report.performanceGrade ?? 'A';
  const gradeColors = {
    S: 'border-amber-400 bg-amber-500/15 text-amber-300 shadow-amber-500/30',
    A: 'border-teal-400 bg-teal-500/15 text-teal-300 shadow-teal-500/30',
    B: 'border-sky-400 bg-sky-500/15 text-sky-300 shadow-sky-500/30',
    C: 'border-rose-400 bg-rose-500/15 text-rose-300 shadow-rose-500/30',
  }[grade];

  const deltaPositive = (report.iqDelta ?? 0) >= 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="iq-report-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-[560px] rounded-3xl bg-[#0b1021] border border-[#332924] shadow-2xl p-5 sm:p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
              <Trophy className="w-3.5 h-3.5" />
              <span>Tactics IQ Evaluation</span>
            </div>
            <h2
              id="iq-report-title"
              className="text-lg sm:text-xl font-extrabold text-slate-100 tracking-tight mt-0.5"
            >
              {report.chapterTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss IQ Report"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 mb-4">
          <div
            className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-serif text-3xl font-black shadow-lg shrink-0 ${gradeColors}`}
          >
            {grade}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg text-amber-300">
                {report.glyph ?? '♔'}
              </span>
              <span className="text-sm font-bold text-slate-100 truncate">
                {report.rankLabel ?? 'Field Tactician'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
              <span>
                Final IQ:{' '}
                <strong className="text-slate-100 font-bold">
                  {report.endingIq ?? 100}
                </strong>
              </span>
              <span>·</span>
              <span>
                Peak:{' '}
                <strong className="text-slate-100 font-bold">
                  {report.peakIq ?? 100}
                </strong>
              </span>
              <span>·</span>
              <span
                className={
                  deltaPositive ? 'text-teal-300 font-bold' : 'text-rose-400 font-bold'
                }
              >
                {deltaPositive ? '+' : ''}
                {report.iqDelta ?? 0} IQ
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-center">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Clean Lethals
            </div>
            <div className="text-base font-extrabold text-teal-300 font-mono mt-0.5">
              {report.cleanLethals ?? 0}
            </div>
            <div className="text-[9px] text-teal-400/80 font-mono">+3 IQ each</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Advantage Hits
            </div>
            <div className="text-base font-extrabold text-amber-300 font-mono mt-0.5">
              {report.advantageStrikes ?? 0}
            </div>
            <div className="text-[9px] text-amber-400/80 font-mono">+2 IQ each</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Chrono Rewinds
            </div>
            <div className="text-base font-extrabold text-slate-300 font-mono mt-0.5">
              {report.chronoRewindsUsed ?? 0}
            </div>
            <div className="text-[9px] text-slate-500 font-mono">-10 IQ each</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Reckless Moves
            </div>
            <div className="text-base font-extrabold text-rose-400 font-mono mt-0.5">
              {report.recklessExposures ?? 0}
            </div>
            <div className="text-[9px] text-rose-400/80 font-mono">-2 IQ each</div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 mb-5 space-y-1.5 text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Spoils of Victory
          </div>
          <div className="flex flex-wrap items-center gap-3 text-slate-200">
            <span className="flex items-center gap-1 font-mono text-amber-300 font-bold">
              <Coins className="w-3.5 h-3.5" />
              +{report.goldEarned}g
            </span>
            {report.rewardItemName && (
              <span className="flex items-center gap-1 text-sky-300 font-semibold">
                <Shield className="w-3.5 h-3.5" />
                {report.rewardItemName}
              </span>
            )}
            {report.recruitName && (
              <span className="flex items-center gap-1 text-emerald-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                {report.recruitName} joined!
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="w-full min-h-[44px] rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-slate-950 font-bold text-sm px-4 py-2.5 inline-flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
        >
          <span>Continue Campaign</span>
        </button>
      </div>
    </div>
  );
}
