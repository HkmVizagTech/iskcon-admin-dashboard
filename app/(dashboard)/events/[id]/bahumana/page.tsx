"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Maximize2, Printer, Download } from "lucide-react";
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
  const [venue, setVenue] = useState<string>("all");
  const { user, logout } = useAuth();
  const isAnnouncer = user?.role === "announcer" || user?.permissions?.canBahumanaView === true;

  const exportCSV = async () => {
    try {
      const res = await api.get(
        `/reports/events/${eventId}/bahumana-announcement/export?session=${session}&venue=${encodeURIComponent(venue)}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `bahumana_${session}${venue !== "all" ? `_${venue}` : ""}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["bahumana-announcement", eventId, session, venue],
    queryFn: async () => {
      const res = await api.get(
        `/reports/events/${eventId}/bahumana-announcement?session=${session}&venue=${encodeURIComponent(venue)}`
      );
      return res.data;
    },
    refetchInterval: 30000,
  });

  const sessions = data?.sessions || {};
  const grouped: { tier: string; holders: any[] }[] = data?.grouped || [];
const groupedOthers: { category: string; holders: any[] }[] = data?.groupedOthers || [];
  const notYetAttended: any[] = data?.notYetAttended || [];
  const summary = data?.summary || {};
  const breakdown = data?.breakdown || { byStation: [], byVenue: [] };
  const venueOptions: { key: string; label: string; count: number }[] = data?.venueOptions || [];
  // Only worth showing when there's more than just "All Venues" to pick from.
  const showVenueFilter = venueOptions.length > 1;
  const [showNotYet, setShowNotYet] = useState(false);

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
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
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

{/* Venue filter — only shown when the event has more than one venue
          with recorded attendance */}
      {showVenueFilter && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {venueOptions.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setVenue(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors flex flex-col items-center min-w-[100px] ${
                venue === key
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-orange-300"
              }`}
            >
              <span>📍 {label}</span>
              <span className={`text-xs mt-0.5 font-normal ${venue === key ? "text-orange-100" : "text-gray-400"}`}>
                {count} attended
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Summary stats */}
      {!fullscreen && summary?.totalSponsorsIssued > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-gray-900">{summary.totalSponsorsIssued}</p>
            <p className="text-xs text-gray-500">Sponsors Issued</p>
          </CardBody></Card>
          <Card><CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-green-700">{summary.totalSponsorsAttended}</p>
            <p className="text-xs text-gray-500">Attended</p>
          </CardBody></Card>
          <Card><CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-orange-600">{summary.attendanceRate}%</p>
            <p className="text-xs text-gray-500">Attendance Rate</p>
          </CardBody></Card>
          <Card><CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-red-600">{notYetAttended.length}</p>
            <p className="text-xs text-gray-500">Not Yet Attended</p>
          </CardBody></Card>
        </div>
      )}

      {/* Per-tier issued vs attended */}
      {!fullscreen && summary?.tierSummary?.length > 0 && (
        <Card>
          <CardBody>
            <p className="text-sm font-semibold text-gray-700 mb-3">Tier Breakdown — Issued vs Attended</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {summary.tierSummary.map((t: any) => {
                const style = TIER_STYLES[t.tier] || TIER_STYLES["—"];
                const chip = TIER_CHIP[t.tier];
                return (
                  <div key={t.tier} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${style.border} ${style.bg}`}>
                    <div className="flex items-center gap-2">
                      {chip && <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${chip}`}>{t.tier}</span>}
                      <span className={`text-sm font-medium ${style.text}`}>Tier {t.tier}</span>
                    </div>
                    <span className={`text-sm font-bold ${style.text}`}>{t.attended} / {t.issued}</span>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Venue / Station breakdown */}
      {!fullscreen && (breakdown.byStation.length > 0 || breakdown.byVenue.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {breakdown.byStation.length > 0 && (
            <Card>
              <CardBody>
                <p className="text-sm font-semibold text-gray-700 mb-2">Entry by Station</p>
                <div className="space-y-1.5">
                  {breakdown.byStation.map((s: any) => (
                    <div key={s.station} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{s.station}</span>
                      <span className="font-semibold text-gray-900">{s.count}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
          {breakdown.byVenue.length > 0 && (
            <Card>
              <CardBody>
                <p className="text-sm font-semibold text-gray-700 mb-2">Entry by Venue</p>
                <div className="space-y-1.5">
                  {breakdown.byVenue.map((v: any) => (
                    <div key={v.venue} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{v.venue}</span>
                      <span className="font-semibold text-gray-900">{v.count}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
) : grouped.length === 0 && groupedOthers.length === 0 && notYetAttended.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-center text-gray-400 py-8">
              {session === "morning"
                ? "No one attended before 2:00 PM yet."
                : session === "evening"
                ? "No one attended from 2:00 PM yet."
                : venue !== "all"
                ? "No one attended this venue yet."
                : "No one has attended yet. Scan some QRs first."}
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
                        {(h.scanVenue || h.venueName) && (
                          <p className={`text-xs mt-0.5 opacity-50 ${style.text}`}>
                            📍 {h.scanVenue || h.venueName}
                            {h.scanVenue && h.venueName && h.scanVenue.toLowerCase() !== h.venueName.toLowerCase()
                              ? ` (registered for ${h.venueName})`
                              : ""}
                          </p>
                        )}
                        {h.scanInfo?.station && (
                          <p className={`text-xs mt-0.5 opacity-50 ${style.text}`}>
                            🚪 Entered at {h.scanInfo.station}
                            {h.scanInfo.venue ? ` · ${h.scanInfo.venue}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

{/* Non-Sponsor attendees (Donor, Invitee, etc.) */}
          {groupedOthers.length > 0 && (
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 overflow-hidden">
              <div className="px-5 py-3 border-b border-blue-200">
                <p className="font-bold text-lg text-blue-900">Other Attendees</p>
                <p className="text-sm text-blue-900 opacity-60">
                  {groupedOthers.reduce((sum, g) => sum + g.holders.length, 0)} attended (non-sponsor)
                </p>
              </div>
              <div className="divide-y divide-blue-100">
                {groupedOthers.map(({ category, holders }) => (
                  <div key={category} className="px-5 py-3">
                    <p className="text-sm font-semibold text-blue-800 mb-2">{category} ({holders.length})</p>
                    <div className="space-y-2">
                      {holders.map((h: any, i: number) => (
                        <div key={h._id} className="flex items-start gap-3">
                          <span className="text-lg font-black opacity-30 w-6 text-right shrink-0 text-blue-900">{i + 1}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-blue-900">{h.name}</p>
                            {h.sevaSlotId && (
                              <p className="text-sm mt-0.5 opacity-70 text-blue-900">
                                🕉️ {h.sevaSlotId.name}{h.sevaSlotId.time ? ` · ${h.sevaSlotId.time}` : ""}
                              </p>
                            )}
                            {(h.scanVenue || h.venueName) && (
                              <p className="text-xs mt-0.5 opacity-50 text-blue-900">
                                📍 {h.scanVenue || h.venueName}
                              </p>
                            )}
                            {h.scanInfo?.station && (
                              <p className="text-xs mt-0.5 opacity-60 text-blue-800">
                                🚪 {h.scanInfo.station}{h.scanInfo.venue ? ` · ${h.scanInfo.venue}` : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not Yet Attended */}
          {!fullscreen && notYetAttended.length > 0 && (
            <div className="rounded-2xl border-2 border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowNotYet(!showNotYet)}
                className="w-full px-5 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
              >
                <div className="text-left">
                  <p className="font-bold text-lg text-gray-700">Not Yet Attended</p>
                  <p className="text-sm text-gray-500">{notYetAttended.length} sponsor(s) with a pass haven't scanned in yet</p>
                </div>
                <span className="text-gray-400 text-sm">{showNotYet ? "Hide ▲" : "Show ▼"}</span>
              </button>
              {showNotYet && (
                <div className="divide-y divide-gray-100">
                  {notYetAttended.map((h: any, i: number) => (
                    <div key={h._id} className="px-5 py-2.5 flex items-center gap-4">
                      <span className="text-sm font-black opacity-30 w-6 text-right shrink-0 text-gray-700">{i + 1}</span>
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800">{h.name}</p>
                          <p className="text-xs text-gray-400">{h.phone}</p>
                        </div>
                        {h.subCategory && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_CHIP[h.subCategory] || "bg-gray-300 text-white"}`}>
                            Tier {h.subCategory}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
