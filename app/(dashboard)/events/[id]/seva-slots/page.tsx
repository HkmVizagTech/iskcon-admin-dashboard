"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2, Clock } from "lucide-react";

export default function SevaSlotsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ code: "", name: "", time: "", description: "", sortOrder: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ["seva-slots", eventId],
    queryFn: async () => (await api.get(`/events/${eventId}/seva-slots`)).data.slots,
  });

  const createMutation = useMutation({
    mutationFn: async (d: any) => (await api.post(`/events/${eventId}/seva-slots`, d)).data,
    onSuccess: () => { toast.success("Slot created"); queryClient.invalidateQueries({ queryKey: ["seva-slots", eventId] }); close(); },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed"),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, d }: any) => (await api.patch(`/events/${eventId}/seva-slots/${id}`, d)).data,
    onSuccess: () => { toast.success("Slot updated"); queryClient.invalidateQueries({ queryKey: ["seva-slots", eventId] }); close(); },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed"),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/events/${eventId}/seva-slots/${id}`)).data,
    onSuccess: () => { toast.success("Slot removed"); queryClient.invalidateQueries({ queryKey: ["seva-slots", eventId] }); },
  });

  const close = () => { setShowModal(false); setEditing(null); setForm({ code: "", name: "", time: "", description: "", sortOrder: 0 }); };
  const openEdit = (s: any) => { setEditing(s); setForm({ code: s.code, name: s.name, time: s.time || "", description: s.description || "", sortOrder: s.sortOrder ?? 0 }); setShowModal(true); };
  const submit = () => {
    if (!form.code) { toast.error("Code is required"); return; }
    if (!form.name) { toast.error("Name is required"); return; }
    if (editing) { updateMutation.mutate({ id: editing._id, d: form }); } else { createMutation.mutate(form); }
  };

  const slots: any[] = data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Seva Slots</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Define sponsor seva time-slots for this event. The sub-category code on each QR pass
            links to one of these slots — shown on the scanner so the reception desk knows where to seat them.
          </p>
        </div>
        <button onClick={() => { close(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
          <Plus className="w-4 h-4" /> Add Slot
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !slots.length ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No seva slots yet</p>
          <p className="text-gray-400 text-sm mt-1">Add slots like "A — Pratistha Abhisheka · 7:00 AM"</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
            Add First Slot
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Code", "Seva Name", "Time", "Description", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {slots.map((s: any) => (
                <tr key={s._id} className="hover:bg-orange-50/30 transition-colors group">
                  <td className="px-5 py-4">
                    <span className={`font-mono font-black text-sm px-3 py-1 rounded-full border ${
                      s.code === "A" ? "bg-amber-100 text-amber-800 border-amber-300" :
                      s.code === "B" ? "bg-slate-100 text-slate-700 border-slate-300" :
                      s.code === "C" ? "bg-orange-100 text-orange-800 border-orange-300" :
                      "bg-purple-100 text-purple-800 border-purple-300"
                    }`}>{s.code}</span>
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-900">{s.name}</td>
                  <td className="px-5 py-4 text-gray-600">
                    {s.time ? (
                      <span className="flex items-center gap-1.5 text-sm">
                        <Clock className="w-3.5 h-3.5 text-gray-400" /> {s.time}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500 max-w-[200px] truncate">{s.description || "—"}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => { if (confirm(`Remove "${s.code} — ${s.name}"?`)) deleteMutation.mutate(s._id); }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Display what the scanner will show */}
      {slots.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Scanner Preview</p>
          <div className="flex flex-wrap gap-2">
            {slots.map((s: any) => (
              <div key={s._id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center shadow-sm">
                <span className={`block text-2xl font-black font-mono mb-1 ${
                  s.code === "A" ? "text-amber-700" :
                  s.code === "B" ? "text-slate-600" :
                  s.code === "C" ? "text-orange-700" : "text-purple-700"
                }`}>{s.code}</span>
                <span className="block text-xs font-medium text-gray-700">{s.name}</span>
                {s.time && <span className="block text-xs text-gray-400 mt-0.5">{s.time}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold">{editing ? "Edit Slot" : "Add Seva Slot"}</h2>
              <p className="text-xs text-gray-400 mt-0.5">The code is used as the sub-category on QR passes</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code * <span className="text-xs text-gray-400 font-normal">e.g. A, B, SDGP, PA</span>
                  </label>
                  <input type="text" value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="A"
                    disabled={!!editing}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 font-mono font-bold uppercase tracking-widest disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time <span className="text-xs text-gray-400 font-normal">e.g. 7:00 AM</span>
                  </label>
                  <input type="text" value={form.time}
                    onChange={e => setForm({ ...form, time: e.target.value })}
                    placeholder="7:00 AM"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seva Name *</label>
                <input type="text" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Pratistha Abhisheka"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-xs text-gray-400 font-normal">optional notes for the desk</span></label>
                <textarea value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Seating in front rows, special bahumana box"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order <span className="text-xs text-gray-400 font-normal">lower = first</span></label>
                <input type="number" value={form.sortOrder}
                  onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  className="w-32 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                />
              </div>
              {/* Preview */}
              {form.code && form.name && (
                <div className="bg-orange-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">Scanner will show:</p>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-black text-2xl px-3 py-1 rounded-full border ${
                      form.code === "A" ? "bg-amber-100 text-amber-800 border-amber-300" :
                      form.code === "B" ? "bg-slate-100 text-slate-700 border-slate-300" :
                      form.code === "C" ? "bg-orange-100 text-orange-800 border-orange-300" :
                      "bg-purple-100 text-purple-800 border-purple-300"
                    }`}>{form.code}</span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{form.name}</p>
                      {form.time && <p className="text-xs text-gray-500">{form.time}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={close} className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={submit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Add Slot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
