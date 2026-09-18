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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!AUTH_ROUTES.includes(pathname)) return NextResponse.next();
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();
  if (!request.cookies.has(REFRESH_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/home";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/", "/auth/login", "/auth/register"],
};
