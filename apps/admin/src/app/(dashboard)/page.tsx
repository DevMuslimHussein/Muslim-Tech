import Link from "next/link";
import { serverApiFetch } from "@/lib/server-api";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { AreaChart, BarList } from "@/components/charts";
import { Avatar } from "@/components/avatar";
import { IconUsers, IconBook, IconPlay, IconMegaphone } from "@/components/icons";

interface Stats {
  overview: {
    students: number;
    activeStudents: number;
    suspendedStudents: number;
    subjects: number;
    lectures: number;
    publishedLectures: number;
    draftLectures: number;
    announcements: number;
    files: number;
  };
  signups: { date: string; count: number }[];
  publishes: { date: string; count: number }[];
  bySubject: { id: string; name: string; lectures: number }[];
  recentStudents: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
    createdAt: string;
  }[];
}

export default async function DashboardHomePage() {
  const stats = await serverApiFetch<Stats>("/admin/stats");

  if (!stats) {
    return <EmptyState title="تعذّر تحميل الإحصائيات" description="حاول تحديث الصفحة." />;
  }

  const { overview } = stats;

  const tiles = [
    {
      label: "الطلاب",
      value: overview.students,
      Icon: IconUsers,
      detail: `${overview.activeStudents} نشط`,
      tone: "accent" as const,
    },
    {
      label: "المواد",
      value: overview.subjects,
      Icon: IconBook,
      detail: `${overview.files} ملف مرفوع`,
      tone: "violet" as const,
    },
    {
      label: "المحاضرات المنشورة",
      value: overview.publishedLectures,
      Icon: IconPlay,
      detail: `${overview.draftLectures} مسودة`,
      tone: "success" as const,
    },
    {
      label: "الإعلانات الفعّالة",
      value: overview.announcements,
      Icon: IconMegaphone,
      detail: "ظاهرة للطلاب الآن",
      tone: "warning" as const,
    },
  ];

  return (
    <div>
      <PageHeader title="نظرة عامة" subtitle="ملخص حيّ لحالة المنصة" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ label, value, Icon, detail, tone }) => (
          <Card key={label} hover className="p-5">
            <div className="mb-3 flex items-start justify-between">
              <span
                className={`flex size-9 items-center justify-center rounded-md ${
                  tone === "accent"
                    ? "bg-accent-soft text-accent"
                    : tone === "violet"
                      ? "bg-violet-soft text-violet"
                      : tone === "success"
                        ? "bg-success-soft text-success"
                        : "bg-warning-soft text-warning"
                }`}
              >
                <Icon width={18} height={18} />
              </span>
            </div>
            <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
            <p className="mt-1 text-sm font-medium text-ink-soft">{label}</p>
            <p className="mt-0.5 text-xs text-muted">{detail}</p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <AreaChart data={stats.signups} label="تسجيل الطلاب — آخر ١٤ يومًا" />
        </Card>
        <Card className="p-5">
          <AreaChart data={stats.publishes} label="نشر المحاضرات — آخر ١٤ يومًا" />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <BarList data={stats.bySubject} label="المحاضرات المنشورة حسب المادة" />
        </Card>

        <Card className="p-5 lg:col-span-2">
          <p className="mb-4 text-sm font-medium text-ink-soft">أحدث المشتركين</p>
          {stats.recentStudents.length > 0 ? (
            <ul className="space-y-3">
              {stats.recentStudents.map((student) => (
                <li key={student.id} className="flex items-center gap-3">
                  <Avatar name={student.fullName} src={student.avatarUrl} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{student.fullName}</p>
                    <p className="truncate font-en text-xs text-muted">@{student.username}</p>
                  </div>
                  <Badge tone="neutral">
                    {new Date(student.createdAt).toLocaleDateString("ar-IQ", {
                      day: "numeric",
                      month: "short",
                    })}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted">لا يوجد مشتركون بعد</p>
          )}
          <Link
            href="/students"
            className="mt-4 block text-center text-sm text-accent-ink transition-opacity hover:opacity-75"
          >
            عرض كل الطلاب
          </Link>
        </Card>
      </div>
    </div>
  );
}
