"use client";

import { CheckCircle2, Clock3, XCircle } from "lucide-react";

import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import type { SimulationHistoryItem } from "@/types/simulation";

type SimulationHistoryProps = {
  items: SimulationHistoryItem[];
  questionCount: number;
};

function formatSimulationDate(value: string) {
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function SimulationHistory({ items, questionCount }: SimulationHistoryProps) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-0 flex-col rounded-[14px] border border-white/4 bg-[rgba(20,20,20,0.6)] p-3 backdrop-blur-[10px]">
        <h3 className="text-[15px] font-semibold leading-[1.3] text-white">So&apos;nggi imtihonlar</h3>
        <p className="mt-1 text-[13px] leading-[1.3] text-white/55">Oxirgi 3 ta simulyatsiya natijasi.</p>
        <div className="mt-4 flex flex-1 items-center">
          <div className="flex min-h-[13rem] w-full flex-col items-center justify-center rounded-[14px] border border-dashed border-white/10 bg-black/10 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10">
              <Clock3 className="h-5 w-5 text-emerald-300" />
            </div>
            <p className="mt-5 text-[15px] font-medium leading-[1.3] text-white">Siz hali simulyatsiya ishlamadingiz</p>
            <p className="mt-2 max-w-[18rem] text-[13px] leading-[1.3] text-white/45">
              1 marta sinab ko&apos;ring, natijalar shu yerda chiqadi.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col rounded-[14px] border border-white/4 bg-[rgba(20,20,20,0.6)] p-3 backdrop-blur-[10px]">
      <h3 className="text-[15px] font-semibold leading-[1.3] text-white">So&apos;nggi imtihonlar</h3>
      <p className="mt-1 text-[13px] leading-[1.3] text-white/55">Oxirgi 3 ta simulyatsiya natijasi.</p>
      <div className="mt-3 space-y-2 overflow-y-auto pr-1">
        {items.map((entry) => {
          const correctCount = Math.max(0, questionCount - entry.mistakes);
          return (
            <div
              key={entry.attempt_id}
              className="rounded-[14px] border border-white/5 bg-[rgba(18,18,18,0.78)] p-[10px] transition-colors duration-200 hover:bg-[rgba(22,22,22,0.82)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-bold leading-[1.3] text-white">{correctCount} / {questionCount}</p>
                    <Badge variant={entry.passed ? "success" : "warning"}>
                      {entry.passed ? "O'tdi" : "O'tmadi"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-white/52">{formatSimulationDate(entry.date)}</p>
                  <p className="text-[11px] text-white/34">{formatRelativeTime(entry.date)}</p>
                </div>
                <div
                  className={`rounded-full p-2.5 ${entry.passed ? "bg-emerald-500/12 text-emerald-300" : "bg-amber-500/12 text-amber-300"}`}
                >
                  {entry.passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-[12px] bg-black/15 px-3 py-2">
                  <p className="text-[11px] text-white/42">Natija</p>
                  <p className="text-[13px] font-semibold leading-[1.3] text-white">{Math.round(entry.score)}%</p>
                </div>
                <div className="rounded-[12px] bg-black/15 px-3 py-2">
                  <p className="text-[11px] text-white/42">Xato</p>
                  <p className="text-[13px] font-semibold leading-[1.3] text-white">{entry.mistakes} ta</p>
                </div>
                <div className="rounded-[12px] bg-black/15 px-3 py-2">
                  <p className="text-[11px] text-white/42">Holat</p>
                  <div className="flex items-center gap-2 text-[13px] font-semibold leading-[1.3] text-white">
                    <Clock3 className="h-4 w-4 text-white/40" />
                    {entry.passed ? "Muvaffaqiyatli" : "Qayta urinish"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
