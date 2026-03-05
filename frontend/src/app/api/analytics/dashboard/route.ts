import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildFallbackDashboardPayload() {
  return {
    overview: {
      total_attempts: 0,
      average_score: 0,
      best_score: 0,
      readiness_score: 0,
      pass_probability: 0,
      pass_probability_final: 0,
      current_training_level: "beginner",
      cognitive_stability: "n/a",
      improvement_delta: 0,
      improvement_direction: "stable",
    },
    recommendation: null,
    recent_scores: [],
    topic_breakdown: [],
    category_performance: [],
    difficulty_progression: [],
    weak_topics: [],
    progress_trend: [],
    question_bank_mastery: {
      total_questions: 0,
      seen_questions: 0,
      correct_questions: 0,
      mastered_questions: 0,
      needs_review_questions: 0,
    },
    pass_probability_breakdown: {
      explanation:
        "To'liq analitika vaqtincha yuklanmadi. Ma'lumotlar avtomatik tiklanadi.",
      factors: [],
    },
    _fallback: true,
  };
}

function getApiBaseUrl(): string {
  const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return rawBaseUrl.trim().replace(/\/+$/, "");
}

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token.length > 0) return token;
  }
  const cookieToken = request.cookies.get("access_token")?.value;
  return cookieToken && cookieToken.length > 0 ? cookieToken : null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/analytics/me/dashboard`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();
    let payload: unknown = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { detail: text || "Invalid JSON response from backend" };
    }

    if (response.ok) {
      return NextResponse.json(payload, { status: response.status });
    }

    // Production guard: if dashboard endpoint fails with server error,
    // degrade gracefully using summary endpoint instead of bubbling 500.
    if (response.status >= 500) {
      try {
        const summaryResponse = await fetch(`${apiBaseUrl}/analytics/me/summary`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (summaryResponse.ok) {
          const summaryPayload = (await summaryResponse.json()) as {
            total_attempts?: number;
            average_score?: number;
          };

          const fallbackPayload = buildFallbackDashboardPayload();
          fallbackPayload.overview.total_attempts = Number(summaryPayload.total_attempts ?? 0);
          fallbackPayload.overview.average_score = Number(summaryPayload.average_score ?? 0);
          return NextResponse.json(fallbackPayload, {
            status: 200,
            headers: { "x-dashboard-fallback": "summary" },
          });
        }
      } catch {
        // keep original backend error payload below
      }

      // Even if summary fallback also fails, keep frontend stable with
      // a safe 200 response to avoid hard dashboard crash loops.
      return NextResponse.json(buildFallbackDashboardPayload(), {
        status: 200,
        headers: { "x-dashboard-fallback": "safe-default" },
      });
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(buildFallbackDashboardPayload(), {
      status: 200,
      headers: { "x-dashboard-fallback": "proxy-exception" },
    });
  }
}
