"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { visibleNavItems, activeHref, SECTION_LABELS, type NavItem } from "./navItems";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  event_admin: "Event Admin",
  campaign_manager: "Campaign Manager",
  issuer: "Issuer",
  announcer: "Announcer",
  preacher: "Preacher",
  volunteer: "Volunteer",
};

function NavLinks({
  items,
  active,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  active: string | null;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const sections = (["main", "passes", "people", "admin"] as const)
    .map((s) => ({ s, list: items.filter((i) => i.section === s) }))
    .filter((g) => g.list.length > 0);

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {sections.map(({ s, list }) => (
        <div key={s} className="space-y-1">
          {!collapsed && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {SECTION_LABELS[s]}
            </p>
          )}
          {list.map((item) => {
            const isActive = item.href === active;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.name : undefined}
                className={`flex items-center rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
                  isActive
                    ? "bg-gradient-to-r from-orange-50 to-red-50 text-orange-600 font-semibold"
                    : "text-gray-600 hover:bg-gray-50 font-medium"
                } ${collapsed ? "justify-center" : "gap-3"}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const items = visibleNavItems(user);
  const active = activeHref(items, pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    document.addEventListener("toggle-sidebar", handleToggle);
    return () => document.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  // Close the drawer on navigation and lock page scroll while it is open.
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 z-20 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <NavLinks items={items} active={active} collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center p-4 border-t border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </aside>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
        <aside
          className={`absolute inset-y-0 left-0 w-[82%] max-w-xs bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">🕉️</span>
              </div>
              <div className="leading-tight">
                <p className="font-semibold text-gray-900">Seva Pass</p>
                <p className="text-xs text-gray-500">HKM Visakhapatnam</p>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 -mr-2 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <NavLinks items={items} active={active} onNavigate={() => setMobileOpen(false)} />

          <div className="border-t border-gray-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
              {user?.name?.charAt(0) || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{ROLE_LABEL[user?.role || ""] || user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-red-600 hover:bg-red-50"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
