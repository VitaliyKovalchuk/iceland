"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today" },
  { href: "/days", label: "Days" },
  { href: "/near", label: "Map" },
  { href: "/booked", label: "Stays" },
];

export default function Nav() {
  const path = usePathname();
  const active = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-500 border-t border-[var(--color-line)]
                 bg-[var(--color-surface)]/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-3xl">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active(t.href) ? "page" : undefined}
            className={`flex-1 py-3 text-center text-[13px] font-medium transition-colors ${
              active(t.href)
                ? "text-[var(--color-accent-ink)]"
                : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]"
            }`}
          >
            <span
              className={`block border-t-2 pt-2 ${
                active(t.href) ? "border-[var(--color-accent)]" : "border-transparent"
              }`}
            >
              {t.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
