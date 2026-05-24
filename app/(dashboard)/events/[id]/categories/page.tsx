"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api"; // FIX: use authenticated instance
import { ArrowLeft, Plus, Tags, Edit, Trash2, Check, X } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import Link from "next/link";


export default function CategoriesPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    catCode: "",
    description: "",
    color: "#FF6B6B",
    holderTypeId: "",
    entryPointIds: [] as string[],
    issuerRoleRequired: "event_admin",
    overrideAllowedBy: "event_admin",
  });

  const { data: eventData } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}`);
      return response.data;
    },
  });

  // Fetch holder types
  const { data: holderTypes } = useQuery({
    queryKey: ["holder-types", eventId],
    queryFn: async () => {
      const response = await api.get(
        `/events/${eventId}/holder-types`,
      );
      return response.data;
    },
  });

  // Fetch entry points
  const { data: entryPoints } = useQuery({
    queryKey: ["entry-points", eventId],
    queryFn: async () => {
      const response = await api.get(
        `/events/${eventId}/entry-points`,
      );
      return response.data;
    },
  });

  // Fetch categories
  const { data: categories, refetch } = useQuery({
    queryKey: ["categories", eventId],
    queryFn: async () => {
      const response = await api.get(
        `/events/${eventId}/categories`,
      );
      return response.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(
        `/events/${eventId}/categories`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Category created successfully");
      closeModal();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create category");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(
        `/events/${eventId}/categories/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Category updated successfully");
      closeModal();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update category");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/events/${eventId}/categories/${id}`);
    },
    onSuccess: () => {
      toast.success("Category deleted");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete category");
    },
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      catCode: "",
      description: "",
      color: "#FF6B6B",
      holderTypeId: "",
      entryPointIds: [],
      issuerRoleRequired: "event_admin",
      overrideAllowedBy: "event_admin",
    });
  };

  const handleEdit = (cat: any) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || "",
      catCode: cat.catCode || "",
      description: cat.description || "",
      color: cat.color || "#FF6B6B",
      holderTypeId: cat.holderTypeId?._id || cat.holderTypeId || "",
      entryPointIds: cat.entryPoints?.map((ep: any) => ep._id || ep) || [],
      issuerRoleRequired: cat.issuerRoleRequired || "event_admin",
      overrideAllowedBy: cat.overrideAllowedBy || "event_admin",
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      catCode: formData.catCode,
      description: formData.description,
      color: formData.color,
      holderTypeId: formData.holderTypeId,
      entryPointIds: formData.entryPointIds,
      issuerRoleRequired: formData.issuerRoleRequired,
      overrideAllowedBy: formData.overrideAllowedBy,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleEntryPoint = (epId: string) => {
    setFormData((prev) => ({
      ...prev,
      entryPointIds: prev.entryPointIds.includes(epId)
        ? prev.entryPointIds.filter((id) => id !== epId)
        : [...prev.entryPointIds, epId],
    }));
  };

  // When holder type changes, auto-select its entry points
  const handleHolderTypeChange = (holderTypeId: string) => {
    setFormData((prev) => ({ ...prev, holderTypeId }));

    // Auto-select entry points from holder type
    const selectedHT = holderTypes?.find((ht: any) => ht._id === holderTypeId);
    if (selectedHT?.entryPoints) {
      setFormData((prev) => ({
        ...prev,
        entryPointIds: selectedHT.entryPoints.map((ep: any) => ep._id || ep),
      }));
    }
  };

  const getEntryPointName = (epId: string) => {
    return entryPoints?.find((ep: any) => ep._id === epId)?.name || epId;
  };

  const getHolderTypeName = (htId: string) => {
    return holderTypes?.find((ht: any) => ht._id === htId)?.name || htId;
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
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-600 mt-1">
              {eventData?.event?.name} - Configure categories for QR passes
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null);
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories?.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No categories yet. Create your first category!
          </div>
        )}
        {categories?.map((cat: any) => (
          <Card key={cat._id} padding={false}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: (cat.color || "#FF6B6B") + "20" }}
                  >
                    {cat.icon || "🏷️"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">
                      {cat.catCode}
                    </p>
                  </div>
                </div>
                {cat.isCustom && (
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
                    Custom
                  </span>
                )}
              </div>

              {/* Holder Type */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">Holder Type</p>
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor:
                      (cat.holderTypeId?.color || "#FF6B6B") + "20",
                    color: cat.holderTypeId?.color || "#FF6B6B",
                  }}
                >
                  {cat.holderTypeId?.icon || "👤"}{" "}
                  {cat.holderTypeId?.name || "Unknown"}
                </span>
              </div>

              {/* Entry Points */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">Entry Points</p>
                <div className="flex flex-wrap gap-1">
                  {cat.entryPoints?.map((ep: any) => (
                    <span
                      key={ep._id || ep}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                    >
                      {ep.name || getEntryPointName(ep)}
                    </span>
                  ))}
                  {(!cat.entryPoints || cat.entryPoints.length === 0) && (
                    <span className="text-xs text-gray-400">None</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div>
                  <strong>Issued by:</strong>{" "}
                  {cat.issuerRoleRequired?.replace("_", " ")}
                </div>
                <div>
                  <strong>Override:</strong>{" "}
                  {cat.overrideAllowedBy === "none"
                    ? "No"
                    : cat.overrideAllowedBy?.replace("_", " ")}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 p-4 bg-gray-50 flex justify-end space-x-2">
              <button
                onClick={() => handleEdit(cat)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this category?"))
                    deleteMutation.mutate(cat._id);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingCategory ? "Edit Category" : "Add Category"}
        size="lg"
        onConfirm={handleModalConfirm}
        confirmText={editingCategory ? "Update Category" : "Create Category"}
        loading={createMutation.isPending || updateMutation.isPending}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Category Name *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., VIP Sponsor Access"
              required
            />
            <Input
              label="Category Code *"
              value={formData.catCode}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  catCode: e.target.value.toUpperCase(),
                })
              }
              placeholder="e.g., VS"
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
            placeholder="Brief description of this category"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon (Emoji)
              </label>
              <input
                type="text"
                value={formData.color}
                placeholder="🏷️"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Select Holder Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Holder Type *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {holderTypes?.map((ht: any) => (
                <button
                  key={ht._id}
                  type="button"
                  onClick={() => handleHolderTypeChange(ht._id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    formData.holderTypeId === ht._id
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-orange-300"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{ht.icon || "👤"}</span>
                    <div>
                      <p className="font-medium text-sm">{ht.name}</p>
                      <p className="text-xs text-gray-500">{ht.code}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Select Entry Points */}
          {formData.holderTypeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entry Points (auto-selected from holder type, can modify)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {entryPoints?.map((ep: any) => (
                  <label
                    key={ep._id}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.entryPointIds.includes(ep._id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.entryPointIds.includes(ep._id)}
                      onChange={() => toggleEntryPoint(ep._id)}
                      className="rounded border-gray-300 text-blue-600 mr-2"
                    />
                    <div>
                      <p className="font-medium text-sm">{ep.name}</p>
                      <p className="text-xs text-gray-500">{ep.stationLabel}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Issuer Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who can issue this category?
            </label>
            <select
              value={formData.issuerRoleRequired}
              onChange={(e) =>
                setFormData({ ...formData, issuerRoleRequired: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="super_admin">Super Admin Only</option>
              <option value="event_admin">Event Admin</option>
              <option value="campaign_manager">Campaign Manager</option>
            </select>
          </div>

          {/* Override Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who can override entry points?
            </label>
            <select
              value={formData.overrideAllowedBy}
              onChange={(e) =>
                setFormData({ ...formData, overrideAllowedBy: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="super_admin">Super Admin Only</option>
              <option value="event_admin">Event Admin</option>
              <option value="none">No Override Allowed</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
