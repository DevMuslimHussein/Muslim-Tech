import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "استعادة كلمة المرور — إدارة المنصة",
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="text-lg font-semibold tracking-tight text-ink">
            مسلم تك
          </span>
          <h1 className="mt-6 text-xl font-semibold text-ink text-balance">
            استعادة كلمة المرور
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة التعيين
          </p>
        </div>

        <ForgotPasswordForm />
      </div>
    </main>
  );
}
