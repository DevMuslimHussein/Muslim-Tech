import type { Metadata } from "next";
import { serverApiFetch } from "@/lib/server-api";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { IconHistory } from "@/components/icons";

export const metadata: Metadata = {
  title: "سجل النشاط — إدارة المنصة",
};

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { fullName: string; username: string } | null;
}

const actionLabels: Record<string, string> = {
  "lecture.publish": "نشر محاضرة",
  "announcement.create": "إنشاء إعلان",
  "student.suspend": "إيقاف حساب طالب",
  "student.activate": "تفعيل حساب طالب",
  "student.delete": "حذف حساب طالب",
  "subject.create": "إنشاء مادة",
  "subject.delete": "حذف مادة",
};

export default async function AuditPage() {
  const data = await serverApiFetch<{ items: AuditRow[]; total: number }>("/admin/audit");
  const items = data?.items ?? [];

  return (
    <div>
      <PageHeader title="سجل النشاط" subtitle={`${data?.total ?? 0} عملية مسجّلة`} />

      {items.length === 0 ? (
        <EmptyState
          icon={<IconHistory />}
          title="لا توجد عمليات مسجّلة بعد"
          description="كل عملية إدارية مهمة (نشر محاضرة، إنشاء إعلان، تعديل حساب) تُسجَّل هنا تلقائيًا."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {items.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5 last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-ink">{actionLabels[row.action] ?? row.action}</span>
                    {typeof row.metadata?.title === "string" && (
                      <span className="truncate text-sm text-ink-soft">— {row.metadata.title}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {row.actor ? row.actor.fullName : "النظام"} ·{" "}
                    {new Date(row.createdAt).toLocaleString("ar-IQ", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <Badge tone="neutral">{row.entityType}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
