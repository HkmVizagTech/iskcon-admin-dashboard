"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api"; // FIX: use authenticated instance
import { format } from "date-fns";
import {
  Download, TrendingUp, Users, QrCode, ScanLine,
  CheckCircle, Circle, Filter,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatCard from "@/components/ui/StatCard";
import toast from "react-hot-toast";

export default function ReportsPage() {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "holders">("overview");
  const [holderTypeFilter, setHolderTypeFilter] = useState("");
  const [venueFilter, setVenueFilter] = useState("");
  const [preacherFilter, setPreacherFilter] = useState("");
  const [entryPointFilter, setEntryPointFilter] = useState(""); // FIX: now wired to query

  const { data: events } = useQuery({
    queryKey: ["events-all"],
    queryFn: async () => {
      const response = await api.get("/events");
      return response.data.events;
    },
  });

  const selectedEventData = events?.find((e: any) => e._id === selectedEvent);
  const eventVenues = Array.isArray(selectedEventData?.venue) ? selectedEventData.venue : [];

  const { data: entryPoints } = useQuery({
    queryKey: ["entry-points", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const response = await api.get(`/events/${selectedEvent}/entry-points`);
      return response.data;
    },
    enabled: !!selectedEvent,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["event-summary", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return null;
      const response = await api.get(`/reports/events/${selectedEvent}/summary`);
      return response.data;
    },
    enabled: !!selectedEvent,
  });

  const { data: noShows } = useQuery({
    queryKey: ["no-shows", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return null;
      const response = await api.get(`/reports/events/${selectedEvent}/no-shows`);
      return response.data;
    },
    enabled: !!selectedEvent,
  });

  const { data: holdersReport, isLoading: holdersLoading } = useQuery({
    queryKey: ["holders-report", selectedEvent, holderTypeFilter, venueFilter, preacherFilter, entryPointFilter],
    queryFn: async () => {
      if (!selectedEvent) return null;
      const params = new URLSearchParams();
      if (holderTypeFilter) params.append("holderType", holderTypeFilter);
      if (venueFilter) params.append("venue", venueFilter);
      if (preacherFilter) params.append("preacher", preacherFilter);
      // FIX: entryPointFilter now actually sent to the backend
      if (entryPointFilter) params.append("entryPoint", entryPointFilter);
      const response = await api.get(`/reports/events/${selectedEvent}/holders-detail?${params}`);
      return response.data.report;
    },
    enabled: !!selectedEvent && activeTab === "holders",
  });

  const handleExport = async () => {
    if (!selectedEvent) { toast.error("Please select an event first"); return; }
    try {
      const response = await api.get(`/reports/export/${selectedEvent}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `event-${selectedEvent}-report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Report exported successfully");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">View insights and export data</p>
        </div>
        <Button onClick={handleExport} disabled={!selectedEvent}>
          <Download className="w-5 h-5 mr-2" />Export Report
        </Button>
      </div>

      <Card>
        <CardBody>
          <select
            value={selectedEvent}
            onChange={(e) => {
              setSelectedEvent(e.target.value);
              setHolderTypeFilter(""); setVenueFilter("");
              setPreacherFilter(""); setEntryPointFilter("");
            }}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select an event...</option>
            {events?.map((event: any) => (
              <option key={event._id} value={event._id}>{event.name} ({event.eventCode})</option>
            ))}
          </select>
        </CardBody>
      </Card>

      {selectedEvent && (
        <>
          <div className="border-b border-gray-200">
            <nav className="flex space-x-6">
              {(["overview", "holders"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "holders" ? "Holder Details" : "Overview"}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === "overview" && summary && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Passes Issued" value={summary.totalIssued || 0} icon={<QrCode className="w-6 h-6" />} color="blue" loading={summaryLoading} />
                <StatCard title="Total Scans" value={summary.totalScanned || 0} icon={<ScanLine className="w-6 h-6" />} color="green" loading={summaryLoading} />
                <StatCard title="Scan Rate" value={`${summary.totalIssued ? ((summary.totalScanned / summary.totalIssued) * 100).toFixed(1) : 0}%`} icon={<TrendingUp className="w-6 h-6" />} color="orange" loading={summaryLoading} />
                <StatCard title="No-Shows" value={noShows?.count || 0} icon={<Users className="w-6 h-6" />} color="purple" loading={summaryLoading} />
              </div>

              {noShows && noShows.noShows?.length > 0 && (
                <Card>
                  <CardHeader><h2 className="font-semibold">No-Shows ({noShows.count})</h2></CardHeader>
                  <CardBody padding={false}>
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Phone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">QR ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {noShows.noShows.slice(0, 10).map((pass: any) => (
                            <tr key={pass._id}>
                              <td className="px-6 py-3 text-sm">{pass.holderId?.name}</td>
                              <td className="px-6 py-3 text-sm">{pass.holderId?.phone}</td>
                              <td className="px-6 py-3 text-sm font-mono">{pass.qrId}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              )}
            </>
          )}

          {activeTab === "holders" && (
            <Card padding={false}>
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-4">
                <Filter className="w-5 h-5 text-gray-400 mt-2" />
                <select value={holderTypeFilter} onChange={(e) => setHolderTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All Holder Types</option>
                  <option value="SP">Sponsor</option>
                  <option value="DN">Donor</option>
                  <option value="VL">Volunteer</option>
                  <option value="GN">General Public</option>
                  <option value="VP">VIP Guest</option>
                </select>
                <select value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All Venues</option>
                  {eventVenues.map((v: any, i: number) => (
                    <option key={i} value={v.name}>{v.name}</option>
                  ))}
                </select>
                <input type="text" value={preacherFilter} onChange={(e) => setPreacherFilter(e.target.value)} placeholder="Filter by preacher..." className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                {/* FIX: entryPoint filter now properly wired to query */}
                <select value={entryPointFilter} onChange={(e) => setEntryPointFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All Entry Points</option>
                  {entryPoints?.map((ep: any) => (
                    <option key={ep._id} value={ep._id}>{ep.name} ({ep.stationLabel})</option>
                  ))}
                </select>
              </div>

              {holdersLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {["Name","Phone","Type","Venue","Preacher","Entry Points (Scanned/Total)"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {holdersReport?.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-500">No holders found</td></tr>
                      ) : (
                        holdersReport?.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.holder?.name || "N/A"}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.holder?.phone || "N/A"}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">{item.holderType || "N/A"}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.holder?.venue || "N/A"}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.holder?.preacher || "-"}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {item.entryPoints?.map((ep: any, i: number) => {
                                  const isScanned = item.scans?.some(
                                    (s: any) => s.epId?.toString() === ep._id?.toString() || s.epId === ep._id,
                                  );
                                  return (
                                    <span key={i} className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${isScanned ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                      {isScanned ? <CheckCircle className="w-3 h-3 mr-1" /> : <Circle className="w-3 h-3 mr-1" />}
                                      {ep.name || ep.stationLabel || `EP ${i + 1}`}
                                    </span>
                                  );
                                })}
                                {(!item.entryPoints || item.entryPoints.length === 0) && (
                                  <span className="text-xs text-gray-400">No entry points</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {!selectedEvent && (
        <Card><div className="text-center py-12 text-gray-500">Select an event to view reports</div></Card>
      )}
    </div>
  );
}
