"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Maximize2, Printer } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import toast from "react-hot-toast";

const TIER_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  A: { bg: "bg-amber-50",  text: "text-amber-900",  border: "border-amber-300", label: "Tier A" },
  B: { bg: "bg-slate-50",  text: "text-slate-900",  border: "border-slate-300", label: "Tier B" },
  C: { bg: "bg-orange-50", text: "text-orange-900", border: "border-orange-300", label: "Tier C" },
  "—": { bg: "bg-gray-50", text: "text-gray-800",   border: "border-gray-200",  label: "Others" },
};

const TIER_CHIP: Record<string, string> = {
  A: "bg-amber-400 text-white",
  B: "bg-slate-400 text-white",
  C: "bg-orange-400 text-white",
};

type Session = "all" | "morning" | "evening";

export default function BahumanaAnnouncementPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [fullscreen, setFullscreen] = useState(false);
  const [session, setSession] = useState<Session>("all");
  const { user, logout } = useAuth();
  const isAnnouncer = user?.role === "announcer" || user?.permissions?.canBahumanaView === true;

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["bahumana-announcement", eventId, session],
    queryFn: async () => {
      const res = await api.get(
        `/reports/events/${eventId}/bahumana-announcement?session=${session}`
      );
      return res.data;
    },
    refetchInterval: 30000,
  });

  const sessions = data?.sessions || {};
  const grouped: { tier: string; holders: any[] }[] = data?.grouped || [];

  const SESSION_TABS: { key: Session; emoji: string; label: string }[] = [
    { key: "all",     emoji: "🕉️", label: "All Sessions" },
    { key: "morning", emoji: "🌅", label: "Morning" },
    { key: "evening", emoji: "🌆", label: "Evening" },
  ];

  return (
    <div className={fullscreen ? "fixed inset-0 z-[200] bg-white overflow-auto" : "space-y-4"}>
      {/* Header */}
      <div className={`flex items-center justify-between ${fullscreen ? "sticky top-0 bg-white border-b px-6 py-3 z-10" : ""}`}>
        <div className="flex items-center gap-3">
          {!fullscreen && !isAnnouncer && (
            <Link href={`/events/${eventId}`}>
              <ArrowLeft className="w-5 h-5 text-gray-500 hover:text-gray-700" />
            </Link>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">🎁 Bahumana Announcement</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {data?.sponsorsAttended || 0} sponsors attended · auto-refreshes every 30s
              {dataUpdatedAt ? ` · updated ${new Date(dataUpdatedAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => window.print()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Print">
            <Printer className="w-4 h-4" />
          </button>
          <button onClick={() => setFullscreen(!fullscreen)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
            <Maximize2 className="w-4 h-4" />
          </button>
          {isAnnouncer && (
            <button onClick={logout} className="ml-2 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
              Log out
            </button>
          )}
        </div>
      </div>

      {/* Morning / Evening session tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SESSION_TABS.map(({ key, emoji, label }) => {
          const count = sessions[key]?.count;
          const sub = key === "morning" ? "Before 2:00 PM" : key === "evening" ? "From 2:00 PM" : null;
          return (
            <button
              key={key}
              onClick={() => setSession(key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors flex flex-col items-center min-w-[110px] ${
                session === key
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-orange-300"
              }`}
            >
              <span>{emoji} {label}</span>
              {count !== undefined && (
                <span className={`text-xs mt-0.5 font-normal ${session === key ? "text-orange-100" : "text-gray-400"}`}>
                  {count} attended{sub ? ` · ${sub}` : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-center text-gray-400 py-8">
              {session === "morning"
                ? "No sponsors attended before 2:00 PM yet."
                : session === "evening"
                ? "No sponsors attended from 2:00 PM yet."
                : "No sponsors have attended yet. Scan some QRs first."}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className={fullscreen ? "px-6 pb-10 space-y-8 mt-6" : "space-y-6"}>
          {grouped.map(({ tier, holders }) => {
            const style = TIER_STYLES[tier] || TIER_STYLES["—"];
            const chip = TIER_CHIP[tier];
            return (
              <div key={tier} className={`rounded-2xl border-2 ${style.border} ${style.bg} overflow-hidden`}>
                <div className={`px-5 py-3 flex items-center gap-3 border-b ${style.border}`}>
                  {chip && (
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl ${chip}`}>
                      {tier}
                    </span>
                  )}
                  <div>
                    <p className={`font-bold text-lg ${style.text}`}>{style.label} Sponsors</p>
                    <p className={`text-sm ${style.text} opacity-60`}>{holders.length} attended</p>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {holders.map((h: any, i: number) => (
                    <div key={h._id} className="px-5 py-3 flex items-start gap-4">
                      <span className={`text-2xl font-black opacity-30 w-8 text-right shrink-0 ${style.text}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className={`text-lg font-bold leading-tight ${style.text}`}>{h.name}</p>
                        {h.sevaSlotId && (
                          <p className={`text-sm mt-0.5 opacity-70 ${style.text}`}>
                            🕉️ {h.sevaSlotId.name}{h.sevaSlotId.time ? ` · ${h.sevaSlotId.time}` : ""}
                          </p>
                        )}
                        {h.venueName && (
                          <p className={`text-xs mt-0.5 opacity-50 ${style.text}`}>📍 {h.venueName}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
