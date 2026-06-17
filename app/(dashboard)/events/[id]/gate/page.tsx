"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { ArrowLeft, Search, CheckCircle, UserCheck, Phone } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import toast from "react-hot-toast";

export default function GatePage() {
  const params = useParams();
  const eventId = params.id as string;
  const { user } = useAuth();
  const canManualEntry =
    user?.role === "super_admin" ||
    user?.role === "event_admin" ||
    user?.permissions?.canManualEntry === true;

  const [query, setQuery] = useState("");
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch matching holders
  const { data, isLoading } = useQuery({
    queryKey: ["gate-search", eventId, query],
    queryFn: async () => {
      if (query.trim().length < 2) return { holders: [] };
      const res = await api.get(`/holders/events/${eventId}/holders?search=${encodeURIComponent(query)}&limit=10`);
      return res.data;
    },
    enabled: query.trim().length >= 2,
  });

  const holders: any[] = data?.holders || [];

  // Manual entry mutation
  const markMutation = useMutation({
    mutationFn: async ({ qrId, holderName }: { qrId: string; holderName: string }) =>
      api.post(`/qr/${qrId}/manual-entry`, {
        stationLabel: "Gate — Manual Entry",
        reason: "No QR / admin override at gate",
      }),
    onSuccess: (res, vars) => {
      toast.success(`✅ ${vars.holderName} marked as attended`);
      setMarkedIds((prev) => { const next = new Set(prev); next.add(vars.qrId); return next; });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to mark attendance"),
  });

  if (!canManualEntry) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <div className="text-4xl">🚫</div>
        <h2 className="text-xl font-bold text-gray-900">No Permission</h2>
        <p className="text-gray-500">You need Manual Entry permission to access this page.</p>
        <Link href={`/events/${eventId}`} className="text-orange-600 hover:underline text-sm">← Back to event</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/events/${eventId}`}>
          <ArrowLeft className="w-5 h-5 text-gray-500 hover:text-gray-700" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-orange-500" />
            Gate — Manual Entry
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Search by name or phone · mark attendance without QR scan
          </p>
        </div>
      </div>

      {/* Search box */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type name or phone number..."
          autoFocus
          className="w-full pl-12 pr-4 py-4 text-lg border-2 border-orange-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); searchRef.current?.focus(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        )}
      </div>

      {/* Instructions */}
      {query.trim().length < 2 && (
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
          <p className="text-sm font-semibold text-amber-800 mb-3">How to use:</p>
          <div className="space-y-2 text-sm text-amber-700">
            <p>1. Type the sponsor's name or phone number above</p>
            <p>2. Find them in the results</p>
            <p>3. Tap <strong>Mark as Attended</strong> to let them in</p>
          </div>
          <p className="text-xs text-amber-500 mt-3">
            Use this when: no QR received · wrong phone number · technical issue
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && query.trim().length >= 2 && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* No results */}
      {!isLoading && query.trim().length >= 2 && holders.length === 0 && (
        <Card>
          <CardBody>
            <p className="text-center text-gray-400 py-6">
              No holders found for "{query}". Try a different name or phone number.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-3">
        {holders.map((h: any) => {
          const qrId = h.qrPass?.qrId;
          const isMarked = qrId && markedIds.has(qrId);
          const alreadyAttended = (h.qrPass?.redemptionHistory?.length ?? 0) > 0;
          const cat = h.catId;
          const slot = h.sevaSlotId;

          return (
            <div
              key={h._id}
              className={`rounded-2xl border-2 p-4 transition-all ${
                isMarked
                  ? "border-green-300 bg-green-50"
                  : alreadyAttended
                  ? "border-blue-200 bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Name */}
                  <p className="font-bold text-gray-900 text-base leading-tight">{h.name}</p>

                  {/* Phone */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-500">{h.phone}</p>
                  </div>

                  {/* Tags row */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {cat && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
                        style={{ background: cat.color || "#9CA3AF" }}
                      >
                        {cat.name}
                      </span>
                    )}
                    {h.subCategory && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                        h.subCategory === "A" ? "bg-amber-100 text-amber-800 border-amber-300" :
                        h.subCategory === "B" ? "bg-slate-100 text-slate-700 border-slate-300" :
                        "bg-orange-100 text-orange-700 border-orange-300"
                      }`}>
                        🎁 Tier {h.subCategory}
                      </span>
                    )}
                    {slot && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                        🕉️ {slot.name}{slot.time ? ` · ${slot.time}` : ""}
                      </span>
                    )}
                    {alreadyAttended && !isMarked && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                        ✅ Already attended
                      </span>
                    )}
                    {isMarked && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-800 border border-green-300 font-semibold">
                        ✅ Just marked attended
                      </span>
                    )}
                  </div>

                  {/* QR ID */}
                  {qrId && (
                    <p className="text-xs text-gray-400 font-mono mt-1">{qrId}</p>
                  )}
                </div>

                {/* Action button */}
                <div className="shrink-0">
                  {!qrId ? (
                    <div className="text-center">
                      <p className="text-xs text-red-500 font-medium">No QR</p>
                      <Link
                        href={`/holders/${h._id}`}
                        className="text-xs text-orange-600 hover:underline"
                      >
                        Issue first →
                      </Link>
                    </div>
                  ) : isMarked ? (
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (alreadyAttended) {
                          if (!confirm(`${h.name} already attended. Mark again?`)) return;
                        }
                        markMutation.mutate({ qrId, holderName: h.name });
                      }}
                      disabled={markMutation.isPending}
                      className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                        alreadyAttended
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                          : "bg-orange-600 text-white hover:bg-orange-700 shadow-sm"
                      }`}
                    >
                      {markMutation.isPending ? "..." : alreadyAttended ? "Mark Again" : "Let In"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
