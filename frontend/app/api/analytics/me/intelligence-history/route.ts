import type { NextRequest } from "next/server";

import { proxyBackendRequest } from "@/app/api/_proxy";

export async function GET(request: NextRequest) {
  return proxyBackendRequest(request, "/analytics/me/intelligence-history");
}
