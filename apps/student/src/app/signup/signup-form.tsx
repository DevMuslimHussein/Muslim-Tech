"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, username, email, password }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? "تعذّر إنشاء الحساب، حاول مرة أخرى");
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
        <label htmlFor="fullName" className="mb-1.5 block text-sm text-ink-soft">
          اسم الطالب
        </label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-base focus:border-accent"
        />
      </div>

      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm text-ink-soft">
          اسم المستخدم
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          required
          pattern="[a-zA-Z0-9_.]+"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-base focus:border-accent"
          dir="ltr"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm text-ink-soft">
          الإيميل الجامعي
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-base focus:border-accent"
          dir="ltr"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm text-ink-soft">
          كلمة المرور
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
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
        {isSubmitting ? "جارٍ إنشاء الحساب…" : "إنشاء حساب"}
      </button>
    </form>
  );
}
