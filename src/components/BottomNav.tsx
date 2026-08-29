"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cls } from "@/lib/util";

const ITEMS = [
  {
    href: "/",
    label: "Today",
    icon: (
      // dumbbell
      <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
    ),
  },
  {
    href: "/log",
    label: "Log",
    icon: (
      // clipboard-list
      <path d="M9 4h6v3H9zM9 4a2 2 0 0 0-2 2v0H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1M9 12h6M9 16h6" />
    ),
  },
  {
    href: "/progress",
    label: "Progress",
    icon: (
      // trending-up
      <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md">
        {ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" || pathname.startsWith("/history") : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cls(
                "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold tracking-wide transition-colors active:scale-[0.97]",
                active ? "text-volt" : "text-mid",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {item.icon}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
