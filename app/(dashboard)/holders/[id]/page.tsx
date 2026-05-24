"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api"; // FIX: use authenticated instance
import Link from "next/link";
import { format } from "date-fns";
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


export default function HolderDetailsPage() {
  const params = useParams();
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const holder = data?.holder;
  const qrPass = data?.qrPass;

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  ? format(new Date(holder.issuedAt), "PPP p")
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
                  ? format(new Date(qrPass.validFrom), "PPP p")
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Valid Until</p>
              <p className="text-sm text-gray-900 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {qrPass?.validUntil
                  ? format(new Date(qrPass.validUntil), "PPP p")
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Delivery</p>
              <p className="text-sm text-gray-900 capitalize">
                {qrPass?.deliveryMethod || "N/A"}
              </p>
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
                          ? format(new Date(scan.scannedAt), "PPP p")
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
    </div>
  );
}
