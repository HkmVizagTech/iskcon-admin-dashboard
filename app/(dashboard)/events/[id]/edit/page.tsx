"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { utcToISTLocal, istLocalToISO } from "@/lib/dateUtils";
import toast from "react-hot-toast";
import { ArrowLeft, MapPin, Plus, X, Tags } from "lucide-react";
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
    thirdPartyEventId: eventData?.thirdPartyEventId || "",
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
  const [formData, setFormData] = useState(() => buildFormData(eventData));
  const [venues, setVenues] = useState<{ name: string; address: string }[]>(
    () => buildVenues(eventData),
  );

  // Devotee app categories — which categories the Seva Pass app can show
  const [devCats, setDevCats] = useState<{ catCode: string; name: string; limit: number | null }[]>(
    () => eventData?.devoteeAppCategories || [],
  );

  // Fetch all pass types for this event (merged HolderType entity)
  const { data: allCategories } = useQuery({
    queryKey: ["holder-types", eventId],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}/holder-types`);
      return response.data;
    },
    enabled: !!eventId,
  });

  // Sync when server data arrives
  useEffect(() => {
    if (eventData) {
      setFormData(buildFormData(eventData));
      setVenues(buildVenues(eventData));
      setDevCats(eventData.devoteeAppCategories || []);
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
      payload.thirdPartyEventId = formData.thirdPartyEventId?.trim() || null;
      if (formData.donorThreshold !== undefined) payload.donorThreshold = formData.donorThreshold;
      const cleanVenues = venues.filter((v) => v.name.trim());
      if (cleanVenues.length > 0) payload.venue = cleanVenues;

      // Save devoteeAppCategories — null clears the restriction (all categories shown)
      if (devCats.length > 0) {
        payload.devoteeAppCategories = devCats;
      } else {
        payload.devoteeAppCategories = null; // null = unset = show all
      }

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

  // ── Devotee app category helpers ──────────────────────────────────────
  const toggleDevCat = (cat: any) => {
    setDevCats((prev) => {
      const exists = prev.find((c) => c.catCode === cat.catCode);
      if (exists) {
        return prev.filter((c) => c.catCode !== cat.catCode);
      }
      return [...prev, { catCode: cat.catCode, name: cat.name, limit: null }];
    });
  };

  const setDevCatLimit = (catCode: string, limit: number | null) => {
    setDevCats((prev) =>
      prev.map((c) => (c.catCode === catCode ? { ...c, limit } : c)),
    );
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="col-span-2 pt-4 border-t border-orange-100">
              <p className="text-sm font-semibold text-gray-800 mb-0.5">🔗 Community App Sync</p>
              <p className="text-xs text-gray-400 mb-3">
                If set, every QR issued for this event is automatically pushed to
                harekrishnavizag.co.in&apos;s community app using this event_id. Leave blank to disable sync for this event.
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Input
                label="Community App event_id"
                type="text"
                placeholder="e.g. event_5"
                value={formData.thirdPartyEventId}
                onChange={(e) => setFormData({ ...formData, thirdPartyEventId: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">Their event ID — ask their team, or agree on one together</p>
            </div>
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

      {/* ── Devotee App Categories ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">
            <Tags className="w-5 h-5 inline mr-2" />
            Devotee App — Pass Types
          </h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-gray-500 mb-4">
            Choose which categories the <strong>Seva Pass devotee app</strong> can show when issuing passes for this event.
            Leave <strong>all unchecked</strong> to allow every category. You can also set a max pass limit per category.
          </p>

          {!allCategories || allCategories.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No pass types found. Create them under the Pass Types tab first.</p>
          ) : (
            <div className="space-y-3">
              {allCategories.map((cat: any) => {
                const isEnabled = devCats.some((c) => c.catCode === cat.catCode);
                const devCat = devCats.find((c) => c.catCode === cat.catCode);

                return (
                  <div
                    key={cat.catCode}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      isEnabled
                        ? "border-orange-400 bg-orange-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <label className="flex items-center space-x-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => toggleDevCat(cat)}
                        className="rounded border-gray-300 text-orange-600"
                      />
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: (cat.color || "#FF6B6B") + "20" }}
                      >
                        {cat.icon || "🏷️"}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{cat.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{cat.catCode}</p>
                      </div>
                    </label>

                    {isEnabled && (
                      <div className="flex items-center space-x-2 ml-4">
                        <label className="text-xs text-gray-500">Max passes:</label>
                        <input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg"
                          placeholder="∞"
                          value={devCat?.limit ?? ""}
                          onChange={(e) =>
                            setDevCatLimit(
                              cat.catCode,
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {devCats.length > 0 && (
            <p className="text-xs text-orange-600 mt-3">
              {devCats.length} {devCats.length === 1 ? "category" : "categories"} enabled for the devotee app
            </p>
          )}
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
