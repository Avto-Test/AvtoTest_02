'use client';
/* eslint-disable react/no-unescaped-entities */

import { CheckCircle2, CircleAlert } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { BuilderCompletion } from '@/lib/instructorProfileBuilder';

type CompletionChecklistProps = {
  completion: BuilderCompletion;
};

export function CompletionChecklist({ completion }: CompletionChecklistProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-100">Profil to'liqligi</p>
        <span className="text-sm font-bold text-cyan-300">{completion.percent}%</span>
      </div>
      <Progress className="mt-3 h-2.5 bg-slate-800" value={completion.percent} />
      <div className="mt-4 space-y-2">
        {completion.items.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-md border border-white/5 bg-slate-950/80 px-3 py-2">
            <span className="text-xs text-slate-200">{item.label}</span>
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <CircleAlert className="h-4 w-4 text-amber-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}



