"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  QrCode,
  Edit,
  Play,
  Pause,
  DoorOpen,
  Tags,
  UserPlus,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatCard from "@/components/ui/StatCard";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "overview" | "entry-points" | "holder-types" | "categories"
  >("overview");

  const {
    data: eventData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/events/${eventId}`);
      return response.data;
    },
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Refetch when page loads
    refetchOnWindowFocus: true, // Refetch when tab focuses
  });

  useEffect(() => {
    const handleRouteChange = () => {
      refetch();
    };
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, [refetch]);

  const handleStatusChange = async (action: "activate" | "deactivate") => {
    try {
      await axios.post(`${API_URL}/events/${eventId}/${action}`);
      toast.success(`Event ${action}d successfully`);
      refetch();
    } catch (error) {
      toast.error(`Failed to ${action} event`);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/events" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {event?.name}
              </h1>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  event?.status === "active"
                    ? "bg-green-100 text-green-700"
                    : event?.status === "draft"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-blue-100 text-blue-700"
                }`}
              >
                {event?.status}
              </span>
            </div>
            <p className="text-gray-600 mt-1 font-mono">{event?.eventCode}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {event?.status === "draft" && (
            <Button onClick={() => handleStatusChange("activate")}>
              <Play className="w-4 h-4 mr-2" />
              Activate Event
            </Button>
          )}
          {event?.status === "active" && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("deactivate")}
            >
              <Pause className="w-4 h-4 mr-2" />
              End Event
            </Button>
          )}
        </div>
      </div>

      {/* Tabs - Order: Overview → Entry Points → Holder Types → Categories */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === "overview"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => router.push(`/events/${eventId}/entry-points`)}
            className="py-4 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 hover:text-gray-700 whitespace-nowrap"
          >
            <DoorOpen className="w-4 h-4 inline mr-1" />
            Entry Points
          </button>
          <button
            onClick={() => router.push(`/events/${eventId}/holder-types`)}
            className="py-4 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 hover:text-gray-700 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 inline mr-1" />
            Holder Types
          </button>
          <button
            onClick={() => router.push(`/events/${eventId}/categories`)}
            className="py-4 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 hover:text-gray-700 whitespace-nowrap"
          >
            <Tags className="w-4 h-4 inline mr-1" />
            Categories
          </button>
        </nav>
      </div>

      {activeTab === "overview" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Passes"
              value={event?.stats?.totalPasses || 0}
              icon={<QrCode className="w-6 h-6" />}
              color="blue"
            />
            <StatCard
              title="Scanned Passes"
              value={event?.stats?.scannedPasses || 0}
              icon={<Users className="w-6 h-6" />}
              color="green"
            />
            <StatCard
              title="Scan Rate"
              value={`${event?.stats?.scanRate || 0}%`}
              icon={<Calendar className="w-6 h-6" />}
              color="orange"
            />
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="text-gray-900 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {event?.dateStart &&
                        format(new Date(event.dateStart), "PPP p")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="text-gray-900 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {event?.dateEnd &&
                        format(new Date(event.dateEnd), "PPP p")}
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
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                        <span className="font-medium">
                          {v.name || `Venue ${i + 1}`}
                        </span>
                        {i === 0 && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
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
                      className="p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {pass.holderId?.name}
                        </p>
                        <p className="text-sm text-gray-500">{pass.qrId}</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
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
