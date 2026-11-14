"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api"; // FIX: use authenticated instance
import { format } from "date-fns";
import { formatIST } from "@/lib/dateUtils";
import {
  Download, TrendingUp, Users, QrCode, ScanLine,
  CheckCircle, Circle, Filter,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import toast from "react-hot-toast";
import AnalyticsPanel from "@/components/reports/AnalyticsPanel";

export default function ReportsPage() {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [activeTab, setActiveTab] = useState<"analytics" | "overview" | "holders">("analytics");
  const [categoryFilter, setCategoryFilter] = useState("");
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

  const { data: preachers } = useQuery({
    queryKey: ["preachers"],
    queryFn: async () => {
      if (!selectedEvent) return [];
      return (await api.get("/preachers")).data.preachers;
    },
    enabled: !!selectedEvent,
  });

  const { data: entryPoints } = useQuery({
    queryKey: ["entry-points", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const response = await api.get(`/events/${selectedEvent}/entry-points`);
      return response.data;
    },
    enabled: !!selectedEvent,
  });

  const { data: passTypes } = useQuery({
    queryKey: ["holder-types", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const response = await api.get(`/events/${selectedEvent}/holder-types`);
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
    queryKey: ["holders-report", selectedEvent, categoryFilter, venueFilter, preacherFilter, entryPointFilter],
    queryFn: async () => {
      if (!selectedEvent) return null;
      const params = new URLSearchParams();
      if (categoryFilter) params.append("catCode", categoryFilter);
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
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="View insights and export data"
        actions={
          <Button onClick={handleExport} disabled={!selectedEvent}>
            <Download className="w-5 h-5 mr-2" />Export Report
          </Button>
        }
      />

      {/* Tabs — always visible */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["analytics", "overview", "holders"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm capitalize whitespace-nowrap ${
                activeTab === tab ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "holders" ? "Holder Details" : tab === "analytics" ? "📊 Analytics" : "Overview"}
            </button>
          ))}
        </nav>
      </div>

      {/* Analytics tab — has its own scope toggle, no event selection needed */}
      {activeTab === "analytics" && <AnalyticsPanel events={events || []} />}

      {/* Event selector — only for Overview / Holders tabs */}
      {activeTab !== "analytics" && (
        <Card padding={false}>
          <CardBody>
            <select
              value={selectedEvent}
              onChange={(e) => {
                setSelectedEvent(e.target.value);
                setCategoryFilter(""); setVenueFilter("");
                setPreacherFilter(""); setEntryPointFilter("");
              }}
              className="w-full md:w-64 px-4 py-2.5 md:py-2 text-base md:text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select an event...</option>
              {events?.map((event: any) => (
                <option key={event._id} value={event._id}>{event.name} ({event.eventCode})</option>
              ))}
            </select>
          </CardBody>
        </Card>
      )}

      {activeTab !== "analytics" && selectedEvent && (
        <>
          <div className="hidden">
            <nav className="flex space-x-6">
              {([] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "holders" ? "Holder Details" : tab === "analytics" ? "📊 Analytics" : "Overview"}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === "overview" && summary && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <StatCard title="Total Passes Issued" value={summary.totalIssued || 0} icon={<QrCode className="w-6 h-6" />} color="blue" loading={summaryLoading} />
                <StatCard title="Total Scans" value={summary.totalScanned || 0} icon={<ScanLine className="w-6 h-6" />} color="green" loading={summaryLoading} />
                <StatCard title="Scan Rate" value={`${summary.totalIssued ? ((summary.totalScanned / summary.totalIssued) * 100).toFixed(1) : 0}%`} icon={<TrendingUp className="w-6 h-6" />} color="orange" loading={summaryLoading} />
                <StatCard title="No-Shows (people)" value={noShows?.holderCount ?? noShows?.count ?? 0} icon={<Users className="w-6 h-6" />} color="purple" loading={summaryLoading} />
              </div>

              {summary.sessionCount > 0 && (
                <p className="text-sm text-gray-600">
                  {summary.uniqueHolders} people hold {summary.totalIssued} passes across {summary.sessionCount} sessions;{" "}
                  {summary.passesCollected} collected
                  {noShows ? `, ${noShows.count} missed, ${noShows.pendingCount || 0} still open or upcoming` : ""}.
                </p>
              )}

              {noShows && noShows.noShows?.length > 0 && (
                <Card padding={false}>
                  <CardHeader><h2 className="font-semibold">Missed passes ({noShows.count})</h2></CardHeader>
                  <CardBody padding={false}>
                    {/* Phones: stacked rows */}
                    <ul className="md:hidden max-h-96 overflow-y-auto divide-y divide-gray-100">
                      {noShows.noShows.slice(0, 10).map((pass: any) => (
                        <li key={pass._id} className="px-4 py-3">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 min-w-0 break-words">{pass.holderId?.name}</p>
                            <p className="text-sm text-gray-600 whitespace-nowrap">{pass.holderId?.phone}</p>
                          </div>
                          <p className="mt-1 text-xs font-mono text-gray-500 break-all">{pass.qrId}</p>
                          {summary.sessionCount > 0 && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              Session: {pass.windowed && pass.validFrom ? formatIST(pass.validFrom, "EEE d MMM yyyy") : "—"}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                    <div className="hidden md:block max-h-96 overflow-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500">Name</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500">Phone</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500">QR ID</th>
                            {summary.sessionCount > 0 && (
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500">Session</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {noShows.noShows.slice(0, 10).map((pass: any) => (
                            <tr key={pass._id}>
                              <td className="px-3 sm:px-6 py-3 text-sm">{pass.holderId?.name}</td>
                              <td className="px-3 sm:px-6 py-3 text-sm whitespace-nowrap">{pass.holderId?.phone}</td>
                              <td className="px-3 sm:px-6 py-3 text-sm font-mono">{pass.qrId}</td>
                              {summary.sessionCount > 0 && (
                                <td className="px-3 sm:px-6 py-3 text-sm">
                                  {pass.windowed && pass.validFrom ? formatIST(pass.validFrom, "EEE d MMM yyyy") : "—"}
                                </td>
                              )}
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
              <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-4 rounded-t-xl">
                <Filter className="hidden sm:block w-5 h-5 text-gray-400 mt-2" />
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full sm:w-auto min-w-0 px-3 py-2.5 sm:py-2 bg-white border border-gray-300 rounded-lg text-base sm:text-sm">
                  <option value="">All Holder Types</option>
                  {passTypes?.map((pt: any) => (
                    <option key={pt._id} value={pt.catCode}>{pt.name}</option>
                  ))}
                </select>
                <select value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)} className="w-full sm:w-auto min-w-0 px-3 py-2.5 sm:py-2 bg-white border border-gray-300 rounded-lg text-base sm:text-sm">
                  <option value="">All Venues</option>
                  {eventVenues.map((v: any, i: number) => (
                    <option key={i} value={v.name}>{v.name}</option>
                  ))}
                </select>
                {/* Preacher dropdown from DB if available, else free text */}
                {preachers && preachers.length > 0 ? (
                  <select
                    value={preacherFilter}
                    onChange={(e) => setPreacherFilter(e.target.value)}
                    className="w-full sm:w-auto min-w-0 px-3 py-2.5 sm:py-2 bg-white border border-gray-300 rounded-lg text-base sm:text-sm"
                  >
                    <option value="">All Preachers</option>
                    {preachers.map((p: any) => (
                      <option key={p._id} value={p.name}>
                        {p.shortCode ? `[${p.shortCode}] ` : ""}{p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={preacherFilter} onChange={(e) => setPreacherFilter(e.target.value)} placeholder="Filter by preacher..." className="w-full sm:w-auto min-w-0 px-3 py-2.5 sm:py-2 bg-white border border-gray-300 rounded-lg text-base sm:text-sm" />
                )}
                {/* FIX: entryPoint filter now properly wired to query */}
                <select value={entryPointFilter} onChange={(e) => setEntryPointFilter(e.target.value)} className="w-full sm:w-auto min-w-0 px-3 py-2.5 sm:py-2 bg-white border border-gray-300 rounded-lg text-base sm:text-sm">
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
                <>
                {/* Phones: one card per holder */}
                <div className="md:hidden max-h-[600px] overflow-y-auto divide-y divide-gray-100">
                  {holdersReport?.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No holders found</p>
                  ) : (
                    holdersReport?.map((item: any, idx: number) => (
                      <div key={idx} className="px-4 py-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 break-words">{item.holder?.name || "N/A"}</p>
                            <p className="text-sm text-gray-600">{item.holder?.phone || "N/A"}</p>
                          </div>
                          <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full whitespace-nowrap flex-shrink-0">{item.holderType || "N/A"}</span>
                        </div>
                        {item.passCount > 1 && (
                          <p className="text-xs text-gray-500">{item.collectedCount}/{item.passCount} passes collected</p>
                        )}
                        <p className="text-xs text-gray-500 break-words">
                          {item.holder?.venue || "N/A"}
                          {item.holder?.preacher ? ` · ${item.holder.preacher}` : ""}
                        </p>
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
                      </div>
                    ))
                  )}
                </div>
                <div className="hidden md:block overflow-x-auto max-h-[600px] overflow-y-auto">
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
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {item.holder?.name || "N/A"}
                              {item.passCount > 1 && (
                                <div className="text-xs font-normal text-gray-500">
                                  {item.collectedCount}/{item.passCount} passes collected
                                </div>
                              )}
                            </td>
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
                </>
              )}
            </Card>
          )}
        </>
      )}

      {activeTab !== "analytics" && !selectedEvent && (
        <Card><div className="text-center py-12 text-gray-500">Select an event to view reports</div></Card>
      )}
    </div>
  );
}
