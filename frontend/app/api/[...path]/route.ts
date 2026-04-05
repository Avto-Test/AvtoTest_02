import { NextRequest } from "next/server";

import { proxyBackendRequest } from "@/app/api/_proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveBackendPath(pathSegments: string[] | undefined) {
  const joined = (pathSegments ?? []).map((segment) => encodeURIComponent(segment)).join("/");
  return `/${joined}`;
}

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function forwardRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyBackendRequest(request, resolveBackendPath(path), { requireAuth: false });
}

export function GET(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}

export function POST(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}

export function PUT(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}

export function HEAD(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}
