"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api"; // FIX: use authenticated instance
import { format } from "date-fns";
import { formatIST } from "@/lib/dateUtils";
import {
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
import PageHeader from "@/components/ui/PageHeader";
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <PageHeader
        title="Failed Imports"
        subtitle="View and manage failed WhatsApp deliveries"
        backHref="/holders"
      />

      {/* Event Selection */}
      <Card className="p-0 sm:p-6">
        <CardBody>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full md:w-64 px-4 py-2.5 sm:py-2 text-base sm:text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
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
          <div className="text-center py-8 sm:py-12">
            <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-green-400 mx-auto mb-4" />
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 break-all">
                        Batch: {batch.batchId}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatIST(batch.createdAt, "PPP p")} •
                        {batch.failedCount}/{batch.totalCount} failed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 pl-9 sm:pl-0">
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                      {batch.failedCount} failed
                    </span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                      {batch.successCount} sent
                    </span>
                    {expandedBatch === batch._id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 ml-auto sm:ml-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 ml-auto sm:ml-0" />
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
                  <div className="p-4 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-gray-500">
                      {batch.records.length} failed records
                    </p>
                    <div className="flex gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
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
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="font-medium text-gray-900 break-words">
                                {record.name || "Unknown"}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                              {record.phone && (
                                <span className="flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {record.phone}
                                </span>
                              )}
                              {record.email && (
                                <span className="flex items-center min-w-0 break-all">
                                  <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                                  {record.email}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-start gap-3">
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full break-words sm:whitespace-nowrap">
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
                              className="text-blue-600 hover:text-blue-800 text-sm whitespace-nowrap px-2 py-2 -my-2 sm:p-0 sm:m-0"
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
