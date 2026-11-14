import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth/config";

/**
 * Schneller Vorfilter: Ohne Session-Cookie geht es direkt zum Login.
 * Die eigentliche Prüfung gegen die Datenbank passiert serverseitig in
 * requireMember() (Middleware läuft im Edge-Runtime ohne MySQL-Treiber).
 */
const PUBLIC_PATHS = ["/login", "/api/health"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (request.cookies.has(authConfig.cookieName)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Statische Dateien und Next-Interna auslassen.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
