import { NextRequest } from "next/server";

import { proxyBackendRequest } from "@/app/api/_proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ featureId: string }> },
) {
  const { featureId } = await context.params;
  const normalizedFeatureId = featureId.trim();

  if (!normalizedFeatureId) {
    return Response.json({ detail: "featureId is required." }, { status: 422 });
  }

  return proxyBackendRequest(request, `/features/${encodeURIComponent(normalizedFeatureId)}`);
}
