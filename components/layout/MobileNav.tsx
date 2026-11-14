"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { visibleNavItems, activeHref } from "./navItems";

// Bottom tab bar on phones: the 4 most-used pages the user can access, plus
// "More", which opens the full menu drawer — so every page stays reachable.
const PREFERRED = ["/dashboard", "/events", "/holders", "/holders/create", "/holders/import", "/scanfeed"];

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = visibleNavItems(user);
  const tabs = PREFERRED.map((h) => items.find((i) => i.href === h))
    .filter((i): i is NonNullable<typeof i> => !!i)
    .slice(0, 4);
  const active = activeHref(items, pathname);
  const moreActive = !!active && !tabs.some((t) => t.href === active);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
        {tabs.map((item) => {
          const isActive = item.href === active;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] ${
                isActive ? "text-orange-600" : "text-gray-500"
              }`}
            >
              {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-orange-500" />}
              <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.4 : 2} />
              <span className={`text-[11px] ${isActive ? "font-semibold" : "font-medium"}`}>
                {item.short || item.name}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => document.dispatchEvent(new CustomEvent("toggle-sidebar"))}
          className={`relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] ${
            moreActive ? "text-orange-600" : "text-gray-500"
          }`}
        >
          {moreActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-orange-500" />}
          <Menu className="w-[22px] h-[22px]" />
          <span className={`text-[11px] ${moreActive ? "font-semibold" : "font-medium"}`}>More</span>
        </button>
      </div>
    </nav>
  );
}
