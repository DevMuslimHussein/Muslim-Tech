import { NextResponse } from "next/server";
import { apiUrl } from "@/lib/api";

export async function POST(request: Request) {
  const { token, newPassword } = (await request.json()) as {
    token?: string;
    newPassword?: string;
  };

  if (!token || !newPassword) {
    return NextResponse.json({ message: "البيانات المدخلة غير مكتملة" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(apiUrl("/auth/reset-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
  } catch {
    return NextResponse.json({ message: "تعذّر الاتصال بالخادم، حاول مرة أخرى" }, { status: 502 });
  }

  if (!upstream.ok) {
    const error = (await upstream.json().catch(() => null)) as { message?: string } | null;
    return NextResponse.json(
      { message: error?.message ?? "تعذّرت إعادة تعيين كلمة المرور" },
      { status: upstream.status },
    );
  }

  return NextResponse.json({ ok: true });
}
