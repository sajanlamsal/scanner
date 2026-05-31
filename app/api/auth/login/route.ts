import { NextRequest, NextResponse } from "next/server";
import { validatePin, SESSION_COOKIE } from "@/lib/auth/pin";
import { z } from "zod";

const bodySchema = z.object({ pin: z.string().min(1) });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "PIN is required" }, { status: 400 });
  }

  if (!validatePin(parsed.data.pin)) {
    return NextResponse.json({ message: "Incorrect PIN" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, process.env.COOKIE_SECRET!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return response;
}
