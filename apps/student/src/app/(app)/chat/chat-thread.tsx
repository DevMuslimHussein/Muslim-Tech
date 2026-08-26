"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, Textarea, Button, Skeleton } from "@/components/ui";
import { IconChat, IconSend } from "@/components/icons";

const POLL_MS = 4000;

interface Message {
  id: string;
  body: string;
  fromAdmin: boolean;
  createdAt: string;
  sender: { id: string; fullName: string; avatarUrl: string | null } | null;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-IQ", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDay(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return "اليوم";
  return date.toLocaleDateString("ar-IQ", {
    day: "numeric",
    month: "long",
  });
}

export function ChatThread() {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAtRef = useRef<string | null>(null);

  const appendUnique = useCallback((incoming: Message[]) => {
    if (incoming.length === 0) return;
    setMessages((current) => {
      const existing = new Set((current ?? []).map((m) => m.id));
      const added = incoming.filter((m) => !existing.has(m.id));
      if (added.length === 0) return current;
      return [...(current ?? []), ...added];
    });
    lastAtRef.current = incoming[incoming.length - 1].createdAt;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      const response = await fetch("/api/proxy/chat").catch(() => null);
      if (cancelled || !response?.ok) {
        if (!cancelled) setMessages([]);
        return;
      }
      const data = (await response.json()) as { messages: Message[] };
      if (cancelled) return;
      setMessages(data.messages);
      lastAtRef.current = data.messages.at(-1)?.createdAt ?? null;
    }

    void loadAll();

    const timer = setInterval(async () => {
      const since = lastAtRef.current;
      const url = since
        ? `/api/proxy/chat?since=${encodeURIComponent(since)}`
        : "/api/proxy/chat";
      const response = await fetch(url).catch(() => null);
      if (cancelled || !response?.ok) return;
      const data = (await response.json()) as { messages: Message[] };
      appendUnique(data.messages);
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [appendUnique]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isSending) return;

    setIsSending(true);
    setDraft("");
    const response = await fetch("/api/proxy/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }).catch(() => null);

    if (response?.ok) {
      const message = (await response.json()) as Message;
      appendUnique([message]);
    } else {
      setDraft(body);
    }
    setIsSending(false);
  }

  let lastDay: string | null = null;

  return (
    <Card className="flex h-[calc(100vh-11rem)] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <IconChat width={18} height={18} />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">الإدارة</p>
          <p className="text-xs text-muted">
            اسأل عن أي شيء يخص المحاضرات أو حسابك
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages === null ? (
          <>
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="mr-auto h-12 w-1/2" />
            <Skeleton className="h-12 w-3/5" />
          </>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted">
              <IconChat width={22} height={22} />
            </span>
            <p className="text-sm text-ink">ابدأ المحادثة مع الإدارة</p>
            <p className="mt-1 max-w-xs text-xs text-muted">
              اكتب سؤالك في الأسفل وسيصلك الرد هنا مباشرة.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const day = formatDay(message.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;

            return (
              <div key={message.id}>
                {showDay && (
                  <div className="my-3 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted">{day}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div
                  className={`flex ${message.fromAdmin ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                      message.fromAdmin
                        ? "rounded-tr-sm bg-surface-2 text-ink"
                        : "rounded-tl-sm bg-accent text-accent-contrast"
                    }`}
                  >
                    {message.fromAdmin && (
                      <p className="mb-0.5 text-xs font-medium text-accent-ink">
                        الإدارة
                      </p>
                    )}
                    <p className="whitespace-pre-wrap text-sm/relaxed">
                      {message.body}
                    </p>
                    <p
                      className={`mt-1 text-[11px] tabular-nums ${
                        message.fromAdmin ? "text-muted" : "opacity-70"
                      }`}
                    >
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="flex items-end gap-2 border-t border-border px-4 py-3"
      >
        <Textarea
          rows={1}
          placeholder="اكتب رسالتك…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(event);
            }
          }}
          className="max-h-32 min-h-10 resize-none py-2.5"
        />
        <Button type="submit" disabled={!draft.trim() || isSending} className="shrink-0">
          <IconSend width={16} height={16} />
        </Button>
      </form>
    </Card>
  );
}
