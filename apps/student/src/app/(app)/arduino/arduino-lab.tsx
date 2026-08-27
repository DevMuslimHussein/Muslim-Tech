"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, PageHeader, Button, Badge } from "@/components/ui";
import { IconPlay, IconTrash, IconClock, IconPlus } from "@/components/icons";
import {
  buildProgram,
  parseEvents,
  type SimEvent,
} from "./arduino-core";
import {
  BOARD_PINS,
  COMPONENT_SPECS,
  LED_COLORS,
  checkWiring,
  pinLabel,
  signalPinsFor,
  type ComponentType,
  type PlacedComponent,
  type Wire,
} from "./circuit";
import { ComponentBody, type PartState } from "./components";
import { STARTER_SKETCH, EXAMPLES } from "./examples";

const WANDBOX_ENDPOINT = "https://wandbox.org/api/compile.json";
const SKETCH_KEY = "mt_arduino_sketch";
const CIRCUIT_KEY = "mt_arduino_circuit";

interface PendingWire {
  componentId: string;
  terminalId: string;
}

let nextId = 1;
const makeId = (prefix: string) => `${prefix}${nextId++}_${Date.now() % 100000}`;

export function ArduinoLab() {
  const [code, setCode] = useState(STARTER_SKETCH);
  const [components, setComponents] = useState<PlacedComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [pending, setPending] = useState<PendingWire | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [events, setEvents] = useState<SimEvent[] | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  const [clock, setClock] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  // --- persistence -------------------------------------------------------

  useEffect(() => {
    try {
      const savedSketch = localStorage.getItem(SKETCH_KEY);
      if (savedSketch) setCode(savedSketch);
      const savedCircuit = localStorage.getItem(CIRCUIT_KEY);
      if (savedCircuit) {
        const parsed = JSON.parse(savedCircuit) as {
          components: PlacedComponent[];
          wires: Wire[];
        };
        setComponents(parsed.components ?? []);
        setWires(parsed.wires ?? []);
      }
    } catch {
      // Corrupt or blocked storage — start from the defaults.
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(SKETCH_KEY, code);
        localStorage.setItem(CIRCUIT_KEY, JSON.stringify({ components, wires }));
      } catch {
        // Drafts simply will not persist.
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [code, components, wires]);

  // --- playback ----------------------------------------------------------

  const duration = events?.length ? events[events.length - 1].time : 0;

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

  // --- circuit editing ---------------------------------------------------

  function addComponent(type: ComponentType) {
    const spec = COMPONENT_SPECS[type];
    setComponents((prev) => [
      ...prev,
      {
        id: makeId(type),
        type,
        x: 40 + (prev.length % 5) * 110,
        y: 40 + Math.floor(prev.length / 5) * 120,
        color: type === "led" ? LED_COLORS[prev.length % LED_COLORS.length].key : undefined,
        value: type === "potentiometer" ? 512 : undefined,
        pressed: type === "button" ? false : undefined,
      },
    ]);
    void spec;
  }

  function removeComponent(id: string) {
    setComponents((prev) => prev.filter((c) => c.id !== id));
    setWires((prev) => prev.filter((w) => w.componentId !== id));
    setSelectedId((current) => (current === id ? null : current));
  }

  function connectTo(pin: number | "GND" | "5V") {
    if (!pending) return;
    setWires((prev) => [
      // One wire per terminal: re-clicking a pin moves the connection.
      ...prev.filter(
        (w) =>
          !(w.componentId === pending.componentId && w.terminalId === pending.terminalId),
      ),
      { id: makeId("w"), ...pending, pin },
    ]);
    setPending(null);
  }

  function onPointerDownComponent(event: React.PointerEvent, component: PlacedComponent) {
    const canvas = canvasRef.current?.getBoundingClientRect();
    if (!canvas) return;
    dragRef.current = {
      id: component.id,
      dx: event.clientX - canvas.left - component.x,
      dy: event.clientY - canvas.top - component.y,
    };
    setSelectedId(component.id);
  }

  useEffect(() => {
    function move(event: PointerEvent) {
      const drag = dragRef.current;
      const canvas = canvasRef.current?.getBoundingClientRect();
      if (!drag || !canvas) return;
      const x = Math.max(0, Math.min(canvas.width - 100, event.clientX - canvas.left - drag.dx));
      const y = Math.max(0, Math.min(canvas.height - 110, event.clientY - canvas.top - drag.dy));
      setComponents((prev) =>
        prev.map((c) => (c.id === drag.id ? { ...c, x, y } : c)),
      );
    }
    function up() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  // --- running -----------------------------------------------------------

  const run = useCallback(async () => {
    setIsCompiling(true);
    setCompileError(null);
    setEvents(null);
    setIsPlaying(false);
    setClock(0);

    // Buttons that are held down force their wired pin HIGH; potentiometers
    // report their knob position on whichever analog pin they reach.
    const highPins: number[] = [];
    const analogValues: Record<number, number> = {};

    for (const component of components) {
      const signals = signalPinsFor(component, wires);
      if (component.type === "button" && component.pressed) {
        const pin = signals.out;
        if (pin !== undefined) highPins.push(pin);
      }
      if (component.type === "potentiometer") {
        const pin = signals.wiper;
        if (pin !== undefined) analogValues[pin] = component.value ?? 512;
      }
    }

    try {
      const response = await fetch(WANDBOX_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compiler: "gcc-head",
          code: buildProgram(code, { highPins, analogValues }),
          options: "gnu++17",
        }),
      });

      if (!response.ok) throw new Error("تعذّر الوصول لخادم الترجمة");

      const result = (await response.json()) as {
        status: string;
        compiler_error?: string;
        program_output?: string;
      };

      if (result.status !== "0") {
        setCompileError(result.compiler_error?.trim() || "فشلت الترجمة");
        return;
      }

      setEvents(parseEvents(result.program_output ?? ""));
      setIsPlaying(true);
    } catch (error) {
      setCompileError(error instanceof Error ? error.message : "خطأ غير متوقّع");
    } finally {
      setIsCompiling(false);
    }
  }, [code, components, wires]);

  // --- derived state at the current playback position ---------------------

  const pinDuty = new Array<number>(20).fill(0);
  const pinTone = new Map<number, number>();
  const pinAngle = new Map<number, number>();
  const serialLines: { time: number; text: string }[] = [];
  let partial = "";

  if (events) {
    for (const event of events) {
      if (event.time > clock) break;
      if (event.pin === undefined) {
        if (event.kind === "serial") partial += event.text ?? "";
        else if (event.kind === "serialln") {
          serialLines.push({ time: event.time, text: partial + (event.text ?? "") });
          partial = "";
        }
        continue;
      }
      if (event.kind === "write") pinDuty[event.pin] = event.value ? 255 : 0;
      else if (event.kind === "analog") pinDuty[event.pin] = event.value ?? 0;
      else if (event.kind === "tone") pinTone.set(event.pin, event.value ?? 0);
      else if (event.kind === "servo") pinAngle.set(event.pin, event.value ?? 0);
    }
    if (partial) serialLines.push({ time: clock, text: partial });
  }

  function stateFor(component: PlacedComponent): PartState {
    const signals: Record<string, number> = {};
    const mapped = signalPinsFor(component, wires);
    for (const [terminal, pin] of Object.entries(mapped)) {
      signals[terminal] = pinDuty[pin] ?? 0;
    }
    const firstPin = Object.values(mapped)[0];
    return {
      signals,
      tone: firstPin !== undefined ? pinTone.get(firstPin) : undefined,
      angle: firstPin !== undefined ? pinAngle.get(firstPin) : undefined,
    };
  }

  const problems = checkWiring(components, wires);
  const finished = events !== null && clock >= duration;
  const selected = components.find((c) => c.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        title="مختبر أردوينو"
        subtitle="ركّب دائرتك، اكتب الكود، وشاهدها تشتغل"
        action={
          <select
            onChange={(event) => {
              const example = EXAMPLES[Number(event.target.value)];
              if (!example) return;
              setCode(example.code);
              setComponents(example.components);
              setWires(example.wires);
              setEvents(null);
              setClock(0);
            }}
            defaultValue=""
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="" disabled>
              مشاريع جاهزة
            </option>
            {EXAMPLES.map((example, index) => (
              <option key={example.name} value={index}>
                {example.name}
              </option>
            ))}
          </select>
        }
      />

      {/* Component palette */}
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-soft">أضف مكوّنًا:</span>
          {(Object.keys(COMPONENT_SPECS) as ComponentType[]).map((type) => (
            <button
              key={type}
              onClick={() => addComponent(type)}
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent-ink"
            >
              <IconPlus width={12} height={12} />
              {COMPONENT_SPECS[type].label}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_26rem]">
        {/* Canvas + board */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-xs text-muted">
                {pending
                  ? "اختر منفذًا من اللوحة لإكمال السلك"
                  : "اسحب المكوّنات · اضغط طرفًا لبدء سلك"}
              </span>
              {events && (
                <span className="flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted">
                  <IconClock width={11} height={11} />
                  {(clock / 1000).toFixed(1)}s / {(duration / 1000).toFixed(1)}s
                </span>
              )}
            </div>

            <div
              ref={canvasRef}
              onPointerDown={() => {
                setSelectedId(null);
                setPending(null);
              }}
              className="relative h-80 overflow-hidden bg-[radial-gradient(circle,var(--color-border)_1px,transparent_1px)] [background-size:16px_16px]"
            >
              {components.length === 0 && (
                <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">
                  أضف مكوّنًا من الأعلى لتبدأ
                </p>
              )}

              {components.map((component) => {
                const spec = COMPONENT_SPECS[component.type];
                const isSelected = selectedId === component.id;
                return (
                  <div
                    key={component.id}
                    style={{ left: component.x, top: component.y }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      onPointerDownComponent(event, component);
                    }}
                    className={`absolute cursor-move touch-none select-none rounded-md p-1 ${
                      isSelected ? "ring-2 ring-accent" : ""
                    }`}
                  >
                    <ComponentBody
                      component={component}
                      state={stateFor(component)}
                      onToggle={() =>
                        setComponents((prev) =>
                          prev.map((c) =>
                            c.id === component.id ? { ...c, pressed: !c.pressed } : c,
                          ),
                        )
                      }
                      onValueChange={(value) =>
                        setComponents((prev) =>
                          prev.map((c) => (c.id === component.id ? { ...c, value } : c)),
                        )
                      }
                    />

                    {/* Terminals */}
                    {spec.terminals.map((terminal) => {
                      const wire = wires.find(
                        (w) =>
                          w.componentId === component.id && w.terminalId === terminal.id,
                      );
                      const isPending =
                        pending?.componentId === component.id &&
                        pending.terminalId === terminal.id;
                      return (
                        <button
                          key={terminal.id}
                          title={`${terminal.label}${wire ? ` → ${pinLabel(wire.pin)}` : ""}`}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setPending({ componentId: component.id, terminalId: terminal.id });
                          }}
                          style={{ left: terminal.dx - 5, top: terminal.dy - 5 }}
                          className={`absolute size-3 rounded-full border transition-transform ${
                            isPending
                              ? "scale-150 border-accent bg-accent"
                              : wire
                                ? "border-emerald-500 bg-emerald-400"
                                : "border-border-strong bg-surface hover:scale-125"
                          }`}
                        />
                      );
                    })}

                    {/* Wire labels: which pin each terminal reaches */}
                    <div className="pointer-events-none absolute -bottom-4 left-0 flex gap-1">
                      {wires
                        .filter((w) => w.componentId === component.id)
                        .map((w) => (
                          <span
                            key={w.id}
                            className="rounded bg-emerald-500/15 px-1 font-mono text-[9px] text-emerald-600"
                          >
                            {pinLabel(w.pin)}
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Board pin rail */}
            <div className="border-t border-border bg-[#0b3d52] px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-en text-[10px] font-semibold tracking-wide text-white/70">
                  ARDUINO UNO
                </span>
                <span
                  className={`flex items-center gap-1.5 text-[10px] ${
                    events ? "text-emerald-300" : "text-white/40"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      events ? "bg-emerald-400" : "bg-white/30"
                    }`}
                  />
                  {events ? "يعمل" : "متوقف"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {BOARD_PINS.map((pin) => {
                  const active =
                    typeof pin === "number" && (pinDuty[pin] ?? 0) > 0;
                  const used = wires.some((w) => w.pin === pin);
                  return (
                    <button
                      key={String(pin)}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        connectTo(pin);
                      }}
                      disabled={!pending}
                      title={pending ? "وصّل هنا" : undefined}
                      className={`min-w-8 rounded px-1.5 py-1 font-mono text-[10px] tabular-nums transition-all ${
                        active
                          ? "bg-amber-300 text-amber-950 shadow-[0_0_8px_2px_rgba(252,211,77,0.6)]"
                          : used
                            ? "bg-emerald-400/25 text-emerald-200"
                            : "bg-white/10 text-white/50"
                      } ${pending ? "cursor-pointer ring-1 ring-white/40 hover:bg-white/25" : ""}`}
                    >
                      {pinLabel(pin)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Playback */}
            {events && (
              <div className="space-y-2 border-t border-border px-4 py-3">
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

          {/* Selected component controls */}
          {selected && (
            <Card className="flex flex-wrap items-center gap-3 p-3">
              <span className="text-xs text-ink-soft">
                {COMPONENT_SPECS[selected.type].label}
              </span>

              {selected.type === "led" && (
                <div className="flex items-center gap-1.5">
                  {LED_COLORS.map((color) => (
                    <button
                      key={color.key}
                      onClick={() =>
                        setComponents((prev) =>
                          prev.map((c) =>
                            c.id === selected.id ? { ...c, color: color.key } : c,
                          ),
                        )
                      }
                      title={color.label}
                      style={{ background: color.on }}
                      className={`size-5 rounded-full border-2 ${
                        selected.color === color.key
                          ? "border-accent"
                          : "border-transparent"
                      }`}
                    />
                  ))}
                </div>
              )}

              <div className="flex-1" />

              <button
                onClick={() => {
                  setWires((prev) => prev.filter((w) => w.componentId !== selected.id));
                }}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-warning hover:text-warning"
              >
                فصل الأسلاك
              </button>
              <button
                onClick={() => removeComponent(selected.id)}
                className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-danger hover:text-danger"
              >
                <IconTrash width={12} height={12} />
                حذف
              </button>
            </Card>
          )}

          {problems.length > 0 && (
            <Card className="p-3">
              <p className="mb-1.5 text-xs font-medium text-warning">تنبيهات التوصيل</p>
              <ul className="space-y-0.5">
                {problems.map((problem, index) => (
                  <li key={index} className="text-[11px] text-muted">
                    • {problem.message}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Editor + serial */}
        <div className="space-y-4">
          <Card className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="font-en text-xs text-muted">sketch.ino</span>
              <Button size="sm" onClick={run} disabled={isCompiling}>
                <IconPlay width={14} height={14} />
                {isCompiling ? "جارٍ الترجمة…" : "تشغيل"}
              </Button>
            </div>

            <div className="flex min-h-[18rem]" dir="ltr">
              <div
                aria-hidden="true"
                className="select-none border-l border-border bg-surface-2 px-2 py-3 text-left font-mono text-[11px] leading-6 text-muted"
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
                    setCode(value.slice(0, selectionStart) + "  " + value.slice(selectionEnd));
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
                className="flex-1 resize-none bg-surface px-3 py-3 text-left font-mono text-[13px] leading-6 text-ink outline-none"
              />
            </div>
          </Card>

          <Card className="flex flex-col overflow-hidden">
            <div className="border-b border-border px-4 py-2.5">
              <span className="text-xs text-muted">الشاشة التسلسلية</span>
            </div>
            <div className="h-40 overflow-auto px-4 py-3 font-mono text-xs leading-6">
              {compileError ? (
                <pre dir="ltr" className="whitespace-pre-wrap text-left text-danger">
                  {compileError}
                </pre>
              ) : serialLines.length === 0 ? (
                <p className="text-muted">
                  {events ? "لا يوجد إخراج تسلسلي." : "شغّل لتظهر النتيجة."}
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

          <div className="rounded-lg border border-border bg-surface px-4 py-3">
            <Badge tone="neutral">تنبيه</Badge>
            <p className="mt-2 text-[11px] leading-5 text-muted">
              هذه محاكاة لواجهة أردوينو البرمجية وللتوصيل المنطقي — وليست محاكيًا
              كهربائيًا: لا تُحسب الفولتية ولا التيار ولا قيم المقاومات، والتوقيت
              افتراضي. الكود يُترجم على خادم خارجي.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
