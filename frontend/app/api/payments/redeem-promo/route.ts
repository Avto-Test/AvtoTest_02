import { NextRequest } from "next/server";

import { proxyAuthedPaymentRequest } from "@/app/api/payments/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return proxyAuthedPaymentRequest(request, "/api/payments/redeem-promo", {
    method: "POST",
  });
}
