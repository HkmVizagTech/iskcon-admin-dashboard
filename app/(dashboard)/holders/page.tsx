"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Upload,
  Download,
  QrCode,
  Phone,
  Mail,
  MoreVertical,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function HoldersPage() {
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [page, setPage] = useState(1);

  const { data: events } = useQuery({
    queryKey: ["events-list"],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/events`);
      return response.data.events;
    },
  });

  const { data: holdersData, isLoading } = useQuery({
    queryKey: ["holders", selectedEvent, search, page],
    queryFn: async () => {
      if (!selectedEvent) return null;
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("page", page.toString());
      params.append("limit", "20");
      const response = await axios.get(
        `${API_URL}/events/${selectedEvent}/holders?${params}`,
      );
      return response.data;
    },
    enabled: !!selectedEvent,
  });

  const handleExport = async () => {
    if (!selectedEvent) {
      toast.error("Please select an event first");
      return;
    }
    try {
      const response = await axios.get(
        `${API_URL}/events/${selectedEvent}/holders/export`,
        {
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `holders-${selectedEvent}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export started");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const handleResendQR = async (qrId: string) => {
    try {
      await axios.post(`${API_URL}/qr/${qrId}/resend`, {
        deliveryMethod: "whatsapp",
      });
      toast.success("QR resent successfully");
    } catch (error) {
      toast.error("Failed to resend QR");
    }
  };

  const handleRevokeQR = async (qrId: string) => {
    if (!confirm("Are you sure you want to revoke this QR pass?")) return;
    try {
      await axios.patch(`${API_URL}/qr/${qrId}/revoke`);
      toast.success("QR revoked successfully");
    } catch (error) {
      toast.error("Failed to revoke QR");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holders</h1>
          <p className="text-gray-600 mt-1">Manage QR pass holders</p>
        </div>
        <div className="flex space-x-3">
          <Link href="/holders/import">
            <Button variant="outline">
              <Upload className="w-5 h-5 mr-2" />
              Bulk Import
            </Button>
          </Link>
          <Link href="/holders/create">
            <Button>
              <Plus className="w-5 h-5 mr-2" />
              Issue QR Pass
            </Button>
          </Link>
        </div>
      </div>

      {/* Event Selection */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select an event...</option>
            {events?.map((event: any) => (
              <option key={event._id} value={event._id}>
                {event.name} ({event.eventCode})
              </option>
            ))}
          </select>

          <div className="flex-1">
            <Input
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-5 h-5" />}
            />
          </div>

          <Button variant="outline" onClick={handleExport}>
            <Download className="w-5 h-5 mr-2" />
            Export
          </Button>
        </div>
      </Card>

      {/* Holders Table */}
      {!selectedEvent ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            Please select an event to view holders
          </div>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Holder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QR ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issued
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {holdersData?.holders?.map((holder: any) => (
                  <tr key={holder._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {holder.name}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <Phone className="w-3 h-3 mr-1" />
                        {holder.phone}
                      </div>
                      {holder.email && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {holder.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-2 py-1 text-xs rounded-full"
                        style={{
                          backgroundColor: holder.catId?.color + "20",
                          color: holder.catId?.color,
                        }}
                      >
                        {holder.catId?.name || holder.holderType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {holder.qrPass?.qrId || "Not generated"}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          holder.qrPass?.status === "active"
                            ? "bg-green-100 text-green-700"
                            : holder.qrPass?.status === "revoked"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {holder.qrPass?.status || "pending"}
                      </span>
                      {holder.qrPass?.redemptionCount > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Scanned: {holder.qrPass.redemptionCount}x
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(holder.issuedAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/holders/${holder._id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </Link>
                        {holder.qrPass?.status === "active" && (
                          <>
                            <button
                              onClick={() => handleResendQR(holder.qrPass.qrId)}
                              className="text-green-600 hover:text-green-800"
                            >
                              Resend
                            </button>
                            <button
                              onClick={() => handleRevokeQR(holder.qrPass.qrId)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {holdersData?.pagination && holdersData.pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(page - 1) * 20 + 1} to{" "}
                {Math.min(page * 20, holdersData.pagination.total)} of{" "}
                {holdersData.pagination.total} holders
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === holdersData.pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
