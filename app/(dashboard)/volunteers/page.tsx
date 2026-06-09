"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api"; // FIX: use authenticated instance
import toast from "react-hot-toast";
import { Plus, Search, Edit, Trash2, Key, Shield } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";


export default function VolunteersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    assignedEvents: [] as string[],
    assignedEntryPoints: [] as string[],
    assignedVenues: [] as number[],
  });

  // Fetch volunteers
  const { data: volunteersData, isLoading } = useQuery({
    queryKey: ["volunteers", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const response = await api.get(`/volunteers?${params}`);
      return response.data.volunteers;
    },
  });

  // Fetch events for assignment
  const { data: events } = useQuery({
    queryKey: ["events-active"],
    queryFn: async () => {
      const response = await api.get(`/events`);
      return response.data.events;
    },
  });

  // Fetch available entry points — keyed on selected events so it refetches when they change
  const { data: availableEntryPoints } = useQuery({
    queryKey: ["available-entry-points", ...formData.assignedEvents],
    queryFn: async () => {
      // FIX BUG 2: was static key ["available-entry-points"] — cached result was reused
      // even after admin checked new events, so new event stations never appeared.
      const params = formData.assignedEvents.length > 0
        ? "?" + formData.assignedEvents.map(id => `eventId=${id}`).join("&")
        : "";
      const response = await api.get(`/volunteers/available-entry-points${params}`);
      return response.data.entryPoints;
    },
    enabled: true,
  });

  // Create volunteer mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/volunteers`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Volunteer created successfully");
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["volunteers"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create volunteer");
    },
  });

  // Update volunteer mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/volunteers/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Volunteer updated successfully");
      setShowModal(false);
      setEditingVolunteer(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["volunteers"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update volunteer");
    },
  });

  // Delete volunteer mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/volunteers/${id}`);
    },
    onSuccess: () => {
      toast.success("Volunteer deleted");
      queryClient.invalidateQueries({ queryKey: ["volunteers"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete volunteer");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      assignedEvents: [],
      assignedEntryPoints: [],
      assignedVenues: [],
    });
  };

  const handleEdit = (volunteer: any) => {
    setEditingVolunteer(volunteer);
    const assignedEventIds = volunteer.assignedEvents?.map((e: any) => e._id || e) || [];
    // Only pre-check entry points that belong to the volunteer's assigned events.
    // assignedEntryPoints from the list view is already cleaned by the backend
    // (orphaned/duplicate IDs removed), so we can use it directly.
    const assignedEpIds = (volunteer.assignedEntryPoints || []).map((e: any) => e._id || e);
    setFormData({
      name: volunteer.name,
      email: volunteer.email || "",
      phone: volunteer.phone || "",
      password: "",
      assignedEvents: assignedEventIds,
      assignedEntryPoints: assignedEpIds,
      assignedVenues: volunteer.assignedVenues || [],
    });
    setShowModal(true);
  };

  // FIXED: Made e optional and check before calling preventDefault
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Send only the entry points currently checked in the form.
    // The backend validates every ID against the assigned events and purges
    // any orphaned/stale IDs — so we never accidentally re-add deleted ones.
    const allEntryPointIds = Array.from(new Set([...formData.assignedEntryPoints]));

    const data = {
      ...formData,
      assignedEventIds: formData.assignedEvents,
      assignedEntryPointIds: allEntryPointIds,
    };

    if (editingVolunteer) {
      updateMutation.mutate({ id: editingVolunteer._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleEvent = (eventId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedEvents: prev.assignedEvents.includes(eventId)
        ? prev.assignedEvents.filter((id) => id !== eventId)
        : [...prev.assignedEvents, eventId],
    }));
  };

  const toggleVenue = (venueKey: string) => {
    setFormData((prev) => {
      const current = prev.assignedVenues || [];
      const key = parseInt(venueKey);
      return {
        ...prev,
        assignedVenues: current.includes(key)
          ? current.filter((v) => v !== key)
          : [...current, key],
      };
    });
  };

  // Get venues for selected events
  const selectedEventsVenues =
    events
      ?.filter((e: any) => formData.assignedEvents.includes(e._id))
      ?.flatMap((e: any) =>
        (Array.isArray(e.venue) ? e.venue : []).map((v: any, i: number) => ({
          ...v,
          eventName: e.name,
          eventCode: e.eventCode,
          venueIndex: i,
        })),
      ) || [];

  const toggleEntryPoint = (epId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedEntryPoints: prev.assignedEntryPoints.includes(epId)
        ? prev.assignedEntryPoints.filter((id) => id !== epId)
        : [...prev.assignedEntryPoints, epId],
    }));
  };

  // FIX BUG 3: show entry points for ALL assigned events (not just those currently
  // visible/checked). Previously, entry points from an already-assigned event that
  // was not re-checked during edit were hidden AND dropped from the save payload —
  // silently removing the volunteer's existing assignments on every edit.
  const filteredEntryPoints = availableEntryPoints?.filter(
    (ep: any) =>
      formData.assignedEvents.length === 0 ||
      formData.assignedEvents.includes(ep.eventId?._id || ep.eventId),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Volunteers</h1>
          <p className="text-gray-600 mt-1">Manage scanning volunteers</p>
        </div>
        <Button
          onClick={() => {
            setShowModal(true);
            setEditingVolunteer(null);
            resetForm();
          }}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Volunteer
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardBody>
          <Input
            placeholder="Search volunteers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </CardBody>
      </Card>

      {/* Volunteers List */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Volunteer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Assigned Stations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Venues
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {volunteersData?.map((volunteer: any) => (
                <tr key={volunteer._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {volunteer.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {volunteer.email || volunteer.phone || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {volunteer.assignedEntryPoints?.map((ep: any) => (
                        <span
                          key={ep._id}
                          className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full"
                        >
                          {ep.stationLabel || ep.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {volunteer.assignedVenues?.map((vIndex: number) => {
                        const eventVenue = selectedEventsVenues?.find(
                          (v: any) => v.venueIndex === vIndex,
                        );
                        return eventVenue ? (
                          <span
                            key={vIndex}
                            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
                          >
                            {eventVenue.eventCode}: {eventVenue.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {volunteer.assignedEvents?.map((event: any) => (
                        <span
                          key={event._id}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                        >
                          {event.eventCode}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        volunteer.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {volunteer.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(volunteer)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(volunteer._id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingVolunteer(null);
          resetForm();
        }}
        title={editingVolunteer ? "Edit Volunteer" : "Add Volunteer"}
        size="lg"
        onConfirm={() => handleSubmit()} // FIXED: Remove the undefined as any
        confirmText={editingVolunteer ? "Update Volunteer" : "Create Volunteer"}
        loading={createMutation.isPending || updateMutation.isPending}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form fields remain the same */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="For phone login"
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="For email login"
          />

          <Input
            label={
              editingVolunteer
                ? "New Password (leave blank to keep)"
                : "Password *"
            }
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required={!editingVolunteer}
          />

          {/* Assign Events */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Events
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {events?.map((event: any) => (
                <label
                  key={event._id}
                  className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={formData.assignedEvents.includes(event._id)}
                    onChange={() => toggleEvent(event._id)}
                    className="rounded border-gray-300 text-orange-600"
                  />
                  <span className="ml-2 text-sm">
                    {event.name} ({event.eventCode})
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Assign Entry Points */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Entry Points (Scanning Stations)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {filteredEntryPoints?.map((ep: any) => (
                <label
                  key={ep._id}
                  className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={formData.assignedEntryPoints.includes(ep._id)}
                    onChange={() => toggleEntryPoint(ep._id)}
                    className="rounded border-gray-300 text-orange-600"
                  />
                  <span className="ml-2 text-sm">
                    {ep.stationLabel || ep.name}
                    <span className="text-xs text-gray-500 block">
                      {ep.eventId?.eventCode || ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          {/* Assign Venues */}
          {selectedEventsVenues.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Venues
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {selectedEventsVenues.map((venue: any) => {
                  const venueKey = venue.venueIndex.toString();
                  return (
                    <label
                      key={`${venue.eventCode}-${venueKey}`}
                      className={`flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        (formData.assignedVenues || []).includes(
                          venue.venueIndex,
                        )
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={(formData.assignedVenues || []).includes(
                          venue.venueIndex,
                        )}
                        onChange={() => toggleVenue(venueKey)}
                        className="rounded border-gray-300 text-orange-600 mr-2"
                      />
                      <span className="text-sm">
                        {venue.name || `Venue ${venue.venueIndex + 1}`}
                        <span className="text-xs text-gray-500 block">
                          {venue.eventCode} - {venue.address || ""}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
