"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Menu, LogOut, Settings } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="bg-white/95 backdrop-blur border-b border-gray-200 sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
      <div className="px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 lg:h-16 gap-2">
          <div className="flex items-center gap-1 min-w-0">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100"
              onClick={() => document.dispatchEvent(new CustomEvent("toggle-sidebar"))}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>

            <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-base">🕉️</span>
              </div>
              <span className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                <span className="sm:hidden">Seva Pass</span>
                <span className="hidden sm:inline">ISKCON Seva Pass</span>
              </span>
            </Link>
          </div>

          {/* User menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Account menu"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-medium">
                {user?.name?.charAt(0) || "A"}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">{user?.name}</span>
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 md:hidden">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email || user?.phone}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/settings"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowDropdown(false)}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        logout();
                      }}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
