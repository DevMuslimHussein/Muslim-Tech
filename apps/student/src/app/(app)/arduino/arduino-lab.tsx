"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader, Badge, Button } from "@/components/ui";
import { IconChip, IconPlay } from "@/components/icons";

const STORAGE_KEY = "mt_arduino_board";

interface BoardOption {
  key: string;
  label: string;
  note: string;
  /** Path segment on wokwi.com/projects/new/… */
  slug: string;
}

const BOARDS: BoardOption[] = [
  {
    key: "uno",
    label: "Arduino Uno",
    note: "الأشهر للمبتدئين",
    slug: "arduino-uno",
  },
  {
    key: "mega",
    label: "Arduino Mega",
    note: "منافذ أكثر",
    slug: "arduino-mega",
  },
  {
    key: "nano",
    label: "Arduino Nano",
    note: "حجم صغير",
    slug: "arduino-nano",
  },
  {
    key: "esp32",
    label: "ESP32",
    note: "واي فاي وبلوتوث",
    slug: "esp32",
  },
];

export function ArduinoLab() {
  const [board, setBoard] = useState<BoardOption>(BOARDS[0]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const found = BOARDS.find((b) => b.key === saved);
      if (found) setBoard(found);
    } catch {
      // Blocked storage — the default board stays selected.
    }
  }, []);

  function choose(option: BoardOption) {
    setBoard(option);
    // Remount the frame so switching boards actually loads the new one.
    setStarted(false);
    try {
      localStorage.setItem(STORAGE_KEY, option.key);
    } catch {
      // Preference just will not persist.
    }
  }

  return (
    <div>
      <PageHeader
        title="مختبر أردوينو"
        subtitle="محاكي دوائر كامل — ركّب، وصّل، وشغّل"
        action={
          <a
            href={`https://wokwi.com/projects/new/${board.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border px-3 py-2 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent-ink"
          >
            فتح بنافذة كاملة ↗
          </a>
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 text-xs text-ink-soft">اختر اللوحة:</span>
          {BOARDS.map((option) => (
            <button
              key={option.key}
              onClick={() => choose(option)}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                board.key === option.key
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-border text-ink-soft hover:border-border-strong hover:bg-surface-2"
              }`}
            >
              <span className="font-en">{option.label}</span>
              <span className="mr-1.5 text-[10px] text-muted">{option.note}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {started ? (
          <iframe
            key={board.key}
            src={`https://wokwi.com/projects/new/${board.slug}`}
            title={`محاكي ${board.label}`}
            // clipboard-write lets the student copy their sketch out of the frame.
            allow="clipboard-write; clipboard-read"
            className="h-[78vh] min-h-[34rem] w-full border-0"
          />
        ) : (
          <div className="flex h-[78vh] min-h-[34rem] flex-col items-center justify-center px-6 text-center">
            <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
              <IconChip width={30} height={30} />
            </span>

            <h2 className="text-lg font-semibold text-ink">
              محاكي {board.label}
            </h2>
            <p className="mt-2 max-w-md text-sm/relaxed text-ink-soft">
              محاكاة كاملة للمعالج مع بريدبورد ومقاومات وحساسات وشاشات — تركّب
              دائرتك وتوصّل الأسلاك وتشوفها تشتغل.
            </p>

            <Button className="mt-5" onClick={() => setStarted(true)}>
              <IconPlay width={16} height={16} />
              افتح المحاكي
            </Button>

            <p className="mt-3 text-[11px] text-muted">
              يُحمَّل عند الطلب حتى لا يُبطئ الصفحة
            </p>
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="mb-2 text-xs font-medium text-ink">كيف تبدأ</p>
          <ol className="space-y-1.5 text-xs leading-5 text-ink-soft">
            <li>١. اضغط <strong>افتح المحاكي</strong> بالأعلى</li>
            <li>
              ٢. اضغط <span className="font-en">+</span> فوق اللوحة لإضافة مكوّن
              (مصباح، زر، حسّاس، شاشة…)
            </li>
            <li>٣. اسحب من طرف المكوّن إلى منفذ اللوحة لرسم سلك</li>
            <li>
              ٤. اكتب الكود بالمحرّر واضغط <span className="font-en">▶</span>
            </li>
          </ol>
        </Card>

        <Card className="p-4">
          <Badge tone="neutral">ملاحظات</Badge>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-muted">
            <li>• واجهة المحاكي بالإنكليزية — الشرح والدروس تضل بالعربي هنا</li>
            <li>
              • لحفظ مشروعك ومشاركته تحتاج حسابًا مجانيًا على{" "}
              <span className="font-en">Wokwi</span>
            </li>
            <li>• إذا ضاقت الشاشة، افتحه بنافذة كاملة من الزر بالأعلى</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
