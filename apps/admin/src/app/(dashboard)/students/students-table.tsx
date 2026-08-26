"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, Badge, EmptyState, Skeleton, Input } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import {
  IconUsers,
  IconSearch,
  IconCheck,
  IconBan,
  IconTrash,
  IconChat,
} from "@/components/icons";

interface Student {
  id: string;
  fullName: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  status: "active" | "suspended";
  createdAt: string;
  lastLoginAt: string | null;
}

interface StudentsResponse {
  items: Student[];
  total: number;
}

export function StudentsTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [data, setData] = useState<StudentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (query: string) => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: "1", pageSize: "100" });
    if (query) params.set("search", query);
    const response = await fetch(`/api/proxy/admin/students?${params.toString()}`);
    if (response.ok) setData((await response.json()) as StudentsResponse);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => load(search), 300);
    return () => clearTimeout(timeout);
  }, [search, load]);

  async function toggleStatus(student: Student) {
    const nextStatus = student.status === "active" ? "suspended" : "active";
    await fetch(`/api/proxy/admin/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    load(search);
  }

  async function removeStudent(student: Student) {
    if (!confirm(`حذف حساب "${student.fullName}" نهائيًا؟`)) return;
    await fetch(`/api/proxy/admin/students/${student.id}`, { method: "DELETE" });
    load(search);
  }

  async function openChat(student: Student) {
    await fetch(`/api/proxy/admin/chat/with/${student.id}`, { method: "POST" });
    router.push("/chat");
  }

  return (
    <div>
      <PageHeader
        title="الطلاب"
        subtitle={data ? `${data.total} طالب مسجّل` : undefined}
        action={
          <div className="relative w-72">
            <IconSearch
              width={16}
              height={16}
              className="pointer-events-none absolute inset-y-0 right-3 my-auto text-muted"
            />
            <Input
              type="search"
              placeholder="بحث بالاسم أو المستخدم أو البريد"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pr-9"
            />
          </div>
        }
      />

      {isLoading && !data ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : data && data.items.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-right">
                  <th className="px-5 py-3 font-medium text-ink-soft">الطالب</th>
                  <th className="px-5 py-3 font-medium text-ink-soft">البريد الجامعي</th>
                  <th className="px-5 py-3 font-medium text-ink-soft">آخر دخول</th>
                  <th className="px-5 py-3 font-medium text-ink-soft">الحالة</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-surface-2/60"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.fullName} src={student.avatarUrl} size={34} />
                        <div className="min-w-0">
                          <p className="truncate text-ink">{student.fullName}</p>
                          <p className="truncate font-en text-xs text-muted">@{student.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-en text-xs text-ink-soft" dir="ltr">
                      {student.email}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">
                      {student.lastLoginAt
                        ? new Date(student.lastLoginAt).toLocaleDateString("ar-IQ", {
                            day: "numeric",
                            month: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={student.status === "active" ? "success" : "danger"}>
                        {student.status === "active" ? "نشط" : "موقوف"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-left whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openChat(student)}
                          title="مراسلة الطالب"
                          aria-label="مراسلة الطالب"
                          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent-ink"
                        >
                          <IconChat width={14} height={14} />
                          مراسلة
                        </button>
                        {student.status === "active" ? (
                          <button
                            onClick={() => toggleStatus(student)}
                            title="إيقاف الحساب"
                            aria-label="إيقاف الحساب"
                            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-warning hover:bg-warning-soft hover:text-warning"
                          >
                            <IconBan width={14} height={14} />
                            إيقاف
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleStatus(student)}
                            title="تفعيل الحساب"
                            aria-label="تفعيل الحساب"
                            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-success hover:bg-success-soft hover:text-success"
                          >
                            <IconCheck width={14} height={14} />
                            تفعيل
                          </button>
                        )}
                        <button
                          onClick={() => removeStudent(student)}
                          title="حذف الحساب نهائيًا"
                          aria-label="حذف الحساب نهائيًا"
                          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-danger hover:bg-danger-soft hover:text-danger"
                        >
                          <IconTrash width={14} height={14} />
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={<IconUsers />}
          title={search ? "لا نتائج مطابقة" : "لا يوجد طلاب بعد"}
          description={
            search
              ? "جرّب كلمة بحث أخرى."
              : "سيظهر الطلاب هنا فور إنشائهم حسابات من تطبيق الطالب."
          }
        />
      )}
    </div>
  );
}
