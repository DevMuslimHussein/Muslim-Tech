"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, PageHeader, Button, Badge } from "@/components/ui";
import { IconPlay, IconTrash, IconClock } from "@/components/icons";
import {
  DIGITAL_PINS,
  EXAMPLES,
  STARTER_SKETCH,
  buildProgram,
  parseEvents,
  type SimEvent,
} from "./arduino-core";

const WANDBOX_ENDPOINT = "https://wandbox.org/api/compile.json";
const STORAGE_KEY = "mt_arduino_sketch";
const BUTTON_PIN = 2;

interface SerialLine {
  time: number;
  text: string;
}

export function ArduinoLab() {
  const [code, setCode] = useState(STARTER_SKETCH);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [potValue, setPotValue] = useState(512);

  const [events, setEvents] = useState<SimEvent[] | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  // Playback state
  const [clock, setClock] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCode(saved);
    } catch {
      // Blocked storage — the starter sketch stays.
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        // Ignore: drafts simply will not persist.
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [code]);

  const duration = events?.length ? events[events.length - 1].time : 0;

  // Drive the virtual clock in real time while playing.
  useEffect(() => {
    if (!isPlaying || !events) return;

    lastFrameRef.current = performance.now();
    const step = (now: number) => {
      const delta = (now - lastFrameRef.current) * speed;
      lastFrameRef.current = now;

      setClock((current) => {
        const next = current + delta;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, events, speed, duration]);

  async function run() {
    if (isCompiling) return;
    setIsCompiling(true);
    setCompileError(null);
    setEvents(null);
    setIsPlaying(false);
    setClock(0);

    try {
      const response = await fetch(WANDBOX_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compiler: "gcc-head",
          code: buildProgram(code, {
            buttonPin: BUTTON_PIN,
            buttonPressed,
            potValue,
          }),
          options: "gnu++17",
        }),
      });

      if (!response.ok) {
        throw new Error("تعذّر الوصول لخادم الترجمة — تحقّق من اتصالك");
      }

      const result = (await response.json()) as {
        status: string;
        compiler_error?: string;
        program_output?: string;
      };

      if (result.status !== "0") {
        // Strip the mock core's line numbers so errors point at the sketch.
        setCompileError(result.compiler_error?.trim() || "فشلت الترجمة");
        return;
      }

      const parsed = parseEvents(result.program_output ?? "");
      setEvents(parsed);
      setIsPlaying(true);
    } catch (error) {
      setCompileError(
        error instanceof Error ? error.message : "حدث خطأ غير متوقّع",
      );
    } finally {
      setIsCompiling(false);
    }
  }

  // Pin states and serial output as of the current playback position.
  const pinStates = new Array<number>(DIGITAL_PINS).fill(0);
  const serialLines: SerialLine[] = [];
  let pending = "";

  if (events) {
    for (const event of events) {
      if (event.time > clock) break;

      if (event.kind === "write" || event.kind === "analog") {
        if (event.pin !== undefined && event.pin < DIGITAL_PINS) {
          pinStates[event.pin] = event.value ?? 0;
        }
      } else if (event.kind === "serial") {
        pending += event.text ?? "";
      } else if (event.kind === "serialln") {
        serialLines.push({ time: event.time, text: pending + (event.text ?? "") });
        pending = "";
      }
    }
    if (pending) serialLines.push({ time: clock, text: pending });
  }

  const finished = events !== null && clock >= duration;

  return (
    <div>
      <PageHeader
        title="مختبر أردوينو"
        subtitle="اكتب سكتش حقيقي وشاهد اللوحة تشتغل"
        action={
          <select
            onChange={(event) => {
              const example = EXAMPLES[Number(event.target.value)];
              if (example) setCode(example.code);
            }}
            defaultValue=""
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="" disabled>
              أمثلة جاهزة
            </option>
            {EXAMPLES.map((example, index) => (
              <option key={example.name} value={index}>
                {example.name}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="font-en text-xs text-muted">sketch.ino</span>
              <button
                onClick={() => setCode(STARTER_SKETCH)}
                className="text-xs text-muted transition-colors hover:text-ink"
              >
                استعادة المثال
              </button>
            </div>

            <div className="flex min-h-[20rem]" dir="ltr">
              <div
                aria-hidden="true"
                className="select-none border-l border-border bg-surface-2 px-2.5 py-3 text-left font-mono text-xs leading-6 text-muted"
              >
                {Array.from({ length: code.split("\n").length }, (_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Tab") {
                    event.preventDefault();
                    const target = event.currentTarget;
                    const { selectionStart, selectionEnd, value } = target;
                    setCode(
                      value.slice(0, selectionStart) + "  " + value.slice(selectionEnd),
                    );
                    requestAnimationFrame(() => {
                      target.selectionStart = target.selectionEnd = selectionStart + 2;
                    });
                  }
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    void run();
                  }
                }}
                spellCheck={false}
                className="flex-1 resize-none bg-surface px-3 py-3 text-left font-mono text-sm leading-6 text-ink outline-none"
              />
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-[11px] text-muted">Ctrl+Enter للتشغيل</span>
              <Button onClick={run} disabled={isCompiling}>
                <IconPlay width={15} height={15} />
                {isCompiling ? "جارٍ الترجمة…" : "تشغيل المحاكاة"}
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <p className="mb-3 text-xs font-medium text-ink-soft">
              المدخلات الافتراضية — اضبطها قبل التشغيل
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                onClick={() => setButtonPressed((v) => !v)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                  buttonPressed
                    ? "border-accent bg-accent-soft text-accent-ink"
                    : "border-border text-ink-soft hover:border-border-strong"
                }`}
              >
                <span
                  className={`size-3 rounded-full ${
                    buttonPressed ? "bg-accent" : "bg-border-strong"
                  }`}
                />
                الزر (منفذ {BUTTON_PIN}): {buttonPressed ? "مضغوط" : "غير مضغوط"}
              </button>

              <label className="flex flex-1 items-center gap-3">
                <span className="shrink-0 text-xs text-ink-soft">
                  المقياس (A0)
                </span>
                <input
                  type="range"
                  min={0}
                  max={1023}
                  value={potValue}
                  onChange={(event) => setPotValue(Number(event.target.value))}
                  className="min-w-32 flex-1 accent-[var(--color-accent)]"
                />
                <span className="w-10 shrink-0 text-left font-mono text-xs tabular-nums text-ink">
                  {potValue}
                </span>
              </label>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-medium text-ink-soft">اللوحة</p>
              {events && (
                <span className="flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted">
                  <IconClock width={11} height={11} />
                  {(clock / 1000).toFixed(1)}s / {(duration / 1000).toFixed(1)}s
                </span>
              )}
            </div>

            <Board pinStates={pinStates} live={events !== null} />

            {events && (
              <div className="mt-4 space-y-3">
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  value={clock}
                  onChange={(event) => {
                    setIsPlaying(false);
                    setClock(Number(event.target.value));
                  }}
                  className="w-full accent-[var(--color-accent)]"
                />

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (finished) setClock(0);
                      setIsPlaying((v) => !v);
                    }}
                  >
                    {isPlaying ? "إيقاف" : finished ? "إعادة" : "تشغيل"}
                  </Button>

                  {[0.5, 1, 2, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => setSpeed(value)}
                      className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-colors ${
                        speed === value
                          ? "border-accent bg-accent-soft text-accent-ink"
                          : "border-border text-muted hover:border-border-strong"
                      }`}
                    >
                      {value}×
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-xs text-muted">الشاشة التسلسلية (Serial)</span>
              {serialLines.length > 0 && (
                <button
                  onClick={() => setClock(0)}
                  aria-label="من البداية"
                  className="rounded p-1 text-muted transition-colors hover:text-ink"
                >
                  <IconTrash width={13} height={13} />
                </button>
              )}
            </div>

            <div className="h-48 overflow-auto px-4 py-3 font-mono text-xs leading-6">
              {compileError ? (
                <pre dir="ltr" className="whitespace-pre-wrap text-left text-danger">
                  {compileError}
                </pre>
              ) : serialLines.length === 0 ? (
                <p className="text-muted">
                  {events ? "لا يوجد إخراج تسلسلي." : "شغّل المحاكاة لتظهر النتيجة."}
                </p>
              ) : (
                serialLines.map((line, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="shrink-0 tabular-nums text-muted">
                      {(line.time / 1000).toFixed(1)}s
                    </span>
                    <span className="text-ink">{line.text}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-xs text-muted">
        محاكاة لواجهة أردوينو البرمجية — تعلّمك منطق السكتش بدقة، لكنها ليست محاكيًا
        كهربائيًا للشريحة: التوقيت افتراضي ولا توجد مقاطعات (interrupts). الكود
        يُترجم على خادم خارجي.
      </p>
    </div>
  );
}

function Board({ pinStates, live }: { pinStates: number[]; live: boolean }) {
  return (
    <div className="rounded-lg bg-[#0b3d52] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-en text-[10px] font-semibold tracking-wide text-white/70">
          ARDUINO UNO
        </span>
        <span
          className={`flex items-center gap-1.5 text-[10px] ${
            live ? "text-emerald-300" : "text-white/40"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              live ? "bg-emerald-400" : "bg-white/30"
            }`}
          />
          {live ? "يعمل" : "متوقف"}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {pinStates.map((state, pin) => {
          const on = state > 0;
          return (
            <div key={pin} className="flex flex-col items-center gap-1">
              <span
                className={`size-5 rounded-full border transition-all duration-100 ${
                  on
                    ? "border-amber-200 bg-amber-300 shadow-[0_0_10px_3px_rgba(252,211,77,0.7)]"
                    : "border-white/20 bg-white/10"
                }`}
              />
              <span
                className={`font-mono text-[10px] tabular-nums ${
                  on ? "text-amber-200" : "text-white/40"
                }`}
              >
                {pin}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[10px] text-white/40">
        المنافذ الرقمية 0 — 13
      </p>
    </div>
  );
}
