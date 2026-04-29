"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft,
  Plus,
  DoorOpen,
  Users,
  Link as LinkIcon,
  Edit,
  Trash2,
  QrCode,
  UserPlus,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import toast from "react-hot-toast";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const entryPointTypes = [
  { value: "venue_entry", label: "🚪 Venue Entry" },
  { value: "darshan", label: "🙏 Darshan" },
  { value: "prasadam", label: "🍛 Prasadam" },
  { value: "bahumana", label: "🎁 Bahumana" },
  { value: "vip_seat", label: "⭐ VIP Seat" },
  { value: "custom", label: "📍 Custom" },
];

export default function EntryPointsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntryPoint, setEditingEntryPoint] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    stationLabel: "",
    type: "custom",
    location: "",
    multiEntryAllowed: false,
    allowGroupCount: false,
    linkedEpId: "",
  });

  const { data: eventData } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/events/${eventId}`);
      return response.data;
    },
  });

  const { data: entryPoints, refetch } = useQuery({
    queryKey: ["entry-points", eventId],
    queryFn: async () => {
      const response = await axios.get(
        `${API_URL}/events/${eventId}/entry-points`,
      );
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post(
        `${API_URL}/events/${eventId}/entry-points`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Entry point added successfully");
      setShowAddModal(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to add entry point");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await axios.patch(
        `${API_URL}/events/${eventId}/entry-points/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Entry point updated successfully");
      setEditingEntryPoint(null);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || "Failed to update entry point",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_URL}/events/${eventId}/entry-points/${id}`);
    },
    onSuccess: () => {
      toast.success("Entry point deleted successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || "Failed to delete entry point",
      );
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      stationLabel: "",
      type: "custom",
      location: "",
      multiEntryAllowed: false,
      allowGroupCount: false,
      linkedEpId: "",
    });
  };

  const handleEdit = (ep: any) => {
    setEditingEntryPoint(ep);
    setFormData({
      name: ep.name,
      stationLabel: ep.stationLabel,
      type: ep.type,
      location: ep.location || "",
      multiEntryAllowed: ep.multiEntryAllowed || false,
      allowGroupCount: ep.allowGroupCount || false,
      linkedEpId: ep.linkedEpId || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData };
    if (editingEntryPoint) {
      updateMutation.mutate({ id: editingEntryPoint._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this entry point?")) {
      deleteMutation.mutate(id);
    }
  };

  const generateStationQR = async (entryPointId: string) => {
    try {
      const response = await axios.post(
        `${API_URL}/entry-points/${entryPointId}/generate-station-qr`,
      );
      const link = document.createElement("a");
      link.href = response.data.qrImage;
      link.download = `station-${entryPointId}.png`;
      link.click();
      toast.success("Station QR downloaded");
    } catch (error) {
      toast.error("Failed to generate station QR");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/events/${eventId}`}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Entry Points</h1>
            <p className="text-gray-600 mt-1">
              {eventData?.event?.name} - Configure scanning stations
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Add Entry Point
        </Button>
      </div>

      {/* Entry Points Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entryPoints?.map((ep: any) => (
          <Card key={ep._id} padding={false}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <DoorOpen className="w-6 h-6 text-orange-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{ep.name}</h3>
                    <p className="text-sm text-gray-500">{ep.stationLabel}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${ep.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                >
                  {ep.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                {ep.location && (
                  <p className="text-gray-600">📍 {ep.location}</p>
                )}
                {ep.linkedEpId && (
                  <p className="text-orange-600 flex items-center">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Requires:{" "}
                    {
                      entryPoints?.find((e: any) => e._id === ep.linkedEpId)
                        ?.name
                    }
                  </p>
                )}
                {ep.multiEntryAllowed && (
                  <p className="text-blue-600">✓ Multiple entries allowed</p>
                )}
                {ep.allowGroupCount && (
                  <p className="text-green-600 flex items-center">
                    <UserPlus className="w-4 h-4 mr-1" />✓ Family/Group count
                    enabled
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 p-4 bg-gray-50 flex justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(ep)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(ep._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || !!editingEntryPoint}
        onClose={() => {
          setShowAddModal(false);
          setEditingEntryPoint(null);
          resetForm();
        }}
        title={editingEntryPoint ? "Edit Entry Point" : "Add Entry Point"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={entryPointTypes}
            required
          />

          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Main Gate Entry"
            required
          />
          <Input
            label="Station Label"
            value={formData.stationLabel}
            onChange={(e) =>
              setFormData({ ...formData, stationLabel: e.target.value })
            }
            placeholder="e.g., Gate #1 - North Entrance"
            required
          />
          <Input
            label="Location (Optional)"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            placeholder="e.g., Near Reception"
          />

          {/* Multi Entry Toggle */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.multiEntryAllowed}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    multiEntryAllowed: e.target.checked,
                  })
                }
                className="rounded border-gray-300 text-orange-600"
              />
              <span className="ml-2 text-sm">Allow multiple entries</span>
            </label>
          </div>

          {/* Family/Group Count Toggle - NEW */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.allowGroupCount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    allowGroupCount: e.target.checked,
                  })
                }
                className="rounded border-gray-300 text-orange-600"
              />
              <span className="ml-2 text-sm">Allow Family/Group Count</span>
            </label>
            <p className="text-xs text-gray-400 mt-1 ml-6">
              When enabled, volunteer can enter number of people for this entry
              point
            </p>
          </div>

          <Select
            label="Requires Previous Scan (Optional)"
            value={formData.linkedEpId}
            onChange={(e) =>
              setFormData({ ...formData, linkedEpId: e.target.value })
            }
            options={[
              { value: "", label: "None - Standalone" },
              ...(entryPoints?.map((ep: any) => ({
                value: ep._id,
                label: `Must scan ${ep.name} first`,
              })) || []),
            ]}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setEditingEntryPoint(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingEntryPoint ? "Update" : "Add"} Entry Point
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
