"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="rounded-md border border-border px-3.5 py-2 text-sm text-ink-soft transition-colors duration-base hover:border-accent hover:text-accent-ink disabled:opacity-60"
    >
      تسجيل الخروج
    </button>
  );
}
