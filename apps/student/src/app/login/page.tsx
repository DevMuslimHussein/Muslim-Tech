import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول — Muslim Tech",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="text-lg font-semibold tracking-tight text-ink">
            مسلم تك
          </span>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-ink-soft">
          ليس لديك حساب؟{" "}
          <Link href="/signup" className="text-accent-ink hover:underline">
            إنشاء حساب
          </Link>
        </p>
      </div>
    </main>
  );
}
