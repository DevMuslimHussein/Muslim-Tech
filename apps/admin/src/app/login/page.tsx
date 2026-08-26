import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول — إدارة المنصة",
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
      </div>
    </main>
  );
}
