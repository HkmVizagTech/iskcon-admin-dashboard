"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Tags,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";

const CLEAR_WORDS = new Set(["NONE", "N/A", "-", "CLEAR", "REMOVE", "NO"]);

interface ParsedRow {
  id: number;
  line: string;
  valid: boolean;
  reason?: string;
  name: string;
  phone: string;
  category: string;
}

interface HolderRef {
  _id: string;
  name: string;
  phone: string;
  subCategory: string | null;
}

interface RowResult {
  rowIndex: number;
  name: string;
  phone: string;
  requestedCategory: string | null;
  status: string;
  message: string;
  holder: HolderRef | null;
  matches: HolderRef[] | null;
}

interface ApiSummary {
  total: number;
  updated: number;
  cleared: number;
  noChange: number;
  noChangeApplied: number;
  willUpdate: number;
  willClear: number;
  notFound: number;
  noPhone: number;
  nameMismatch: number;
  duplicate: number;
  revoked: number;
  notInEvent: number;
  conflict: number;
  failed: number;
}

const TIER_COLORS: Record<string, string> = {
  will_update: "bg-blue-100 text-blue-700",
  will_clear: "bg-violet-100 text-violet-700",
  updated: "bg-green-100 text-green-700",
  cleared: "bg-violet-100 text-violet-700",
  no_change: "bg-gray-100 text-gray-600",
  not_found: "bg-red-100 text-red-700",
  no_phone: "bg-red-100 text-red-700",
  not_in_event: "bg-red-100 text-red-700",
  revoked: "bg-gray-100 text-gray-600",
  name_mismatch: "bg-amber-100 text-amber-700",
  duplicate: "bg-amber-100 text-amber-700",
  conflict: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
};

const STATUS_PREFIX: Record<string, string> = {
  will_update: "Will update",
  will_clear: "Will clear",
  updated: "Updated",
  cleared: "Cleared",
  no_change: "No change",
  not_found: "Not found",
  no_phone: "No phone",
  not_in_event: "Not in event",
  revoked: "Revoked pass",
  name_mismatch: "Name differs",
  duplicate: "Duplicate",
  conflict: "Conflict",
  failed: "Failed",
};

function parseRows(text: string): ParsedRow[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, idx): ParsedRow => {
      const toks = line
        .split(/[\t,;]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (toks.length < 2) {
        return {
          id: idx,
          line,
          valid: false,
          reason: "Need at least Phone, Category",
          name: "",
          phone: "",
          category: "",
        };
      }
      const catRaw = toks[toks.length - 1];
      const phoneRaw = toks[toks.length - 2];
      const digits = phoneRaw.replace(/[+\s()-]/g, "");
      if (!/^\d{10,12}$/.test(digits)) {
        return {
          id: idx,
          line,
          valid: false,
          reason: `"${phoneRaw}" doesn't look like a phone`,
          name: "",
          phone: phoneRaw,
          category: "",
        };
      }
      const cat = catRaw.toUpperCase();
      if (CLEAR_WORDS.has(cat)) {
        return {
          id: idx,
          line,
          valid: true,
          name: toks.slice(0, -2).join(" "),
          phone: phoneRaw,
          category: "",
        };
      }
      if (!/^[A-Z0-9/]+$/.test(cat) || cat.length > 4) {
        return {
          id: idx,
          line,
          valid: false,
          reason: `"${catRaw}" isn't a valid category (A/B/C, or NONE to remove)`,
          name: "",
          phone: "",
          category: "",
        };
      }
      return {
        id: idx,
        line,
        valid: true,
        name: toks.slice(0, -2).join(" "),
        phone: phoneRaw,
        category: cat,
      };
    });
}

function summaryLine(summary: ApiSummary | undefined, applied: boolean): string {
  if (!summary) return "";
  const parts: string[] = [];
  const add = (label: string, n: number | undefined) => {
    if (n && n > 0) parts.push(`${n} ${label}`);
  };
  if (applied) {
    add("updated", summary.updated);
    add("cleared", summary.cleared);
    add("no change", summary.noChangeApplied);
    add("not found", summary.notFound);
    add("revoked skipped", summary.revoked);
    add("duplicates unresolved", summary.duplicate);
    add("name differs", summary.nameMismatch);
    add("conflicts", summary.conflict);
    add("failed", summary.failed);
  } else {
    add("will update", summary.willUpdate);
    add("will clear", summary.willClear);
    add("no change", summary.noChange);
    add("not found", summary.notFound);
    add("revoked skipped", summary.revoked);
    add("duplicates to resolve", summary.duplicate);
    add("name differs", summary.nameMismatch);
  }
  return parts.join(" · ") || "Everything already set correctly";
}

export default function BulkUpdateCategoryPage() {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [preview, setPreview] = useState<{ results: RowResult[] } | null>(null);
  const [result, setResult] = useState<{ results: RowResult[] } | null>(null);
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [forceIds, setForceIds] = useState<Record<number, boolean>>({});
  const [showSummaryLine, setShowSummaryLine] = useState("");
  const [appliedSummary, setAppliedSummary] = useState<ApiSummary | null>(null);

  const { data: events } = useQuery({
    queryKey: ["events-list"],
    queryFn: async () => {
      const response = await api.get(`/events`);
      return response.data.events;
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (rows: any[]) =>
      api.post("/holders/bulk-update-category", {
        eventId: selectedEvent,
        rows,
        apply: false,
      }),
  });

  const applyMutation = useMutation({
    mutationFn: async (rows: any[]) =>
      api.post("/holders/bulk-update-category", {
        eventId: selectedEvent,
        rows,
        apply: true,
      }),
  });

  const filePreviewMutation = useMutation({
    mutationFn: async (formData: FormData) =>
      api.post("/holders/bulk-update-category/file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
  });

  const resetPreviewState = () => {
    setPreview(null);
    setResult(null);
    setPicks({});
    setForceIds({});
    setShowSummaryLine("");
    setAppliedSummary(null);
  };

  const onTextChange = (value: string) => {
    setText(value);
    setParsed(null);
    resetPreviewState();
  };

  const handlePreview = () => {
    if (!selectedEvent) {
      toast.error("Select an event first");
      return;
    }
    const rows = parseRows(text);
    setParsed(rows);
    resetPreviewState();
    const invalid = rows.filter((r) => !r.valid);
    if (invalid.length > 0) {
      setShowSummaryLine(
        `${invalid.length} row(s) unreadable — fix them before previewing`,
      );
      toast.error(`${invalid.length} row(s) unreadable — fix them before previewing`);
      return;
    }
    if (rows.length === 0) {
      setShowSummaryLine(
        "Paste at least one row — each line: Name, Phone, Category",
      );
      toast.error("Paste at least one row");
      return;
    }
    previewMutation.mutate(
      rows.map((r) => ({ name: r.name, phone: r.phone, subCategory: r.category })),
      {
        onSuccess: (res) => {
          setPreview(res.data);
          setShowSummaryLine(summaryLine(res.data.summary, false));
          if (res.data.summary.notFound > 0) {
            toast.error(
              `${res.data.summary.notFound} row(s) not found in this event`,
            );
          }
        },
        onError: (e: any) =>
          toast.error(e.response?.data?.error || "Preview failed"),
      },
    );
  };

  const handleUploadPreview = () => {
    if (!selectedEvent) {
      toast.error("Select an event first");
      return;
    }
    if (!file) {
      toast.error("Choose a CSV/XLSX file first");
      return;
    }
    setParsed(null);
    resetPreviewState();
    const formData = new FormData();
    formData.append("eventId", selectedEvent);
    formData.append("apply", "false");
    formData.append("file", file);
    filePreviewMutation.mutate(formData, {
      onSuccess: (res) => {
        setPreview(res.data);
        setShowSummaryLine(summaryLine(res.data.summary, false));
        if (res.data.summary.notFound > 0) {
          toast.error(
            `${res.data.summary.notFound} row(s) not found in this event`,
          );
        }
      },
      onError: (e: any) =>
        toast.error(e.response?.data?.error || "Upload failed"),
    });
  };

  const handleApply = () => {
    if (!preview) return;
    const applyRows = preview.results.map((res, i) => {
      if (res.status === "duplicate") {
        const h = picks[i];
        return h
          ? { holderId: h, subCategory: res.requestedCategory || "" }
          : { name: res.name, phone: res.phone, subCategory: res.requestedCategory || "" };
      }
      if (res.status === "name_mismatch" && res.holder?._id && forceIds[i]) {
        return { holderId: res.holder._id, subCategory: res.requestedCategory || "" };
      }
      return { name: res.name, phone: res.phone, subCategory: res.requestedCategory || "" };
    });
    const unresolved = preview.results.filter(
      (r) => r.status === "duplicate" && !picks[r.rowIndex],
    );
    if (unresolved.length > 0) {
      toast(
        `${unresolved.length} duplicate row(s) still need a choice — they will be skipped.`,
        { icon: "⚠️" },
      );
    }
    applyMutation.mutate(applyRows, {
      onSuccess: (res) => {
        setResult(res.data);
        setPreview(null);
        setAppliedSummary(res.data.summary);
        toast.success("Category updates applied — shows on next scan");
      },
      onError: (e: any) =>
        toast.error(e.response?.data?.error || "Apply failed"),
    });
  };

  const canPreview =
    !!selectedEvent &&
    !previewMutation.isPending &&
    !filePreviewMutation.isPending &&
    (mode === "file" ? !!file : text.trim().length > 0);
  const canApply =
    !!preview && !applyMutation.isPending && applyMutation.isIdle;

  const showTable = result || preview || parsed;
  const resultsToShow = result?.results || preview?.results || null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/holders" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bulk Update Category
            </h1>
            <p className="text-gray-600 mt-1">
              Change A/B/C tiers on already-issued passes — no re-issue, new
              category shows on the next scan
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold flex items-center">
            <Tags className="w-5 h-5 mr-2" />
            1 · Choose event
          </h2>
        </CardHeader>
        <CardBody>
          <Select
            label="Event"
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            options={(events || []).map((e: any) => ({
              value: e._id,
              label: `${e.name} (${e.eventCode})`,
            }))}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold flex items-center">
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            2 · Enter rows
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex gap-2">
            {(
              [
                { key: "paste", label: "Paste rows" },
                { key: "file", label: "Upload sheet" },
              ] as const
            ).map((m) => (
              <button
                key={m.key}
                onClick={() => {
                  setMode(m.key);
                  resetPreviewState();
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  mode === m.key
                    ? "border-orange-600 bg-orange-50 text-orange-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-orange-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "paste" ? (
            <>
              <p className="text-sm text-gray-600">
                One pass per line:{" "}
                <span className="font-mono text-gray-900">Name, Phone, Category</span>{" "}
                (name optional). Category is A, B or C —{" "}
                <span className="font-mono">NONE</span> removes the tier.
              </p>
              <textarea
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                rows={8}
                placeholder={"Ram Prasad, 9000000001, B\nSita Devi, 9000000002, C\nKrishna Kumar, 9000000003, NONE"}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-mono text-sm resize-y"
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handlePreview}
                  disabled={!canPreview}
                  loading={previewMutation.isPending}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    onTextChange(
                      "Ram Prasad, 9000000001, B\nSita Devi, 9000000002, C",
                    )
                  }
                >
                  Load sample
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Upload a{" "}
                <span className="font-mono">CSV</span> or{" "}
                <span className="font-mono">XLSX</span> with columns{" "}
                <span className="font-mono text-gray-900">Name</span>{" "}
                (optional),{" "}
                <span className="font-mono text-gray-900">Phone</span> and{" "}
                <span className="font-mono text-gray-900">Category</span> (A/B/C,
                or <span className="font-mono">NONE</span> to remove) — same
                format as a bulk-issue sheet.
              </p>
              <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-400 hover:bg-orange-50/40 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    resetPreviewState();
                  }}
                  className="hidden"
                />
                <div className="text-center">
                  <FileSpreadsheet className="w-8 h-8 mx-auto text-gray-400" />
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    {file ? file.name : "Click to choose a sheet"}
                  </p>
                  <p className="text-xs text-gray-400">
                    CSV · XLSX (first sheet is read)
                  </p>
                </div>
              </label>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleUploadPreview}
                  disabled={!canPreview}
                  loading={filePreviewMutation.isPending}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Upload &amp; Preview
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {showSummaryLine && (
        <div
          className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm ${
            appliedSummary
              ? "bg-green-50 text-green-800"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          {appliedSummary ? (
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          {showSummaryLine}
        </div>
      )}

      {showTable && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">
              {result ? "Result" : preview ? "Preview" : "Parsed rows"}
            </h2>
          </CardHeader>
          <CardBody className="overflow-x-auto">
            {preview || result ? (
              ((resultsToShow || []).length === 0 ? null : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-3 font-medium">#</th>
                      <th className="py-2 pr-3 font-medium">Name / Phone</th>
                      <th className="py-2 pr-3 font-medium">New</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(resultsToShow || []).map((res, i) => {
                      const isDuplicate = res.status === "duplicate";
                      const isMismatch = res.status === "name_mismatch";
                      return (
                        <tr key={i} className="border-b last:border-0 align-top">
                          <td className="py-3 pr-3 text-gray-400">{i + 1}</td>
                          <td className="py-3 pr-3">
                            <p className="font-medium text-gray-900">
                              {res.name || "—"}
                            </p>
                            <p className="text-xs text-gray-500">{res.phone}</p>
                            {res.holder && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Matched:{" "}
                                {res.status === "name_mismatch"
                                  ? res.holder.name
                                  : res.status === "duplicate"
                                    ? `${res.matches?.length || 0} candidates`
                                    : res.holder.name}
                                {res.holder.subCategory
                                  ? ` · currently ${res.holder.subCategory}`
                                  : ""}
                              </p>
                            )}
                          </td>
                          <td className="py-3 pr-3">
                            <span className="inline-flex px-2 py-0.5 rounded-md font-mono font-bold border border-orange-200 bg-orange-50 text-orange-700">
                              {res.requestedCategory || "None"}
                            </span>
                          </td>
                          <td className="py-3 pr-3 max-w-[240px]">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[res.status] || "bg-gray-100 text-gray-600"}`}
                            >
                              {STATUS_PREFIX[res.status] || res.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {res.message}
                            </p>
                          </td>
                          <td className="py-3 min-w-[220px]">
                            {isDuplicate && preview && !result && (
                              <Select
                                label="Choose which pass"
                                value={picks[res.rowIndex] || ""}
                                onChange={(e) =>
                                  setPicks((prev) => ({
                                    ...prev,
                                    [res.rowIndex]: e.target.value,
                                  }))
                                }
                                options={(res.matches || []).map((m) => ({
                                  value: m._id,
                                  label: `${m.name} (${m.phone})${
                                    m.subCategory
                                      ? ` · currently ${m.subCategory}`
                                      : ""
                                  }`,
                                }))}
                              />
                            )}
                            {isMismatch && preview && !result && res.holder && (
                              <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!forceIds[res.rowIndex]}
                                  onChange={(e) =>
                                    setForceIds((prev) => ({
                                      ...prev,
                                      [res.rowIndex]: e.target.checked,
                                    }))
                                  }
                                  className="mt-0.5 accent-orange-600"
                                />
                                Update this pass anyway
                              </label>
                            )}
                            {result && res.status === "updated" && (
                              <span className="text-xs text-green-600">
                                Now{" "}
                                <span className="font-mono font-bold">
                                  {res.requestedCategory || "None"}
                                </span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ))
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Phone</th>
                    <th className="py-2 font-medium">New category</th>
                  </tr>
                </thead>
                <tbody>
                  {(parsed || []).map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 pr-3 text-gray-400">{i + 1}</td>
                      <td className="py-3 pr-3 text-gray-900">
                        {r.valid ? r.name || "—" : (
                          <span className="text-red-600">{r.reason}</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-gray-900">{r.phone}</td>
                      <td className="py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md font-mono font-bold border border-orange-200 bg-orange-50 text-orange-700">
                          {r.category || "None"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {preview && !result && (
        <div className="flex justify-end">
          <Button onClick={handleApply} loading={applyMutation.isPending}>
            <ShieldCheck className="w-4 h-4 mr-2" />
            Apply changes
          </Button>
        </div>
      )}
    </div>
  );
}