import type { NextRequest } from "next/server";

import { proxyBackendRequest } from "@/app/api/_proxy";

export async function POST(request: NextRequest) {
  return proxyBackendRequest(request, "/simulation/start");
}
