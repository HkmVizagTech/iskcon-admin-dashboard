"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Plus, Search, Edit2, Trash2, KeyRound,
  BookOpen, CheckCircle, XCircle, Eye, EyeOff, Badge
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function PreachersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPreacher, setEditingPreacher] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const [formData, setFormData] = useState({
    name: "", shortCode: "", email: "", phone: "", password: "",
    allowedEvents: [] as string[],
  });

  const { data: events } = useQuery({
    queryKey: ["events-all"],
    queryFn: async () => (await api.get("/events")).data.events,
  });

  const { data: preachers, isLoading } = useQuery({
    queryKey: ["preachers", eventFilter],
    queryFn: async () => {
      const params = eventFilter ? `?eventId=${eventFilter}` : "";
      return (await api.get(`/preachers${params}`)).data.preachers;
    },
  });

  const filtered = preachers?.filter((p: any) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.shortCode?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  );

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await api.post("/preachers", data)).data,
    onSuccess: () => {
      toast.success("Preacher created successfully");
      queryClient.invalidateQueries({ queryKey: ["preachers"] });
      setShowModal(false); resetForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to create preacher"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => (await api.patch(`/preachers/${id}`, data)).data,
    onSuccess: () => {
      toast.success("Preacher updated");
      queryClient.invalidateQueries({ queryKey: ["preachers"] });
      setShowModal(false); resetForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/preachers/${id}`)).data,
    onSuccess: () => {
      toast.success("Preacher deactivated");
      queryClient.invalidateQueries({ queryKey: ["preachers"] });
    },
    onError: () => toast.error("Failed to deactivate"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: any) =>
      (await api.post(`/preachers/${id}/reset-password`, { password })).data,
    onSuccess: () => {
      toast.success("Password reset");
      setShowPasswordModal(null); setNewPassword("");
    },
    onError: () => toast.error("Failed to reset password"),
  });

  const resetForm = () => {
    setFormData({ name: "", shortCode: "", email: "", phone: "", password: "", allowedEvents: [] });
    setEditingPreacher(null);
    setShowPassword(false);
  };

  const handleEdit = (p: any) => {
    setEditingPreacher(p);
    setFormData({
      name: p.name || "",
      shortCode: p.shortCode || "",
      email: p.email || "",
      phone: p.phone || "",
      password: "",
      allowedEvents: p.allowedEvents?.map((e: any) => e._id || e) || [],
    });
    setShowModal(true);
  };

  // Auto-generate short code from name
  const autoGenCode = (name: string) => {
    return name
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("")
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10);
  };

  const handleSubmit = () => {
    if (!formData.name) { toast.error("Name is required"); return; }
    if (!formData.shortCode) { toast.error("Short code is required"); return; }
    if (!editingPreacher && formData.password.length < 6) {
      toast.error("Password must be at least 6 characters"); return;
    }
    if (!formData.email && !formData.phone) {
      toast.error("Email or phone is required"); return;
    }

    const payload: any = {
      name: formData.name,
      shortCode: formData.shortCode.toUpperCase(),
      allowedEvents: formData.allowedEvents,
    };
    if (formData.email) payload.email = formData.email;
    if (formData.phone) payload.phone = formData.phone;
    if (formData.password) payload.password = formData.password;

    if (editingPreacher) {
      updateMutation.mutate({ id: editingPreacher._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-600" /> Preachers
          </h1>
          <p className="text-gray-600 mt-1">
            Manage preachers, their short codes, and festival access.
            Use short codes (e.g. <span className="font-mono bg-orange-50 px-1 rounded text-orange-700">MKGD</span>) in the Preacher column of your import CSV.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-5 h-5 mr-2" /> Add Preacher
        </Button>
      </div>

      {/* Info box */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 text-sm text-orange-800">
        <strong>📋 How to use in CSV import:</strong> Add a "Preacher" column to your spreadsheet.
        Enter the preacher's short code (e.g. <code className="bg-orange-100 px-1 rounded">MKGD</code>) or full name.
        The system will automatically link the holder to the matching preacher.
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Preachers", value: preachers?.length || 0, color: "orange" },
          { label: "Active", value: preachers?.filter((p: any) => p.isActive !== false).length || 0, color: "green" },
          { label: "Festivals Covered", value: new Set(preachers?.flatMap((p: any) => p.allowedEvents?.map((e: any) => e._id || e) || [])).size || 0, color: "purple" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex-1">
          <Input
            placeholder="Search by name or short code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
        >
          <option value="">All Festivals</option>
          {events?.map((e: any) => (
            <option key={e._id} value={e._id}>{e.name} ({e.eventCode})</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Preacher", "Short Code", "Contact", "Assigned Festivals", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!filtered?.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    No preachers yet. Add your first preacher to get started.
                  </td>
                </tr>
              ) : filtered.map((p: any) => (
                <tr key={p._id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {p.shortCode?.[0] || p.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                        <p className="text-xs text-gray-400">🕉️ Preacher</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {p.shortCode ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold font-mono bg-orange-100 text-orange-700 border border-orange-200">
                        {p.shortCode}
                      </span>
                    ) : (
                      <span className="text-xs text-red-400">Not set</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {p.email && <div className="truncate max-w-[160px]">{p.email}</div>}
                    {p.phone && <div>{p.phone}</div>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {p.allowedEvents?.length > 0 ? (
                        p.allowedEvents.map((e: any) => (
                          <span key={e._id || e}
                            className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium border border-orange-100">
                            🕉️ {e.name || e.eventCode}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No festivals</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {p.isActive !== false ? (
                      <span className="flex items-center gap-1 text-green-700 text-xs font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                        <XCircle className="w-3.5 h-3.5" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(p)} title="Edit"
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setShowPasswordModal(p); setNewPassword(""); }} title="Reset Password"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Deactivate ${p.name}?`)) deleteMutation.mutate(p._id); }}
                        title="Deactivate"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold">
                {editingPreacher ? "Edit Preacher" : "Add Preacher"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                The short code is used in CSV imports to identify this preacher.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <Input
                label="Full Name *"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    name,
                    // Auto-generate short code when name is typed (if field is empty)
                    shortCode: prev.shortCode ? prev.shortCode : autoGenCode(name),
                  }));
                }}
                placeholder="e.g. Mukunda Gauranga Dasa"
              />

              {/* Short Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Code *
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    used in CSV import Preacher column
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.shortCode}
                    onChange={(e) => setFormData({
                      ...formData,
                      shortCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                    })}
                    placeholder="e.g. MKGD"
                    maxLength={10}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono uppercase text-orange-700 font-bold tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, shortCode: autoGenCode(prev.name) }))}
                    className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 whitespace-nowrap"
                  >
                    Auto-generate
                  </button>
                </div>
                {formData.shortCode && (
                  <p className="text-xs text-orange-600 mt-1">
                    In CSV: use <code className="bg-orange-50 px-1 rounded font-bold">{formData.shortCode}</code> in the Preacher column
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Email" type="email" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="preacher@iskcon.org" />
                <Input label="Phone" value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="9876543210" />
              </div>

              {!editingPreacher && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password * <span className="text-xs text-gray-400 font-normal">(min 6 chars)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Set login password"
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Festivals
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50">
                  {!events?.length && <p className="text-sm text-gray-400 p-2">No events available</p>}
                  {events?.map((e: any) => (
                    <label key={e._id} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.allowedEvents.includes(e._id)}
                        onChange={(ev) => setFormData(prev => ({
                          ...prev,
                          allowedEvents: ev.target.checked
                            ? [...prev.allowedEvents, e._id]
                            : prev.allowedEvents.filter(id => id !== e._id),
                        }))}
                        className="w-4 h-4 text-orange-600 rounded"
                      />
                      <span className="text-sm text-gray-700">🕉️ {e.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{e.eventCode}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>
                {editingPreacher ? "Save Changes" : "Create Preacher"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-1">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-4">
              for <strong>{showPasswordModal.name}</strong>
              {showPasswordModal.shortCode && (
                <span className="ml-2 font-mono bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">
                  {showPasswordModal.shortCode}
                </span>
              )}
            </p>
            <div className="relative mb-4">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1"
                onClick={() => { setShowPasswordModal(null); setNewPassword(""); }}>Cancel</Button>
              <Button className="flex-1" loading={resetPasswordMutation.isPending}
                onClick={() => {
                  if (newPassword.length < 6) { toast.error("Min 6 characters"); return; }
                  resetPasswordMutation.mutate({ id: showPasswordModal._id, password: newPassword });
                }}>Reset</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
