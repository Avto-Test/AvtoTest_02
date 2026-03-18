import { proxyPublicPaymentRequest } from "@/app/api/payments/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return proxyPublicPaymentRequest("/api/payments/plans");
}
