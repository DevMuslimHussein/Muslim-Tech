"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, Input, Textarea, Button, Badge, Skeleton, EmptyState } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { IconChat, IconSend, IconSearch } from "@/components/icons";

const LIST_POLL_MS = 10_000;
const THREAD_POLL_MS = 4000;

interface Student {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  status: "active" | "suspended";
}

interface Conversation {
  id: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  adminUnread: number;
  student: Student;
}

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

function formatRelative(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return formatTime(iso);
  return date.toLocaleDateString("ar-IQ", { day: "numeric", month: "short" });
}

export function ChatConsole() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const loadList = useCallback(async (query: string) => {
    const params = query ? `?search=${encodeURIComponent(query)}` : "";
    const response = await fetch(`/api/proxy/admin/chat${params}`).catch(() => null);
    if (!response?.ok) {
      setConversations([]);
      return;
    }
    setConversations((await response.json()) as Conversation[]);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void loadList(search), 300);
    return () => clearTimeout(timeout);
  }, [search, loadList]);

  useEffect(() => {
    const timer = setInterval(() => void loadList(search), LIST_POLL_MS);
    return () => clearInterval(timer);
  }, [search, loadList]);

  return (
    <div className="grid h-[calc(100vh-11rem)] gap-4 lg:grid-cols-[20rem_1fr]">
      <Card className="flex flex-col overflow-hidden">
        <div className="border-b border-border p-3">
          <div className="relative">
            <IconSearch
              width={16}
              height={16}
              className="pointer-events-none absolute inset-y-0 right-3 my-auto text-muted"
            />
            <Input
              type="search"
              placeholder="بحث عن طالب"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pr-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations === null ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">
              {search ? "لا نتائج مطابقة" : "لا توجد محادثات بعد"}
            </p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => {
                  setActiveId(conversation.id);
                  setConversations(
                    (current) =>
                      current?.map((c) =>
                        c.id === conversation.id ? { ...c, adminUnread: 0 } : c,
                      ) ?? null,
                  );
                }}
                className={`flex w-full items-start gap-3 border-b border-border px-4 py-3 text-right transition-colors last:border-0 ${
                  activeId === conversation.id
                    ? "bg-accent-soft"
                    : "hover:bg-surface-2"
                }`}
              >
                <Avatar
                  name={conversation.student.fullName}
                  src={conversation.student.avatarUrl}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm text-ink">
                      {conversation.student.fullName}
                    </p>
                    <span className="shrink-0 text-[11px] text-muted">
                      {formatRelative(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {conversation.lastMessagePreview}
                  </p>
                </div>
                {conversation.adminUnread > 0 && (
                  <span className="mt-1 flex min-w-5 shrink-0 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
                    {conversation.adminUnread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </Card>

      {activeId ? (
        <Thread
          key={activeId}
          conversationId={activeId}
          onSent={() => void loadList(search)}
        />
      ) : (
        <Card className="flex items-center justify-center">
          <EmptyState
            icon={<IconChat />}
            title="اختر محادثة"
            description="اختر طالبًا من القائمة لعرض الرسائل والرد عليه."
          />
        </Card>
      )}
    </div>
  );
}

function Thread({
  conversationId,
  onSent,
}: {
  conversationId: string;
  onSent: () => void;
}) {
  const [student, setStudent] = useState<Student | null>(null);
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
      const response = await fetch(`/api/proxy/admin/chat/${conversationId}`).catch(
        () => null,
      );
      if (cancelled || !response?.ok) {
        if (!cancelled) setMessages([]);
        return;
      }
      const data = (await response.json()) as {
        student: Student;
        messages: Message[];
      };
      if (cancelled) return;
      setStudent(data.student);
      setMessages(data.messages);
      lastAtRef.current = data.messages.at(-1)?.createdAt ?? null;
    }

    void loadAll();

    const timer = setInterval(async () => {
      const since = lastAtRef.current;
      const url = since
        ? `/api/proxy/admin/chat/${conversationId}?since=${encodeURIComponent(since)}`
        : `/api/proxy/admin/chat/${conversationId}`;
      const response = await fetch(url).catch(() => null);
      if (cancelled || !response?.ok) return;
      const data = (await response.json()) as { messages: Message[] };
      appendUnique(data.messages);
    }, THREAD_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [conversationId, appendUnique]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isSending) return;

    setIsSending(true);
    setDraft("");
    const response = await fetch(`/api/proxy/admin/chat/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }).catch(() => null);

    if (response?.ok) {
      appendUnique([(await response.json()) as Message]);
      onSent();
    } else {
      setDraft(body);
    }
    setIsSending(false);
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        {student && (
          <>
            <Avatar name={student.fullName} src={student.avatarUrl} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {student.fullName}
              </p>
              <p className="truncate font-en text-xs text-muted">
                @{student.username}
              </p>
            </div>
            <Badge tone={student.status === "active" ? "success" : "danger"}>
              {student.status === "active" ? "نشط" : "موقوف"}
            </Badge>
          </>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages === null ? (
          <>
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="mr-auto h-12 w-1/2" />
          </>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.fromAdmin ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                  message.fromAdmin
                    ? "rounded-tl-sm bg-accent text-accent-contrast"
                    : "rounded-tr-sm bg-surface-2 text-ink"
                }`}
              >
                {message.fromAdmin && message.sender && (
                  <p className="mb-0.5 text-xs opacity-75">
                    {message.sender.fullName}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm/relaxed">{message.body}</p>
                <p
                  className={`mt-1 text-[11px] tabular-nums ${
                    message.fromAdmin ? "opacity-70" : "text-muted"
                  }`}
                >
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="flex items-end gap-2 border-t border-border px-4 py-3"
      >
        <Textarea
          rows={1}
          placeholder="اكتب ردك…"
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
