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

const mobileItems = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Holders", href: "/holders", icon: Users },
  { name: "Issue QR", href: "/holders/create", icon: QrCode },
  { name: "Import", href: "/holders/import", icon: Upload },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
      <div className="flex items-center justify-around">
        {mobileItems.map((item) => {
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
