import "server-only";
import { cookies } from "next/headers";
import { apiUrl } from "./api";
import { ACCESS_COOKIE } from "./cookies";
import type { User } from "@muslim-tech/types";

export async function getCurrentStudent(): Promise<User | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(apiUrl("/auth/me"), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as User;
  } catch {
    // API unreachable (e.g. still starting up) — fall back to "not signed in".
    return null;
  }
}
