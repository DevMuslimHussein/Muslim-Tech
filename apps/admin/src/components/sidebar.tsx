"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconHome,
  IconUsers,
  IconBook,
  IconPlay,
  IconMegaphone,
  IconBell,
  IconHistory,
  IconSettings,
  IconChat,
} from "./icons";

const UNREAD_POLL_MS = 15_000;

const links = [
  { href: "/", label: "الرئيسية", Icon: IconHome },
  { href: "/students", label: "الطلاب", Icon: IconUsers },
  { href: "/chat", label: "المحادثات", Icon: IconChat, badge: "chat" as const },
  { href: "/subjects", label: "المواد", Icon: IconBook },
  { href: "/lectures", label: "المحاضرات", Icon: IconPlay },
  { href: "/announcements", label: "الإعلانات", Icon: IconMegaphone },
  { href: "/notifications", label: "التنبيهات", Icon: IconBell },
  { href: "/audit", label: "سجل النشاط", Icon: IconHistory },
  { href: "/settings", label: "الإعدادات", Icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const response = await fetch("/api/proxy/admin/chat/unread").catch(() => null);
      if (cancelled || !response?.ok) return;
      const data = (await response.json()) as { unread: number };
      setChatUnread(data.unread);
    }

    void check();
    const timer = setInterval(check, UNREAD_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pathname]);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-l border-border bg-bg-elevated px-3 py-5">
      <div className="mb-8 flex items-center gap-2.5 px-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-gradient-brand text-sm font-bold text-white shadow-accent">
          مت
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-ink">إدارة المنصة</p>
          <p className="text-[11px] text-muted">مسلم تك</p>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {links.map(({ href, label, Icon, badge }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const count = badge === "chat" ? chatUnread : 0;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150 ease-mt ${
                isActive
                  ? "bg-accent-soft font-medium text-accent-ink"
                  : "text-ink-soft hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon
                width={18}
                height={18}
                className={isActive ? "text-accent" : "text-muted group-hover:text-ink-soft"}
              />
              <span className="flex-1">{label}</span>
              {count > 0 && (
                <span className="flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
