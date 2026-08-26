"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconBell } from "./icons";

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  type: string;
  deepLink: string | null;
  createdAt: string;
  isRead: boolean;
}

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(async () => {
    const response = await fetch("/api/proxy/notifications/unread-count");
    if (response.ok) {
      const data = (await response.json()) as { count: number };
      setUnread(data.count);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    loadCount();
    const timer = setInterval(loadCount, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadCount]);

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  async function open() {
    setIsOpen(true);
    const response = await fetch("/api/proxy/notifications");
    if (response.ok) setRows((await response.json()) as NotificationRow[]);
  }

  async function markAllRead() {
    await fetch("/api/proxy/notifications/read-all", { method: "PATCH" });
    setUnread(0);
    setRows((prev) => prev?.map((row) => ({ ...row, isRead: true })) ?? null);
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        aria-label={`التنبيهات${unread > 0 ? ` — ${unread} غير مقروء` : ""}`}
        aria-expanded={isOpen}
        className="relative rounded-md p-2 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <IconBell width={19} height={19} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] font-bold leading-4 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="mt-pop-in absolute left-0 top-full z-30 mt-2 w-88 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-ink">التنبيهات</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-accent-ink transition-opacity hover:opacity-75">
                تعليم الكل كمقروء
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {rows === null ? (
              <div className="space-y-2 p-4">
                <div className="mt-skeleton h-12 w-full" />
                <div className="mt-skeleton h-12 w-full" />
              </div>
            ) : rows.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">لا توجد تنبيهات</p>
            ) : (
              <ul>
                {rows.map((row) => {
                  const content = (
                    <>
                      <div className="flex items-start gap-2.5">
                        {!row.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />}
                        <div className={`min-w-0 ${row.isRead ? "pr-4.5" : ""}`}>
                          <p className={`text-sm ${row.isRead ? "text-ink-soft" : "font-medium text-ink"}`}>
                            {row.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{row.body}</p>
                          <p className="mt-1 text-[11px] text-muted">
                            {new Date(row.createdAt).toLocaleString("ar-IQ", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                      </div>
                    </>
                  );

                  return (
                    <li key={row.id} className="border-b border-border last:border-0">
                      {row.deepLink ? (
                        <Link
                          href={row.deepLink}
                          onClick={() => setIsOpen(false)}
                          className="block px-4 py-3 transition-colors hover:bg-surface-2"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="px-4 py-3">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
