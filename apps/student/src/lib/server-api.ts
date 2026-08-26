import "server-only";
import { cookies } from "next/headers";
import { apiUrl } from "./api";
import { ACCESS_COOKIE } from "./cookies";

export async function serverApiFetch<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(apiUrl(path), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    // API unreachable (e.g. still starting up) — treat like "no data" rather
    // than crashing the page.
    return null;
  }
}
