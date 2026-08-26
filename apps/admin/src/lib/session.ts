import "server-only";
import { cookies } from "next/headers";
import { apiUrl } from "./api";

interface CurrentAdmin {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
}

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("mt_access")?.value;

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

    const user = (await response.json()) as CurrentAdmin;
    return user.role === "admin" ? user : null;
  } catch {
    // API unreachable (e.g. still starting up) — fall back to "not signed in".
    return null;
  }
}
