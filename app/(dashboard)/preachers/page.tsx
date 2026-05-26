"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Plus, Search, Edit2, Trash2, KeyRound,
  BookOpen, CheckCircle, XCircle, Eye, EyeOff,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function PreachersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPreacher, setEditingPreacher] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const [formData, setFormData] = useState({
    name: "", shortCode: "", email: "", phone: "", password: "",
  });

  const { data: preachers, isLoading } = useQuery({
    queryKey: ["preachers"],
    queryFn: async () => (await api.get("/preachers")).data.preachers,
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
      toast.success("Preacher created");
      queryClient.invalidateQueries({ queryKey: ["preachers"] });
      closeModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) =>
      (await api.patch(`/preachers/${id}`, data)).data,
    onSuccess: () => {
      toast.success("Preacher updated");
      queryClient.invalidateQueries({ queryKey: ["preachers"] });
      closeModal();
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

  const resetPwMutation = useMutation({
    mutationFn: async ({ id, password }: any) =>
      (await api.post(`/preachers/${id}/reset-password`, { password })).data,
    onSuccess: () => {
      toast.success("Password reset");
      setShowPasswordModal(null);
      setNewPassword("");
    },
    onError: () => toast.error("Failed to reset password"),
  });

  const autoCode = (name: string) =>
    name.split(/\s+/).map((w) => w[0]?.toUpperCase() || "").join("").replace(/[^A-Z0-9]/g, "").slice(0, 10);

  const resetForm = () => {
    setFormData({ name: "", shortCode: "", email: "", phone: "", password: "" });
    setEditingPreacher(null);
    setShowPassword(false);
  };

  const closeModal = () => { setShowModal(false); resetForm(); };

  const openEdit = (p: any) => {
    setEditingPreacher(p);
    setFormData({
      name: p.name || "",
      shortCode: p.shortCode || "",
      email: p.email || "",
      phone: p.phone || "",
      password: "",
    });
    setShowPassword(false);
    setShowModal(true);
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
          <p className="text-gray-500 mt-1 text-sm">
            Manage preachers and their short codes. Preachers can log in to view their holders across all festivals.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Preacher
        </Button>
      </div>

      {/* CSV hint */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 text-sm text-orange-800">
        <strong>📋 CSV Import:</strong> Add a <code className="bg-orange-100 px-1.5 py-0.5 rounded font-mono text-xs">Preacher</code> column
        to your spreadsheet and enter the short code (e.g.{" "}
        <code className="bg-orange-100 px-1.5 py-0.5 rounded font-mono font-bold text-xs">MKGD</code>)
        or full name. The system will automatically link the holder to the matching preacher.
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-orange-600">{preachers?.length || 0}</div>
          <div className="text-sm text-gray-500 mt-0.5">Total Preachers</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {preachers?.filter((p: any) => p.isActive !== false).length || 0}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">Active</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <Input
          placeholder="Search by name or short code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
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
                {["Preacher", "Short Code", "Contact", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!filtered?.length ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No preachers yet</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Add preachers so you can link holders to them during import
                    </p>
                    <button
                      onClick={() => { resetForm(); setShowModal(true); }}
                      className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                    >
                      Add First Preacher
                    </button>
                  </td>
                </tr>
              ) : filtered.map((p: any) => (
                <tr key={p._id} className="hover:bg-orange-50/30 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {p.shortCode?.[0] || p.name?.[0]?.toUpperCase()}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {p.shortCode ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold font-mono bg-orange-100 text-orange-700 border border-orange-200 tracking-widest">
                        {p.shortCode}
                      </span>
                    ) : (
                      <span className="text-xs text-red-400">Not set</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {p.email && <div className="truncate max-w-[180px]">{p.email}</div>}
                    {p.phone && <div>{p.phone}</div>}
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(p)} title="Edit"
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setShowPasswordModal(p); setNewPassword(""); }} title="Reset Password"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Deactivate ${p.name}?`)) deleteMutation.mutate(p._id); }}
                        title="Deactivate"
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold">
                {editingPreacher ? "Edit Preacher" : "Add Preacher"}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Short code is used to identify this preacher in CSV imports
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData(prev => ({
                      ...prev, name,
                      shortCode: prev.shortCode ? prev.shortCode : autoCode(name),
                    }));
                  }}
                  placeholder="e.g. Mukunda Gauranga Dasa"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>

              {/* Short Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Code *
                  <span className="ml-1.5 text-xs text-gray-400 font-normal">2–10 letters/numbers</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.shortCode}
                    onChange={(e) => setFormData({
                      ...formData,
                      shortCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                    })}
                    placeholder="MKGD"
                    maxLength={10}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 font-mono font-bold text-orange-700 tracking-widest text-sm uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, shortCode: autoCode(p.name) }))}
                    className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 whitespace-nowrap"
                  >
                    Auto
                  </button>
                </div>
                {formData.shortCode && (
                  <p className="text-xs text-orange-600 mt-1">
                    In CSV Preacher column, use{" "}
                    <code className="bg-orange-50 px-1 rounded font-bold">{formData.shortCode}</code>
                  </p>
                )}
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@iskcon.org"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 text-sm" />
                </div>
              </div>

              {/* Password (create only) */}
              {!editingPreacher && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                    <span className="text-xs text-gray-400 font-normal ml-1">min 6 chars</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Set login password"
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingPreacher ? "Save Changes" : "Add Preacher"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold mb-1">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
              {showPasswordModal.name}
              {showPasswordModal.shortCode && (
                <span className="font-mono bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">
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
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowPasswordModal(null); setNewPassword(""); }}
                className="flex-1 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                disabled={resetPwMutation.isPending}
                onClick={() => {
                  if (newPassword.length < 6) { toast.error("Min 6 characters"); return; }
                  resetPwMutation.mutate({ id: showPasswordModal._id, password: newPassword });
                }}
                className="flex-1 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
                {resetPwMutation.isPending ? "Resetting..." : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
