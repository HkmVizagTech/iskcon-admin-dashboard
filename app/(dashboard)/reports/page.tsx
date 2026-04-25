"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import { Download, TrendingUp, Users, QrCode, ScanLine } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatCard from "@/components/ui/StatCard";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function ReportsPage() {
  const [selectedEvent, setSelectedEvent] = useState("");

  const { data: events } = useQuery({
    queryKey: ["events-all"],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/events`);
      return response.data.events;
    },
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["event-summary", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return null;
      const response = await axios.get(
        `${API_URL}/reports/events/${selectedEvent}/summary`,
      );
      return response.data;
    },
    enabled: !!selectedEvent,
  });

  const { data: noShows } = useQuery({
    queryKey: ["no-shows", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return null;
      const response = await axios.get(
        `${API_URL}/reports/events/${selectedEvent}/no-shows`,
      );
      return response.data;
    },
    enabled: !!selectedEvent,
  });

  const { data: capacity } = useQuery({
    queryKey: ["capacity", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return null;
      const response = await axios.get(
        `${API_URL}/reports/events/${selectedEvent}/capacity`,
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
        `${API_URL}/reports/export/${selectedEvent}`,
        {
          responseType: "blob",
        },
      );
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reports & Analytics
          </h1>
          <p className="text-gray-600 mt-1">View insights and export data</p>
        </div>

        <Button onClick={handleExport} disabled={!selectedEvent}>
          <Download className="w-5 h-5 mr-2" />
          Export Report
        </Button>
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

      {selectedEvent && summary && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Passes Issued"
              value={summary.totalIssued || 0}
              icon={<QrCode className="w-6 h-6" />}
              color="blue"
              loading={summaryLoading}
            />
            <StatCard
              title="Total Scans"
              value={summary.totalScanned || 0}
              icon={<ScanLine className="w-6 h-6" />}
              color="green"
              loading={summaryLoading}
            />
            <StatCard
              title="Scan Rate"
              value={`${summary.totalIssued ? ((summary.totalScanned / summary.totalIssued) * 100).toFixed(1) : 0}%`}
              icon={<TrendingUp className="w-6 h-6" />}
              color="orange"
              loading={summaryLoading}
            />
            <StatCard
              title="No-Shows"
              value={noShows?.count || 0}
              icon={<Users className="w-6 h-6" />}
              color="purple"
              loading={summaryLoading}
            />
          </div>

          {/* Capacity Report */}
          {capacity && capacity.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Entry Point Capacity</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {capacity.map((ep: any) => (
                    <div key={ep.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{ep.name}</span>
                        <span className="text-gray-600">
                          {ep.currentCount} / {ep.maxCapacity || "∞"}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full"
                          style={{ width: `${ep.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* No-Shows List */}
          {noShows && noShows.noShows?.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">No-Shows ({noShows.count})</h2>
              </CardHeader>
              <CardBody padding={false}>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          QR ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {noShows.noShows.slice(0, 10).map((pass: any) => (
                        <tr key={pass._id}>
                          <td className="px-6 py-3 text-sm">
                            {pass.holderId?.name}
                          </td>
                          <td className="px-6 py-3 text-sm">
                            {pass.holderId?.phone}
                          </td>
                          <td className="px-6 py-3 text-sm font-mono">
                            {pass.qrId}
                          </td>
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

      {!selectedEvent && (
        <Card>
          <div className="text-center py-12 text-gray-500">
            Select an event to view reports
          </div>
        </Card>
      )}
    </div>
  );
}
