"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import {
  Search,
  Calendar,
  User,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function ScanFeedPage() {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [activeTab, setActiveTab] = useState<"scans" | "summary" | "capacity">(
    "scans",
  );
  const [page, setPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  // Fetch events for filter
  const { data: events } = useQuery({
    queryKey: ["events-active"],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/events`);
      return response.data.events;
    },
  });

  // Fetch scan logs
  const { data: scanData, isLoading: scansLoading } = useQuery({
    queryKey: ["scan-logs", selectedEvent, page, resultFilter],
    queryFn: async () => {
      if (!selectedEvent) return null;
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "20");
      if (resultFilter) params.append("result", resultFilter);
      const response = await axios.get(
        `${API_URL}/reports/events/${selectedEvent}/scan-log?${params}`,
      );
      return response.data;
    },
    enabled: !!selectedEvent,
  });

  // Fetch event summary
  const { data: summary } = useQuery({
    queryKey: ["event-summary", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return null;
      const response = await axios.get(
        `${API_URL}/reports/events/${selectedEvent}/summary`,
      );
      return response.data;
    },
    enabled: !!selectedEvent && activeTab === "summary",
  });

  // Handle CSV export
  const handleExport = async () => {
    if (!selectedEvent) {
      toast.error("Please select an event first");
      return;
    }
    try {
      const response = await axios.get(
        `${API_URL}/reports/export/${selectedEvent}`,
        {
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `scan-report-${selectedEvent}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Report exported!");
    } catch (error) {
      toast.error("Failed to export report");
    }
  };

  const getResultBadge = (result: string) => {
    const badges: Record<string, { color: string; icon: any; label: string }> =
      {
        granted: {
          color: "bg-green-100 text-green-700",
          icon: CheckCircle,
          label: "Granted",
        },
        already_used: {
          color: "bg-yellow-100 text-yellow-700",
          icon: Clock,
          label: "Already Used",
        },
        not_included: {
          color: "bg-red-100 text-red-700",
          icon: XCircle,
          label: "Not Included",
        },
        invalid: {
          color: "bg-red-100 text-red-700",
          icon: XCircle,
          label: "Invalid",
        },
        link_required: {
          color: "bg-orange-100 text-orange-700",
          icon: Clock,
          label: "Link Required",
        },
        expired: {
          color: "bg-gray-100 text-gray-700",
          icon: Clock,
          label: "Expired",
        },
        revoked: {
          color: "bg-red-100 text-red-700",
          icon: XCircle,
          label: "Revoked",
        },
      };
    const badge = badges[result] || {
      color: "bg-gray-100 text-gray-700",
      icon: Clock,
      label: result,
    };
    const Icon = badge.icon;
    return (
      <span
        className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${badge.color}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reports & Live Scans
          </h1>
          <p className="text-gray-600 mt-1">View scan history and analytics</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={!selectedEvent}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Event Selection */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select an event...</option>
              {events?.map((event: any) => (
                <option key={event._id} value={event._id}>
                  {event.name} ({event.eventCode})
                </option>
              ))}
            </select>

            {selectedEvent && (
              <>
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Results</option>
                  <option value="granted">✅ Granted</option>
                  <option value="already_used">⚠️ Already Used</option>
                  <option value="not_included">❌ Not Included</option>
                  <option value="invalid">❌ Invalid</option>
                </select>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {!selectedEvent ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>Select an event to view scan reports</p>
          </div>
        </Card>
      ) : scansLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-6">
              <button
                onClick={() => setActiveTab("scans")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "scans"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Live Scan Feed
              </button>
              <button
                onClick={() => setActiveTab("summary")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "summary"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Summary
              </button>
            </nav>
          </div>

          {/* Scan Feed */}
          {activeTab === "scans" && (
            <Card padding={false}>
              <div className="divide-y divide-gray-100">
                {/* Header */}
                <div className="px-6 py-3 bg-gray-50 grid grid-cols-5 gap-4 text-xs font-medium text-gray-500 uppercase">
                  <span>Holder</span>
                  <span>Station</span>
                  <span>Volunteer</span>
                  <span>Time</span>
                  <span>Result</span>
                </div>

                {scanData?.logs?.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No scans recorded yet
                  </div>
                ) : (
                  scanData?.logs?.map((log: any) => (
                    <div
                      key={log._id}
                      className="px-6 py-4 grid grid-cols-5 gap-4 items-center hover:bg-gray-50"
                    >
                      <div>
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900 text-sm">
                            {log.holderId?.name || "Unknown"}
                          </span>
                        </div>
                        {log.holderId?.phone && (
                          <p className="text-xs text-gray-500 mt-1">
                            {log.holderId.phone}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                        {log.stationLabel || log.epId?.name || "Unknown"}
                      </div>
                      <div className="text-sm text-gray-600">
                        {log.scannedBy?.name || "Unknown"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(log.scannedAt), "MMM d, h:mm a")}
                      </div>
                      <div>{getResultBadge(log.result)}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {scanData?.pagination && scanData.pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Page {scanData.pagination.page} of{" "}
                    {scanData.pagination.pages}
                  </span>
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
                      disabled={page === scanData.pagination.pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Summary Tab */}
          {activeTab === "summary" && summary && (
            <div className="space-y-6">
              {/* Top Stats */}
              <div className="grid grid-cols-3 gap-6">
                <Card>
                  <CardBody className="text-center">
                    <p className="text-3xl font-bold text-gray-900">
                      {summary.totalIssued || 0}
                    </p>
                    <p className="text-sm text-gray-500">Total Issued</p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="text-center">
                    <p className="text-3xl font-bold text-green-700">
                      {summary.totalScanned || 0}
                    </p>
                    <p className="text-sm text-green-600">
                      Total Scanned (All)
                    </p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="text-center">
                    <p className="text-3xl font-bold text-blue-700">
                      {summary.byEntryPoint?.reduce(
                        (sum: number, ep: any) => sum + ep.granted,
                        0,
                      ) || 0}
                    </p>
                    <p className="text-sm text-blue-600">Access Granted</p>
                  </CardBody>
                </Card>
              </div>

              {/* By Entry Point */}
              <Card>
                <CardHeader>
                  <h2 className="font-semibold">By Entry Point</h2>
                </CardHeader>
                <CardBody padding={false}>
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Station
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-green-600">
                          ✅ Granted
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-yellow-600">
                          ⚠️ Already Used
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-red-600">
                          ❌ Not Included
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-red-600">
                          🚫 Invalid
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {summary.byEntryPoint?.map((ep: any) => (
                        <tr key={ep._id?.epId}>
                          <td className="px-4 py-2 text-sm">
                            {ep._id?.epLabel || ep._id?.epName || "Unknown"}
                          </td>
                          <td className="px-4 py-2 text-sm text-center font-medium text-green-600">
                            {ep.granted}
                          </td>
                          <td className="px-4 py-2 text-sm text-center">
                            {ep.already_used || 0}
                          </td>
                          <td className="px-4 py-2 text-sm text-center">
                            {ep.not_included || 0}
                          </td>
                          <td className="px-4 py-2 text-sm text-center">
                            {ep.invalid || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>

              {/* By Holder Type & By Venue */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <h2 className="font-semibold">By Holder Type (Granted)</h2>
                  </CardHeader>
                  <CardBody>
                    {summary.byHolderType?.map((ht: any) => (
                      <div
                        key={ht._id}
                        className="flex justify-between py-2 border-b last:border-0"
                      >
                        <span className="text-sm capitalize">
                          {ht._id || "Unknown"}
                        </span>
                        <span className="font-bold">{ht.count}</span>
                      </div>
                    ))}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h2 className="font-semibold">By Venue (Granted)</h2>
                  </CardHeader>
                  <CardBody>
                    {summary.byVenue?.map((v: any) => (
                      <div
                        key={v._id}
                        className="flex justify-between py-2 border-b last:border-0"
                      >
                        <span className="text-sm">{v._id || "Unknown"}</span>
                        <span className="font-bold">{v.count}</span>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
