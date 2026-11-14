"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import { istLocalToISO } from "@/lib/dateUtils";
import { vccEventDayKeys } from "@/lib/vccDays";
import VccSlotEditor, { slotsProblem, cleanSlots, type DaySlots } from "./VccSlotEditor";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

// Everything VCC's own "Create Event" form asks for, so an event that "needs
// volunteers" is fully set up in VCC from here. QR owns name/code/dates/venue/
// banner; the settings below only exist in VCC.

export type { DaySlots };

export const FIELD_TYPES = {
  short_text: "Short text",
  long_text: "Long text (paragraph)",
  number: "Number",
  email: "Email",
  phone: "Phone",
  select: "Dropdown",
  radio: "Single choice",
  checkbox: "Multiple choice",
  date: "Date",
  devotee_select: "Devotee selector",
} as const;
export type FieldType = keyof typeof FIELD_TYPES;
const TYPES_WITH_OPTIONS: FieldType[] = ["select", "radio", "checkbox"];

export type CustomField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  important: boolean;
  optionsText: string; // comma-separated, for select/radio/checkbox
  helpText: string;
};

export type ServiceRow = { name: string; description: string; requiredVolunteers: string; coordinatorId: string };

export type VccFormState = {
  coordinatorId: string;
  registrationStart: string; // datetime-local, IST
  registrationEnd: string;
  photoRequired: boolean;
  status: "registration_open" | "draft";
  availabilitySlots: DaySlots[];
  customFields: CustomField[];
  services: ServiceRow[];
};

export const emptyVccForm: VccFormState = {
  coordinatorId: "",
  registrationStart: "",
  registrationEnd: "",
  photoRequired: false,
  status: "registration_open",
  availabilitySlots: [],
  customFields: [],
  services: [],
};

function makeId() {
  return Math.random().toString(36).slice(2, 14);
}

/** Problems that would make VCC reject or silently drop something. */
export function validateVcc(f: VccFormState): string | null {
  if (!f.coordinatorId) return "Select a VCC coordinator";
  const slotIssue = slotsProblem(f.availabilitySlots);
  if (slotIssue) return slotIssue;
  for (const q of f.customFields) {
    if (!q.label.trim()) return "Every custom question needs a label";
    if (TYPES_WITH_OPTIONS.includes(q.type) && !q.optionsText.split(",").some((o) => o.trim())) {
      return `Add options for "${q.label}"`;
    }
  }
  const names = new Set<string>();
  for (const s of f.services) {
    const n = s.name.trim().toLowerCase();
    if (!n) return "Every service needs a name";
    if (names.has(n)) return `Service "${s.name}" is listed twice`;
    names.add(n);
  }
  return null;
}

export function toVccPayload(f: VccFormState, dayKeys?: string[]) {
  const keep = dayKeys ? new Set(dayKeys) : null;
  return {
    coordinatorId: f.coordinatorId || undefined,
    registrationStart: f.registrationStart ? istLocalToISO(f.registrationStart) : undefined,
    registrationEnd: f.registrationEnd ? istLocalToISO(f.registrationEnd) : undefined,
    photoRequired: f.photoRequired,
    status: f.status,
    // Only sent when slots were actually added here, so this can never wipe
    // slots a VCC admin set in VCC.
    availabilitySlots: (() => {
      const slots = cleanSlots(f.availabilitySlots, keep);
      return slots.length ? slots : undefined;
    })(),
    customFields: f.customFields.map((q) => ({
      id: q.id,
      label: q.label.trim(),
      type: q.type,
      required: q.required,
      important: q.important,
      helpText: q.helpText.trim() || undefined,
      options: TYPES_WITH_OPTIONS.includes(q.type)
        ? q.optionsText.split(",").map((o) => o.trim()).filter(Boolean)
        : undefined,
    })),
    services: f.services.map((s) => ({
      name: s.name.trim(),
      description: s.description.trim() || undefined,
      requiredVolunteers: s.requiredVolunteers === "" ? undefined : Number(s.requiredVolunteers),
      coordinatorId: s.coordinatorId || undefined,
    })),
  };
}

type Coordinator = { _id: string; name: string; phone?: string; role: string };

export function useVccCoordinators(enabled = true) {
  return useQuery({
    queryKey: ["vcc-coordinators"],
    queryFn: async () => (await api.get("/events/vcc/coordinators")).data as {
      enabled: boolean;
      coordinators: Coordinator[];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

const selectCls =
  "w-full px-4 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white";
const smallInputCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-orange-500";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="pt-5 border-t border-gray-100 space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export default function VccFields({
  value,
  onChange,
  eventStartLocal,
  eventEndLocal,
}: {
  value: VccFormState;
  onChange: (v: VccFormState) => void;
  /** Event start/end as IST datetime-local strings — used to list the days for time slots. */
  eventStartLocal?: string;
  eventEndLocal?: string;
}) {
  const { data, isLoading, error } = useVccCoordinators();
  const set = (patch: Partial<VccFormState>) => onChange({ ...value, ...patch });
  const loadError = (error as any)?.response?.data?.error;
  const coordinators = data?.coordinators || [];
  // Same list VCC's own event form shows: every coordinator except Super Admin.
  const vccCoordinators = coordinators.filter((c) => c.role !== "super_admin");
  const dayKeys = vccEventDayKeys(eventStartLocal, eventEndLocal);

  if (data && !data.enabled) {
    return (
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        VCC link is not configured on the server (VCC_INTEGRATION_KEY). The event will be
        created in QR only.
      </p>
    );
  }

  // ── custom questions ──
  const setField = (i: number, patch: Partial<CustomField>) =>
    set({ customFields: value.customFields.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  const moveField = (i: number, dir: -1 | 1) => {
    const next = [...value.customFields];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set({ customFields: next });
  };

  // ── services ──
  const setService = (i: number, patch: Partial<ServiceRow>) =>
    set({ services: value.services.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  return (
    <div className="space-y-5">
      {/* Basics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">VCC Coordinator *</label>
          <select
            value={value.coordinatorId}
            onChange={(e) => set({ coordinatorId: e.target.value })}
            className={selectCls}
            disabled={isLoading || !!loadError}
          >
            <option value="">{isLoading ? "Loading coordinators…" : "Select coordinator"}</option>
            {vccCoordinators.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {c.phone ? ` · ${c.phone}` : ""}
                  {c.role === "event_coordinator" ? " · Event coordinator" : " · Service coordinator"}
                </option>
              ))}
          </select>
          {loadError && <p className="text-sm text-red-600 mt-1">{loadError}</p>}
        </div>
        <Input
          label="Volunteer registration opens (IST)"
          type="datetime-local"
          value={value.registrationStart}
          onChange={(e) => set({ registrationStart: e.target.value })}
        />
        <Input
          label="Volunteer registration closes (IST)"
          type="datetime-local"
          value={value.registrationEnd}
          onChange={(e) => set({ registrationEnd: e.target.value })}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status in VCC</label>
          <select
            value={value.status}
            onChange={(e) => set({ status: e.target.value as VccFormState["status"] })}
            className={selectCls}
          >
            <option value="registration_open">Registration open (visible in app)</option>
            <option value="draft">Draft (hidden until opened in VCC)</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 py-1 md:mt-8">
          <input
            type="checkbox"
            checked={value.photoRequired}
            onChange={(e) => set({ photoRequired: e.target.checked })}
            className="w-5 h-5 sm:w-4 sm:h-4 accent-orange-500"
          />
          Volunteer photo required
        </label>
      </div>

      {/* Time slots */}
      <Section
        title="Availability time slots"
        hint="For each event day, the time slots volunteers can choose (up to 4 per day). Optional — they can also be added later from Edit Event or in VCC."
      >
        <VccSlotEditor
          dayKeys={dayKeys}
          value={value.availabilitySlots}
          onChange={(availabilitySlots) => set({ availabilitySlots })}
        />
      </Section>

      {/* Custom questions */}
      <Section
        title="Registration questions"
        hint="Extra questions volunteers answer when they register (in the Vaikuntham app)."
      >
        {value.customFields.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={q.label}
                placeholder="Question, e.g. T-shirt size"
                onChange={(e) => setField(i, { label: e.target.value })}
                className={`${smallInputCls} flex-1 min-w-[180px]`}
              />
              <select
                value={q.type}
                onChange={(e) => setField(i, { type: e.target.value as FieldType })}
                className={`${smallInputCls} bg-white flex-1 sm:flex-none`}
              >
                {Object.entries(FIELD_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => moveField(i, -1)} className="p-2.5 sm:p-1 text-gray-500 hover:bg-gray-100 rounded-lg" title="Move up" aria-label="Move up">
                <ChevronUp className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => moveField(i, 1)} className="p-2.5 sm:p-1 text-gray-500 hover:bg-gray-100 rounded-lg" title="Move down" aria-label="Move down">
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => set({ customFields: value.customFields.filter((_, j) => j !== i) })}
                className="p-2.5 sm:p-1 text-red-500 hover:bg-red-50 rounded-lg"
                title="Remove question"
                aria-label="Remove question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {TYPES_WITH_OPTIONS.includes(q.type) && (
              <input
                value={q.optionsText}
                placeholder="Options, separated by commas — e.g. S, M, L, XL"
                onChange={(e) => setField(i, { optionsText: e.target.value })}
                className={`${smallInputCls} w-full`}
              />
            )}
            <input
              value={q.helpText}
              placeholder="Help text (optional)"
              onChange={(e) => setField(i, { helpText: e.target.value })}
              className={`${smallInputCls} w-full`}
            />
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={q.required} onChange={(e) => setField(i, { required: e.target.checked })} className="w-5 h-5 sm:w-4 sm:h-4 accent-orange-500" />
                Required
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={q.important} onChange={(e) => setField(i, { important: e.target.checked })} className="w-5 h-5 sm:w-4 sm:h-4 accent-orange-500" />
                Important (highlighted for coordinators)
              </label>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            set({
              customFields: [
                ...value.customFields,
                { id: makeId(), label: "", type: "short_text", required: false, important: false, optionsText: "", helpText: "" },
              ],
            })
          }
        >
          <Plus className="w-4 h-4 mr-1" /> Add question
        </Button>
      </Section>

      {/* Services */}
      <Section
        title="Services (seva)"
        hint="The seva teams volunteers are assigned to, and how many volunteers each needs. Coordinator defaults to the event coordinator."
      >
        {value.services.map((s, i) => (
          <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={s.name}
                placeholder="Service name, e.g. Prasadam Distribution"
                onChange={(e) => setService(i, { name: e.target.value })}
                className={`${smallInputCls} flex-1 min-w-[180px]`}
              />
              <input
                type="number"
                min={0}
                value={s.requiredVolunteers}
                placeholder="Volunteers needed"
                onChange={(e) => setService(i, { requiredVolunteers: e.target.value })}
                className={`${smallInputCls} flex-1 min-w-0 sm:flex-none sm:w-40`}
              />
              <button
                type="button"
                onClick={() => set({ services: value.services.filter((_, j) => j !== i) })}
                className="p-2.5 sm:p-1 text-red-500 hover:bg-red-50 rounded-lg"
                title="Remove service"
                aria-label="Remove service"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={s.description}
                placeholder="Description (optional)"
                onChange={(e) => setService(i, { description: e.target.value })}
                className={`${smallInputCls} flex-1 min-w-[180px]`}
              />
              <select
                value={s.coordinatorId}
                onChange={(e) => setService(i, { coordinatorId: e.target.value })}
                className={`${smallInputCls} bg-white w-full sm:w-auto`}
              >
                <option value="">Coordinator: same as event</option>
                {vccCoordinators.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => set({ services: [...value.services, { name: "", description: "", requiredVolunteers: "", coordinatorId: "" }] })}
        >
          <Plus className="w-4 h-4 mr-1" /> Add service
        </Button>
      </Section>
    </div>
  );
}
