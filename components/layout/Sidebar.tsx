"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  QrCode,
  Upload,
  BarChart3, BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ScanLine,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";

// `requires` names a permission flag that must not be false for the item to
// show, and `adminOnly` limits an item to the roles that can actually use it.
// Hiding is cosmetic — every one of these routes is enforced server-side too.
const menuItems: {
  name: string;
  href: string;
  icon: any;
  requires?: "canViewReports" | "canViewScanFeed";
  adminOnly?: boolean;
}[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, requires: "canViewReports" },
  { name: "Events", href: "/events", icon: Calendar, adminOnly: true },
  { name: "Holders", href: "/holders", icon: Users },
  { name: "Issue QR Pass", href: "/holders/create", icon: QrCode },
  { name: "Bulk Import", href: "/holders/import", icon: Upload },
  { name: "Failed Imports", href: "/holders/failed", icon: AlertTriangle },
  { name: "Reports", href: "/reports", icon: BarChart3, requires: "canViewReports" },
  { name: "Live Scan", href: "/scanfeed", icon: ScanLine, requires: "canViewScanFeed" },
  { name: "Volunteers", href: "/volunteers", icon: Users, adminOnly: true },
  { name: "Preachers", href: "/preachers", icon: BookOpen, adminOnly: true },
  { name: "Settings", href: "/settings", icon: Settings },
];

const ADMIN_ROLES = ["super_admin", "event_admin", "campaign_manager"];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const visibleItems = menuItems.filter((item) => {
    if (item.requires && !can(user, item.requires)) return false;
    if (item.adminOnly && !ADMIN_ROLES.includes(user?.role || "")) return false;
    return true;
  });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    document.addEventListener("toggle-sidebar", handleToggle);
    return () => document.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white border-r border-gray-200
        transition-all duration-300 z-40
        ${collapsed ? "w-20" : "w-64"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="flex flex-col h-full">
          <nav className="flex-1 p-4 space-y-1">
            {visibleItems.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center px-3 py-3 rounded-lg transition-colors
                    ${
                      isActive
                        ? "bg-gradient-to-r from-orange-50 to-red-50 text-orange-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }
                    ${collapsed ? "justify-center" : "space-x-3"}
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="font-medium">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center p-4 border-t border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
