import { NextRequest, NextResponse } from "next/server";

import { getRequestAuthToken, getServerApiBaseUrl } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const token = getRequestAuthToken(request);
        if (!token) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        let body: { question_count?: number } = { question_count: 20 };
        try {
            const raw = await request.text();
            if (raw) {
                body = JSON.parse(raw) as { question_count?: number };
            }
        } catch {
            // keep default body
        }

        const apiBaseUrl = getServerApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/learning/session`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const text = await response.text();
        let payload: unknown = {};
        try {
            payload = text ? JSON.parse(text) : {};
        } catch {
            payload = { detail: text || "Invalid JSON from backend" };
        }

        return NextResponse.json(payload, { status: response.status });
    } catch (error) {
        console.error("[learning/session] proxy error:", error);
        return NextResponse.json(
            { detail: "Learning session yaratishda xatolik yuz berdi." },
            { status: 500 }
        );
    }
}
