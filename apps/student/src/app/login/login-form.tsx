"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? "تعذّر تسجيل الدخول، حاول مرة أخرى");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم، تحقق من اتصالك بالإنترنت");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="identifier" className="mb-1.5 block text-sm text-ink-soft">
          اسم المستخدم أو البريد الإلكتروني
        </label>
        <input
          id="identifier"
          type="text"
          autoComplete="username"
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-base focus:border-accent"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm text-ink-soft">
          كلمة المرور
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-base focus:border-accent"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-sm bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-white transition-opacity duration-base hover:opacity-90 disabled:opacity-60"
      >
        {isSubmitting ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
      </button>

      <div className="pt-1 text-center">
        <a href="/forgot-password" className="text-sm text-ink-soft underline-offset-4 hover:text-accent hover:underline">
          نسيت كلمة المرور؟
        </a>
      </div>
    </form>
  );
}
