"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader, Badge, EmptyState, Skeleton } from "@/components/ui";
import { IconAward, IconExam, IconEdit } from "@/components/icons";

interface GradeItem {
  id: string;
  source: "exam" | "manual";
  title: string;
  points: number;
  maxPoints: number;
  percent: number;
  note: string | null;
  date: string;
}

interface SubjectGrades {
  subjectId: string;
  subjectName: string;
  items: GradeItem[];
  totalPoints: number;
  totalMax: number;
  average: number;
}

interface GradesResponse {
  subjects: SubjectGrades[];
  overallAverage: number;
}

function toneFor(percent: number) {
  if (percent >= 75) return "success" as const;
  if (percent >= 50) return "warning" as const;
  return "danger" as const;
}

export function GradesView() {
  const [data, setData] = useState<GradesResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/proxy/grades")
      .then((r) => (r.ok ? r.json() : { subjects: [], overallAverage: 0 }))
      .then((d: GradesResponse) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ subjects: [], overallAverage: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageHeader title="درجاتي" />

      {data === null ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : data.subjects.length === 0 ? (
        <EmptyState
          icon={<IconAward />}
          title="لا توجد درجات بعد"
          description="ستظهر درجاتك هنا بعد أداء الامتحانات."
        />
      ) : (
        <>
          <Card className="mb-4 flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-ink-soft">المعدّل العام</p>
              <p className="mt-1 text-xs text-muted">
                عبر {data.subjects.length} مادة
              </p>
            </div>
            <div className="text-left">
              <p className="font-mono text-3xl font-bold tabular-nums text-ink">
                {Math.round(data.overallAverage)}%
              </p>
              <Badge tone={toneFor(data.overallAverage)}>
                {data.overallAverage >= 75
                  ? "ممتاز"
                  : data.overallAverage >= 50
                    ? "مقبول"
                    : "يحتاج تحسين"}
              </Badge>
            </div>
          </Card>

          <div className="space-y-4">
            {data.subjects.map((subject) => (
              <Card key={subject.subjectId} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border bg-surface-2 px-5 py-3">
                  <h2 className="text-sm font-semibold text-ink">
                    {subject.subjectName}
                  </h2>
                  <span className="font-mono text-sm tabular-nums text-ink-soft">
                    {Math.round(subject.average)}%
                  </span>
                </div>

                <ul>
                  {subject.items.map((item) => (
                    <li
                      key={`${item.source}-${item.id}`}
                      className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
                    >
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
                          item.source === "exam"
                            ? "bg-accent-soft text-accent-ink"
                            : "bg-surface-2 text-muted"
                        }`}
                      >
                        {item.source === "exam" ? (
                          <IconExam width={14} height={14} />
                        ) : (
                          <IconEdit width={14} height={14} />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">{item.title}</p>
                        {item.note && (
                          <p className="truncate text-xs text-muted">{item.note}</p>
                        )}
                      </div>

                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                        {item.points} / {item.maxPoints}
                      </span>
                      <Badge tone={toneFor(item.percent)}>
                        {Math.round(item.percent)}%
                      </Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
