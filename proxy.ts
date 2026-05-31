import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

const PROTECTED = ["/scanner", "/dashboard"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const sessionVal = request.cookies.get(SESSION_COOKIE)?.value;
  const cookieSecret = process.env.COOKIE_SECRET;

  if (!cookieSecret || sessionVal !== cookieSecret) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/scanner/:path*", "/dashboard/:path*"],
};
