import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "تعيين كلمة مرور جديدة — Muslim Tech",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="text-lg font-semibold tracking-tight text-ink">
            مسلم تك
          </span>
        </div>

        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="rounded-sm bg-danger-soft px-3.5 py-2.5 text-center text-sm text-danger">
            رابط إعادة التعيين غير صالح
          </p>
        )}
      </div>
    </main>
  );
}
