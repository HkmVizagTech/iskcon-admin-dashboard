"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  Calendar, Users, QrCode, TrendingUp, Plus, ArrowRight,
  ScanLine, BookOpen, CheckCircle, XCircle, Edit2, KeyRound,
  Eye, EyeOff, Trash2,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { formatIST } from "@/lib/dateUtils";
import StatCard from "@/components/ui/StatCard";
import { useState } from "react";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Preacher modal state
  const [showPreacherModal, setShowPreacherModal] = useState(false);
  const [editingPreacher, setEditingPreacher] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [preacherForm, setPreacherForm] = useState({
    name: "", shortCode: "", email: "", phone: "", password: "",
    allowedEvents: [] as string[],
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await api.get("/reports/dashboard")).data,
  });

  const { data: recentEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["recent-events"],
    queryFn: async () => (await api.get("/events?limit=5")).data.events,
  });

  const { data: recentScans } = useQuery({
    queryKey: ["recent-scans"],
    staleTime: 0,
    queryFn: async () => (await api.get("/scan/recent?limit=10")).data.scans,
  });

  const { data: preachers, isLoading: preachersLoading } = useQuery({
    queryKey: ["preachers-dashboard"],
    queryFn: async () => (await api.get("/preachers")).data.preachers,
  });

  const { data: events } = useQuery({
    queryKey: ["events-for-preachers"],
    queryFn: async () => (await api.get("/events")).data.events,
  });

  // Auto-generate short code from name initials
  const autoCode = (name: string) =>
    name.split(/\s+/).map((w) => w[0]?.toUpperCase() || "").join("").replace(/[^A-Z0-9]/g, "").slice(0, 10);

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await api.post("/preachers", data)).data,
    onSuccess: () => {
      toast.success("Preacher added");
      queryClient.invalidateQueries({ queryKey: ["preachers-dashboard"] });
      closePreacherModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => (await api.patch(`/preachers/${id}`, data)).data,
    onSuccess: () => {
      toast.success("Preacher updated");
      queryClient.invalidateQueries({ queryKey: ["preachers-dashboard"] });
      closePreacherModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/preachers/${id}`)).data,
    onSuccess: () => {
      toast.success("Preacher deactivated");
      queryClient.invalidateQueries({ queryKey: ["preachers-dashboard"] });
    },
    onError: () => toast.error("Failed to deactivate"),
  });

  const resetPwMutation = useMutation({
    mutationFn: async ({ id, password }: any) =>
      (await api.post(`/preachers/${id}/reset-password`, { password })).data,
    onSuccess: () => {
      toast.success("Password reset");
      setShowResetModal(null); setNewPassword("");
    },
    onError: () => toast.error("Failed"),
  });

  const openAddModal = () => {
    setEditingPreacher(null);
    setPreacherForm({ name: "", shortCode: "", email: "", phone: "", password: "", allowedEvents: [] });
    setShowPassword(false);
    setShowPreacherModal(true);
  };

  const openEditModal = (p: any) => {
    setEditingPreacher(p);
    setPreacherForm({
      name: p.name || "",
      shortCode: p.shortCode || "",
      email: p.email || "",
      phone: p.phone || "",
      password: "",
      allowedEvents: p.allowedEvents?.map((e: any) => e._id || e) || [],
    });
    setShowPassword(false);
    setShowPreacherModal(true);
  };

  const closePreacherModal = () => {
    setShowPreacherModal(false);
    setEditingPreacher(null);
  };

  const handlePreacherSubmit = () => {
    if (!preacherForm.name) { toast.error("Name is required"); return; }
    if (!preacherForm.shortCode) { toast.error("Short code is required"); return; }
    if (!editingPreacher && preacherForm.password.length < 6) {
      toast.error("Password min 6 chars"); return;
    }
    if (!preacherForm.email && !preacherForm.phone) {
      toast.error("Email or phone required"); return;
    }
    const payload: any = {
      name: preacherForm.name,
      shortCode: preacherForm.shortCode.toUpperCase(),
      allowedEvents: preacherForm.allowedEvents,
    };
    if (preacherForm.email) payload.email = preacherForm.email;
    if (preacherForm.phone) payload.phone = preacherForm.phone;
    if (preacherForm.password) payload.password = preacherForm.password;
    editingPreacher
      ? updateMutation.mutate({ id: editingPreacher._id, data: payload })
      : createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(" ")[0]}! 🙏
          </h1>
          <p className="text-gray-500 mt-0.5">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex space-x-3">
          <Link href="/holders/create"
            className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all shadow-md text-sm font-medium">
            <QrCode className="w-4 h-4 mr-2" /> Issue QR Pass
          </Link>
          <Link href="/events/create"
            className="flex items-center px-4 py-2 border border-orange-500 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4 mr-2" /> Create Event
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Events" value={stats?.totalEvents || 0} icon={<Calendar className="w-6 h-6" />} color="blue" loading={statsLoading} />
        <StatCard title="Active Passes" value={stats?.activePasses || 0} icon={<QrCode className="w-6 h-6" />} color="green" loading={statsLoading} />
        <StatCard title="Total Holders" value={stats?.totalHolders || 0} icon={<Users className="w-6 h-6" />} color="purple" loading={statsLoading} />
        <StatCard title="Scan Rate" value={`${stats?.scanRate || 0}%`} icon={<TrendingUp className="w-6 h-6" />} color="orange" loading={statsLoading} />
      </div>

      {/* Events + Scan Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Recent Events</h2>
            <Link href="/events" className="text-orange-600 hover:text-orange-700 text-sm flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {eventsLoading ? (
              <div className="p-6 flex justify-center">
                <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !recentEvents?.length ? (
              <div className="p-6 text-center text-sm text-gray-400">No events yet</div>
            ) : recentEvents.map((event: any) => (
              <Link key={event._id} href={`/events/${event._id}`} className="block px-5 py-4 hover:bg-orange-50/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{event.name}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        event.status === "active" ? "bg-green-100 text-green-700" :
                        event.status === "upcoming" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-500"}`}>
                        {event.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {event.eventCode} · {formatIST(event.dateStart, "MMM d")} – {formatIST(event.dateEnd, "MMM d")}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-semibold text-gray-800">{event.stats?.totalPasses || 0} passes</div>
                    <div className="text-gray-400">{event.stats?.scanRate || 0}% scanned</div>
                  </div>
                </div>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-1">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1 rounded-full"
                    style={{ width: `${Math.min(event.stats?.scanRate || 0, 100)}%` }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Live Scan Feed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Live Scan Feed</h2>
            <ScanLine className="w-4 h-4 text-green-500 animate-pulse" />
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {!recentScans?.length ? (
              <div className="p-6 text-center text-sm text-gray-400">No scans yet</div>
            ) : recentScans.map((scan: any, i: number) => (
              <div key={scan._id || i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${scan.result === "granted" ? "bg-green-500" : "bg-red-400"}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{scan.holderId?.name || "Unknown"}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {scan.epId?.eventId?.name && <span className="text-orange-600 font-medium">{scan.epId.eventId.name} · </span>}
                      {scan.stationLabel || scan.epId?.stationLabel} · {formatIST(scan.scannedAt, "h:mm a")}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                  scan.result === "granted" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {scan.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ PREACHERS SECTION ═══ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Preachers</h2>
              <p className="text-xs text-gray-400">Use the short code in your import CSV's Preacher column</p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Preacher
          </button>
        </div>

        {preachersLoading ? (
          <div className="p-6 flex justify-center">
            <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !preachers?.length ? (
          <div className="p-8 text-center">
            <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No preachers yet</p>
            <p className="text-gray-400 text-sm mt-1">Add preachers to link holders to them during import</p>
            <button onClick={openAddModal}
              className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
              Add First Preacher
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {preachers.map((p: any) => (
              <div key={p._id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-orange-50/30 transition-colors group">

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {p.shortCode?.[0] || p.name?.[0]?.toUpperCase()}
                </div>

                {/* Name + short code */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{p.name}</span>
                    {p.shortCode && (
                      <span className="font-mono text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200 font-bold tracking-wide">
                        {p.shortCode}
                      </span>
                    )}
                    {p.isActive === false && (
                      <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {p.email || p.phone || "No contact"}
                  </p>
                </div>

                {/* Festivals */}
                <div className="hidden md:flex flex-wrap gap-1 max-w-xs">
                  {p.allowedEvents?.length > 0 ? (
                    p.allowedEvents.slice(0, 2).map((e: any) => (
                      <span key={e._id || e} className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full font-medium">
                        🕉️ {e.eventCode || e.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-300">No festivals</span>
                  )}
                  {p.allowedEvents?.length > 2 && (
                    <span className="text-xs text-gray-400">+{p.allowedEvents.length - 2} more</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(p)} title="Edit"
                    className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setShowResetModal(p); setNewPassword(""); }} title="Reset Password"
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Deactivate ${p.name}?`)) deleteMutation.mutate(p._id); }}
                    title="Deactivate"
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* ═══ END PREACHERS ═══ */}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickAction title="Issue QR Pass" description="Create and send passes" href="/holders/create" icon={<QrCode className="w-5 h-5" />} />
        <QuickAction title="Bulk Import" description="Import via CSV/Excel" href="/holders/import" icon={<Users className="w-5 h-5" />} />
        <QuickAction title="View Reports" description="Analytics & insights" href="/reports" icon={<TrendingUp className="w-5 h-5" />} />
        <QuickAction title="Manage Events" description="Configure events" href="/events" icon={<Calendar className="w-5 h-5" />} />
      </div>

      {/* Holder Type Breakdown */}
      {stats?.holderTypeStats?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Holder Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.holderTypeStats.map((ht: any) => (
              <div key={ht._id} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{ht.count}</div>
                <div className="text-xs text-gray-500 mt-0.5 capitalize">{ht._id || "Unknown"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scans by Entry Point */}
      {stats?.scansByEP?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Scans by Entry Point</h3>
          <div className="space-y-3">
            {stats.scansByEP.map((ep: any) => (
              <div key={ep._id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{ep.name}</span>
                  <span className="text-gray-500 tabular-nums">{ep.count} scans</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-orange-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min((ep.count / (stats.scansByEP[0]?.count || 1)) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Preacher Add/Edit Modal ── */}
      {showPreacherModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold">{editingPreacher ? "Edit Preacher" : "Add Preacher"}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Short code is used to identify the preacher in CSV imports</p>
            </div>
            <div className="px-6 py-5 space-y-4">

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={preacherForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setPreacherForm(prev => ({
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
                  <span className="ml-1.5 text-xs text-gray-400 font-normal">2–10 letters (e.g. MKGD)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={preacherForm.shortCode}
                    onChange={(e) => setPreacherForm({
                      ...preacherForm,
                      shortCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                    })}
                    placeholder="MKGD"
                    maxLength={10}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 font-mono font-bold text-orange-700 tracking-widest text-sm uppercase"
                  />
                  <button type="button"
                    onClick={() => setPreacherForm(p => ({ ...p, shortCode: autoCode(p.name) }))}
                    className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 whitespace-nowrap transition-colors">
                    Auto
                  </button>
                </div>
                {preacherForm.shortCode && (
                  <p className="text-xs text-orange-600 mt-1">
                    CSV: use <code className="bg-orange-50 px-1 rounded font-bold">{preacherForm.shortCode}</code> in the Preacher column
                  </p>
                )}
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={preacherForm.email}
                    onChange={(e) => setPreacherForm({ ...preacherForm, email: e.target.value })}
                    placeholder="preacher@iskcon.org"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={preacherForm.phone}
                    onChange={(e) => setPreacherForm({ ...preacherForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 text-sm" />
                </div>
              </div>

              {/* Password (create only) */}
              {!editingPreacher && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password * <span className="text-xs text-gray-400 font-normal">min 6 chars</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={preacherForm.password}
                      onChange={(e) => setPreacherForm({ ...preacherForm, password: e.target.value })}
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

              {/* Festivals */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Festivals</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50">
                  {!events?.length && <p className="text-xs text-gray-400 p-1">No events available</p>}
                  {events?.map((e: any) => (
                    <label key={e._id} className="flex items-center gap-3 cursor-pointer hover:bg-white p-1.5 rounded-lg transition-colors">
                      <input type="checkbox"
                        checked={preacherForm.allowedEvents.includes(e._id)}
                        onChange={(ev) => setPreacherForm(prev => ({
                          ...prev,
                          allowedEvents: ev.target.checked
                            ? [...prev.allowedEvents, e._id]
                            : prev.allowedEvents.filter(id => id !== e._id),
                        }))}
                        className="w-4 h-4 text-orange-600 rounded" />
                      <span className="text-sm text-gray-700">🕉️ {e.name}</span>
                      <span className="text-xs text-gray-400 ml-auto font-mono">{e.eventCode}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closePreacherModal}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handlePreacherSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingPreacher ? "Save Changes" : "Add Preacher"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold mb-1">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
              for {showResetModal.name}
              {showResetModal.shortCode && (
                <span className="font-mono bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">
                  {showResetModal.shortCode}
                </span>
              )}
            </p>
            <div className="relative mb-4">
              <input type={showPassword ? "text" : "password"} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowResetModal(null); setNewPassword(""); }}
                className="flex-1 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                disabled={resetPwMutation.isPending}
                onClick={() => {
                  if (newPassword.length < 6) { toast.error("Min 6 characters"); return; }
                  resetPwMutation.mutate({ id: showResetModal._id, password: newPassword });
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

function QuickAction({ title, description, href, icon }: any) {
  return (
    <Link href={href} className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg text-orange-600">{icon}</div>
        <div>
          <p className="font-medium text-gray-900 text-sm">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
    </Link>
  );
}
