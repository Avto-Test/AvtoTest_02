"use client";

import { CheckCircle2, Clock3, XCircle } from "lucide-react";

import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import type { SimulationHistoryItem } from "@/types/simulation";

type ExtendedSimulationHistoryItem = SimulationHistoryItem & {
  question_count?: number;
  disqualified?: boolean;
  disqualification_reason?: string | null;
  violation_count?: number;
};

type SimulationHistoryProps = {
  items: ExtendedSimulationHistoryItem[];
  questionCount: number;
};

function humanizeViolationEvent(eventType?: string | null) {
  return {
    screenshot_attempt: "screenshot urinish",
    page_leave_attempt: "sahifani tark etish urinish",
    navigation_blocked: "boshqa sahifaga o'tish urinish",
    devtools_blocked: "developer tools ochish urinish",
    devtools_detected: "developer tools ochilgani",
    copy_blocked: "nusxa olish urinish",
    clipboard_shortcut_blocked: "clipboard shortcut urinish",
    selection_blocked: "matnni belgilash urinish",
    context_menu_blocked: "context menu urinish",
    drag_blocked: "drag urinish",
    cut_blocked: "kesib olish urinish",
    paste_blocked: "joylashtirish urinish",
  }[eventType ?? ""] ?? "qoidabuzarlik";
}

function humanizeFailureReason(reason?: string | null) {
  if (!reason) {
    return null;
  }

  if (reason.startsWith("violation_limit_reached")) {
    const [, rawEvent = ""] = reason.split(":", 2);
    return `Qoidabuzarlik limiti to'ldi (${humanizeViolationEvent(rawEvent)})`;
  }

  if (reason === "mistake_limit_reached") {
    return "Xato limiti to'ldi";
  }

  return reason;
}

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
      <div className="flex min-h-0 flex-col rounded-[14px] border border-[color-mix(in_oklab,var(--border)_76%,transparent)] bg-[color-mix(in_oklab,var(--card)_72%,transparent)] p-3 shadow-[0_20px_42px_-32px_rgba(15,23,42,0.18)] backdrop-blur-[12px]">
        <h3 className="text-[15px] font-semibold leading-[1.3] text-[var(--text-primary)]">So&apos;nggi imtihonlar</h3>
        <p className="mt-1 text-[13px] leading-[1.3] text-[var(--text-secondary)]">Oxirgi 3 ta simulyatsiya natijasi.</p>
        <div className="mt-4 flex flex-1 items-center">
          <div className="flex min-h-[13rem] w-full flex-col items-center justify-center rounded-[14px] border border-dashed border-[color-mix(in_oklab,var(--border)_70%,transparent)] bg-[color-mix(in_oklab,var(--card)_74%,transparent)] p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--accent-green)_20%,transparent)] bg-[color-mix(in_oklab,var(--accent-green-soft)_86%,transparent)]">
              <Clock3 className="h-5 w-5 text-[var(--accent-green)]" />
            </div>
            <p className="mt-5 text-[15px] font-medium leading-[1.3] text-[var(--text-primary)]">Siz hali simulyatsiya ishlamadingiz</p>
            <p className="mt-2 max-w-[18rem] text-[13px] leading-[1.3] text-[var(--text-secondary)]">
              1 marta sinab ko&apos;ring, natijalar shu yerda chiqadi.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col rounded-[14px] border border-[color-mix(in_oklab,var(--border)_76%,transparent)] bg-[color-mix(in_oklab,var(--card)_72%,transparent)] p-3 shadow-[0_20px_42px_-32px_rgba(15,23,42,0.18)] backdrop-blur-[12px]">
      <h3 className="text-[15px] font-semibold leading-[1.3] text-[var(--text-primary)]">So&apos;nggi imtihonlar</h3>
      <p className="mt-1 text-[13px] leading-[1.3] text-[var(--text-secondary)]">Oxirgi 3 ta simulyatsiya natijasi.</p>
      <div className="mt-3 space-y-2 overflow-y-auto pr-1">
        {items.map((entry) => {
          const totalQuestions = entry.question_count ?? questionCount;
          const correctCount = Math.max(0, totalQuestions - entry.mistakes);
          const failureReason = humanizeFailureReason(entry.disqualification_reason);
          return (
            <div
              key={entry.attempt_id}
              className="rounded-[14px] border border-[color-mix(in_oklab,var(--border)_72%,transparent)] bg-[color-mix(in_oklab,var(--card)_84%,transparent)] p-[10px] transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--card)_92%,var(--accent-brand)_4%)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-bold leading-[1.3] text-[var(--text-primary)]">{correctCount} / {totalQuestions}</p>
                    <Badge variant={entry.passed ? "success" : "warning"}>
                      {entry.passed ? "O'tdi" : "O'tmadi"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{formatSimulationDate(entry.date)}</p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">{formatRelativeTime(entry.date)}</p>
                </div>
                <div
                  className={`rounded-full p-2.5 ${entry.passed ? "bg-[color-mix(in_oklab,var(--accent-green-soft)_86%,transparent)] text-[var(--accent-green)]" : "bg-amber-500/12 text-amber-300"}`}
                >
                  {entry.passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-[12px] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] px-3 py-2">
                  <p className="text-[11px] text-[var(--text-tertiary)]">Natija</p>
                  <p className="text-[13px] font-semibold leading-[1.3] text-[var(--text-primary)]">{Math.round(entry.score)}%</p>
                </div>
                <div className="rounded-[12px] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] px-3 py-2">
                  <p className="text-[11px] text-[var(--text-tertiary)]">Xato</p>
                  <p className="text-[13px] font-semibold leading-[1.3] text-[var(--text-primary)]">{entry.mistakes} ta</p>
                </div>
                <div className="rounded-[12px] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] px-3 py-2">
                  <p className="text-[11px] text-[var(--text-tertiary)]">Holat</p>
                  <div className="flex items-center gap-2 text-[13px] font-semibold leading-[1.3] text-[var(--text-primary)]">
                    <Clock3 className="h-4 w-4 text-[var(--text-tertiary)]" />
                    {entry.passed ? "Muvaffaqiyatli" : entry.disqualified ? "Yiqildi" : "Qayta urinish"}
                  </div>
                </div>
              </div>
              {!entry.passed && (failureReason || entry.violation_count) ? (
                <div className="mt-3 rounded-[12px] border border-[color-mix(in_oklab,var(--border)_68%,transparent)] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] px-3 py-2">
                  <p className="text-[11px] text-[var(--text-tertiary)]">Sabab</p>
                  <p className="mt-1 text-[12px] font-medium leading-[1.35] text-[var(--text-primary)]">
                    {failureReason ?? "Imtihon muvaffaqiyatsiz yakunlandi."}
                  </p>
                  {entry.violation_count ? (
                    <p className="mt-1 text-[11px] leading-[1.35] text-[var(--text-secondary)]">
                      Qoidabuzarliklar: {entry.violation_count} ta
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
