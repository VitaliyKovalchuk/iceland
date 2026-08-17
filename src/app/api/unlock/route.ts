import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/") || "/";
  const expected = process.env.TRIP_PASSWORD;

  if (!expected || password !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/unlock";
    url.searchParams.set("bad", "1");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  }

  const url = req.nextUrl.clone();
  url.pathname = next.startsWith("/") ? next : "/";
  url.search = "";
  const res = NextResponse.redirect(url, 303);
  res.cookies.set("trip-ok", expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 120, // covers the trip and then some
  });
  return res;
}
