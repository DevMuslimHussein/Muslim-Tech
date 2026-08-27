"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, PageHeader, Button, Badge } from "@/components/ui";
import { IconPlay, IconTrash, IconClock } from "@/components/icons";

const PYODIDE_VERSION = "0.28.3";
const WANDBOX_ENDPOINT = "https://wandbox.org/api/compile.json";

type Language = "python" | "cpp";

const STARTERS: Record<Language, string> = {
  python: `# اكتب كودك هنا
name = "مسلم تك"
print(f"مرحبًا من {name}")

for i in range(1, 6):
    print(i, "×", i, "=", i * i)
`,
  cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string name = "مسلم تك";
    cout << "مرحبًا من " << name << endl;

    for (int i = 1; i <= 5; i++) {
        cout << i << " x " << i << " = " << i * i << endl;
    }
    return 0;
}
`,
};

const LANGUAGE_META: Record<Language, { label: string; where: string }> = {
  python: { label: "Python", where: "يشتغل داخل متصفحك" },
  cpp: { label: "C++", where: "يُترجم على خادم خارجي" },
};

interface PyodideRuntime {
  runPythonAsync(code: string): Promise<unknown>;
  setStdout(options: { batched: (text: string) => void }): void;
  setStderr(options: { batched: (text: string) => void }): void;
  setStdin(options: { stdin: () => string | null }): void;
}

declare global {
  interface Window {
    loadPyodide?: (options?: { indexURL?: string }) => Promise<PyodideRuntime>;
  }
}

let pyodidePromise: Promise<PyodideRuntime> | null = null;

/** Loads the Python runtime once and reuses it for every later run. */
function loadPyodide(onProgress: (message: string) => void): Promise<PyodideRuntime> {
  if (pyodidePromise) return pyodidePromise;

  pyodidePromise = (async () => {
    if (!window.loadPyodide) {
      onProgress("جارٍ تحميل محرّك بايثون… (مرة واحدة فقط)");
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("تعذّر تحميل محرّك بايثون"));
        document.head.appendChild(script);
      });
    }
    onProgress("جارٍ تهيئة بايثون…");
    return window.loadPyodide!({
      indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
    });
  })();

  // A failed load must not be cached, or retrying would never re-attempt.
  pyodidePromise.catch(() => {
    pyodidePromise = null;
  });

  return pyodidePromise;
}

export function CodeLab() {
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(STARTERS.python);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState<{ text: string; isError: boolean }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Restore the last draft per language so a refresh does not lose work.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mt_lab_${language}`);
      setCode(saved ?? STARTERS[language]);
    } catch {
      setCode(STARTERS[language]);
    }
    setOutput([]);
    setElapsed(null);
  }, [language]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`mt_lab_${language}`, code);
      } catch {
        // Private browsing or blocked storage — drafts just will not persist.
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [code, language]);

  const runPython = useCallback(
    async (source: string, input: string) => {
      const pyodide = await loadPyodide(setStatus);
      setStatus(null);

      const lines = input.split("\n");
      let cursor = 0;
      pyodide.setStdin({ stdin: () => (cursor < lines.length ? lines[cursor++] : null) });
      pyodide.setStdout({
        batched: (text) => setOutput((prev) => [...prev, { text, isError: false }]),
      });
      pyodide.setStderr({
        batched: (text) => setOutput((prev) => [...prev, { text, isError: true }]),
      });

      try {
        await pyodide.runPythonAsync(source);
      } catch (error) {
        setOutput((prev) => [
          ...prev,
          { text: error instanceof Error ? error.message : String(error), isError: true },
        ]);
      }
    },
    [],
  );

  const runCpp = useCallback(async (source: string, input: string) => {
    setStatus("جارٍ الترجمة والتشغيل…");
    const response = await fetch(WANDBOX_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler: "gcc-head",
        code: source,
        stdin: input,
        options: "warning,gnu++17",
      }),
    });
    setStatus(null);

    if (!response.ok) {
      throw new Error("تعذّر الوصول لخادم الترجمة — تحقّق من اتصالك");
    }

    const result = (await response.json()) as {
      status: string;
      compiler_error?: string;
      program_output?: string;
      program_error?: string;
    };

    const chunks: { text: string; isError: boolean }[] = [];
    if (result.compiler_error?.trim()) {
      chunks.push({ text: result.compiler_error, isError: true });
    }
    if (result.program_output) {
      chunks.push({ text: result.program_output, isError: false });
    }
    if (result.program_error?.trim()) {
      chunks.push({ text: result.program_error, isError: true });
    }
    if (chunks.length === 0) {
      chunks.push({ text: "(البرنامج لم يُخرج شيئًا)", isError: false });
    }
    setOutput(chunks);
  }, []);

  async function run() {
    if (isRunning) return;
    setIsRunning(true);
    setOutput([]);
    setElapsed(null);
    const startedAt = Date.now();

    try {
      if (language === "python") {
        await runPython(code, stdin);
      } else {
        await runCpp(code, stdin);
      }
    } catch (error) {
      setOutput([
        {
          text: error instanceof Error ? error.message : "حدث خطأ غير متوقّع",
          isError: true,
        },
      ]);
    } finally {
      setStatus(null);
      setElapsed(Date.now() - startedAt);
      setIsRunning(false);
    }
  }

  /** Tab should indent instead of moving focus out of the editor. */
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Tab") {
      event.preventDefault();
      const target = event.currentTarget;
      const { selectionStart, selectionEnd, value } = target;
      const next = value.slice(0, selectionStart) + "    " + value.slice(selectionEnd);
      setCode(next);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = selectionStart + 4;
      });
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void run();
    }
  }

  const lineCount = code.split("\n").length;

  return (
    <div>
      <PageHeader
        title="مختبر الأكواد"
        subtitle="اكتب كودك وشغّله وشوف النتيجة فورًا"
        action={
          <div className="flex items-center gap-2">
            {(["python", "cpp"] as Language[]).map((value) => (
              <button
                key={value}
                onClick={() => setLanguage(value)}
                className={`rounded-md border px-3 py-1.5 font-en text-xs transition-colors ${
                  language === value
                    ? "border-accent bg-accent-soft text-accent-ink"
                    : "border-border text-ink-soft hover:border-border-strong hover:bg-surface-2"
                }`}
              >
                {LANGUAGE_META[value].label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="font-en text-xs text-muted">
              {language === "python" ? "main.py" : "main.cpp"}
            </span>
            <button
              onClick={() => setCode(STARTERS[language])}
              className="text-xs text-muted transition-colors hover:text-ink"
            >
              استعادة المثال
            </button>
          </div>

          <div className="relative flex min-h-[22rem] flex-1" dir="ltr">
            <div
              aria-hidden="true"
              className="select-none border-l border-border bg-surface-2 px-2.5 py-3 text-left font-mono text-xs leading-6 text-muted"
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={editorRef}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="flex-1 resize-none bg-surface px-3 py-3 text-left font-mono text-sm leading-6 text-ink outline-none"
            />
          </div>

          <div className="border-t border-border px-4 py-3">
            <label className="mb-1.5 block text-xs text-ink-soft">
              مدخلات البرنامج (اختياري) — كل سطر إدخال منفصل
            </label>
            <textarea
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              rows={2}
              dir="ltr"
              placeholder="input()"
              className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-left font-mono text-xs text-ink outline-none placeholder:text-muted focus:border-accent"
            />
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-[11px] text-muted">
              {LANGUAGE_META[language].where} · Ctrl+Enter للتشغيل
            </span>
            <Button onClick={run} disabled={isRunning}>
              <IconPlay width={15} height={15} />
              {isRunning ? "جارٍ التشغيل…" : "تشغيل"}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-xs text-muted">النتيجة</span>
            <div className="flex items-center gap-2">
              {elapsed !== null && (
                <span className="flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted">
                  <IconClock width={11} height={11} />
                  {elapsed} ms
                </span>
              )}
              {output.length > 0 && (
                <button
                  onClick={() => setOutput([])}
                  aria-label="مسح النتيجة"
                  className="rounded p-1 text-muted transition-colors hover:text-ink"
                >
                  <IconTrash width={13} height={13} />
                </button>
              )}
            </div>
          </div>

          <div
            dir="ltr"
            className="min-h-[22rem] flex-1 overflow-auto bg-surface-2/40 px-4 py-3 text-left font-mono text-sm leading-6"
          >
            {status ? (
              <p className="text-muted">{status}</p>
            ) : output.length === 0 ? (
              <p className="text-muted" dir="rtl">
                اضغط «تشغيل» لتظهر النتيجة هنا.
              </p>
            ) : (
              output.map((chunk, index) => (
                <pre
                  key={index}
                  className={`whitespace-pre-wrap break-words ${
                    chunk.isError ? "text-danger" : "text-ink"
                  }`}
                >
                  {chunk.text}
                </pre>
              ))
            )}
          </div>

          {language === "cpp" && (
            <p className="border-t border-border px-4 py-2 text-[11px] text-muted">
              أكواد ‏C++‎ تُرسل لخادم ترجمة خارجي — لا تكتب فيها بيانات حساسة.
            </p>
          )}
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 rounded-lg border border-border bg-surface px-4 py-3 text-xs text-muted">
        <span>
          <Badge tone="neutral">Python</Badge> يشتغل داخل متصفحك — أول تشغيل يحتاج
          تحميلًا لمرة واحدة، وبعدها فوري وبلا إنترنت.
        </span>
        <span>
          <Badge tone="neutral">C++</Badge> ترجمة كاملة بـ GCC مع دعم STL.
        </span>
      </div>
    </div>
  );
}
