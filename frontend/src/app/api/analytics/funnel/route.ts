import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FunnelResponse {
  premium_block_view: number;
  upgrade_click: number;
  upgrade_page_view: number;
  upgrade_success: number;
  ctr: number;
  conversion_rate: number;
  pass_probability: number;
}

interface FunnelLeak {
  block_to_click_drop_rate: number;
  click_to_success_drop_rate: number;
  worst_stage: "block_to_click" | "click_to_success" | null;
}

interface FunnelRecommendation {
  severity: "low" | "medium" | "high";
  message: string;
}

interface FunnelTrend {
  direction: "improving" | "declining" | "stable";
  strength: number;
}

interface FunnelAnomaly {
  detected: boolean;
  severity: "moderate" | "critical" | null;
}

interface FunnelDeltaValue {
  absolute: number;
  relative: number;
}

interface FunnelComparisonDelta {
  premium_block_view: FunnelDeltaValue;
  upgrade_click: FunnelDeltaValue;
  upgrade_success: FunnelDeltaValue;
  ctr: FunnelDeltaValue;
  conversion_rate: FunnelDeltaValue;
}

interface FunnelComparison {
  previous: FunnelResponse;
  delta: FunnelComparisonDelta;
}

type FunnelApiResponse = FunnelResponse & {
  comparison?: FunnelComparison;
  leak?: FunnelLeak;
  recommendation?: FunnelRecommendation;
  trend?: FunnelTrend;
  anomaly?: FunnelAnomaly;
};

interface ResolvedUser {
  id: string;
  isAdmin: boolean;
}

const EVENT_NAMES = [
  "premium_block_view",
  "upgrade_click",
  "upgrade_page_view",
  "upgrade_success",
  "upgrade_failed",
] as const;

type TrackedEventName = (typeof EVENT_NAMES)[number];
type PeriodValue = "today" | "yesterday" | "7d" | "30d";

const EMPTY_RESPONSE: FunnelResponse = {
  premium_block_view: 0,
  upgrade_click: 0,
  upgrade_page_view: 0,
  upgrade_success: 0,
  ctr: 0,
  conversion_rate: 0,
  pass_probability: 0,
};

const globalForPool = globalThis as typeof globalThis & {
  analyticsPool?: Pool;
};

const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T/;
const SUPPORTED_PERIODS: readonly PeriodValue[] = [
  "today",
  "yesterday",
  "7d",
  "30d",
];

function toPgConnectionString(rawConnectionString: string): string {
  return rawConnectionString
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace("postgres+asyncpg://", "postgres://");
}

function getDatabaseUrl(): string {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!dbUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return toPgConnectionString(dbUrl);
}

function shouldUseSsl(connectionString: string): boolean {
  const sslEnv = process.env.DATABASE_SSL ?? process.env.PGSSLMODE;
  if (typeof sslEnv === "string") {
    const normalized = sslEnv.trim().toLowerCase();
    if (["disable", "false", "0", "off"].includes(normalized)) {
      return false;
    }
    if (["require", "true", "1", "on"].includes(normalized)) {
      return true;
    }
  }

  try {
    const { hostname } = new URL(connectionString);
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    return !localHosts.has(hostname);
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

function getPool(): Pool {
  if (!globalForPool.analyticsPool) {
    const connectionString = getDatabaseUrl();
    const useSsl = shouldUseSsl(connectionString);
    globalForPool.analyticsPool = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });
  }

  return globalForPool.analyticsPool;
}

function getApiBaseUrl(): string {
  const rawBaseUrl = process.env.API_URL;
  if (!rawBaseUrl) {
    throw new Error("API_URL is not defined");
  }
  return rawBaseUrl.trim().replace(/\/+$/, "");
}

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
  }

  const cookieToken = request.cookies.get("access_token")?.value;
  return cookieToken && cookieToken.length > 0 ? cookieToken : null;
}

async function resolveUser(token: string): Promise<ResolvedUser | null> {
  const apiBaseUrl = getApiBaseUrl();
  const userResponse = await fetch(`${apiBaseUrl}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!userResponse.ok) {
    return null;
  }

  const payload = (await userResponse.json()) as {
    id?: unknown;
    is_admin?: unknown;
  };

  if (typeof payload.id !== "string" || payload.id.length === 0) {
    return null;
  }

  return {
    id: payload.id,
    isAdmin: payload.is_admin === true,
  };
}

function safeRate(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(6));
}

function toTrackedEventName(value: string): TrackedEventName | null {
  return (EVENT_NAMES as readonly string[]).includes(value)
    ? (value as TrackedEventName)
    : null;
}

function getEmptyCounts(): Record<TrackedEventName, number> {
  return {
    premium_block_view: 0,
    upgrade_click: 0,
    upgrade_page_view: 0,
    upgrade_success: 0,
    upgrade_failed: 0,
  };
}

function toFunnelResponse(counts: Record<TrackedEventName, number>): FunnelResponse {
  const premiumBlockView = counts.premium_block_view;
  const upgradeClick = counts.upgrade_click;
  const upgradePageView = counts.upgrade_page_view;
  const upgradeSuccess = counts.upgrade_success;

  return {
    premium_block_view: premiumBlockView,
    upgrade_click: upgradeClick,
    upgrade_page_view: upgradePageView,
    upgrade_success: upgradeSuccess,
    ctr: safeRate(upgradeClick, premiumBlockView),
    conversion_rate: safeRate(upgradeSuccess, premiumBlockView),
    pass_probability: 0,
  };
}

async function resolvePassProbability(token: string): Promise<number> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/analytics/me/dashboard`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      return 0;
    }
    const payload = (await response.json()) as {
      overview?: {
        pass_probability_final?: unknown;
        pass_probability?: unknown;
      };
    };
    const rawValue = payload.overview?.pass_probability_final ?? payload.overview?.pass_probability;
    const numeric = typeof rawValue === "number" ? rawValue : Number(rawValue);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    // backend dashboard keeps this value in 0..100; funnel exposes normalized 0..1
    const normalized = numeric > 1 ? numeric / 100 : numeric;
    return Number(Math.max(0, Math.min(1, normalized)).toFixed(4));
  } catch {
    return 0;
  }
}

function safeDelta(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return 0;
  }

  return Number((current - previous).toFixed(6));
}

function safeRelativeDelta(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return 0;
  }

  if (previous === 0) {
    return current > 0 ? 1 : 0;
  }

  const relative = (current - previous) / previous;
  if (!Number.isFinite(relative)) {
    return 0;
  }

  return Number(relative.toFixed(6));
}

function buildDeltaValue(current: number, previous: number): FunnelDeltaValue {
  return {
    absolute: safeDelta(current, previous),
    relative: safeRelativeDelta(current, previous),
  };
}

function safeDropRate(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }

  const value = 1 - numerator / denominator;
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(6));
}

function getFunnelLeak(response: FunnelResponse): FunnelLeak {
  const blockToClickDropRate = safeDropRate(
    response.upgrade_click,
    response.premium_block_view
  );
  const clickToSuccessDropRate = safeDropRate(
    response.upgrade_success,
    response.upgrade_click
  );

  const worstStage =
    blockToClickDropRate === 0 && clickToSuccessDropRate === 0
      ? null
      : blockToClickDropRate >= clickToSuccessDropRate
      ? "block_to_click"
      : "click_to_success";

  return {
    block_to_click_drop_rate: blockToClickDropRate,
    click_to_success_drop_rate: clickToSuccessDropRate,
    worst_stage: worstStage,
  };
}

function getFunnelRecommendation(leak: FunnelLeak): FunnelRecommendation {
  const clickToSuccessDropRate = Number.isFinite(leak.click_to_success_drop_rate)
    ? leak.click_to_success_drop_rate
    : 0;
  const blockToClickDropRate = Number.isFinite(leak.block_to_click_drop_rate)
    ? leak.block_to_click_drop_rate
    : 0;

  if (clickToSuccessDropRate > 0.6) {
    return {
      severity: "high",
      message:
        "Severe drop between upgrade clicks and success. Review payment flow.",
    };
  }

  if (blockToClickDropRate > 0.5) {
    return {
      severity: "medium",
      message:
        "High drop between premium exposure and upgrade clicks. Review CTA or copy.",
    };
  }

  return {
    severity: "low",
    message: "Funnel performing within normal range.",
  };
}

function getFunnelTrend(relative: number): FunnelTrend {
  const safeRelative = Number.isFinite(relative) ? relative : 0;
  const normalizedStrength = Math.max(0, Math.min(1, Math.abs(safeRelative)));

  if (safeRelative > 0.15) {
    return {
      direction: "improving",
      strength: Number(normalizedStrength.toFixed(6)),
    };
  }

  if (safeRelative < -0.15) {
    return {
      direction: "declining",
      strength: Number(normalizedStrength.toFixed(6)),
    };
  }

  return {
    direction: "stable",
    strength: Number(normalizedStrength.toFixed(6)),
  };
}

function getFunnelAnomaly(relative: number): FunnelAnomaly {
  const safeRelative = Number.isFinite(relative) ? relative : 0;
  const magnitude = Math.abs(safeRelative);

  if (magnitude > 0.4) {
    return {
      detected: true,
      severity: "critical",
    };
  }

  if (magnitude > 0.25) {
    return {
      detected: true,
      severity: "moderate",
    };
  }

  return {
    detected: false,
    severity: null,
  };
}

function parseIsoDateParam(
  rawValue: string | null,
  boundary: "start" | "end"
): Date | null {
  if (rawValue === null) {
    return null;
  }

  const value = rawValue.trim();
  if (value.length === 0) {
    return null;
  }

  if (ISO_DATE_ONLY_REGEX.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    if (boundary === "end") {
      date.setUTCHours(23, 59, 59, 999);
    }

    return date;
  }

  if (!ISO_DATE_TIME_REGEX.test(value)) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  );
}

function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
  );
}

function getPeriodRange(period: PeriodValue): { from: Date; to: Date } {
  const now = new Date();

  if (period === "today") {
    return {
      from: startOfUtcDay(now),
      to: endOfUtcDay(now),
    };
  }

  if (period === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return {
      from: startOfUtcDay(yesterday),
      to: endOfUtcDay(yesterday),
    };
  }

  if (period === "7d") {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 6);
    return {
      from: startOfUtcDay(start),
      to: endOfUtcDay(now),
    };
  }

  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 29);
  return {
    from: startOfUtcDay(start),
    to: endOfUtcDay(now),
  };
}

function getPreviousEquivalentRange(currentFrom: Date, currentTo: Date): {
  from: Date;
  to: Date;
} {
  const durationMs = currentTo.getTime() - currentFrom.getTime();
  const previousTo = new Date(currentFrom.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - durationMs);

  return {
    from: previousFrom,
    to: previousTo,
  };
}

async function queryEventCounts(
  pool: Pool,
  from: Date | null,
  to: Date | null
): Promise<Record<TrackedEventName, number>> {
  const queryParams: unknown[] = [EVENT_NAMES];
  const filters = ["event_name = ANY($1::text[])"];
  let parameterIndex = 2;

  if (from) {
    queryParams.push(from.toISOString());
    filters.push(`created_at >= $${parameterIndex}::timestamptz`);
    parameterIndex += 1;
  }

  if (to) {
    queryParams.push(to.toISOString());
    filters.push(`created_at <= $${parameterIndex}::timestamptz`);
    parameterIndex += 1;
  }

  const result = await pool.query<{
    event_name: string;
    count: number | string;
  }>(
    `
      SELECT event_name, COUNT(*)::int AS count
      FROM analytics_events
      WHERE ${filters.join(" AND ")}
      GROUP BY event_name
    `,
    queryParams
  );

  const counts = getEmptyCounts();

  for (const row of result.rows) {
    const eventName = toTrackedEventName(row.event_name);
    if (!eventName) {
      continue;
    }

    const value = Number(row.count);
    counts[eventName] = Number.isFinite(value) ? value : 0;
  }

  return counts;
}

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.isAdmin) {
      const limited: FunnelApiResponse = {
        ...EMPTY_RESPONSE,
        pass_probability: await resolvePassProbability(token),
      };
      limited.leak = getFunnelLeak(limited);
      limited.recommendation = getFunnelRecommendation(limited.leak);
      return NextResponse.json(limited, { status: 200 });
    }

    let from: Date | null = null;
    let to: Date | null = null;
    let normalizedPeriod: PeriodValue | null = null;

    const periodRaw = request.nextUrl.searchParams.get("period");
    if (periodRaw !== null) {
      const parsedPeriod = periodRaw.trim().toLowerCase();
      if (!SUPPORTED_PERIODS.includes(parsedPeriod as PeriodValue)) {
        return NextResponse.json(
          {
            error:
              "Invalid 'period'. Supported values: today, yesterday, 7d, 30d.",
          },
          { status: 400 }
        );
      }

      normalizedPeriod = parsedPeriod as PeriodValue;
      const range = getPeriodRange(normalizedPeriod);
      from = range.from;
      to = range.to;
    } else {
      const fromRaw = request.nextUrl.searchParams.get("from");
      const toRaw = request.nextUrl.searchParams.get("to");

      from = parseIsoDateParam(fromRaw, "start");
      if (fromRaw !== null && !from) {
        return NextResponse.json(
          { error: "Invalid 'from' date format. Use ISO date or ISO datetime." },
          { status: 400 }
        );
      }

      to = parseIsoDateParam(toRaw, "end");
      if (toRaw !== null && !to) {
        return NextResponse.json(
          { error: "Invalid 'to' date format. Use ISO date or ISO datetime." },
          { status: 400 }
        );
      }

      if (from && to && from.getTime() > to.getTime()) {
        return NextResponse.json(
          { error: "'from' must be less than or equal to 'to'." },
          { status: 400 }
        );
      }
    }

    const pool = getPool();

    const currentCounts = await queryEventCounts(pool, from, to);
    const response: FunnelApiResponse = toFunnelResponse(currentCounts);
    response.pass_probability = await resolvePassProbability(token);
    response.leak = getFunnelLeak(response);
    response.recommendation = getFunnelRecommendation(response.leak);

    if (normalizedPeriod === "7d" && from && to) {
      const previousRange = getPreviousEquivalentRange(from, to);
      const previousCounts = await queryEventCounts(
        pool,
        previousRange.from,
        previousRange.to
      );
      const previous = toFunnelResponse(previousCounts);

      response.comparison = {
        previous,
        delta: {
          premium_block_view: buildDeltaValue(
            response.premium_block_view,
            previous.premium_block_view
          ),
          upgrade_click: buildDeltaValue(
            response.upgrade_click,
            previous.upgrade_click
          ),
          upgrade_success: buildDeltaValue(
            response.upgrade_success,
            previous.upgrade_success
          ),
          ctr: buildDeltaValue(response.ctr, previous.ctr),
          conversion_rate: buildDeltaValue(
            response.conversion_rate,
            previous.conversion_rate
          ),
        },
      };

      response.trend = getFunnelTrend(
        response.comparison.delta.conversion_rate.relative
      );
      response.anomaly = getFunnelAnomaly(
        response.comparison.delta.conversion_rate.relative
      );
    }

    return NextResponse.json(response, { status: 200 });
  } catch {
    return NextResponse.json(EMPTY_RESPONSE, { status: 500 });
  }
}
