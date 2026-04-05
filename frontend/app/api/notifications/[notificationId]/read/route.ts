import type { NextRequest } from "next/server";

import { proxyBackendRequest } from "@/app/api/_proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    notificationId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { notificationId } = await context.params;
  return proxyBackendRequest(
    request,
    `/notifications/${encodeURIComponent(notificationId)}/read`,
  );
}
