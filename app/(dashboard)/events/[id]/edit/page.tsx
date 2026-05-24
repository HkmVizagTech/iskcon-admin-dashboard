"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { ArrowLeft, MapPin, Plus, X } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Link from "next/link";

// ─── Timezone helpers ────────────────────────────────────────────────────────
// The datetime-local input has no timezone concept — its value is always a
// "local" string like "2025-01-16T00:00".  If we send that string as-is, the
// server (running UTC on Cloud Run) parses it as UTC and stores a date that is
// +5:30 ahead of what the user intended, causing drift on every save.
//
// Fix:
//   READ  — convert UTC ISO from DB → IST "YYYY-MM-DDTHH:mm" for the input
//   WRITE — append "+05:30" before sending so the server sees a full ISO string

const IST_OFFSET = "+05:30";

/** Convert a UTC ISO string from the DB into a datetime-local value in IST */
function utcToISTLocal(utcIso: string): string {
  if (!utcIso) return "";
  const d = new Date(utcIso);
  // toLocaleString with sv-SE gives "YYYY-MM-DD HH:mm" — swap space for T
  return d
    .toLocaleString("sv-SE", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(" ", "T");
}

/** Convert the datetime-local string back to a full ISO string with IST offset */
function istLocalToISO(localStr: string): string {
  if (!localStr) return "";
  // localStr is "YYYY-MM-DDTHH:mm" — just append the IST offset
  return `${localStr}:00${IST_OFFSET}`;
}
// ─────────────────────────────────────────────────────────────────────────────

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    eventCode: "",
    description: "",
    dateStart: "",
    dateEnd: "",
    donorThreshold: 0,
  });
  const [venues, setVenues] = useState([{ name: "", address: "" }]);
  const [populated, setPopulated] = useState(false);

  const { data: eventData, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}`);
      return response.data.event;
    },
  });

  useEffect(() => {
    if (eventData && !populated) {
      setFormData({
        name: eventData.name || "",
        eventCode: eventData.eventCode || "",
        description: eventData.description || "",
        // FIX: convert UTC→IST for the datetime-local input
        dateStart: utcToISTLocal(eventData.dateStart),
        dateEnd: utcToISTLocal(eventData.dateEnd),
        donorThreshold: eventData.donorThreshold || 0,
      });

      if (Array.isArray(eventData.venue) && eventData.venue.length > 0) {
        setVenues(
          eventData.venue.map((v: any) => ({
            name: v.name || "",
            address: v.address || "",
          })),
        );
      } else if (eventData.venue?.name) {
        setVenues([{ name: eventData.venue.name || "", address: eventData.venue.address || "" }]);
      }

      setPopulated(true);
    }
  }, [eventData, populated]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {};

      if (formData.name) payload.name = formData.name;
      if (formData.eventCode) payload.eventCode = formData.eventCode;
      payload.description = formData.description;

      // FIX: append IST offset so the server stores the exact time the user intended
      // Previously: sent "2025-01-16T00:00" → server (UTC) stored as 2025-01-16T00:00Z
      //             which displays as 2025-01-16T05:30 IST — +5:30 drift every save
      // Now:        sends "2025-01-16T00:00:00+05:30" → server stores 2025-01-15T18:30Z
      //             which displays back as 2025-01-16T00:00 IST — correct, no drift
      if (formData.dateStart) payload.dateStart = istLocalToISO(formData.dateStart);
      if (formData.dateEnd) payload.dateEnd = istLocalToISO(formData.dateEnd);
      if (formData.donorThreshold !== undefined) payload.donorThreshold = formData.donorThreshold;

      const cleanVenues = venues.filter((v) => v.name.trim());
      if (cleanVenues.length > 0) payload.venue = cleanVenues;

      const response = await api.patch(`/events/${eventId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event updated successfully!");
      router.push(`/events/${eventId}`);
      router.refresh();
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
        <Link href={`/events/${eventId}`} className="text-gray-600 hover:text-gray-900">
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Event Code"
              value={formData.eventCode}
              onChange={(e) => setFormData({ ...formData, eventCode: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date & Time (IST)"
              type="datetime-local"
              value={formData.dateStart}
              onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
            />
            <Input
              label="End Date & Time (IST)"
              type="datetime-local"
              value={formData.dateEnd}
              onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              <MapPin className="w-5 h-5 inline mr-2" />
              Venue(s)
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={addVenue}>
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
              <p className="text-sm font-medium text-gray-500 mb-3">Venue #{index + 1}</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
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
              setFormData({ ...formData, donorThreshold: parseInt(e.target.value) || 0 })
            }
          />
        </CardBody>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
