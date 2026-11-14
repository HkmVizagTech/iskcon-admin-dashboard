"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api"; // FIX: use authenticated instance
import Link from "next/link";
import { format } from "date-fns";
import { formatIST } from "@/lib/dateUtils";
import {
  Calendar,
  MapPin,
  Users,
  QrCode,
  Edit,
  Trash2,
  DoorOpen,
  Tags,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatCard from "@/components/ui/StatCard";
import toast from "react-hot-toast";
import VccStatsCard from "@/components/events/VccStatsCard";
import PageHeader from "@/components/ui/PageHeader";

const tabBase =
  "py-3 sm:py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0 inline-flex items-center";


export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "overview" | "entry-points" | "holder-types"
  >("overview");

  const {
    data: eventData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}`);
      return response.data;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch live stats from the reports summary endpoint
  const { data: summaryData } = useQuery({
    queryKey: ["event-summary", eventId],
    queryFn: async () => {
      const res = await api.get(`/reports/events/${eventId}/summary`);
      return res.data;
    },
    staleTime: 30000,
    refetchInterval: 60000, // auto-refresh every minute
    enabled: !!eventId,
  });

  // Standing events (e.g. prasadam) issue one pass per dated session.
  const { data: sessions } = useQuery({
    queryKey: ["event-sessions", eventId],
    queryFn: async () => {
      const res = await api.get(`/reports/events/${eventId}/sessions`);
      return res.data.sessions as any[];
    },
    staleTime: 30000,
    retry: false,
    enabled: !!eventId,
  });

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    refetch();
  }, [eventId]);

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this event? This cannot be undone.",
      )
    )
      return;
    try {
      await api.delete(`/events/${eventId}`);
      toast.success("Event deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      router.push("/events");
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const event = eventData?.event;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <PageHeader
        backHref="/events"
        title={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="break-words">{event?.name}</span>
            {/* Status badge */}
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                event?.status === "active"
                  ? "bg-green-100 text-green-700"
                  : event?.status === "upcoming"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700"
              }`}
            >
              {event?.status}
            </span>
          </span>
        }
        subtitle={<span className="font-mono">{event?.eventCode}</span>}
        actions={
          <>
            {/* Edit & Delete Buttons */}
            <Link href={`/events/${eventId}/edit`}>
              <Button variant="outline" className="w-full sm:w-auto">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button variant="outline" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2 text-red-600" />
              <span className="text-red-600">Delete</span>
            </Button>
          </>
        }
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 -mx-3 px-3 sm:mx-0 sm:px-0">
        <nav className="flex gap-5 sm:gap-8 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setActiveTab("overview")}
            className={`${tabBase} ${
              activeTab === "overview"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => router.push(`/events/${eventId}/entry-points`)}
            className={`${tabBase} border-transparent text-gray-500 hover:text-gray-700`}
          >
            <DoorOpen className="w-4 h-4 inline mr-1" />
            Entry Points
          </button>
          <button
            onClick={() => router.push(`/events/${eventId}/holder-types`)}
            className={`${tabBase} border-transparent text-gray-500 hover:text-gray-700`}
          >
            <Tags className="w-4 h-4 inline mr-1" />
            Holder Types
          </button>
          <button
            onClick={() => router.push(`/events/${eventId}/seva-slots`)}
            className={`${tabBase} border-transparent text-gray-500 hover:text-gray-700`}
          >
            🕉️ Seva Slots
          </button>
          <Link
            href={`/events/${eventId}/bahumana`}
            className={`${tabBase} border-transparent text-gray-500 hover:text-gray-700`}
          >
            🎁 Bahumana View
          </Link>
          <Link
            href={`/events/${eventId}/gate`}
            className={`${tabBase} border-transparent text-amber-600 hover:text-amber-700 font-semibold`}
          >
            🖐 Gate Entry
          </Link>
        </nav>
      </div>

      {activeTab === "overview" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            <StatCard
              title="Total Passes"
              value={summaryData?.totalIssued ?? 0}
              icon={<QrCode className="w-6 h-6" />}
              color="blue"
            />
            <StatCard
              title="Scanned Passes"
              value={summaryData?.totalScanned ?? 0}
              icon={<Users className="w-6 h-6" />}
              color="green"
            />
            <StatCard
              title="Scan Rate"
              value={summaryData?.totalIssued
                ? `${Math.round((summaryData.totalScanned / summaryData.totalIssued) * 100)}%`
                : "0%"}
              icon={<Calendar className="w-6 h-6" />}
              color="orange"
            />
          </div>

          {/* Volunteers from VCC (only shown for events linked to VCC) */}
          <VccStatsCard eventId={eventId} />

          {/* Sessions — windowed passes grouped by session */}
          {sessions && sessions.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Sessions ({sessions.length})</h2>
              </CardHeader>
              <CardBody padding={false}>
                {/* Phones: one card per session */}
                <div className="md:hidden divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
                  {sessions.map((s) => (
                    <div key={s.sessionKey} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm">{formatIST(s.validFrom, "EEE d MMM yyyy")}</div>
                          <div className="text-xs text-gray-500">
                            {formatIST(s.validFrom, "h:mm a")} – {formatIST(s.validUntil, "d MMM, h:mm a")}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 font-mono truncate max-w-[40%]">{s.sessionKey}</div>
                      </div>
                      <div className="mt-2 grid grid-cols-5 gap-1 text-center">
                        {[
                          ["Issued", s.issued, "text-gray-900"],
                          ["Collected", s.collected, "text-green-700"],
                          ["Missed", s.missed, "text-red-600"],
                          ["Open", s.pending, "text-gray-600"],
                          ["Revoked", s.revoked, "text-gray-500"],
                        ].map(([label, val, cls]) => (
                          <div key={label as string} className="bg-gray-50 rounded-md py-1.5">
                            <div className={`text-sm font-semibold ${cls}`}>{val}</div>
                            <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-1.5 text-xs text-gray-500 truncate">
                        Issued by {(s.clients || []).join(", ") || "Dashboard"}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {["Date", "Window (IST)", "Issued", "Collected", "Missed", "Open", "Revoked", "Issued by"].map((h) => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sessions.map((s) => (
                        <tr key={s.sessionKey} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">
                            <div className="font-medium text-gray-900">{formatIST(s.validFrom, "EEE d MMM yyyy")}</div>
                            <div className="text-xs text-gray-400 font-mono">{s.sessionKey}</div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                            {formatIST(s.validFrom, "h:mm a")} – {formatIST(s.validUntil, "d MMM, h:mm a")}
                          </td>
                          <td className="px-4 py-2 text-sm">{s.issued}</td>
                          <td className="px-4 py-2 text-sm text-green-700">{s.collected}</td>
                          <td className="px-4 py-2 text-sm text-red-600">{s.missed}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{s.pending}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{s.revoked}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{(s.clients || []).join(", ") || "Dashboard"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Event Details</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-gray-900">
                    {event?.description || "No description"}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="text-gray-900 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                      {event?.dateStart &&
                        formatIST(event.dateStart, "PPP p")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="text-gray-900 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                      {event?.dateEnd &&
                        formatIST(event.dateEnd, "PPP p")}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Donor Threshold</p>
                  <p className="text-gray-900">
                    ₹{event?.donorThreshold?.toLocaleString() || 0}
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold">Venue(s)</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {Array.isArray(event?.venue) && event.venue.length > 0 ? (
                  event.venue.map((v: any, i: number) => (
                    <div key={i} className="border rounded-lg p-3">
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 mr-2 mt-1 text-orange-500 flex-shrink-0" />
                        <span className="font-medium min-w-0 break-words">
                          {v.name || `Venue ${i + 1}`}
                        </span>
                        {i === 0 && (
                          <span className="ml-2 mt-0.5 flex-shrink-0 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      {v.address && (
                        <p className="text-sm text-gray-500 mt-1 ml-6">
                          {v.address}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No venue information</p>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Recent Activity */}
          {eventData?.recentActivity?.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Recent Activity</h2>
              </CardHeader>
              <CardBody padding={false}>
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {eventData.recentActivity.map((pass: any) => (
                    <div
                      key={pass._id}
                      className="px-4 py-3 sm:p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {pass.holderId?.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate font-mono">{pass.qrId}</p>
                      </div>
                      <span
                        className={`flex-shrink-0 px-2 py-1 text-xs rounded-full ${
                          pass.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {pass.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
