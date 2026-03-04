"use client";

import { memo, useMemo } from "react";

type Props = {
  passProbability: number;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function readiness(value: number) {
  if (value < 50) {
    return {
      label: "Boshlovchi",
      tone: "border-amber-300/35 bg-amber-500/15 text-amber-200",
      text: "Yaxshi boshlanish. Davom eting.",
      ring: "#F59E0B",
    };
  }
  if (value < 75) {
    return {
      label: "O'rtacha tayyorgarlik",
      tone: "border-cyan-300/35 bg-cyan-500/15 text-cyan-200",
      text: "Barqaror rivojlanish kuzatilmoqda.",
      ring: "#22D3EE",
    };
  }
  if (value < 90) {
    return {
      label: "Yuqori tayyorgarlik",
      tone: "border-indigo-300/35 bg-indigo-500/15 text-indigo-200",
      text: "Siz imtihonga yaqinlashyapsiz.",
      ring: "#818CF8",
    };
  }
  return {
    label: "Imtihonga tayyor",
    tone: "border-emerald-300/35 bg-emerald-500/15 text-emerald-200",
    text: "Siz deyarli tayyorsiz.",
    ring: "#10B981",
  };
}

function PassProbabilityGaugeComponent({ passProbability }: Props) {
  const value = clamp(passProbability);
  const info = useMemo(() => readiness(value), [value]);
  const ringProgress = `${(value / 100) * 360}deg`;

  return (
    <section className="rounded-3xl border border-[#1F2A44] bg-gradient-to-b from-[#121c30] to-[#0b1324] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
      <div className="mx-auto flex max-w-[320px] flex-col items-center">
        <div
          className="relative h-56 w-56 rounded-full p-[14px]"
          style={{
            background: `conic-gradient(${info.ring} ${ringProgress}, rgba(51,65,85,0.35) ${ringProgress}, rgba(51,65,85,0.35) 360deg)`,
            transition: "background 450ms ease",
          }}
        >
          <div className="relative flex h-full w-full flex-col items-center justify-center rounded-full border border-[#253451] bg-[#0b1324] text-center">
            <p className="text-[44px] font-bold leading-none tracking-tight text-white">{Math.round(value)}%</p>
            <p className="mt-1 text-xs text-slate-300">Imtihondan o'tish ehtimoli</p>
            <span className={`mt-3 rounded-full border px-3 py-1 text-[11px] font-semibold ${info.tone}`}>{info.label}</span>
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-slate-300">{info.text}</p>
      </div>
    </section>
  );
}

export default memo(PassProbabilityGaugeComponent);

