import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth(function middleware(req) {
  const { nextUrl } = req;

  const isSetupRoute = nextUrl.pathname.startsWith("/setup");
  const isApiSetup = nextUrl.pathname.startsWith("/api/setup");
  const isNextInternal = nextUrl.pathname.startsWith("/_next");
  const isPublicFile = ["/favicon.ico"].includes(nextUrl.pathname);
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicApiRoute =
    nextUrl.pathname === "/api/seed" ||
    nextUrl.pathname === "/api/health";
  const isPublicSettingsApi =
    (nextUrl.pathname === "/api/settings" && req.method === "GET") ||
    (nextUrl.pathname.startsWith("/api/printer-settings") && req.method === "GET");

  // Always allow setup, internal, and public routes
  if (isSetupRoute || isApiSetup || isNextInternal || isPublicFile ||
      isApiAuthRoute || isPublicApiRoute || isPublicSettingsApi) {
    return NextResponse.next();
  }

  // Root page handles setup check itself — allow through
  if (nextUrl.pathname === "/") {
    return NextResponse.next();
  }

  // All other routes require login
  const isLoggedIn = !!req.auth;
  const isLoginPage = nextUrl.pathname.startsWith("/login");

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Role-based access control
  const role = (req.auth?.user as { role?: string })?.role;

  const isAdminOnly =
    nextUrl.pathname.startsWith("/users") ||
    nextUrl.pathname.startsWith("/settings");

  const isCashierRestricted =
    nextUrl.pathname.startsWith("/reports") ||
    nextUrl.pathname.startsWith("/users") ||
    nextUrl.pathname.startsWith("/inventory") ||
    nextUrl.pathname.startsWith("/sales") ||
    nextUrl.pathname.startsWith("/suppliers") ||
    nextUrl.pathname.startsWith("/purchases") ||
    nextUrl.pathname.startsWith("/settings");

  if (role === "CASHIER" && isCashierRestricted) {
    return NextResponse.redirect(new URL("/pos", nextUrl));
  }

  if (role === "MANAGER" && isAdminOnly) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)"],
};
