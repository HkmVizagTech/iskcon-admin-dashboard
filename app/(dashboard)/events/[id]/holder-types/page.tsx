"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { ArrowLeft, Plus, Edit, Trash2, Tags, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import Link from "next/link";

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
  { emoji: "🎟️", label: "Invitee" },
  { emoji: "📿", label: "Devotee" },
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

interface CategoryFormData {
  name: string;
  catCode: string;
  description: string;
  color: string;
  icon: string;
  entryPointIds: string[];
  holderTypeId: string;
  issuerRoleRequired: string;
  overrideAllowedBy: string;
}

const EMPTY_CAT_FORM: CategoryFormData = {
  name: "",
  catCode: "",
  description: "",
  color: "#FF6B6B",
  icon: "🎟️",
  entryPointIds: [],
  holderTypeId: "",
  issuerRoleRequired: "event_admin",
  overrideAllowedBy: "event_admin",
};

export default function HolderTypesPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  // Holder type state
  const [showHTModal, setShowHTModal] = useState(false);
  const [editingHT, setEditingHT] = useState<any>(null);
  const [htForm, setHTForm] = useState({
    name: "",
    code: "",
    description: "",
    icon: "👤",
    color: "#F97316",
  });

  // Category state
  const [expandedHT, setExpandedHT] = useState<string | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [catForm, setCatForm] = useState<CategoryFormData>(EMPTY_CAT_FORM);

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: eventData } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}`);
      return response.data;
    },
  });

  const { data: holderTypes, refetch: refetchHT } = useQuery({
    queryKey: ["holder-types", eventId],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}/holder-types`);
      return response.data;
    },
  });

  // Fetch ALL categories for this event (so we can group by holderType)
  const { data: categories, refetch: refetchCats } = useQuery({
    queryKey: ["categories", eventId],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}/categories`);
      return response.data;
    },
  });

  // Fetch entry points (for category modal)
  const { data: entryPoints } = useQuery({
    queryKey: ["entry-points", eventId],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}/entry-points`);
      return response.data;
    },
  });

  // ── Holder Type Mutations ──────────────────────────────────────────────
  const createHTMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/events/${eventId}/holder-types`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Holder type created!");
      closeHTModal();
      refetchHT();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create");
    },
  });

  const updateHTMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/events/${eventId}/holder-types/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Holder type updated!");
      closeHTModal();
      refetchHT();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update");
    },
  });

  const deleteHTMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/events/${eventId}/holder-types/${id}`);
    },
    onSuccess: () => {
      toast.success("Holder type deleted");
      refetchHT();
      refetchCats();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete");
    },
  });

  // ── Category Mutations ─────────────────────────────────────────────────
  const createCatMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/events/${eventId}/categories`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Category created!");
      closeCatModal();
      refetchCats();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create category");
    },
  });

  const updateCatMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/events/${eventId}/categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Category updated!");
      closeCatModal();
      refetchCats();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update category");
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/events/${eventId}/categories/${id}`);
    },
    onSuccess: () => {
      toast.success("Category deleted");
      refetchCats();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete category");
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────
  const getCatsForHT = (htId: string) =>
    (categories || []).filter(
      (cat: any) => cat.holderTypeId?._id === htId || cat.holderTypeId === htId
    );

  const closeHTModal = () => {
    setShowHTModal(false);
    setEditingHT(null);
    setHTForm({ name: "", code: "", description: "", icon: "👤", color: "#F97316" });
  };

  const closeCatModal = () => {
    setShowCatModal(false);
    setEditingCat(null);
    setCatForm(EMPTY_CAT_FORM);
  };

  const handleEditHT = (ht: any) => {
    setEditingHT(ht);
    setHTForm({
      name: ht.name || "",
      code: ht.code || "",
      description: ht.description || "",
      icon: ht.icon || "👤",
      color: ht.color || "#F97316",
    });
    setShowHTModal(true);
  };

  const handleHTSubmit = () => {
    const payload = { ...htForm };
    if (editingHT) {
      updateHTMutation.mutate({ id: editingHT._id, data: payload });
    } else {
      createHTMutation.mutate(payload);
    }
  };

  const handleAddCat = (htId: string) => {
    const ht = holderTypes?.find((h: any) => h._id === htId);
    setEditingCat(null);
    setCatForm({
      ...EMPTY_CAT_FORM,
      holderTypeId: htId,
      color: ht?.color || "#FF6B6B",
      icon: ht?.icon || "🎟️",
    });
    setShowCatModal(true);
  };

  const handleEditCat = (cat: any) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name || "",
      catCode: cat.catCode || "",
      description: cat.description || "",
      color: cat.color || "#FF6B6B",
      icon: cat.icon || "🎟️",
      holderTypeId: cat.holderTypeId?._id || cat.holderTypeId || "",
      entryPointIds: cat.entryPoints?.map((ep: any) => ep._id || ep) || [],
      issuerRoleRequired: cat.issuerRoleRequired || "event_admin",
      overrideAllowedBy: cat.overrideAllowedBy || "event_admin",
    });
    setShowCatModal(true);
  };

  const handleCatSubmit = () => {
    const payload = {
      name: catForm.name,
      catCode: catForm.catCode,
      description: catForm.description,
      color: catForm.color,
      icon: catForm.icon,
      holderTypeId: catForm.holderTypeId,
      entryPointIds: catForm.entryPointIds,
      issuerRoleRequired: catForm.issuerRoleRequired,
      overrideAllowedBy: catForm.overrideAllowedBy,
    };
    if (editingCat) {
      updateCatMutation.mutate({ id: editingCat._id, data: payload });
    } else {
      createCatMutation.mutate(payload);
    }
  };

  const toggleEntryPoint = (epId: string) => {
    setCatForm((prev) => ({
      ...prev,
      entryPointIds: prev.entryPointIds.includes(epId)
        ? prev.entryPointIds.filter((id) => id !== epId)
        : [...prev.entryPointIds, epId],
    }));
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
            <h1 className="text-2xl font-bold text-gray-900">Holder Types &amp; Categories</h1>
            <p className="text-gray-600 mt-1">
              {eventData?.event?.name} — Define holder types and their categories
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingHT(null);
            setHTForm({ name: "", code: "", description: "", icon: "👤", color: "#F97316" });
            setShowHTModal(true);
          }}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Holder Type
        </Button>
      </div>

      {/* Holder Types with inline categories */}
      {holderTypes?.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No holder types yet</p>
            <p className="text-sm">Create &quot;Invitee&quot;, &quot;Sponsor&quot;, &quot;VIP&quot; etc. then add categories to each type.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {holderTypes?.map((ht: any) => {
            const cats = getCatsForHT(ht._id);
            const isExpanded = expandedHT === ht._id;

            return (
              <Card key={ht._id} padding={false}>
                {/* Holder Type Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedHT(isExpanded ? null : ht._id)}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: (ht.color || "#F97316") + "15" }}
                    >
                      {ht.icon || "👤"}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">{ht.name}</h3>
                        <span className="font-mono text-sm text-gray-500">{ht.code}</span>
                        {ht.isDefault && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      {ht.description && (
                        <p className="text-sm text-gray-500">{ht.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {cats.length} {cats.length === 1 ? "category" : "categories"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditHT(ht);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit holder type"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${ht.name}"?`))
                          deleteHTMutation.mutate(ht._id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete holder type"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded: Categories for this holder type */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-700 flex items-center">
                        <Tags className="w-4 h-4 mr-2" />
                        Categories
                      </h4>
                      <Button
                        size="sm"
                        onClick={() => handleAddCat(ht._id)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Category
                      </Button>
                    </div>

                    {cats.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm">
                        No categories yet for this holder type. Add one to enable pass issuance.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cats.map((cat: any) => (
                          <div
                            key={cat._id}
                            className="bg-white rounded-lg border border-gray-200 p-3"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                                  style={{ backgroundColor: (cat.color || "#FF6B6B") + "20" }}
                                >
                                  {cat.icon || "🏷️"}
                                </div>
                                <div>
                                  <p className="font-medium text-sm text-gray-900">{cat.name}</p>
                                  <p className="text-xs text-gray-500 font-mono">{cat.catCode}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleEditCat(cat)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit category"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete category "${cat.name}"?`))
                                      deleteCatMutation.mutate(cat._id);
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete category"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {cat.entryPoints?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {cat.entryPoints.map((ep: any) => (
                                  <span
                                    key={ep._id || ep}
                                    className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded"
                                  >
                                    {ep.name || ep}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add/Edit Holder Type Modal ──────────────────────────────────── */}
      <Modal
        isOpen={showHTModal}
        onClose={closeHTModal}
        title={editingHT ? "Edit Holder Type" : "Add Holder Type"}
        onConfirm={handleHTSubmit}
        confirmText={editingHT ? "Update" : "Create"}
        loading={createHTMutation.isPending || updateHTMutation.isPending}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name *"
              value={htForm.name}
              onChange={(e) => setHTForm({ ...htForm, name: e.target.value })}
              placeholder="e.g. Invitee"
              required
            />
            <Input
              label="Code *"
              value={htForm.code}
              onChange={(e) => setHTForm({ ...htForm, code: e.target.value.toUpperCase() })}
              placeholder="e.g. INV"
              maxLength={5}
              required
            />
          </div>

          <Input
            label="Description"
            value={htForm.description}
            onChange={(e) => setHTForm({ ...htForm, description: e.target.value })}
            placeholder="Who is this holder type for?"
          />

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="grid grid-cols-6 gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon.emoji}
                  type="button"
                  onClick={() => setHTForm({ ...htForm, icon: icon.emoji })}
                  className={`p-3 rounded-xl text-2xl border-2 transition-all ${
                    htForm.icon === icon.emoji
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2 items-center flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setHTForm({ ...htForm, color })}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${
                    htForm.color === color
                      ? "border-gray-900 scale-125 shadow-lg"
                      : "border-gray-200 hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={htForm.color}
                onChange={(e) => setHTForm({ ...htForm, color: e.target.value })}
                className="w-9 h-9 rounded-full border-2 border-gray-200 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Add/Edit Category Modal (within holder type) ────────────────── */}
      <Modal
        isOpen={showCatModal}
        onClose={closeCatModal}
        title={editingCat ? "Edit Category" : "Add Category"}
        size="lg"
        onConfirm={handleCatSubmit}
        confirmText={editingCat ? "Update Category" : "Create Category"}
        loading={createCatMutation.isPending || updateCatMutation.isPending}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Category Name *"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="e.g. Invitee"
              required
            />
            <Input
              label="Category Code *"
              value={catForm.catCode}
              onChange={(e) => setCatForm({ ...catForm, catCode: e.target.value.toUpperCase() })}
              placeholder="e.g. INV"
              maxLength={5}
              required
            />
          </div>

          <Input
            label="Description"
            value={catForm.description}
            onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
            placeholder="Brief description of this category"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <input
                type="color"
                value={catForm.color}
                onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Icon (Emoji)</label>
              <input
                type="text"
                value={catForm.icon || ""}
                onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                placeholder="🎟️"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Select Entry Points */}
          {entryPoints && entryPoints.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entry Points
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {entryPoints.map((ep: any) => (
                  <label
                    key={ep._id}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      catForm.entryPointIds.includes(ep._id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={catForm.entryPointIds.includes(ep._id)}
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
              value={catForm.issuerRoleRequired}
              onChange={(e) => setCatForm({ ...catForm, issuerRoleRequired: e.target.value })}
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
              value={catForm.overrideAllowedBy}
              onChange={(e) => setCatForm({ ...catForm, overrideAllowedBy: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="super_admin">Super Admin Only</option>
              <option value="event_admin">Event Admin</option>
              <option value="none">No Override Allowed</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
