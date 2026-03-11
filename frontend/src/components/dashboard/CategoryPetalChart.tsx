"use client";

import { memo, useMemo } from "react";
import type { CategoryMetric } from "@/analytics/types";

type Props = {
  data: CategoryMetric[];
};

type PetalPoint = {
  category: string;
  accuracy: number;
  angle: number;
  path: string;
  labelX: number;
  labelY: number;
  weak: boolean;
  id: string;
};

const CENTER = 210;
const BASE_INNER_RADIUS = 58;
const BASE_OUTER_RADIUS = 145;
const LABEL_RADIUS = 185;
const PETAL_WIDTH = Math.PI / 8.8;

function toRadians(index: number, total: number): number {
  return (index / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
}

function toPoint(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function makePetalPath(angle: number, accuracy: number): string {
  const valueRatio = Math.max(0.12, Math.min(1, accuracy / 100));
  const outerRadius = BASE_INNER_RADIUS + BASE_OUTER_RADIUS * valueRatio;
  const tip = toPoint(CENTER, CENTER, outerRadius, angle);
  const leftControl = toPoint(CENTER, CENTER, outerRadius * 0.58, angle - PETAL_WIDTH * 0.55);
  const rightControl = toPoint(CENTER, CENTER, outerRadius * 0.58, angle + PETAL_WIDTH * 0.55);

  return `M ${CENTER} ${CENTER} Q ${leftControl.x} ${leftControl.y} ${tip.x} ${tip.y} Q ${rightControl.x} ${rightControl.y} ${CENTER} ${CENTER} Z`;
}

function formatCategoryName(category: string): string {
  if (category.length <= 22) return category;
  return `${category.slice(0, 22)}...`;
}

function CategoryPetalChartComponent({ data }: Props) {
  const normalized = useMemo(() => {
    if (!data.length) return [] as PetalPoint[];
    return data.slice(0, 6).map((item, index, array) => {
      const angle = toRadians(index, array.length);
      const labelPoint = toPoint(CENTER, CENTER, LABEL_RADIUS, angle);
      const weak = item.accuracy < 60;
      return {
        category: formatCategoryName(item.category),
        accuracy: Math.max(0, Math.min(100, item.accuracy)),
        angle,
        path: makePetalPath(angle, item.accuracy),
        labelX: labelPoint.x,
        labelY: labelPoint.y,
        weak,
        id: `petal-${index}`,
      };
    });
  }, [data]);

  const average = useMemo(() => {
    if (!normalized.length) return 0;
    const total = normalized.reduce((sum, item) => sum + item.accuracy, 0);
    return Math.round(total / normalized.length);
  }, [normalized]);

  const weakest = useMemo(() => {
    if (!normalized.length) return null;
    return normalized.reduce((acc, item) => (item.accuracy < acc.accuracy ? item : acc), normalized[0]);
  }, [normalized]);

  if (!normalized.length) {
    return (
      <section className="h-full rounded-3xl border border-[#1F2A44] bg-[#0B1324] p-6">
        <h3 className="text-lg font-semibold text-white">{"Kategoriyalar bo'yicha bilim darajasi"}</h3>
        <p className="mt-2 text-sm text-slate-300">{"Kategoriya tahlili uchun kamida bir nechta test natijasi kerak."}</p>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-3xl border border-[#1F2A44] bg-gradient-to-b from-[#101a2e] to-[#0b1324] p-5 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-white">{"Kategoriyalar bo'yicha bilim darajasi"}</h3>
          <p className="text-sm text-slate-300">{"Qaysi mavzularda kuchli yoki zaif ekaningiz"}</p>
        </div>
        {weakest ? (
          <span className="rounded-full border border-amber-300/35 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
            Zaif: {weakest.category} ({Math.round(weakest.accuracy)}%)
          </span>
        ) : null}
      </div>

      <div className="relative mx-auto h-[360px] w-full max-w-[440px]">
        <svg viewBox="0 0 420 420" className="h-full w-full">
          <defs>
            {normalized.map((item, index) => (
              <linearGradient
                key={item.id}
                id={`${item.id}-gradient`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
                gradientTransform={`rotate(${(item.angle * 180) / Math.PI + 90} 0.5 0.5)`}
              >
                {item.weak ? (
                  <>
                    <stop offset="0%" stopColor="#FB923C" stopOpacity="0.88" />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.52" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor={index % 2 === 0 ? "#22D3EE" : "#818CF8"} stopOpacity="0.88" />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.36" />
                  </>
                )}
              </linearGradient>
            ))}
            <filter id="glow-soft" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx={CENTER} cy={CENTER} r={154} fill="none" stroke="#1f2a44" strokeDasharray="4 8" />
          <circle cx={CENTER} cy={CENTER} r={112} fill="none" stroke="#1f2a44" strokeDasharray="4 8" />
          <circle cx={CENTER} cy={CENTER} r={70} fill="none" stroke="#1f2a44" strokeDasharray="4 8" />

          {normalized.map((item, index) => (
            <g
              key={item.id}
              className={item.accuracy < 50 ? "animate-pulse" : ""}
              style={{
                opacity: 0.96,
                transformOrigin: `${CENTER}px ${CENTER}px`,
                animation: `petal-in .45s ease-out ${index * 0.07}s both`,
              }}
            >
              <path
                d={item.path}
                fill={`url(#${item.id}-gradient)`}
                stroke={item.weak ? "#FB923C" : "#38BDF8"}
                strokeOpacity={item.weak ? 0.55 : 0.32}
                strokeWidth="1.2"
                filter={item.weak ? "url(#glow-soft)" : undefined}
              />
            </g>
          ))}

          <circle cx={CENTER} cy={CENTER} r={58} fill="#0b1324" stroke="#22324e" strokeWidth="1.2" />
          <text x={CENTER} y={CENTER - 8} textAnchor="middle" fill="#94a3b8" fontSize="12">
            {"O'rtacha"}
          </text>
          <text x={CENTER} y={CENTER + 20} textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="700">
            {average}%
          </text>

          {normalized.map((item) => (
            <g key={`${item.id}-label`} transform={`translate(${item.labelX},${item.labelY})`}>
              <text textAnchor="middle" fill="#dbe7ff" fontSize="11" fontWeight="500">
                {item.category}
              </text>
              <text y="14" textAnchor="middle" fill={item.weak ? "#FDBA74" : "#7DD3FC"} fontSize="11" fontWeight="700">
                {Math.round(item.accuracy)}%
              </text>
            </g>
          ))}
        </svg>
      </div>

      <style jsx>{`
        @keyframes petal-in {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 0.96;
            transform: scale(1);
          }
        }
      `}</style>
    </section>
  );
}

export default memo(CategoryPetalChartComponent);

