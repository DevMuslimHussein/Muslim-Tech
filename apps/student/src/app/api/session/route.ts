import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiUrl } from "@/lib/api";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/cookies";

async function setSessionCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });
  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function POST(request: Request) {
  const { identifier, password } = (await request.json()) as {
    identifier?: string;
    password?: string;
  };

  if (!identifier || !password) {
    return NextResponse.json({ message: "البيانات المدخلة غير مكتملة" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(apiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
  } catch {
    return NextResponse.json({ message: "تعذّر الاتصال بالخادم، حاول مرة أخرى" }, { status: 502 });
  }

  if (!upstream.ok) {
    const error = (await upstream.json().catch(() => null)) as { message?: string } | null;
    return NextResponse.json(
      { message: error?.message ?? "تعذّر تسجيل الدخول، حاول مرة أخرى" },
      { status: upstream.status },
    );
  }

  const { accessToken, refreshToken } = (await upstream.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  await setSessionCookies(accessToken, refreshToken);

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    await fetch(apiUrl("/auth/logout"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }

  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);

  return NextResponse.json({ ok: true });
}
