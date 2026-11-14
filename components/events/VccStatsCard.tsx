"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { HandHeart, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { dayLabel } from "@/lib/vccDays";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

// Volunteer numbers from VCC for one QR event (read live via the QR backend,
// which calls VCC's integration API). Shows nothing for events not linked to VCC.

type Stats = {
  enabled: boolean;
  linked?: boolean;
  exists?: boolean;
  error?: string;
  event?: { eventId: string; name: string; status: string };
  total?: number;
  totals?: Record<"registered" | "assigned" | "attended" | "no_show" | "cancelled", number>;
  unassigned?: number;
  services?: { _id: string; name: string; status: string; requiredVolunteers: number; assigned: number; attended: number }[];
  days?: { date: string; attended: number; no_show: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  registration_open: "Registration open",
  registration_closed: "Registration closed",
  ongoing: "Ongoing",
  completed: "Completed",
  archived: "Archived",
};

function Tile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-lg p-3 ${tone}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium opacity-80 leading-snug">{label}</p>
    </div>
  );
}

export default function VccStatsCard({ eventId }: { eventId: string }) {
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["event-vcc-stats", eventId],
    queryFn: async () => (await api.get(`/events/${eventId}/vcc/stats`)).data as Stats,
    retry: false,
    refetchInterval: 60_000,
  });

  // Not configured / not linked → stay out of the way.
  if (isLoading) return null;
  const err = (error as any)?.response?.data?.error || data?.error;
  if (!err && (!data?.enabled || !data?.linked)) return null;

  const t = data?.totals;
  const notInVcc = data?.exists === false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
            <HandHeart className="w-5 h-5 text-orange-500" />
            Volunteers (from VCC)
            {data?.event?.status && (
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {STATUS_LABEL[data.event.status] || data.event.status}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2.5 -m-1 sm:p-1.5 sm:m-0 flex-shrink-0 text-gray-500 hover:bg-gray-100 rounded-lg"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </CardHeader>
      <CardBody className="space-y-5">
        {err && <p className="text-sm text-red-600">{err}</p>}
        {notInVcc && (
          <p className="text-sm text-amber-700">
            This event is linked but not found in VCC.{" "}
            <Link href={`/events/${eventId}/edit`} className="underline">
              Sync it from Edit Event
            </Link>
            .
          </p>
        )}

        {t && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              <Tile label="Total registered" value={data?.total ?? 0} tone="bg-blue-50 text-blue-800" />
              <Tile label="Awaiting assignment" value={t.registered} tone="bg-gray-50 text-gray-800" />
              <Tile label="Assigned" value={t.assigned} tone="bg-purple-50 text-purple-800" />
              <Tile label="Attended" value={t.attended} tone="bg-green-50 text-green-800" />
              <Tile label="No show" value={t.no_show} tone="bg-red-50 text-red-800" />
              <Tile label="Cancelled" value={t.cancelled} tone="bg-amber-50 text-amber-800" />
            </div>

            {data?.services && data.services.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">By service</p>
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[460px] text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Service</th>
                        <th className="text-right px-3 py-2 font-medium">Needed</th>
                        <th className="text-right px-3 py-2 font-medium">Assigned</th>
                        <th className="text-right px-3 py-2 font-medium">Attended</th>
                        <th className="px-3 py-2 font-medium w-32 sm:w-40">Filled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.services.map((s) => {
                        const pct = s.requiredVolunteers
                          ? Math.min(100, Math.round((s.assigned / s.requiredVolunteers) * 100))
                          : null;
                        return (
                          <tr key={s._id} className={s.status === "inactive" ? "opacity-50" : ""}>
                            <td className="px-3 py-2">{s.name}</td>
                            <td className="px-3 py-2 text-right">{s.requiredVolunteers || "—"}</td>
                            <td className="px-3 py-2 text-right">{s.assigned}</td>
                            <td className="px-3 py-2 text-right">{s.attended}</td>
                            <td className="px-3 py-2">
                              {pct === null ? (
                                <span className="text-xs text-gray-400">no target</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${pct >= 100 ? "bg-green-500" : "bg-orange-400"}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-600 w-9 text-right">{pct}%</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {(data.unassigned ?? 0) > 0 && (
                        <tr className="text-gray-500">
                          <td className="px-3 py-2 italic">Not assigned to a service</td>
                          <td />
                          <td className="px-3 py-2 text-right">{data.unassigned}</td>
                          <td colSpan={2} />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {data?.days && data.days.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Attendance by day</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {data.days.map((d) => (
                    <div key={d.date} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      <span className="text-gray-700">{dayLabel(d.date)}</span>
                      <span>
                        <span className="text-green-700 font-semibold">{d.attended}</span>
                        <span className="text-gray-400"> present · </span>
                        <span className="text-red-600 font-semibold">{d.no_show}</span>
                        <span className="text-gray-400"> absent</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
