import {
  LayoutDashboard,
  Calendar,
  Users,
  QrCode,
  Upload,
  BarChart3,
  BookOpen,
  Settings,
  AlertTriangle,
  ScanLine,
  KeyRound,
  HandHeart,
} from "lucide-react";
import { can, isUnrestricted } from "@/lib/permissions";

// One menu definition for the desktop sidebar, the mobile drawer and the
// mobile bottom bar, so the three can never disagree about who sees what.
//
// `requires` names a permission flag that must not be false for the item to
// show, `adminOnly` limits an item to the roles that can actually use it, and
// `superAdminOnly` to super_admin.
// Hiding is cosmetic — every one of these routes is enforced server-side too.
export type NavItem = {
  name: string;
  short?: string; // label in the mobile bottom bar
  href: string;
  icon: any;
  section: "main" | "passes" | "people" | "admin";
  requires?: "canViewReports" | "canViewScanFeed";
  adminOnly?: boolean;
  superAdminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", short: "Home", href: "/dashboard", icon: LayoutDashboard, section: "main", requires: "canViewReports" },
  { name: "Events", href: "/events", icon: Calendar, section: "main", adminOnly: true },
  { name: "Live Scan", href: "/scanfeed", icon: ScanLine, section: "main", requires: "canViewScanFeed" },
  { name: "Reports", href: "/reports", icon: BarChart3, section: "main", requires: "canViewReports" },
  { name: "Holders", href: "/holders", icon: Users, section: "passes" },
  { name: "Issue QR Pass", short: "Issue QR", href: "/holders/create", icon: QrCode, section: "passes" },
  { name: "Bulk Import", short: "Import", href: "/holders/import", icon: Upload, section: "passes" },
  { name: "Failed Imports", href: "/holders/failed", icon: AlertTriangle, section: "passes" },
  { name: "Volunteers", href: "/volunteers", icon: HandHeart, section: "people", adminOnly: true },
  { name: "Preachers", href: "/preachers", icon: BookOpen, section: "people", adminOnly: true },
  { name: "Client Apps", href: "/clients", icon: KeyRound, section: "admin", superAdminOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, section: "admin" },
];

export const SECTION_LABELS: Record<NavItem["section"], string> = {
  main: "Overview",
  passes: "Passes",
  people: "People",
  admin: "Admin",
};

const ADMIN_ROLES = ["super_admin", "event_admin", "campaign_manager"];

export function visibleNavItems(user: any): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.requires && !can(user, item.requires)) return false;
    if (item.adminOnly && !ADMIN_ROLES.includes(user?.role || "")) return false;
    if (item.superAdminOnly && !isUnrestricted(user)) return false;
    return true;
  });
}

/** The most specific item matching the path ("/holders/create" beats "/holders"). */
export function activeHref(items: NavItem[], pathname: string | null): string | null {
  if (!pathname) return null;
  const matches = items.filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  matches.sort((a, b) => b.href.length - a.href.length);
  return matches[0]?.href ?? null;
}
