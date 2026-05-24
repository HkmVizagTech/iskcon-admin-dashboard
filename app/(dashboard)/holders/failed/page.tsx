"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api"; // FIX: use authenticated instance
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  AlertTriangle,
  XCircle,
  Phone,
  Mail,
  User,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";


export default function FailedImportsPage() {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  const { data: events } = useQuery({
    queryKey: ["events-active"],
    queryFn: async () => {
      const response = await api.get(`/events`);
      return response.data.events;
    },
  });

  const { data: failedImports, isLoading } = useQuery({
    queryKey: ["failed-imports", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return null;
      const response = await api.get(
        `/holders/failed-imports/${selectedEvent}`,
      );
      return response.data.imports;
    },
    enabled: !!selectedEvent,
  });

  const handleExportCSV = (batch: any) => {
    const csv = [
      "Name,Phone Number,Sponsor Sevas,Sponsor Category,Preacher,Venue,Slot,Error",
      ...batch.records.map((r: any) => {
        const rd = r.rowData || {};
        return `"${r.name || ""}","${r.phone || ""}","${rd["Sponsor Sevas"] || rd.sponsorSevas || ""}","${rd["Sponsor Category"] || rd.sponsorCategory || ""}","${rd.Preacher || rd.preacher || ""}","${rd.Venue || rd.venue || ""}","${rd.Slot || rd.slot || ""}","${r.error || ""}"`;
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `failed-imports-${batch.batchId}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("CSV exported!");
  };

  const handleResendAll = async (batch: any) => {
    toast.success("Resending is not yet implemented");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/holders" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Failed Imports</h1>
            <p className="text-gray-600 mt-1">
              View and manage failed WhatsApp deliveries
            </p>
          </div>
        </div>
      </div>

      {/* Event Selection */}
      <Card>
        <CardBody>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select an event...</option>
            {events?.map((event: any) => (
              <option key={event._id} value={event._id}>
                {event.name} ({event.eventCode})
              </option>
            ))}
          </select>
        </CardBody>
      </Card>

      {!selectedEvent ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            Select an event to view failed imports
          </div>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : failedImports?.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-gray-500">
              No failed imports! Everything sent successfully 🎉
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {failedImports?.map((batch: any) => (
            <Card key={batch._id} padding={false}>
              {/* Batch Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setExpandedBatch(
                    expandedBatch === batch._id ? null : batch._id,
                  )
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Batch: {batch.batchId}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(batch.createdAt), "PPP p")} •
                        {batch.failedCount}/{batch.totalCount} failed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                      {batch.failedCount} failed
                    </span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                      {batch.successCount} sent
                    </span>
                    {expandedBatch === batch._id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{
                      width: `${(batch.successCount / batch.totalCount) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Expanded Records */}
              {expandedBatch === batch._id && (
                <div className="border-t border-gray-100">
                  <div className="p-4 bg-gray-50 flex justify-between">
                    <p className="text-sm text-gray-500">
                      {batch.records.length} failed records
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportCSV(batch)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Export CSV
                      </Button>
                      <Button size="sm" onClick={() => handleResendAll(batch)}>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Resend All
                      </Button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {batch.records.map((record: any, index: number) => (
                      <div
                        key={index}
                        className="p-4 hover:bg-red-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {record.name || "Unknown"}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              {record.phone && (
                                <span className="flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {record.phone}
                                </span>
                              )}
                              {record.email && (
                                <span className="flex items-center">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {record.email}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full whitespace-nowrap">
                              {record.error}
                            </span>
                            <button
                              onClick={() => {
                                // Copy phone number for manual resend
                                if (record.phone) {
                                  navigator.clipboard.writeText(record.phone);
                                  toast.success("Phone copied!");
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Copy Phone
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
