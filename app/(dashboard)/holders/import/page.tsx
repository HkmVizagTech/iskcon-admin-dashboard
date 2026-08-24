"use client";

import api from "@/lib/api";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
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


export default function BulkImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedHolderTypeId, setSelectedHolderTypeId] = useState("");
  const [selectedPreacherId, setSelectedPreacherId] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<
    "whatsapp" | "email" | "both" | "mobile" | "mobile_whatsapp" | "none"
  >("whatsapp");
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const { data: events } = useQuery({
    queryKey: ["events-active"],
    queryFn: async () => {
      // FIX: only show present (active) and future (upcoming) events when issuing passes
      // Past/completed events are excluded so admins don't accidentally issue to wrong event
      const [active, upcoming] = await Promise.all([
        api.get("/events?status=active"),
        api.get("/events?status=upcoming"),
      ]);
      const all = [
        ...(active.data.events || []),
        ...(upcoming.data.events || []),
      ];
      // Deduplicate and sort by start date ascending (nearest first)
      const seen = new Set();
      return all
        .filter((e: any) => { if (seen.has(e._id)) return false; seen.add(e._id); return true; })
        .sort((a: any, b: any) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime());
    },
  });

  const { data: holderTypes } = useQuery({
    queryKey: ["holder-types", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const response = await api.get(
        `/events/${selectedEvent}/holder-types`,
      );
      return response.data;
    },
    enabled: !!selectedEvent,
  });

  // Selected pass type (merged HolderType entity) — carries entry points directly
  const selectedTypeData = useMemo(() => {
    if (!selectedHolderTypeId || !holderTypes) return null;
    return holderTypes.find((ht: any) => ht._id === selectedHolderTypeId);
  }, [selectedHolderTypeId, holderTypes]);

  // Fetch preachers for selected event
  const { data: preachers } = useQuery({
    queryKey: ["preachers"],
    queryFn: async () => {
      if (!selectedEvent) return [];
      return (await api.get("/preachers")).data.preachers;
    },
    enabled: !!selectedEvent,
  });

  const selectedHolderType = holderTypes?.find(
    (ht: any) => ht._id === selectedHolderTypeId,
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = [".csv", ".xlsx", ".xls"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validTypes.includes(ext)) {
      toast.error("Invalid file format. Use CSV or Excel files.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }
    setFile(file);
  };

  const handleImport = async () => {
    if (!selectedEvent || !selectedHolderTypeId || !file) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("eventId", selectedEvent);
      formData.append("categoryId", selectedHolderTypeId);
      if (selectedPreacherId) formData.append("preacherId", selectedPreacherId);
      formData.append("deliveryMethod", deliveryMethod);

      const response = await api.post(
        `/events/${selectedEvent}/holders/bulk`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              setProgress({ current: percent, total: 100 });
            }
          },
        },
      );

      setImportResult(response.data);

      if (response.data.stats.failed === 0) {
        toast.success(
          `🎉 All ${response.data.stats.success} passes sent successfully!`,
        );
      } else {
        toast.success(
          `✅ ${response.data.stats.success} sent, ⚠️ ${response.data.stats.failed} failed`,
          { duration: 6000 },
        );
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Import failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setImportResult(null);
    setFile(null);
    setProgress({ current: 0, total: 0 });
  };

  const handleDownloadGeneralSample = () => {
    const headers = ["Name", "Phone Number", "Preacher", "Venue"];
    const examples = [
      ["Rajesh Kumar",   "9876543210", "MKGD", "Main Hall"],
      ["Priya Sharma",   "9876543211", "MKGD", "Temple"],
      ["Amit Singh",     "9876543212", "GPVP", "Main Hall"],
      ["Sita Devi Dasi", "9876543213", "",     "Outside"],
    ];
    const notes = [
      ["Column", "Required?", "Notes"],
      ["Name", "Yes", "Full name of the devotee"],
      ["Phone Number", "Yes", "10-digit mobile. 91 prefix added automatically."],
      ["Preacher", "No", "Preacher short code (e.g. MKGD) or full name."],
      ["Venue", "No", "Seating venue or hall name"],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
    ws["!cols"] = [{ wch: 22 }, { wch: 15 }, { wch: 14 }, { wch: 18 }];
    const s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "E85D24" } } };
    headers.forEach((_, i) => { const c2 = XLSX.utils.encode_cell({ r: 0, c: i }); if (!ws[c2]) ws[c2] = { v: headers[i] }; ws[c2].s = s; });
    const wsN = XLSX.utils.aoa_to_sheet(notes);
    wsN["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Holders");
    XLSX.utils.book_append_sheet(wb, wsN, "Column Notes");
    XLSX.writeFile(wb, "iskcon_general_import.xlsx");
    toast.success("General sample downloaded!");
  };

  const handleDownloadSponsorSample = () => {
    const headers = ["Name", "Phone Number", "Preacher", "Venue", "Tier", "SubCategory"];
    const examples = [
      ["Shadgoswami Prabhu", "9876543210", "MKGD", "Main Hall", "A", "SDGP"],
      ["Hari Dasa",          "9876543211", "GPVP", "Temple",    "B", "PA"],
      ["Radha Devi Dasi",    "9876543212", "MKGD", "Main Hall", "A", "PA"],
      ["Shadgoswami Prabhu", "9876543210", "GPVP", "Outside",   "A", "PA"],
    ];
    const notes = [
      ["Column", "Required?", "Notes"],
      ["Name", "Yes", "Full name of the devotee"],
      ["Phone Number", "Yes", "10-digit mobile. 91 prefix added automatically."],
      ["Preacher", "No", "Preacher short code (e.g. MKGD) or full name."],
      ["Venue", "No", "Seating venue or hall name"],
      ["Tier", "Sponsors", "Bahumana tier — A / B / C. Decides the gift/kit. Independent of slot."],
      ["SubCategory", "Sponsors", "Seva slot code matching Events → Seva Slots (e.g. SDGP, PA, A, B). Same phone + same slot = skip. Same phone + different slot = new QR."],
      ["", "", ""],
      ["Note:", "", "Row 1 and Row 4 have same phone but same SubCategory (PA) — Row 4 will be skipped. Use different SubCategory codes for multiple QRs on same number."],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
    ws["!cols"] = [{ wch: 22 }, { wch: 15 }, { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 14 }];
    const base = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "E85D24" } } };
    const spon = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "7B3FA0" } } };
    headers.forEach((_, i) => { const c2 = XLSX.utils.encode_cell({ r: 0, c: i }); if (!ws[c2]) ws[c2] = { v: headers[i] }; ws[c2].s = i >= 4 ? spon : base; });
    const wsN = XLSX.utils.aoa_to_sheet(notes);
    wsN["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 90 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sponsor Holders");
    XLSX.utils.book_append_sheet(wb, wsN, "Column Notes");
    XLSX.writeFile(wb, "iskcon_sponsor_import.xlsx");
    toast.success("Sponsor sample downloaded!");
  };

  // Smart: auto-selects sponsor or general sheet based on selected category
  const handleDownloadSample = handleDownloadGeneralSample;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-4">
          <Link href="/holders" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bulk Import & Send QR Passes
            </h1>
            <p className="text-gray-600 mt-1">
              Upload Excel file and automatically send QR codes via WhatsApp
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <Button
            variant="outline"
            onClick={selectedTypeData?.catCode === "SP" ? handleDownloadSponsorSample : handleDownloadGeneralSample}
            className={selectedTypeData?.catCode === "SP" ? "border-purple-300 text-purple-700 hover:bg-purple-50" : ""}
          >
            <Download className="w-4 h-4 mr-2" />
            {selectedTypeData?.catCode === "SP" ? "Sponsor Sample" : "General Sample"}
          </Button>
          {!selectedHolderTypeId && (
            <span className="text-xs text-gray-400">Select a pass type to get the right sample</span>
          )}
        </div>
      </div>

      {!importResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Select Event */}
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Step 1: Select Event</h2>
              </CardHeader>
              <CardBody>
                <select
                  value={selectedEvent}
                  onChange={(e) => {
                    setSelectedEvent(e.target.value);
                    setSelectedHolderTypeId("");
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Choose an event...</option>
                  {events?.map((event: any) => (
                    <option key={event._id} value={event._id}>
                      {event.name} ({event.eventCode}) —{" "}
                      {new Date(event.dateStart).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                        timeZone: "Asia/Kolkata"
                      })}
                    </option>
                  ))}
                </select>
              </CardBody>
            </Card>

            {/* Step 2: Select Pass Type */}
            {selectedEvent && (
              <Card>
                <CardHeader>
                  <h2 className="font-semibold">
                    Step 2: Select Pass Type
                  </h2>
                </CardHeader>
                <CardBody>
                  {!holderTypes || holderTypes.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No pass types found. Create them under the event's Pass Types tab first.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {holderTypes.map((ht: any) => (
                        <button
                          key={ht._id}
                          type="button"
                          onClick={() => setSelectedHolderTypeId(ht._id)}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            selectedHolderTypeId === ht._id
                              ? "border-orange-500 bg-orange-50 shadow-md"
                              : "border-gray-200 hover:border-orange-300"
                          }`}
                        >
                          <div className="text-2xl mb-1">
                            {ht.icon || "👤"}
                          </div>
                          <div className="text-xs font-medium">{ht.name}</div>
                          <div className="text-xs text-gray-500">{ht.catCode}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Step 2.5: Delivery Method */}
            {selectedHolderTypeId && (
              <Card>
                <CardHeader>
                  <h2 className="font-semibold">Step 2.5: Delivery Method</h2>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { value: "whatsapp", label: "WhatsApp" },
                      { value: "email", label: "Email" },
                      { value: "both", label: "Both" },
                      { value: "mobile", label: "Mobile App" },
                      { value: "mobile_whatsapp", label: "Mobile + WhatsApp" },
                      { value: "none", label: "None" },
                    ].map((opt) => (
                      <label key={opt.value} className="flex items-center">
                        <input
                          type="radio"
                          value={opt.value}
                          checked={deliveryMethod === opt.value}
                          onChange={(e) => setDeliveryMethod(e.target.value as any)}
                          className="text-orange-600 focus:ring-orange-500"
                        />
                        <span className="ml-2">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Applies to every holder in this import. "Mobile App" pushes the QR
                    to the community app instead of / in addition to WhatsApp.
                  </p>
                </CardBody>
              </Card>
            )}

            {/* Step 3: Upload File */}
            {selectedHolderTypeId && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">
                      Step 3: Upload Excel/CSV File
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadSample}
                    >
                      <Download className="w-3 h-3 mr-1" /> Sample
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-400 transition-colors"
                  >
                    <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      Drag and drop your file here, or click to browse
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Supported: .csv, .xlsx, .xls (Max 10MB)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        validateAndSetFile(e.target.files[0])
                      }
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" /> Choose File
                    </Button>
                    {file && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg inline-flex items-center text-green-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                    )}
                  </div>

                  {/* NEW FORMAT INFO */}
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">
                      📋 Required Format
                    </h4>
                    <pre className="text-xs text-blue-800 bg-white p-3 rounded overflow-x-auto">
                      {`Name,Phone Number,Preacher,Venue
Rajesh Kumar,9876543210,MKGD,Main Hall
Priya Sharma,9876543211,MKGD,Temple
Amit Singh,9876543212,GPVP,Outside`}
                    </pre>
                    <p className="text-xs text-blue-600 mt-2">
                      • <strong>Name</strong> and <strong>Phone Number</strong>{" "}
                      are required
                      <br />• <strong>Phone Number</strong> should be 10 digits
                      (India)
                      <br />•{" "}
                      <strong>
                        Preacher and Venue. For Sponsors, also add SubCategory
                      </strong>{" "}
                      are optional
                      <br />• Download the sample file to get started!
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Import Button */}
            {file && (
              <Button
                onClick={handleImport}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending
                    via WhatsApp...{" "}
                    {progress.current > 0 && `${progress.current}%`}
                  </>
                ) : (
                  <>
                    <Smartphone className="w-5 h-5 mr-2" /> Import & Send QR via
                    WhatsApp
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Right - Preview */}
          <div className="space-y-6">
            {selectedHolderType && (
              <Card>
                <CardHeader>
                  <h2 className="font-semibold flex items-center">
                    <span className="text-2xl mr-2">
                      {selectedHolderType.icon || "👤"}
                    </span>
                    {selectedHolderType.name} Pass
                  </h2>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-gray-600 mb-3">
                    {selectedHolderType.description ||
                      `${selectedHolderType.name} access pass`}
                  </p>
                  {selectedTypeData && (
                    <>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Entry Points:
                      </h4>
                      <div className="space-y-1">
                        {selectedTypeData.entryPoints?.map((ep: any) => (
                          <div
                            key={ep._id || ep}
                            className="flex items-center text-sm text-gray-600"
                          >
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                            {ep.name || ep}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            )}
            {selectedTypeData && (
              <Card>
                <CardHeader>
                  <h2 className="font-semibold flex items-center">
                    <Smartphone className="w-4 h-4 mr-2" /> WhatsApp Preview
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs">
                    <p className="font-bold mb-1">*ISKCON Seva Pass* 🕉️</p>
                    <p className="mb-1">Dear [Name],</p>
                    <p className="mb-1">
                      Your pass for *
                      {events?.find((e: any) => e._id === selectedEvent)
                        ?.name || "[Event]"}
                      * is ready!
                    </p>
                    <p className="mb-1">
                      *Access:*{" "}
                      {selectedTypeData.entryPoints
                        ?.map((ep: any) => ep.name || ep)
                        .join(", ")}
                    </p>
                    <p className="mt-2 text-green-700">
                      📱 QR code image attached
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* Results */
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-center">
              {importResult.stats.failed === 0
                ? "🎉 Import Complete!"
                : "⚠️ Import Partially Complete"}
            </h2>
          </CardHeader>
          <CardBody>
            <div className="text-center mb-6">
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {importResult.stats.total}
                  </p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-green-700">
                    {importResult.stats.success}
                  </p>
                  <p className="text-xs text-green-600">Sent ✅</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-red-700">
                    {importResult.stats.failed}
                  </p>
                  <p className="text-xs text-red-600">Failed ❌</p>
                </div>
              </div>

              {importResult.summary.successList?.length > 0 && (
                <div className="mb-4 text-left">
                  <h4 className="font-medium text-green-700 mb-2">
                    ✅ Successfully Sent (
                    {importResult.summary.successList.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.summary.successList.map(
                      (item: any, i: number) => (
                        <div
                          key={i}
                          className="text-sm text-gray-600 flex items-center"
                        >
                          <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                          {item.name} — {item.phone} ({item.qrId})
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {importResult.summary.failedList?.length > 0 && (
                <div className="mb-4 text-left">
                  <h4 className="font-medium text-red-700 mb-2 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" /> Failed (
                    {importResult.summary.failedList.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.summary.failedList.map(
                      (item: any, i: number) => (
                        <div
                          key={i}
                          className="text-sm text-red-600 flex items-center"
                        >
                          <XCircle className="w-3 h-3 text-red-500 mr-2 flex-shrink-0" />
                          {item.name || "Unknown"} — {item.phone} ({item.error})
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={handleReset}>
                Import Another File
              </Button>
              <Button onClick={() => router.push("/holders")}>
                View All Holders
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
