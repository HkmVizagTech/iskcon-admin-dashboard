"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { utcToISTLocal, istLocalToISO } from "@/lib/dateUtils";
import toast from "react-hot-toast";
import { ArrowLeft, MapPin, Plus, X } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Link from "next/link";

function buildFormData(eventData: any) {
  return {
    name: eventData?.name || "",
    eventCode: eventData?.eventCode || "",
    description: eventData?.description || "",
    dateStart: eventData?.dateStart ? utcToISTLocal(eventData.dateStart) : "",
    dateEnd: eventData?.dateEnd ? utcToISTLocal(eventData.dateEnd) : "",
    scanStart: eventData?.scanStart ? utcToISTLocal(eventData.scanStart) : "",
    scanEnd: eventData?.scanEnd ? utcToISTLocal(eventData.scanEnd) : "",
    donorThreshold: eventData?.donorThreshold || 0,
  };
}

function buildVenues(eventData: any) {
  if (Array.isArray(eventData?.venue) && eventData.venue.length > 0) {
    return eventData.venue.map((v: any) => ({ name: v.name || "", address: v.address || "" }));
  }
  if (eventData?.venue?.name) {
    return [{ name: eventData.venue.name || "", address: eventData.venue.address || "" }];
  }
  return [{ name: "", address: "" }];
}

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const queryClient = useQueryClient();

  const { data: eventData, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}`);
      return response.data.event;
    },
    staleTime: 0, // always fetch fresh on mount
  });

  // FIX: Initialise directly from cache if available so fields are never blank.
  // Previously used useEffect + populated guard which caused a blank-then-filled flash
  // because React renders the empty initial state before the effect runs.
  const [formData, setFormData] = useState(() => buildFormData(eventData));
  const [venues, setVenues] = useState<{ name: string; address: string }[]>(
    () => buildVenues(eventData),
  );

  // Sync when server data arrives (handles the async fetch case)
  useEffect(() => {
    if (eventData) {
      setFormData(buildFormData(eventData));
      setVenues(buildVenues(eventData));
    }
  }, [eventData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {};
      if (formData.name) payload.name = formData.name;
      if (formData.eventCode) payload.eventCode = formData.eventCode;
      payload.description = formData.description;
      if (formData.dateStart) payload.dateStart = istLocalToISO(formData.dateStart);
      if (formData.dateEnd) payload.dateEnd = istLocalToISO(formData.dateEnd);
      payload.scanStart = formData.scanStart ? istLocalToISO(formData.scanStart) : null;
      payload.scanEnd = formData.scanEnd ? istLocalToISO(formData.scanEnd) : null;
      payload.scanStart = formData.scanStart ? istLocalToISO(formData.scanStart) : null;
      payload.scanEnd = formData.scanEnd ? istLocalToISO(formData.scanEnd) : null;
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

  if (isLoading && !eventData) {
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
        <CardHeader><h2 className="text-lg font-semibold">Basic Information</h2></CardHeader>
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
            <div className="col-span-2 pt-4 border-t border-orange-100">
              <p className="text-sm font-semibold text-gray-800 mb-0.5">🔒 Scan Window</p>
              <p className="text-xs text-gray-400 mb-3">When the scanner accepts QRs at the gate — set this independent of ceremony time so scanning can start before the event begins. If not set, falls back to event start/end dates.</p>
            </div>
            <div>
              <Input
                label="Gate Opens — Scan Start (IST)"
                type="datetime-local"
                value={formData.scanStart}
                onChange={(e) => setFormData({ ...formData, scanStart: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">QRs become scannable from this time (e.g. 2 hrs before ceremony)</p>
            </div>
            <div>
              <Input
                label="Gate Closes — Scan End (IST)"
                type="datetime-local"
                value={formData.scanEnd}
                onChange={(e) => setFormData({ ...formData, scanEnd: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">QRs stop working after this time</p>
            </div>

            {/* Scan Window */}
            <div className="col-span-2 pt-2">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                🔒 Scan Window
                <span className="ml-2 text-xs font-normal text-gray-400">
                  When QRs are valid at the gate — independent of ceremony time.
                  Leave blank to use Event Start/End dates.
                </span>
              </p>
            </div>
            <Input
              label="Gate Opens (Scan Start — IST)"
              type="datetime-local"
              value={formData.scanStart}
              onChange={(e) => setFormData({ ...formData, scanStart: e.target.value })}
            />
            <Input
              label="Gate Closes (Scan End — IST)"
              type="datetime-local"
              value={formData.scanEnd}
              onChange={(e) => setFormData({ ...formData, scanEnd: e.target.value })}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              <MapPin className="w-5 h-5 inline mr-2" />Venue(s)
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
        <CardHeader><h2 className="text-lg font-semibold">Donor Threshold</h2></CardHeader>
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
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
