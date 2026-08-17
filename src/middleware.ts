import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** A shared-password gate. The guide holds confirmation numbers, eight addresses
 *  and the exact dates our homes are empty, so it should not be openly indexable.
 *
 *  Cookie-based rather than HTTP Basic: this is installed to a phone home screen
 *  and used offline, and Basic re-prompts inside a PWA.
 *
 *  With TRIP_PASSWORD unset (i.e. local dev) the gate is off. */
const COOKIE = "trip-ok";

export function middleware(req: NextRequest) {
  const password = process.env.TRIP_PASSWORD;
  if (!password) return NextResponse.next();
  if (req.cookies.get(COOKIE)?.value === password) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // everything except the unlock page, its action, and the static/PWA assets
    "/((?!unlock|api/unlock|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js).*)",
  ],
};
