const FAVICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="18" fill="#0f766e"/>
  <path d="M18 18h28v28H18z" fill="#14b8a6" opacity="0.35"/>
  <path d="M23 33.5 29.5 40 42 24" fill="none" stroke="#ecfeff" stroke-linecap="round" stroke-linejoin="round" stroke-width="6"/>
</svg>
`.trim();

export const runtime = "nodejs";

export function GET() {
  return new Response(FAVICON_SVG, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
