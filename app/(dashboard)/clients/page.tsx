"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatIST } from "@/lib/dateUtils";
import { isUnrestricted } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, KeyRound, Copy, Check, AlertTriangle } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import toast from "react-hot-toast";

// Registered consumers of the integration API (Vaikuntham, the Seva Pass app,
// FOLK, ...), each with its own key, scopes, allowlists and rate limit.
// Super admin only — the API enforces it too.

interface ClientApp {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  status: "active" | "disabled";
  scopes: string[];
  allowedEvents: string[];
  allowedPassTypes: string[];
  rateLimitPerMin: number;
  keyHint?: string;
  lastUsedAt?: string;
  keyRotatedAt?: string;
  createdAt?: string;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  preset: string;
  scopes: string[];
  allowedEvents: string;
  allowedPassTypes: string;
  rateLimitPerMin: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  description: "",
  preset: "",
  scopes: [],
  allowedEvents: "*",
  allowedPassTypes: "*",
  rateLimitPerMin: "300",
};

// "SKJ26, prasadam" -> ["SKJ26","PRASADAM"]; blank -> ["*"] (every code)
const parseCodes = (text: string) => {
  const list = text.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  return list.length ? Array.from(new Set(list)) : ["*"];
};

const codesLabel = (list?: string[]) =>
  !list || list.length === 0 || list.includes("*") ? "All" : list.join(", ");

const errorText = (e: any, fallback: string) => e?.response?.data?.error || fallback;

export default function ClientAppsPage() {
  const { user } = useAuth();
  const allowed = isUnrestricted(user);
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClientApp | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirm, setConfirm] = useState<{ kind: "rotate" | "delete"; client: ClientApp } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // The clear key lives here only while its modal is open.
  const [revealed, setRevealed] = useState<{ name: string; apiKey: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: clients, isLoading } = useQuery<ClientApp[]>({
    queryKey: ["client-apps"],
    queryFn: async () => (await api.get("/clients")).data.clients,
    enabled: allowed,
  });

  const { data: scopeInfo } = useQuery<{ scopes: Record<string, string>; presets: Record<string, string[]> }>({
    queryKey: ["client-app-scopes"],
    queryFn: async () => (await api.get("/clients/scopes")).data,
    enabled: allowed,
    staleTime: Infinity,
  });

  const { data: events } = useQuery({
    queryKey: ["events-list"],
    queryFn: async () => (await api.get("/events")).data.events,
    enabled: allowed && formOpen,
  });

  const scopes = scopeInfo?.scopes || {};
  const presets = scopeInfo?.presets || {};
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["client-apps"] });

  if (!allowed) {
    return (
      <Card>
        <div className="text-center py-12 text-gray-500">Client apps are managed by a super admin.</div>
      </Card>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (c: ClientApp) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      preset: "",
      scopes: c.scopes || [],
      allowedEvents: (c.allowedEvents || ["*"]).join(", "),
      allowedPassTypes: (c.allowedPassTypes || ["*"]).join(", "),
      rateLimitPerMin: String(c.rateLimitPerMin ?? 300),
    });
    setFormOpen(true);
  };

  const pickPreset = (preset: string) =>
    setForm((f) => ({ ...f, preset, scopes: preset && presets[preset] ? [...presets[preset]] : f.scopes }));

  const toggleScope = (scope: string) =>
    setForm((f) => ({
      ...f,
      preset: "",
      scopes: f.scopes.includes(scope) ? f.scopes.filter((s) => s !== scope) : [...f.scopes, scope],
    }));

  const showKey = (name: string, apiKey: string) => {
    setCopied(false);
    setRevealed({ name, apiKey });
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (form.scopes.length === 0) return toast.error("Pick a preset or at least one scope");
    const rate = Number(form.rateLimitPerMin);
    if (!Number.isInteger(rate) || rate < 1 || rate > 6000) {
      return toast.error("Rate limit must be a whole number from 1 to 6000");
    }
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim(),
      scopes: form.scopes,
      allowedEvents: parseCodes(form.allowedEvents),
      allowedPassTypes: parseCodes(form.allowedPassTypes),
      rateLimitPerMin: rate,
    };
    setBusy("save");
    try {
      if (editing) {
        await api.patch(`/clients/${editing._id}`, body);
        toast.success("Client updated");
      } else {
        if (form.slug.trim()) body.slug = form.slug.trim().toLowerCase();
        const res = await api.post("/clients", body);
        showKey(res.data.client?.name || form.name, res.data.apiKey);
      }
      setFormOpen(false);
      refresh();
    } catch (e) {
      toast.error(errorText(e, "Could not save the client"));
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = async (c: ClientApp) => {
    const status = c.status === "active" ? "disabled" : "active";
    setBusy(`status-${c._id}`);
    try {
      await api.patch(`/clients/${c._id}`, { status });
      toast.success(status === "active" ? "Client enabled" : "Client disabled");
      refresh();
    } catch (e) {
      toast.error(errorText(e, "Could not change the status"));
    } finally {
      setBusy(null);
    }
  };

  const runConfirmed = async () => {
    if (!confirm) return;
    const { kind, client } = confirm;
    setBusy("confirm");
    try {
      if (kind === "rotate") {
        const res = await api.post(`/clients/${client._id}/rotate-key`);
        showKey(client.name, res.data.apiKey);
      } else {
        await api.delete(`/clients/${client._id}`);
        toast.success("Client removed");
      }
      setConfirm(null);
      refresh();
    } catch (e) {
      toast.error(errorText(e, kind === "rotate" ? "Could not rotate the key" : "Could not remove the client"));
    } finally {
      setBusy(null);
    }
  };

  const copyKey = async () => {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.apiKey);
      setCopied(true);
    } catch {
      toast.error("Copy failed — select the key and copy it manually");
    }
  };

  const closeKey = () => {
    setRevealed(null);
    setCopied(false);
  };

  const eventCodes: string[] = (events || []).map((e: any) => e.eventCode).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Apps</h1>
          <p className="text-gray-600 mt-1">Apps that call the integration API, each with its own key</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-5 h-5 mr-2" />New client
        </Button>
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !clients || clients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No client apps yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Client", "Status", "Scopes", "Events", "Pass types", "Rate / min", "Key", "Last used", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{c.slug}</div>
                      {c.description && <div className="text-xs text-gray-500 mt-1 max-w-xs">{c.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(c.scopes || []).map((s) => (
                          <span key={s} className="px-1.5 py-0.5 text-[11px] font-mono rounded bg-orange-50 text-orange-700 border border-orange-200">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{codesLabel(c.allowedEvents)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{codesLabel(c.allowedPassTypes)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.rateLimitPerMin}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{c.keyHint ? `${c.keyHint}…` : "—"}</code>
                      {c.keyRotatedAt && (
                        <div className="text-[11px] text-gray-400 mt-1">rotated {formatIST(c.keyRotatedAt, "d MMM yyyy")}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {c.lastUsedAt ? formatIST(c.lastUsedAt, "d MMM yyyy, h:mm a") : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3 text-sm">
                        <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800">Edit</button>
                        <button
                          onClick={() => toggleStatus(c)}
                          disabled={busy === `status-${c._id}`}
                          className="text-amber-600 hover:text-amber-800 disabled:opacity-50"
                        >
                          {c.status === "active" ? "Disable" : "Enable"}
                        </button>
                        <button onClick={() => setConfirm({ kind: "rotate", client: c })} className="text-orange-600 hover:text-orange-800">
                          Rotate key
                        </button>
                        <button onClick={() => setConfirm({ kind: "delete", client: c })} className="text-red-600 hover:text-red-800">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create / edit */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : "New client app"}
        onConfirm={save}
        confirmText={editing ? "Save" : "Create & show key"}
        loading={busy === "save"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="client-name"
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Vaikuntham app"
            />
            {editing ? (
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">Slug</p>
                <p className="px-4 py-2 font-mono text-sm text-gray-600 bg-gray-50 rounded-lg border border-gray-200">{editing.slug}</p>
              </div>
            ) : (
              <Input
                id="client-slug"
                label="Slug (optional)"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="derived from the name"
              />
            )}
          </div>
          <Input
            id="client-description"
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            maxLength={300}
          />

          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">Access</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.keys(presets).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => pickPreset(p)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    form.preset === p
                      ? "border-orange-600 bg-orange-50 text-orange-700"
                      : "border-gray-200 text-gray-600 hover:border-orange-300"
                  }`}
                >
                  {p}
                </button>
              ))}
              <span className="self-center text-xs text-gray-400">preset, or pick scopes below</span>
            </div>
            <div className="space-y-2">
              {Object.entries(scopes).map(([scope, desc]) => (
                <label key={scope} className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="mt-0.5 accent-orange-600"
                  />
                  <span>
                    <span className="font-mono text-gray-900">{scope}</span>
                    <span className="text-gray-500"> — {desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                id="client-events"
                label="Allowed events"
                value={form.allowedEvents}
                onChange={(e) => setForm({ ...form, allowedEvents: e.target.value })}
                placeholder="* or PRASADAM, SKJ26"
              />
              <p className="mt-1 text-xs text-gray-500">
                Event codes, comma separated; * = all.
                {eventCodes.length > 0 && <> Known: {eventCodes.join(", ")}</>}
              </p>
            </div>
            <div>
              <Input
                id="client-types"
                label="Allowed pass types"
                value={form.allowedPassTypes}
                onChange={(e) => setForm({ ...form, allowedPassTypes: e.target.value })}
                placeholder="* or PR, SP"
              />
              <p className="mt-1 text-xs text-gray-500">Pass type codes (catCode); * = all.</p>
            </div>
          </div>
          <Input
            id="client-rate"
            label="Rate limit (requests per minute)"
            type="number"
            min={1}
            max={6000}
            value={form.rateLimitPerMin}
            onChange={(e) => setForm({ ...form, rateLimitPerMin: e.target.value })}
          />
        </div>
      </Modal>

      {/* Rotate / delete confirmation */}
      <Modal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === "rotate" ? "Rotate API key?" : "Delete client app?"}
        onConfirm={runConfirmed}
        confirmText={confirm?.kind === "rotate" ? "Rotate key" : "Delete"}
        loading={busy === "confirm"}
      >
        {confirm?.kind === "rotate" ? (
          <p className="text-sm text-gray-600">
            A new key is issued for <span className="font-semibold text-gray-900">{confirm.client.name}</span> and the
            current key stops working immediately. The app must be updated with the new key.
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{confirm?.client.name}</span> will no longer be able to call
            the API. Passes it already issued keep working. This cannot be undone; disable the client instead if you
            may need it again.
          </p>
        )}
      </Modal>

      {/* One-time key display */}
      <Modal isOpen={!!revealed} onClose={closeKey} title={`API key for ${revealed?.name || ""}`} cancelText="Done">
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Copy this key now. It is shown only once and cannot be shown again — if it is lost, rotate the key.</span>
          </div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-gray-400 shrink-0" />
            <code className="flex-1 min-w-0 break-all select-all text-sm bg-gray-100 px-3 py-2 rounded-lg font-mono">
              {revealed?.apiKey}
            </code>
            <Button variant="outline" size="sm" onClick={copyKey}>
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Send it as the <span className="font-mono">X-API-Key</span> header.
          </p>
        </div>
      </Modal>
    </div>
  );
}
