import { NextResponse, type NextRequest } from "next/server";

/**
 * The rotating refresh token lives in the httpOnly `curio_rt` cookie (path `/`,
 * set through the same-origin `/api` proxy), so the Next server can see it
 * without calling the API. Presence alone is enough to route a signed-in reader
 * away from the marketing landing page and the auth forms — if the token turns
 * out to be stale, `/home` falls back to its own guest state, so there is no
 * redirect loop.
 */
const REFRESH_COOKIE = "curio_rt";
const AUTH_ROUTES = ["/", "/auth/login", "/auth/register"];

const INDEXABLE_PREFIXES = [
  "/",
  "/policy/terms",
  "/policy/privacy",
  "/policy/affiliates",
  "/books/search",
  "/books",
];

function isIndexableRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return INDEXABLE_PREFIXES.some(
    (prefix) => prefix !== "/" && (pathname === prefix || pathname.startsWith(prefix + "/")),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    AUTH_ROUTES.includes(pathname) &&
    (request.method === "GET" || request.method === "HEAD") &&
    request.cookies.has(REFRESH_COOKIE)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();

  // Crawler governance (AGENTS.md §6.2):
  // Non-production deployments or non-indexable routes carry X-Robots-Tag: noindex, nofollow
  const allowIndexing =
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

  if (!allowIndexing || !isIndexableRoute(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
