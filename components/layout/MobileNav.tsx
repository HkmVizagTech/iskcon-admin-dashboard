"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  QrCode,
  Upload,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";

const mobileItems: {
  name: string;
  href: string;
  icon: any;
  requires?: "canViewReports" | "canViewScanFeed";
  adminOnly?: boolean;
}[] = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard, requires: "canViewReports" },
  { name: "Events", href: "/events", icon: Calendar, adminOnly: true },
  { name: "Holders", href: "/holders", icon: Users },
  { name: "Issue QR", href: "/holders/create", icon: QrCode },
  { name: "Import", href: "/holders/import", icon: Upload },
];

const ADMIN_ROLES = ["super_admin", "event_admin", "campaign_manager"];

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Same rules as the desktop Sidebar — a restricted issuer must not be handed
  // a tab that would only 403.
  const visibleItems = mobileItems.filter((item) => {
    if (item.requires && !can(user, item.requires)) return false;
    if (item.adminOnly && !ADMIN_ROLES.includes(user?.role || "")) return false;
    return true;
  });

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
      <div className="flex items-center justify-around">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center py-2 px-4
                ${isActive ? "text-orange-600" : "text-gray-400"}
              `}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
