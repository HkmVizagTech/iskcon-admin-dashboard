"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api"; // FIX: authenticated instance
import Link from "next/link";
import { format } from "date-fns";
import { formatIST } from "@/lib/dateUtils";
import { Plus, Search, Calendar, MapPin, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import PageHeader from "@/components/ui/PageHeader";

export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ["events", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      const response = await api.get(`/events?${params}`);
      return response.data.events;
    },
  });

  const handleStatusChange = async (eventId: string, action: "activate" | "deactivate") => {
    try {
      await api.post(`/events/${eventId}/${action}`);
      toast.success(`Event ${action}d successfully`);
      refetch();
    } catch (error) {
      toast.error(`Failed to ${action} event`);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event and all its data?")) return;
    try {
      await api.delete(`/events/${eventId}`);
      toast.success("Event deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        subtitle="Manage festivals and programs"
        actions={
          <Link href="/events/create">
            <Button className="w-full sm:w-auto"><Plus className="w-5 h-5 mr-2" />Create Event</Button>
          </Link>
        }
      />

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-5 h-5" />}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-base sm:text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {events?.map((event: any) => (
            <Card key={event._id} padding={false}>
              {/* Brand banner: a slim accent strip on phones, full banner from sm up */}
              <div className="h-1.5 sm:h-32 bg-gradient-to-r from-orange-400 to-red-500 relative rounded-t-xl overflow-hidden">
                <div className="absolute top-3 right-3 hidden sm:block">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusBadge(event.status)}`}>
                    {event.status}
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 mb-1 sm:mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 break-words min-w-0">{event.name}</h3>
                  <span className={`sm:hidden mt-0.5 flex-shrink-0 px-2 py-1 text-xs rounded-full ${statusBadge(event.status)}`}>
                    {event.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 font-mono mb-3">{event.eventCode}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                    {formatIST(event.dateStart, "MMM d, yyyy")} - {formatIST(event.dateEnd, "MMM d, yyyy")}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{Array.isArray(event.venue) ? event.venue[0]?.name : event.venue?.name || "No venue"}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                    {event.stats?.totalPasses || 0} passes issued
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Scan Rate</span>
                    <span className="font-medium">{event.stats?.scanRate || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-red-600 h-1.5 rounded-full"
                      style={{ width: `${Math.min(event.stats?.scanRate || 0, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100">
                  <Link href={`/events/${event._id}`} className="text-orange-600 hover:text-orange-700 font-medium text-sm py-2 pr-4 -my-1">
                    View Details →
                  </Link>
                  <button
                    onClick={() => handleDelete(event._id)}
                    className="text-red-500 hover:text-red-700 text-xs py-2 pl-4 -my-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function statusBadge(status: string) {
  return status === "active" ? "bg-green-500 text-white" :
    status === "upcoming" ? "bg-gray-500 text-white" :
    "bg-blue-500 text-white";
}
