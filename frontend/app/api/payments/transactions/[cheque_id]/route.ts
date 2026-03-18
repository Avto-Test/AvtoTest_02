import { NextRequest } from "next/server";

import { proxyAuthedPaymentRequest } from "@/app/api/payments/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cheque_id: string }> },
) {
  const { cheque_id } = await context.params;
  const normalizedChequeId = cheque_id.trim();

  if (!normalizedChequeId) {
    return Response.json(
      { detail: "cheque_id is required." },
      { status: 422 },
    );
  }

  return proxyAuthedPaymentRequest(
    request,
    `/api/payments/transactions/${encodeURIComponent(normalizedChequeId)}`,
    {
      method: "GET",
    },
  );
}
