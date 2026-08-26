import { NextResponse } from "next/server";
import { apiUrl } from "@/lib/api";

export async function POST(request: Request) {
  const { email } = (await request.json()) as { email?: string };

  if (!email) {
    return NextResponse.json({ message: "البريد الإلكتروني مطلوب" }, { status: 400 });
  }

  await fetch(apiUrl("/auth/forgot-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
