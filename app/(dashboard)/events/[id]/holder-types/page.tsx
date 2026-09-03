"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ArrowLeft, Plus, Edit, Trash2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
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

interface HolderTypeFormData {
  name: string;
  catCode: string;
  description: string;
  color: string;
  icon: string;
  entryPointIds: string[];
  issuerRoleRequired: string;
  overrideAllowedBy: string;
  categories: string[];
}

const EMPTY_FORM: HolderTypeFormData = {
  name: "",
  catCode: "",
  description: "",
  color: "#FF6B6B",
  icon: "🎟️",
  entryPointIds: [],
  issuerRoleRequired: "event_admin",
  overrideAllowedBy: "event_admin",
  categories: [],
};

export default function HolderTypesPage() {
  const params = useParams();
  const eventId = params.id as string;
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<HolderTypeFormData>(EMPTY_FORM);
  const [reassign, setReassign] = useState<{ htId: string; name: string; count: number } | null>(null);
  const [moveToId, setMoveToId] = useState("");
  // Draft text for the "custom category" box. It needs its own state: the input
  // is controlled, and without it React pinned the value to "" on every render,
  // so nothing could ever be typed and no custom category could be added.
  const [customCat, setCustomCat] = useState("");

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: eventData } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}`);
      return response.data;
    },
  });

  const { data: holderTypes, isLoading } = useQuery({
    queryKey: ["holder-types", eventId],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}/holder-types`);
      return response.data;
    },
  });

  const { data: entryPoints } = useQuery({
    queryKey: ["entry-points", eventId],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}/entry-points`);
      return response.data;
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/events/${eventId}/holder-types`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Holder type created!");
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["holder-types", eventId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/events/${eventId}/holder-types/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Holder type updated!");
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["holder-types", eventId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, moveToTypeId }: { id: string; moveToTypeId?: string }) => {
      const url = `/events/${eventId}/holder-types/${id}` +
        (moveToTypeId ? `?moveToTypeId=${moveToTypeId}` : "");
      const response = await api.delete(url);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Holder type deleted");
      setReassign(null);
      setMoveToId("");
      queryClient.invalidateQueries({ queryKey: ["holder-types", eventId] });
    },
    onError: (error: any, variables) => {
      const data = error.response?.data;
      if (error.response?.status === 409 && data?.activeHolderCount > 0) {
        const ht = holderTypes?.find((t: any) => t._id === variables.id);
        setReassign({ htId: variables.id, name: ht?.name || "this type", count: data.activeHolderCount });
        setMoveToId("");
        return;
      }
      toast.error(data?.error || "Failed to delete");
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────
  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setCustomCat("");
  };

  // Commit the typed custom category to the form's list. Shared by the Enter
  // key and the Add button so both behave identically.
  const addCustomCategory = () => {
    const val = customCat.trim().toUpperCase();
    if (!val) return;
    if (form.categories.includes(val)) {
      setCustomCat("");
      return;
    }
    setForm((prev) => ({ ...prev, categories: [...prev.categories, val] }));
    setCustomCat("");
  };

  const handleEdit = (ht: any) => {
    setEditing(ht);
    setForm({
      name: ht.name || "",
      catCode: ht.catCode || "",
      description: ht.description || "",
      color: ht.color || "#FF6B6B",
      icon: ht.icon || "🎟️",
      entryPointIds: ht.entryPoints?.map((ep: any) => ep._id || ep) || [],
      issuerRoleRequired: ht.issuerRoleRequired || "event_admin",
      overrideAllowedBy: ht.overrideAllowedBy || "event_admin",
      categories: ht.categories || [],
    });
    setCustomCat("");
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.catCode.trim()) {
      toast.error("Name and code are required");
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing._id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleEntryPoint = (epId: string) => {
    setForm((prev) => ({
      ...prev,
      entryPointIds: prev.entryPointIds.includes(epId)
        ? prev.entryPointIds.filter((id) => id !== epId)
        : [...prev.entryPointIds, epId],
    }));
  };

  const handleDelete = (ht: any) => {
    if (ht.isDefault) {
      toast.error("Default holder types cannot be deleted. Deactivate them instead.");
      return;
    }
    if (
      !confirm(
        `Delete "${ht.name}"? If holders are assigned to it, you'll be asked where to move them.`,
      )
    ) {
      return;
    }
    deleteMutation.mutate({ id: ht._id });
  };

  const handleReassignConfirm = () => {
    if (!moveToId) {
      toast.error("Choose a holder type to move the holders to");
      return;
    }
    deleteMutation.mutate({ id: reassign!.htId, moveToTypeId: moveToId });
  };

  const sortedTypes = [...(holderTypes || [])].sort(
    (a: any, b: any) =>
      Number(b.isDefault) - Number(a.isDefault) ||
      String(a.catCode).localeCompare(String(b.catCode))
  );

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
              {eventData?.event?.name} — Define holder types, categories, entry access and issuing rules
            </p>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Add Holder Type
        </Button>
      </div>

      {/* Holder Types grid */}
      {isLoading ? (
        <Card>
          <div className="text-center py-12 text-gray-500">Loading…</div>
        </Card>
      ) : sortedTypes.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No holder types yet</p>
            <p className="text-sm">
              Create &quot;Invitee&quot;, &quot;Sponsor&quot;, &quot;VIP&quot; etc. to enable pass issuance.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTypes.map((ht: any) => (
            <Card key={ht._id} padding={false}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: (ht.color || "#FF6B6B") + "15" }}
                    >
                      {ht.icon || "🏷️"}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h3 className="font-semibold text-gray-900">{ht.name}</h3>
                        <span className="font-mono text-sm text-gray-500">{ht.catCode}</span>
                        {ht.isDefault && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                            Default
                          </span>
                        )}
                        {!ht.isActive && (
                          <span className="px-2 py-0.5 text-xs bg-red-50 text-red-500 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      {ht.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{ht.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(ht)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit holder type"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {!ht.isDefault && (
                      <button
                        onClick={() => handleDelete(ht)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete holder type"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Entry points */}
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Entry Points
                  </p>
                  {ht.entryPoints?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {ht.entryPoints.map((ep: any) => (
                        <span
                          key={ep._id || ep}
                          className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded"
                        >
                          {typeof ep === "string" ? ep : ep.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No entry points — unrestricted</p>
                  )}
                </div>

                {/* Categories — shown as a clickable pill that expands */}
                {ht.categories?.length > 0 && (
                  <div className="mb-3">
                    <details className="group">
                      <summary className="cursor-pointer list-none flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors">
                        <span>Categories</span>
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-mono font-bold">
                          {ht.categories.length}
                        </span>
                        <span className="text-gray-300 group-open:rotate-90 transition-transform">▸</span>
                      </summary>
                      <div className="flex flex-wrap gap-1 mt-1.5 pl-0.5">
                        {ht.categories.map((cat: string) => (
                          <span
                            key={cat}
                            className={`px-2 py-0.5 text-xs font-bold font-mono rounded border ${
                              cat === "A" ? "bg-amber-100 text-amber-800 border-amber-300" :
                              cat === "B" ? "bg-slate-100 text-slate-700 border-slate-300" :
                              cat === "C" ? "bg-orange-100 text-orange-800 border-orange-300" :
                              "bg-purple-100 text-purple-800 border-purple-300"
                            }`}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </details>
                  </div>
                )}

                {/* Issuing rules */}
                <div className="flex items-center space-x-2 text-xs text-gray-500 border-t border-gray-100 pt-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                  <span>
                    Issue: {ht.issuerRoleRequired === "super_admin"
                      ? "Super Admin"
                      : ht.issuerRoleRequired === "campaign_manager"
                      ? "Campaign Manager"
                      : "Event Admin"}
                    {" · "}
                    Override: {ht.overrideAllowedBy === "none"
                      ? "None"
                      : ht.overrideAllowedBy === "super_admin"
                      ? "Super Admin"
                      : "Event Admin"}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Add/Edit Holder Type Modal ─────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editing ? "Edit Holder Type" : "Add Holder Type"}
        size="lg"
        onConfirm={handleSubmit}
        confirmText={editing ? "Update" : "Create"}
        loading={createMutation.isPending || updateMutation.isPending}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Invitee"
              required
            />
            <Input
              label="Code *"
              value={form.catCode}
              onChange={(e) => setForm({ ...form, catCode: e.target.value.toUpperCase() })}
              placeholder="e.g. INV"
              maxLength={5}
              required
            />
          </div>

          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Who is this holder type for?"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Icon (Emoji)</label>
              <input
                type="text"
                value={form.icon || ""}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="🎟️"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Icon quick-pick */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Icons</label>
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon.emoji}
                  type="button"
                  onClick={() => setForm({ ...form, icon: icon.emoji })}
                  className={`py-2 rounded-lg text-xl border transition-all ${
                    form.icon === icon.emoji
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-orange-300"
                  }`}
                  title={icon.label}
                >
                  {icon.emoji}
                </button>
              ))}
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
                      form.entryPointIds.includes(ep._id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.entryPointIds.includes(ep._id)}
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

          {/* Categories */}
          <details className="border border-gray-200 rounded-lg p-3 group">
            <summary className="cursor-pointer list-none flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Sub-Categories
                <span className="ml-1.5 text-xs text-gray-400 font-normal">
                  optional tiers within this holder type
                </span>
              </label>
              <span className="text-gray-400 group-open:rotate-90 transition-transform text-sm">▸</span>
            </summary>
            <p className="text-xs text-gray-400 mt-2 mb-3">
              Enable tiers so each holder can be classified (e.g. Donor A, Donor B). Leave empty if not needed.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {["A", "B", "C", "D", "E"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      categories: prev.categories.includes(cat)
                        ? prev.categories.filter((c) => c !== cat)
                        : [...prev.categories, cat],
                    }));
                  }}
                  className={`w-10 h-10 rounded-xl border-2 font-black text-lg transition-colors ${
                    form.categories.includes(cat)
                      ? cat === "A" ? "bg-amber-100 text-amber-800 border-amber-400"
                      : cat === "B" ? "bg-slate-100 text-slate-700 border-slate-400"
                      : cat === "C" ? "bg-orange-100 text-orange-800 border-orange-400"
                      : "bg-purple-100 text-purple-800 border-purple-400"
                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value.toUpperCase())}
                placeholder="Custom category name..."
                maxLength={20}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-bold uppercase"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomCategory();
                  }
                }}
              />
              <button
                type="button"
                onClick={addCustomCategory}
                disabled={!customCat.trim()}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Press Enter or click Add. Duplicates are ignored.
            </p>
            {form.categories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {form.categories.map((cat) => (
                  <span
                    key={cat}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold font-mono rounded border ${
                      cat === "A" ? "bg-amber-100 text-amber-800 border-amber-300" :
                      cat === "B" ? "bg-slate-100 text-slate-700 border-slate-300" :
                      cat === "C" ? "bg-orange-100 text-orange-800 border-orange-300" :
                      "bg-purple-100 text-purple-800 border-purple-300"
                    }`}
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, categories: prev.categories.filter((c) => c !== cat) }))}
                      className="hover:text-red-600"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </details>

          {/* Issuer Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who can issue this holder type?
            </label>
            <select
              value={form.issuerRoleRequired}
              onChange={(e) => setForm({ ...form, issuerRoleRequired: e.target.value })}
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
              value={form.overrideAllowedBy}
              onChange={(e) => setForm({ ...form, overrideAllowedBy: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="super_admin">Super Admin Only</option>
              <option value="event_admin">Event Admin</option>
              <option value="none">No Override Allowed</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* ── Reassign & Delete Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={!!reassign}
        onClose={() => {
          setReassign(null);
          setMoveToId("");
        }}
        title="Reassign holders before delete"
        size="md"
        onConfirm={handleReassignConfirm}
        confirmText={`Move ${reassign?.count ?? 0} & Delete`}
        loading={deleteMutation.isPending}
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <strong>{reassign?.count}</strong> holder(s) and their QR passes are
            assigned to <strong>{reassign?.name}</strong>. Choose another pass
            type to move them to — the type will then be deleted.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Move holders to *
            </label>
            <select
              value={moveToId}
              onChange={(e) => setMoveToId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Choose a holder type...</option>
              {(holderTypes || [])
                .filter((t: any) => t._id !== reassign?.htId)
                .map((t: any) => (
                  <option key={t._id} value={t._id}>
                    {t.icon || "🏷️"} {t.name} ({t.catCode})
                    {!t.isActive ? " — inactive" : ""}
                  </option>
                ))}
            </select>
          </div>
          <p className="text-xs text-gray-400">
            Existing QR passes stay scannable at their current entry points —
            they&apos;ll simply display and report under the new holder type.
          </p>
        </div>
      </Modal>
    </div>
  );
}
