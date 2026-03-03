import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventMetadata = Record<string, unknown>;

interface TrackEventPayload {
  event: string;
  metadata?: EventMetadata;
}

const ALLOWED_EVENTS = new Set([
  "premium_block_view",
  "upgrade_click",
  "upgrade_page_view",
  "upgrade_success",
  "upgrade_failed",
]);

const globalForPool = globalThis as typeof globalThis & {
  analyticsPool?: Pool;
};

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
  const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
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

async function resolveUserId(token: string): Promise<string | null> {
  const apiBaseUrl = getApiBaseUrl();
  const userResponse = await fetch(`${apiBaseUrl}/users/me`, {
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

  const userPayload = (await userResponse.json()) as { id?: unknown };
  if (typeof userPayload.id === "string" && userPayload.id.length > 0) {
    return userPayload.id;
  }
  return null;
}

function parseBody(payload: unknown): TrackEventPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const event = (payload as { event?: unknown }).event;
  const metadata = (payload as { metadata?: unknown }).metadata;

  if (typeof event !== "string") {
    return null;
  }

  const normalizedEvent = event.trim();
  if (!normalizedEvent || !ALLOWED_EVENTS.has(normalizedEvent)) {
    return null;
  }

  if (
    metadata !== undefined &&
    (typeof metadata !== "object" || metadata === null || Array.isArray(metadata))
  ) {
    return null;
  }

  return {
    event: normalizedEvent,
    metadata: (metadata as EventMetadata | undefined) ?? {},
  };
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const userId = await resolveUserId(token);
    if (!userId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsedBody = parseBody(rawBody);

    if (!parsedBody) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const pool = getPool();

    await pool.query(
      `
        INSERT INTO analytics_events (id, user_id, event_name, metadata, created_at)
        VALUES ($1, $2, $3, $4::jsonb, NOW())
      `,
      [
        randomUUID(),
        userId,
        parsedBody.event,
        JSON.stringify(parsedBody.metadata ?? {}),
      ]
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    return NextResponse.json({ success: false }, { status: 500 });
  }
}
