import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "استعادة كلمة المرور — Muslim Tech",
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="text-lg font-semibold tracking-tight text-ink">
            مسلم تك
          </span>
        </div>

        <ForgotPasswordForm />
      </div>
    </main>
  );
}
