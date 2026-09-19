import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/signin",
  "/sign-in",
  "/signing",
  "/forgot-password",
  "/reset-password",
  "/verify-account",
  "/account-locked",
  "/unauthorized",
  "/session-expired",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("psm_session")?.value;

  // Normalize common auth URL aliases
  if (pathname === "/signing" || pathname === "/signin" || pathname === "/sign-in") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname === "/sign-up" || pathname === "/register") {
    return NextResponse.redirect(new URL("/signup", request.url));
  }

  const isPublic =
    pathname === "/" ||
    PUBLIC_PATHS.some((p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`))) ||
    pathname.startsWith("/api/health");

  if (!session && !isPublic) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
