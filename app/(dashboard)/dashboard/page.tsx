"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Calendar,
  Users,
  QrCode,
  TrendingUp,
  Plus,
  ArrowRight,
  ScanLine,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import StatCard from "@/components/ui/StatCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/reports/dashboard`);
      return response.data;
    },
  });

  const { data: recentEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["recent-events"],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/events?limit=5`);
      return response.data.events;
    },
  });

  const { data: recentScans } = useQuery({
    queryKey: ["recent-scans"],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/scan/recent?limit=10`);
      return response.data.scans;
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-gray-600 mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        <div className="flex space-x-3">
          <Link
            href="/holders/create"
            className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all shadow-md"
          >
            <QrCode className="w-5 h-5 mr-2" />
            Issue QR Pass
          </Link>
          <Link
            href="/events/create"
            className="flex items-center px-4 py-2 border border-orange-500 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Event
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Events"
          value={stats?.totalEvents || 0}
          icon={<Calendar className="w-6 h-6" />}
          color="blue"
          loading={statsLoading}
        />
        <StatCard
          title="Active Passes"
          value={stats?.activePasses || 0}
          icon={<QrCode className="w-6 h-6" />}
          color="green"
          loading={statsLoading}
        />
        <StatCard
          title="Total Holders"
          value={stats?.totalHolders || 0}
          icon={<Users className="w-6 h-6" />}
          color="purple"
          loading={statsLoading}
        />
        <StatCard
          title="Scan Rate"
          value={`${stats?.scanRate || 0}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="orange"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Events
            </h2>
            <Link
              href="/events"
              className="text-orange-600 hover:text-orange-700 text-sm flex items-center"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {eventsLoading ? (
              <div className="p-6 text-center">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : recentEvents?.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No events yet. Create your first event!
              </div>
            ) : (
              recentEvents?.map((event: any) => (
                <Link
                  key={event._id}
                  href={`/events/${event._id}`}
                  className="block p-6 hover:bg-orange-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">
                          {event.name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            event.status === "active"
                              ? "bg-green-100 text-green-700"
                              : event.status === "draft"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {event.eventCode} •{" "}
                        {format(new Date(event.dateStart), "MMM d")} -{" "}
                        {format(new Date(event.dateEnd), "MMM d")}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {event.stats?.totalPasses || 0} passes
                      </div>
                      <div className="text-xs text-gray-500">
                        {event.stats?.scanRate || 0}% scanned
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-red-600 h-1.5 rounded-full"
                      style={{ width: `${event.stats?.scanRate || 0}%` }}
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Scans */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Live Scan Feed
            </h2>
            <ScanLine className="w-5 h-5 text-green-500 animate-pulse" />
          </div>

          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {recentScans?.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No scans yet</div>
            ) : (
              recentScans?.map((scan: any, index: number) => (
                <div key={scan._id || index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          scan.result === "granted"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {scan.holderId?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {scan.stationLabel} •{" "}
                          {format(new Date(scan.scannedAt), "h:mm a")}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        scan.result === "granted"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {scan.result}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <QuickAction
          title="Issue QR Pass"
          description="Create and send passes"
          href="/holders/create"
          icon={<QrCode className="w-6 h-6" />}
        />
        <QuickAction
          title="Bulk Import"
          description="Import via CSV/Excel"
          href="/holders/import"
          icon={<Users className="w-6 h-6" />}
        />
        <QuickAction
          title="View Reports"
          description="Analytics & insights"
          href="/reports"
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <QuickAction
          title="Manage Events"
          description="Configure events"
          href="/events"
          icon={<Calendar className="w-6 h-6" />}
        />
      </div>
    </div>
  );
}

function QuickAction({ title, description, href, icon }: any) {
  return (
    <Link
      href={href}
      className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all group"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg text-orange-600">
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </Link>
  );
}
