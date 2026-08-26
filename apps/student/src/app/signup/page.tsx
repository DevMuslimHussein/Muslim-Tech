import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "إنشاء حساب — Muslim Tech",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="text-lg font-semibold tracking-tight text-ink">
            مسلم تك
          </span>
        </div>

        <SignupForm />

        <p className="mt-6 text-center text-sm text-ink-soft">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-accent-ink hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </main>
  );
}
