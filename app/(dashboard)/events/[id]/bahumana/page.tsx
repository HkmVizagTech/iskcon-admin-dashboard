"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Maximize2, Printer } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

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

export default function BahumanaAnnouncementPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [fullscreen, setFullscreen] = useState(false);
  const { user, logout } = useAuth();
  const isAnnouncer = user?.role === "announcer";

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["bahumana-announcement", eventId],
    queryFn: async () => {
      const res = await api.get(`/reports/events/${eventId}/bahumana-announcement`);
      return res.data;
    },
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const grouped: { tier: string; holders: any[] }[] = data?.grouped || [];

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
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => window.print()}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            title={fullscreen ? "Exit fullscreen" : "Fullscreen for announcer"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {isAnnouncer && (
            <button
              onClick={logout}
              className="ml-2 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Log out
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-center text-gray-400 py-8">No sponsors have attended yet. Scan some QRs first.</p>
          </CardBody>
        </Card>
      ) : (
        <div className={fullscreen ? "px-6 pb-10 space-y-8 mt-6" : "space-y-6"}>
          {grouped.map(({ tier, holders }) => {
            const style = TIER_STYLES[tier] || TIER_STYLES["—"];
            const chip = TIER_CHIP[tier];
            return (
              <div key={tier} className={`rounded-2xl border-2 ${style.border} ${style.bg} overflow-hidden`}>
                {/* Tier header */}
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

                {/* Names list */}
                <div className="divide-y divide-gray-100">
                  {holders.map((h: any, i: number) => (
                    <div key={h._id} className="px-5 py-3 flex items-start gap-4">
                      {/* Number */}
                      <span className={`text-2xl font-black opacity-30 w-8 text-right shrink-0 ${style.text}`}>
                        {i + 1}
                      </span>
                      {/* Name */}
                      <div className="flex-1">
                        <p className={`text-lg font-bold leading-tight ${style.text}`}>
                          {h.name}
                        </p>
                        {h.sevaSlotId && (
                          <p className={`text-sm mt-0.5 opacity-70 ${style.text}`}>
                            🕉️ {h.sevaSlotId.name}{h.sevaSlotId.time ? ` · ${h.sevaSlotId.time}` : ""}
                          </p>
                        )}
                        {h.venueName && (
                          <p className={`text-xs mt-0.5 opacity-50 ${style.text}`}>
                            📍 {h.venueName}
                          </p>
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
