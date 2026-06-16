"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  Calendar, Users, QrCode, TrendingUp, Plus, ArrowRight, ScanLine,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { formatIST } from "@/lib/dateUtils";
import StatCard from "@/components/ui/StatCard";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await api.get("/reports/dashboard")).data,
  });

  const { data: recentEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["recent-events"],
    queryFn: async () => (await api.get("/events?limit=5")).data.events,
  });

  const { data: recentScans } = useQuery({
    queryKey: ["recent-scans"],
    staleTime: 0,
    queryFn: async () => (await api.get("/scan/recent?limit=10")).data.scans,
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(" ")[0]}! 🙏
          </h1>
          <p className="text-gray-500 mt-0.5">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex space-x-3">
          <Link href="/holders/create"
            className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all shadow-md text-sm font-medium">
            <QrCode className="w-4 h-4 mr-2" /> Issue QR Pass
          </Link>
          <Link href="/events/create"
            className="flex items-center px-4 py-2 border border-orange-500 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4 mr-2" /> Create Event
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Events" value={stats?.totalEvents || 0} icon={<Calendar className="w-6 h-6" />} color="blue" loading={statsLoading} />
        <StatCard title="Active Passes" value={stats?.activePasses || 0} icon={<QrCode className="w-6 h-6" />} color="green" loading={statsLoading} />
        <StatCard title="Total Holders" value={stats?.totalHolders || 0} icon={<Users className="w-6 h-6" />} color="purple" loading={statsLoading} />
        <StatCard title="Scan Rate" value={`${stats?.scanRate || 0}%`} icon={<TrendingUp className="w-6 h-6" />} color="orange" loading={statsLoading} />
      </div>

      {/* Events + Scan Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Recent Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Recent Events</h2>
            <Link href="/events" className="text-orange-600 hover:text-orange-700 text-sm flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {eventsLoading ? (
              <div className="p-6 flex justify-center">
                <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !recentEvents?.length ? (
              <div className="p-6 text-center text-sm text-gray-400">No events yet. Create your first event!</div>
            ) : recentEvents.map((event: any) => (
              <Link key={event._id} href={`/events/${event._id}`}
                className="block px-5 py-4 hover:bg-orange-50/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{event.name}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        event.status === "active" ? "bg-green-100 text-green-700" :
                        event.status === "upcoming" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-500"}`}>
                        {event.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {event.eventCode} · {formatIST(event.dateStart, "MMM d")} – {formatIST(event.dateEnd, "MMM d")}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-semibold text-gray-800">{event.stats?.totalPasses || 0} passes</div>
                    <div className="text-gray-400">{event.stats?.scanRate || 0}% scanned</div>
                  </div>
                </div>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-1">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1 rounded-full"
                    style={{ width: `${Math.min(event.stats?.scanRate || 0, 100)}%` }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Live Scan Feed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Live Scan Feed</h2>
            <ScanLine className="w-4 h-4 text-green-500 animate-pulse" />
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {!recentScans?.length ? (
              <div className="p-6 text-center text-sm text-gray-400">No scans yet</div>
            ) : recentScans.map((scan: any, i: number) => (
              <div key={scan._id || i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${scan.result === "granted" ? "bg-green-500" : "bg-red-400"}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{scan.holderId?.name || "Unknown"}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {scan.epId?.eventId?.name && (
                        <span className="text-orange-600 font-medium">{scan.epId.eventId.name} · </span>
                      )}
                      {scan.stationLabel || scan.epId?.stationLabel} · {formatIST(scan.scannedAt, "h:mm a")}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                  scan.result === "granted" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {scan.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickAction title="Issue QR Pass" description="Create and send passes" href="/holders/create" icon={<QrCode className="w-5 h-5" />} />
        <QuickAction title="Bulk Import" description="Import via CSV/Excel" href="/holders/import" icon={<Users className="w-5 h-5" />} />
        <QuickAction title="View Reports" description="Analytics & insights" href="/reports" icon={<TrendingUp className="w-5 h-5" />} />
        <QuickAction title="Manage Events" description="Configure events" href="/events" icon={<Calendar className="w-5 h-5" />} />
      </div>

      {/* Holder Type Breakdown */}
      {stats?.holderTypeStats?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Holder Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.holderTypeStats.map((ht: any) => (
              <div key={ht._id} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{ht.count}</div>
                <div className="text-xs text-gray-500 mt-0.5 capitalize">{ht._id || "Unknown"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scans by Entry Point */}
      {stats?.scansByEP?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Scans by Entry Point</h3>
          <div className="space-y-3">
            {stats.scansByEP.map((ep: any) => (
              <div key={ep._id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{ep.name}</span>
                  <span className="text-gray-500 tabular-nums">{ep.count} scans</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-orange-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min((ep.count / (stats.scansByEP[0]?.count || 1)) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAction({ title, description, href, icon }: any) {
  return (
    <Link href={href} className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg text-orange-600">{icon}</div>
        <div>
          <p className="font-medium text-gray-900 text-sm">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
    </Link>
  );
}
