"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Field } from "./ui";
import { Avatar } from "./avatar";
import { IconUpload } from "./icons";

interface Profile {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}

type Status = { kind: "idle" } | { kind: "ok"; message: string } | { kind: "error"; message: string };

export function AccountSettings({ profile }: { profile: Profile }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [profileStatus, setProfileStatus] = useState<Status>({ kind: "idle" });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<Status>({ kind: "idle" });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileStatus({ kind: "idle" });
    setIsSavingProfile(true);

    const response = await fetch("/api/proxy/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phone: phone || undefined }),
    });
    setIsSavingProfile(false);

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { message?: string } | null;
      setProfileStatus({ kind: "error", message: error?.message ?? "تعذّر حفظ التعديلات" });
      return;
    }

    setProfileStatus({ kind: "ok", message: "تم حفظ التعديلات" });
    router.refresh();
  }

  async function uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/proxy/profile/avatar", { method: "POST", body: formData });
    if (!response.ok) {
      setProfileStatus({ kind: "error", message: "تعذّر رفع الصورة" });
      return;
    }

    const updated = (await response.json()) as Profile;
    setAvatarUrl(updated.avatarUrl);
    router.refresh();
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordStatus({ kind: "idle" });
    setIsSavingPassword(true);

    const response = await fetch("/api/proxy/profile/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setIsSavingPassword(false);

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { message?: string } | null;
      setPasswordStatus({ kind: "error", message: error?.message ?? "تعذّر تغيير كلمة المرور" });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setPasswordStatus({
      kind: "ok",
      message: "تم تغيير كلمة المرور — سيُطلب تسجيل الدخول من جديد على الأجهزة الأخرى",
    });
  }

  return (
    <div className="grid max-w-4xl gap-5 lg:grid-cols-2">
      <Card className="p-6">
        <p className="mb-5 font-medium text-ink">المعلومات الشخصية</p>

        <div className="mb-6 flex items-center gap-4">
          <Avatar name={fullName} src={avatarUrl} size={64} />
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInput.current?.click()}
            >
              <IconUpload width={16} height={16} />
              تغيير الصورة
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => event.target.files?.[0] && uploadAvatar(event.target.files[0])}
            />
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <Field label="الاسم الكامل">
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>

          <Field label="اسم المستخدم">
            <Input value={profile.username} disabled dir="ltr" className="opacity-60" />
          </Field>

          <Field label="البريد الإلكتروني">
            <Input required type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>

          <Field label="رقم الهاتف">
            <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="اختياري" />
          </Field>

          {profileStatus.kind !== "idle" && (
            <p
              role="alert"
              className={`rounded-md px-3.5 py-2.5 text-sm ${
                profileStatus.kind === "ok" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
              }`}
            >
              {profileStatus.message}
            </p>
          )}

          <Button type="submit" disabled={isSavingProfile}>
            {isSavingProfile ? "جارٍ الحفظ…" : "حفظ التعديلات"}
          </Button>
        </form>
      </Card>

      <Card className="h-fit p-6">
        <p className="mb-5 font-medium text-ink">تغيير كلمة المرور</p>

        <form onSubmit={changePassword} className="space-y-4">
          <Field label="كلمة المرور الحالية">
            <Input
              required
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>

          <Field label="كلمة المرور الجديدة">
            <Input
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>

          {passwordStatus.kind !== "idle" && (
            <p
              role="alert"
              className={`rounded-md px-3.5 py-2.5 text-sm ${
                passwordStatus.kind === "ok" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
              }`}
            >
              {passwordStatus.message}
            </p>
          )}

          <Button type="submit" disabled={isSavingPassword}>
            {isSavingPassword ? "جارٍ الحفظ…" : "تغيير كلمة المرور"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
