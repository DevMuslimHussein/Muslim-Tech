import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiUrl } from "@/lib/api";

export async function POST(request: Request) {
  const { fullName, username, email, password } = (await request.json()) as {
    fullName?: string;
    username?: string;
    email?: string;
    password?: string;
  };

  if (!fullName || !username || !email || !password) {
    return NextResponse.json({ message: "البيانات المدخلة غير مكتملة" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(apiUrl("/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, username, email, password }),
    });
  } catch {
    return NextResponse.json({ message: "تعذّر الاتصال بالخادم، حاول مرة أخرى" }, { status: 502 });
  }

  if (!upstream.ok) {
    const error = (await upstream.json().catch(() => null)) as { message?: string } | null;
    return NextResponse.json(
      { message: error?.message ?? "تعذّر إنشاء الحساب" },
      { status: upstream.status },
    );
  }

  const { accessToken, refreshToken } = (await upstream.json()) as {
    accessToken: string;
    refreshToken: string;
  };

  const cookieStore = await cookies();
  cookieStore.set("mt_access", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });
  cookieStore.set("mt_refresh", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return NextResponse.json({ ok: true });
}
