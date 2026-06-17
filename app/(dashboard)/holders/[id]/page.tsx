"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api"; // FIX: use authenticated instance
import Link from "next/link";
import { format } from "date-fns";
import { formatIST } from "@/lib/dateUtils";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  QrCode,
  Calendar,
  MapPin,
  RefreshCw,
  Ban,
  Download,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";


export default function HolderDetailsPage() {
  const params = useParams();
  const { user } = useAuth();
  const canManualEntry =
    user?.role === "super_admin" ||
    user?.role === "event_admin" ||
    user?.permissions?.canManualEntry === true;
  const router = useRouter();
  const holderId = params.id as string;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["holder", holderId],
    queryFn: async () => {
      const response = await api.get(`/holders/${holderId}`);
      return response.data;
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(
        `/qr/${data?.qrPass?.qrId}/resend`,
        {
          deliveryMethod: data?.qrPass?.deliveryMethod || "whatsapp",
        },
      );
      return response.data;
    },
    onSuccess: () => toast.success("QR resent successfully!"),
    onError: (error: any) =>
      toast.error(error.response?.data?.error || "Failed to resend"),
  });

  const manualEntryMutation = useMutation({
    mutationFn: async () => api.post(`/qr/${qrPass?.qrId}/manual-entry`, {
      stationLabel: "Admin Dashboard",
      reason: "Manual entry by admin",
    }),
    onSuccess: (res) => {
      toast.success(res.data.message || "Marked as attended ✅");
      refetch();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed"),
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch(
        `/qr/${data?.qrPass?.qrId}/revoke`,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("QR revoked successfully");
      refetch();
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.error || "Failed to revoke"),
  });

  // All hooks MUST be before early returns (React rules)
  const [showQRModal, setShowQRModal] = useState(false);
  // QR image endpoint is public (no auth needed).
  // QR image base — use NEXT_PUBLIC_API_URL directly (it already ends with /api)
  // Fallback to the Railway backend URL for safety
  const API_ROOT = (
    process.env.NEXT_PUBLIC_API_URL ||
    "https://iskcon-seva-pass-backend-production.up.railway.app/api"
  ).replace(/\/$/, ""); // strip trailing slash only

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const holder = data?.holder;
  const qrPass = data?.qrPass;
  const qrImageUrl = qrPass?.qrId
    ? `${API_ROOT}/qr/${qrPass.qrId}/image`
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/holders" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{holder?.name}</h1>
            <p className="text-gray-600 mt-1">Holder Details</p>
          </div>
        </div>
        <div className="flex space-x-3">
          {qrPass?.status === "active" && (
            <>
              <Button
                variant="outline"
                onClick={() => resendMutation.mutate()}
                loading={resendMutation.isPending}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Resend QR
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm("Revoke this QR pass?")) revokeMutation.mutate();
                }}
                loading={revokeMutation.isPending}
              >
                <Ban className="w-4 h-4 mr-2" />
                Revoke QR
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Holder Info */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center">
              <User className="w-5 h-5 mr-2" />
              Holder Information
            </h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium text-gray-900">{holder?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium text-gray-900 flex items-center">
                <Phone className="w-4 h-4 mr-1" /> {holder?.phone}
              </p>
            </div>
            {holder?.email && (
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900 flex items-center">
                  <Mail className="w-4 h-4 mr-1" /> {holder?.email}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Holder Type</p>
              <span className="inline-block px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 capitalize">
                {holder?.holderType}
              </span>
            </div>
            {holder?.subCategory && (
              <div>
                <p className="text-sm text-gray-500">Sub Category (Seva Slot)</p>
                <span className={`mt-0.5 inline-flex px-3 py-1 rounded-full text-sm font-black font-mono border ${
                  holder.subCategory === "A" ? "bg-amber-100 text-amber-800 border-amber-300" :
                  holder.subCategory === "B" ? "bg-slate-100 text-slate-700 border-slate-300" :
                  holder.subCategory === "C" ? "bg-orange-100 text-orange-800 border-orange-300" :
                  "bg-purple-100 text-purple-800 border-purple-300"
                }`}>{holder.subCategory}</span>
              </div>
            )}
            {holder?.lifetimeDonation > 0 && (
              <div>
                <p className="text-sm text-gray-500">Lifetime Donation</p>
                <p className="font-medium text-gray-900">
                  ₹{holder?.lifetimeDonation?.toLocaleString()}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Issued</p>
              <p className="text-sm text-gray-900 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {holder?.issuedAt
                  ? formatIST(holder.issuedAt, "PPP p")
                  : "N/A"}
              </p>
            </div>
          </CardBody>
        </Card>

        {/* QR Pass Info */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center">
              <QrCode className="w-5 h-5 mr-2" />
              QR Pass
            </h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {/* QR Image */}
            {qrImageUrl && (
              <div className="flex flex-col items-center gap-3 py-2">
                <div
                  className="cursor-pointer rounded-2xl border-2 border-orange-200 p-3 bg-white shadow hover:shadow-md transition-shadow"
                  onClick={() => setShowQRModal(true)}
                  title="Click to view fullscreen"
                >
                  <img
                    src={qrImageUrl!}
                    alt="QR Code"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                    className="w-40 h-40 object-contain"
                  />
                </div>
                <button
                  onClick={() => setShowQRModal(true)}
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  🖥️ Show on Screen — Scan at Desk
                </button>
                <a
                  href={qrImageUrl}
                  download={`${qrPass.qrId}.png`}
                  className="w-full py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium text-center transition-colors"
                >
                  ⬇️ Download QR
                </a>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">QR ID</p>
              <p className="font-mono text-sm text-gray-900">
                {qrPass?.qrId || "Not generated"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  qrPass?.status === "active"
                    ? "bg-green-100 text-green-700"
                    : qrPass?.status === "revoked"
                      ? "bg-red-100 text-red-700"
                      : qrPass?.status === "expired"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                }`}
              >
                {qrPass?.status || "pending"}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Valid From</p>
              <p className="text-sm text-gray-900 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {qrPass?.validFrom
                  ? formatIST(qrPass.validFrom, "PPP p")
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Valid Until</p>
              <p className="text-sm text-gray-900 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {qrPass?.validUntil
                  ? formatIST(qrPass.validUntil, "PPP p")
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Delivery Method</p>
              <p className="text-sm text-gray-900 capitalize">
                {qrPass?.deliveryMethod || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">WhatsApp Status</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  qrPass?.deliveryStatus === "delivered" ? "bg-green-100 text-green-700" :
                  qrPass?.deliveryStatus === "sent"      ? "bg-blue-100 text-blue-700" :
                  qrPass?.deliveryStatus === "failed"    ? "bg-red-100 text-red-700" :
                  qrPass?.deliveryStatus === "pending"   ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {qrPass?.deliveryStatus === "delivered" ? "✅ Delivered" :
                   qrPass?.deliveryStatus === "sent"      ? "📤 Sent (awaiting delivery)" :
                   qrPass?.deliveryStatus === "failed"    ? "❌ Failed" :
                   qrPass?.deliveryStatus === "pending"   ? "⏳ Pending" :
                   "—"}
                </span>
                {qrPass?.deliveredAt && qrPass?.deliveryStatus === "delivered" && (
                  <span className="text-xs text-gray-400">
                    {new Date(qrPass.deliveredAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </span>
                )}
              </div>
              {qrPass?.deliveryError && (
                <p className="text-xs text-red-500 mt-1">Error: {qrPass.deliveryError}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Scans</p>
              <p className="font-medium text-gray-900">
                {qrPass?.redemptionHistory?.length || 0}
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Entry Points */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Access Points
            </h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {qrPass?.entryPoints?.map((ep: any) => (
                <div key={ep._id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm">{ep.name}</p>
                  <p className="text-xs text-gray-500">{ep.stationLabel}</p>
                  <span
                    className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded-full ${
                      ep.type === "venue_entry"
                        ? "bg-green-100 text-green-700"
                        : ep.type === "darshan"
                          ? "bg-blue-100 text-blue-700"
                          : ep.type === "prasadam"
                            ? "bg-yellow-100 text-yellow-700"
                            : ep.type === "bahumana"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ep.type?.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Scan History */}
      {qrPass?.redemptionHistory?.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Scan History ({qrPass.redemptionHistory.length})
            </h2>
          </CardHeader>
          <CardBody padding={false}>
            <div className="divide-y divide-gray-100">
              {qrPass.redemptionHistory.map((scan: any, index: number) => (
                <div
                  key={index}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    {scan.result === "granted" ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {scan.stationLabel || "Unknown Station"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {scan.scannedAt
                          ? formatIST(scan.scannedAt, "PPP p")
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      scan.result === "granted"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {scan.result}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Fullscreen QR modal — tap screen to scan at desk */}
      {showQRModal && qrImageUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center gap-6 cursor-pointer"
          onClick={() => setShowQRModal(false)}
        >
          <p className="text-white/50 text-sm">Tap anywhere to close</p>
          <div className="bg-white rounded-3xl p-6 shadow-2xl">
            <img
              src={qrImageUrl!}
              alt="QR Code"
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
              className="w-72 h-72 sm:w-80 sm:h-80 object-contain"
            />
          </div>
          <div className="text-center px-6">
            <p className="text-white font-bold text-xl">{data?.holder?.name}</p>
            <p className="text-white/60 text-sm font-mono mt-1">{qrPass?.qrId}</p>
          </div>
          <p className="text-white/40 text-xs">Point the QR scanner at this screen</p>
        </div>
      )}
    </div>
  );
}
