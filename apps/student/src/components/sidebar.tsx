"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconHome,
  IconBook,
  IconMegaphone,
  IconLayers,
  IconSettings,
  IconNote,
  IconChat,
  IconExam,
  IconAward,
  IconCode,
  IconChip,
} from "./icons";

const UNREAD_POLL_MS = 20_000;

const links = [
  { href: "/", label: "الرئيسية", Icon: IconHome },
  { href: "/subjects", label: "المواد", Icon: IconBook },
  { href: "/notes", label: "ملاحظاتي", Icon: IconNote },
  { href: "/lab", label: "مختبر الأكواد", Icon: IconCode },
  { href: "/arduino", label: "مختبر أردوينو", Icon: IconChip },
  { href: "/exams", label: "الامتحانات", Icon: IconExam },
  { href: "/grades", label: "درجاتي", Icon: IconAward },
  { href: "/bookmarks", label: "المحفوظات", Icon: IconLayers },
  { href: "/chat", label: "التواصل", Icon: IconChat, badge: "chat" as const },
  { href: "/announcements", label: "الإعلانات", Icon: IconMegaphone },
  { href: "/settings", label: "حسابي", Icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const response = await fetch("/api/proxy/chat/unread").catch(() => null);
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
    // Floats inside the page rather than butting against its edge, so the
    // gradient mesh reads continuously behind and around it. Below md the
    // rail would eat most of a phone screen, so it gives way to the bottom
    // bar rendered by MobileNav.
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 py-4 pr-4 md:block">
      <div className="flex h-full flex-col rounded-2xl border bg-glass px-3 py-5 shadow-md">
        <div className="mb-7 flex items-center gap-2.5 px-2">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold text-white shadow-accent">
            مت
          </span>
          <div className="leading-tight">
            <p className="font-en text-sm font-semibold text-ink">Muslim Tech</p>
            <p className="text-[11px] text-muted">مسلم تك</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {links.map(({ href, label, Icon, badge }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            const count = badge === "chat" ? chatUnread : 0;
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ease-mt ${
                  isActive
                    ? "bg-surface font-medium text-accent-ink shadow-sm"
                    : "text-ink-soft hover:bg-surface/60 hover:text-ink"
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
      </div>
    </aside>
  );
}

/**
 * Phone navigation: the same destinations as the rail, as a fixed bottom bar.
 * Only the most-used five get a slot — the rest stay reachable from within
 * their sections — so the targets stay comfortably tappable.
 */
const MOBILE_LINKS = links.filter((link) =>
  ["/", "/subjects", "/exams", "/grades", "/chat"].includes(link.href),
);

export function MobileNav() {
  const pathname = usePathname();
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const response = await fetch("/api/proxy/chat/unread").catch(() => null);
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
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-glass px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="flex items-stretch justify-around">
        {MOBILE_LINKS.map(({ href, label, Icon, badge }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const count = badge === "chat" ? chatUnread : 0;
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] transition-colors ${
                isActive ? "text-accent-ink" : "text-muted"
              }`}
            >
              <Icon width={21} height={21} className={isActive ? "text-accent" : ""} />
              <span className="truncate">{label}</span>
              {count > 0 && (
                <span className="absolute top-0.5 left-1/2 flex min-w-4 translate-x-2 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium tabular-nums text-white">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
