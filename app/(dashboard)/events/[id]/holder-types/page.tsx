"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api"; // FIX: use authenticated instance
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import Link from "next/link";


// Quick icon selection
const ICON_OPTIONS = [
  { emoji: "💰", label: "Sponsor" },
  { emoji: "🙏", label: "Donor" },
  { emoji: "🤝", label: "Volunteer" },
  { emoji: "👤", label: "General" },
  { emoji: "⭐", label: "VIP" },
  { emoji: "🎓", label: "Student" },
  { emoji: "👨‍👩‍👧‍👦", label: "Family" },
  { emoji: "🏛️", label: "Official" },
  { emoji: "🎭", label: "Artist" },
  { emoji: "📰", label: "Media" },
];

const COLOR_OPTIONS = [
  "#F97316",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
  "#EF4444",
  "#EAB308",
  "#EC4899",
  "#06B6D4",
];

export default function HolderTypesPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [showModal, setShowModal] = useState(false);
  const [editingHT, setEditingHT] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    icon: "👤",
    color: "#F97316",
  });

  const { data: eventData } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}`);
      return response.data;
    },
  });

  const { data: holderTypes, refetch } = useQuery({
    queryKey: ["holder-types", eventId],
    queryFn: async () => {
      const response = await api.get(
        `/events/${eventId}/holder-types`,
      );
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(
        `/events/${eventId}/holder-types`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Holder type created!");
      closeModal();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(
        `/events/${eventId}/holder-types/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Holder type updated!");
      closeModal();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/events/${eventId}/holder-types/${id}`);
    },
    onSuccess: () => {
      toast.success("Holder type deleted");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete");
    },
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingHT(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      icon: "👤",
      color: "#F97316",
    });
  };

  const handleEdit = (ht: any) => {
    setEditingHT(ht);
    setFormData({
      name: ht.name || "",
      code: ht.code || "",
      description: ht.description || "",
      icon: ht.icon || "👤",
      color: ht.color || "#F97316",
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData };
    if (editingHT) {
      updateMutation.mutate({ id: editingHT._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleModalConfirm = () => {
    // Create a synthetic event or just call handleSubmit without event
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(fakeEvent);
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
            <h1 className="text-2xl font-bold text-gray-900">Holder Types</h1>
            <p className="text-gray-600 mt-1">
              {eventData?.event?.name} — Define types of pass holders
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingHT(null);
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Holder Type
        </Button>
      </div>

      {/* Holder Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {holderTypes?.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No holder types yet. Create "Sponsor", "Donor", "Volunteer" etc.
          </div>
        )}
        {holderTypes?.map((ht: any) => (
          <Card key={ht._id} padding={false}>
            <div
              className="h-2"
              style={{ backgroundColor: ht.color || "#F97316" }}
            />
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: (ht.color || "#F97316") + "15" }}
                  >
                    {ht.icon || "👤"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{ht.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{ht.code}</p>
                  </div>
                </div>
                {ht.isDefault && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                    Default
                  </span>
                )}
              </div>
              {ht.description && (
                <p className="text-sm text-gray-600">{ht.description}</p>
              )}
            </div>
            <div className="border-t border-gray-100 p-3 bg-gray-50 flex justify-end space-x-2 rounded-b-xl">
              <button
                onClick={() => handleEdit(ht)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${ht.name}"?`))
                    deleteMutation.mutate(ht._id);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingHT ? "Edit Holder Type" : "Add Holder Type"}
        onConfirm={handleModalConfirm}
        confirmText={editingHT ? "Update" : "Create"}
        loading={createMutation.isPending || updateMutation.isPending}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Gold Sponsor"
              required
            />
            <Input
              label="Code *"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              placeholder="e.g., GS"
              maxLength={5}
              required
            />
          </div>

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Who is this holder type for?"
          />

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon.emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: icon.emoji })}
                  className={`p-3 rounded-xl text-2xl border-2 transition-all ${
                    formData.icon === icon.emoji
                      ? "border-orange-500 bg-orange-50 scale-110"
                      : "border-gray-200 hover:border-orange-300"
                  }`}
                  title={icon.label}
                >
                  {icon.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex gap-2 items-center flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${
                    formData.color === color
                      ? "border-gray-900 scale-125 shadow-lg"
                      : "border-gray-200 hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <input
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="w-9 h-9 rounded-full border-2 border-gray-200 cursor-pointer"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
