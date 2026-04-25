"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  Pause,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const {
    data: events,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["events", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      const response = await axios.get(`${API_URL}/events?${params}`);
      return response.data.events;
    },
  });

  const handleStatusChange = async (
    eventId: string,
    action: "activate" | "deactivate",
  ) => {
    try {
      await axios.post(`${API_URL}/events/${eventId}/${action}`);
      toast.success(`Event ${action}d successfully`);
      refetch();
    } catch (error) {
      toast.error(`Failed to ${action} event`);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await axios.delete(`${API_URL}/events/${eventId}`);
      toast.success("Event deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-1">Manage festivals and programs</p>
        </div>
        <Link href="/events/create">
          <Button>
            <Plus className="w-5 h-5 mr-2" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </Card>

      {/* Events Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events?.map((event: any) => (
            <Card key={event._id} padding={false}>
              {/* Banner */}
              <div className="h-32 bg-gradient-to-r from-orange-400 to-red-500 relative">
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      event.status === "active"
                        ? "bg-green-500 text-white"
                        : event.status === "draft"
                          ? "bg-gray-500 text-white"
                          : "bg-blue-500 text-white"
                    }`}
                  >
                    {event.status}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {event.name}
                </h3>
                <p className="text-sm text-gray-500 font-mono mb-3">
                  {event.eventCode}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {format(new Date(event.dateStart), "MMM d, yyyy")} -{" "}
                    {format(new Date(event.dateEnd), "MMM d, yyyy")}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {event.venue.name}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    {event.stats?.totalPasses || 0} passes issued
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Scan Rate</span>
                    <span className="font-medium">
                      {event.stats?.scanRate || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-red-600 h-1.5 rounded-full"
                      style={{ width: `${event.stats?.scanRate || 0}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <Link
                    href={`/events/${event._id}`}
                    className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                  >
                    View Details →
                  </Link>

                  <div className="flex items-center space-x-2">
                    {event.status === "draft" && (
                      <button
                        onClick={() =>
                          handleStatusChange(event._id, "activate")
                        }
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Activate"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {event.status === "active" && (
                      <button
                        onClick={() =>
                          handleStatusChange(event._id, "deactivate")
                        }
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                        title="Deactivate"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    <Link
                      href={`/events/${event._id}/edit`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(event._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
