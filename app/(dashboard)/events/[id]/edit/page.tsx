"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import { ArrowLeft, MapPin, Plus, X } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [formData, setFormData] = useState({
    name: "",
    eventCode: "",
    description: "",
    dateStart: "",
    dateEnd: "",
    donorThreshold: 0,
  });
  const [venues, setVenues] = useState([{ name: "", address: "" }]);
  const queryClient = useQueryClient();

  const { data: eventData, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/events/${eventId}`);
      return response.data.event;
    },
  });

 useEffect(() => {
    if (eventData) {
      const options = {
        timeZone: 'Asia/Kolkata' as const,
        year: 'numeric' as const,
        month: '2-digit' as const,
        day: '2-digit' as const,
        hour: '2-digit' as const,
        minute: '2-digit' as const,
        hour12: false as const
      };

      setFormData({
        name: eventData.name || "",
        eventCode: eventData.eventCode || "",
        description: eventData.description || "",
        dateStart: eventData.dateStart
          ? new Date(eventData.dateStart).toLocaleString("sv-SE", options)
              .replace(' ', 'T')
          : "",
        dateEnd: eventData.dateEnd
          ? new Date(eventData.dateEnd).toLocaleString("sv-SE", options)
              .replace(' ', 'T')
          : "",
        donorThreshold: eventData.donorThreshold || 0,
      });

      // Handle venue array
      if (Array.isArray(eventData.venue) && eventData.venue.length > 0) {
        setVenues(
          eventData.venue.map((v: any) => ({
            name: v.name || "",
            address: v.address || "",
          })),
        );
      } else if (eventData.venue?.name) {
        setVenues([
          {
            name: eventData.venue.name || "",
            address: eventData.venue.address || "",
          },
        ]);
      }
    }
  }, [eventData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formData,
        venue: venues.map((v) => ({ name: v.name, address: v.address })),
        dateStart: formData.dateStart, // Send without converting
        dateEnd: formData.dateEnd,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      const response = await axios.patch(
        `${API_URL}/events/${eventId}`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate both queries
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event updated successfully!");
      router.push(`/events/${eventId}`);
      router.refresh(); // Force Next.js refresh
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update event");
    },
  });

  const addVenue = () => setVenues([...venues, { name: "", address: "" }]);
  const removeVenue = (index: number) => {
    if (venues.length > 1) setVenues(venues.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          href={`/events/${eventId}`}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
          <p className="text-gray-600 mt-1">{formData.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Basic Information</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Event Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <Input
              label="Event Code"
              value={formData.eventCode}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  eventCode: e.target.value.toUpperCase(),
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date & Time"
              type="datetime-local"
              value={formData.dateStart}
              onChange={(e) =>
                setFormData({ ...formData, dateStart: e.target.value })
              }
            />
            <Input
              label="End Date & Time"
              type="datetime-local"
              value={formData.dateEnd}
              onChange={(e) =>
                setFormData({ ...formData, dateEnd: e.target.value })
              }
            />
          </div>
        </CardBody>
      </Card>

      {/* Multi-Venue Edit */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              <MapPin className="w-5 h-5 inline mr-2" />
              Venue(s)
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addVenue}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Venue
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {venues.map((venue, index) => (
            <div key={index} className="border rounded-lg p-4 relative">
              {venues.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVenue(index)}
                  className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <p className="text-sm font-medium text-gray-500 mb-3">
                Venue #{index + 1}
              </p>
              <div className="space-y-3">
                <Input
                  label="Venue Name"
                  value={venue.name}
                  onChange={(e) => {
                    const updated = [...venues];
                    updated[index].name = e.target.value;
                    setVenues(updated);
                  }}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={venue.address}
                    onChange={(e) => {
                      const updated = [...venues];
                      updated[index].address = e.target.value;
                      setVenues(updated);
                    }}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Donor Settings */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Donor Threshold</h2>
        </CardHeader>
        <CardBody>
          <Input
            label="Minimum Lifetime Donation (₹)"
            type="number"
            value={formData.donorThreshold}
            onChange={(e) =>
              setFormData({
                ...formData,
                donorThreshold: parseInt(e.target.value) || 0,
              })
            }
          />
        </CardBody>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          onClick={() => updateMutation.mutate()}
          loading={updateMutation.isPending}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
