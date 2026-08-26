"use client";

import { useState, type FormEvent } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setIsSent(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <p className="rounded-sm bg-accent-soft px-3.5 py-2.5 text-center text-sm text-accent-ink">
        إذا كان البريد الإلكتروني مسجّلاً لدينا، فستصلك رسالة تحتوي على رابط إعادة التعيين خلال دقائق.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm text-ink-soft">
          البريد الإلكتروني
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-base focus:border-accent"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-white transition-opacity duration-base hover:opacity-90 disabled:opacity-60"
      >
        {isSubmitting ? "جارٍ الإرسال…" : "إرسال رابط الاستعادة"}
      </button>

      <div className="pt-1 text-center">
        <a href="/login" className="text-sm text-ink-soft underline-offset-4 hover:text-accent hover:underline">
          العودة لتسجيل الدخول
        </a>
      </div>
    </form>
  );
}
