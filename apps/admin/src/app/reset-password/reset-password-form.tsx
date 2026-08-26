"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? "تعذّرت إعادة تعيين كلمة المرور");
        return;
      }

      router.push("/login");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="newPassword" className="mb-1.5 block text-sm text-ink-soft">
          كلمة المرور الجديدة
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
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
        {isSubmitting ? "جارٍ الحفظ…" : "حفظ كلمة المرور"}
      </button>
    </form>
  );
}
