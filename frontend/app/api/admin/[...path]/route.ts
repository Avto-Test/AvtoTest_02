import { NextRequest } from "next/server";

import { proxyBackendRequest } from "@/app/api/_proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveBackendPath(pathSegments: string[] | undefined) {
  const joined = (pathSegments ?? []).map((segment) => encodeURIComponent(segment)).join("/");
  return `/admin/${joined}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  return proxyBackendRequest(request, resolveBackendPath(path));
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  return proxyBackendRequest(request, resolveBackendPath(path));
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  return proxyBackendRequest(request, resolveBackendPath(path));
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  return proxyBackendRequest(request, resolveBackendPath(path));
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  return proxyBackendRequest(request, resolveBackendPath(path));
}
