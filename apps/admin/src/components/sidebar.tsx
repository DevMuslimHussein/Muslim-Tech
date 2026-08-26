"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconUsers,
  IconBook,
  IconPlay,
  IconMegaphone,
  IconBell,
  IconHistory,
  IconSettings,
} from "./icons";

const links = [
  { href: "/", label: "الرئيسية", Icon: IconHome },
  { href: "/students", label: "الطلاب", Icon: IconUsers },
  { href: "/subjects", label: "المواد", Icon: IconBook },
  { href: "/lectures", label: "المحاضرات", Icon: IconPlay },
  { href: "/announcements", label: "الإعلانات", Icon: IconMegaphone },
  { href: "/notifications", label: "التنبيهات", Icon: IconBell },
  { href: "/audit", label: "سجل النشاط", Icon: IconHistory },
  { href: "/settings", label: "الإعدادات", Icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();

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
        {links.map(({ href, label, Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
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
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
