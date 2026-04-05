import type { NextRequest } from "next/server";

import { proxyBackendRequest } from "@/app/api/_proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return proxyBackendRequest(request, "/notifications/read-all");
}
