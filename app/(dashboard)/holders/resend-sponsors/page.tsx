"use client";

import api from "@/lib/api";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import toast from "react-hot-toast";
import * as XLSX from "xlsx";

import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  Smartphone,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function ResendSponsorsBulkPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: events } = useQuery({
    queryKey: ["events-active"],
    queryFn: async () => {
      const [active, upcoming] = await Promise.all([
        api.get("/events?status=active"),
        api.get("/events?status=upcoming"),
      ]);
      const all = [
        ...(active.data.events || []),
        ...(upcoming.data.events || []),
      ];
      const seen = new Set();
      return all
        .filter((e: any) => { if (seen.has(e._id)) return false; seen.add(e._id); return true; })
        .sort((a: any, b: any) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime());
    },
  });

  const handleDownloadSample = () => {
    const headers = ["Phone Number", "Venue", "Date"];
    const examples = [
      ["9876543210", "Main Hall", "04-09-2026"],
      ["9876543211", "Temple Hall", "05-09-2026"],
      ["9876543212", "Main Hall, Temple Hall", ""],
    ];
    const notes = [
      ["Column", "Required?", "Notes"],
      ["Phone Number", "Yes", "10-digit mobile matching an existing Sponsor on the selected event. 91 prefix added automatically."],
      ["Venue", "Yes", "The new venue to send in the WhatsApp message for THIS phone number. Different rows can have different venues. Multiple venues can be comma-separated (e.g. \"Main Hall, Temple Hall\") if this sponsor should see both."],
      ["Date", "No", "Which specific day (within a multi-day event) this sponsor's seva/program is on — shown in the resent WhatsApp message. Format: DD-MM-YYYY (e.g. 04-09-2026). Leave blank to keep whatever date the pass already had."],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
    ws["!cols"] = [{ wch: 16 }, { wch: 30 }, { wch: 14 }];
    const style = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "E85D24" } } };
    headers.forEach((_, i) => { const c = XLSX.utils.encode_cell({ r: 0, c: i }); if (!ws[c]) ws[c] = { v: headers[i] }; ws[c].s = style; });
    const wsN = XLSX.utils.aoa_to_sheet(notes);
    wsN["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 70 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resend Venues");
    XLSX.utils.book_append_sheet(wb, wsN, "Column Notes");
    XLSX.writeFile(wb, "iskcon_resend_sponsors_venue.xlsx");
    toast.success("Sample sheet downloaded!");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEvent || !file) {
      toast.error("Select an event and a file first");
      return;
    }
    setIsProcessing(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post(
        `/holders/events/${selectedEvent}/resend-sponsors-bulk`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setResult(response.data);
      toast.success(response.data.message || "Resend complete");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Resend failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/holders/import" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Resend Sponsors — New Venue (Bulk)</h1>
          <p className="text-sm text-gray-500">
            Resend the existing QR code over WhatsApp to sponsors, each with their own updated venue.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Step 1: Select Event</h2>
        </CardHeader>
        <CardBody>
          <select
            value={selectedEvent}
            onChange={(e) => { setSelectedEvent(e.target.value); setResult(null); }}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select an event...</option>
            {events?.map((ev: any) => (
              <option key={ev._id} value={ev._id}>{ev.name} ({ev.eventCode})</option>
            ))}
          </select>
        </CardBody>
      </Card>

      {selectedEvent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Step 2: Upload Phone Number + Venue Sheet</h2>
              <Button variant="outline" size="sm" onClick={handleDownloadSample}>
                <Download className="w-4 h-4 mr-1" /> Sample
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Only rows matching an existing, active Sponsor QR pass on this event will be resent.
                Each phone number gets the Venue from its own row — different sponsors can go to different venues.
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-orange-400"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <span className="font-medium">{file.name}</span>
                </div>
              ) : (
                <div className="text-gray-400">
                  <Upload className="w-8 h-8 mx-auto mb-2" />
                  <p>Click to select a CSV or Excel file</p>
                </div>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!file || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resending...</>
              ) : (
                <><Smartphone className="w-4 h-4 mr-2" /> Resend WhatsApp with New Venues</>
              )}
            </Button>
          </CardBody>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Result</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-900">{result.total}</p>
                <p className="text-xs text-gray-500">Total Rows</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-700">{result.sent}</p>
                <p className="text-xs text-green-600">Sent</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-red-700">
                  {(result.failed || 0) + (result.notFoundList?.length || 0)}
                </p>
                <p className="text-xs text-red-600">Failed / Not Found</p>
              </div>
            </div>

            {result.notFoundList?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-amber-500" />
                  No matching active Sponsor QR on this event ({result.notFoundList.length})
                </p>
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                  {result.notFoundList.map((item: any, i: number) => (
                    <div key={i} className="px-3 py-2 text-sm flex justify-between">
                      <span className="text-gray-700">{item.phone}</span>
                      <span className="text-gray-400">{item.venue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.failedList?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Failed to send ({result.failedList.length})
                </p>
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                  {result.failedList.map((item: any, i: number) => (
                    <div key={i} className="px-3 py-2 text-sm">
                      <span className="text-gray-700">{item.name || item.phone}</span>
                      <span className="text-red-500 text-xs ml-2">{item.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.sent > 0 && (
              <p className="text-sm text-green-700 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> {result.sent} sponsor(s) resent successfully.
              </p>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
