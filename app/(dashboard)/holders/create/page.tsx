"use client";

import api from "@/lib/api";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";

import toast from "react-hot-toast";
import { ArrowLeft, User, Phone, Mail, QrCode, MapPin } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import RichTextEditor from "@/components/ui/RichTextEditor";
import Link from "next/link";
import QRPreview from "@/components/qr/QRPreview";
import { useAuth } from "@/contexts/AuthContext";
import {
  allowedDeliveryMethods,
  filterHolderTypes,
  type DeliveryMethod,
} from "@/lib/permissions";


export default function CreateHolderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedHolderTypeId, setSelectedHolderTypeId] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("");
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]); // multi-venue issuance
  const [preacher, setPreacher] = useState("");
  const [tier, setTier] = useState("");          // bahumana A/B/C
  const [slotCode, setSlotCode] = useState("");  // seva slot code
  const [instruction, setInstruction] = useState(""); // custom rich-text instruction for community app
  const [overrideReason, setOverrideReason] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [preacherId, setPreacherId] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    lifetimeDonation: "",
  });
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("whatsapp");
  const [generatedQR, setGeneratedQR] = useState<any>(null);
  const [showQRPreview, setShowQRPreview] = useState(false);

  // Fetch active events
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

  // Get selected event's venues
  const selectedEventData = events?.find((e: any) => e._id === selectedEvent);
  const eventVenues = Array.isArray(selectedEventData?.venue)
    ? selectedEventData.venue
    : [];

  // Fetch pass types from API (merged HolderType entity)
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

  // Holder types this ACCOUNT may issue. The server rejects a disallowed type
  // with 403 regardless; filtering here just means a restricted issuer is
  // never shown a button that cannot work.
  const issuableTypes = filterHolderTypes(holderTypes, user);

  // Delivery options this account may use, from the one shared list.
  const deliveryOptions = allowedDeliveryMethods(user);

  // If the current selection isn't permitted (default "whatsapp" on an account
  // barred from it), fall back to the first option that is.
  useEffect(() => {
    if (deliveryOptions.length === 0) return;
    if (!deliveryOptions.some((m) => m.value === deliveryMethod)) {
      setDeliveryMethod(deliveryOptions[0].value);
    }
  }, [deliveryOptions, deliveryMethod]);

  // Fetch seva slots for the selected event
  const { data: sevaSlots } = useQuery({
    queryKey: ["seva-slots", selectedEvent],
    queryFn: async () => (await api.get(`/events/${selectedEvent}/seva-slots`)).data.slots,
    enabled: !!selectedEvent,
  });

  const { data: preachers } = useQuery({
    queryKey: ["preachers"],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const res = await api.get("/preachers");
      return res.data.preachers;
    },
    enabled: !!selectedEvent,
  });

  const createHolderMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(
        `/events/${selectedEvent}/holders`,
        {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          catId: selectedHolderTypeId,
          lifetimeDonation: parseInt(formData.lifetimeDonation) || 0,
          deliveryMethod,
          preacher: preacher,
          preacherId: preacherId || undefined,
          venueName: selectedVenues[0] || selectedVenue || selectedEventData?.venue?.[0]?.name || "",
          // Restrict the pass to the selected venues. Empty array = valid
          // everywhere (legacy). The backend resolves these against the event's
          // actual venue names before storing `allowedVenues` on the QRPass.
          venues: selectedVenues.length > 0 ? selectedVenues : undefined,
          subCategory: tier.trim().toUpperCase() || undefined,      // bahumana tier
          sevaSlotCode: slotCode.trim().toUpperCase() || undefined,  // seva slot
          instruction: instruction.trim() || undefined,             // custom instruction for community app
          overrideReason: overrideReason.trim() || undefined,
        },
      );
      return response.data;
    },
    onSuccess: (data) => {
      const ds = data.qrPass?.deliveryStatus;
      const de = data.qrPass?.deliveryError;
      if (ds === "sent") {
        const method = deliveryMethod === "mobile" ? "mobile app" :
          deliveryMethod === "mobile_whatsapp" ? "WhatsApp & mobile app" : "WhatsApp";
        toast.success(`QR Pass generated & sent via ${method}`);
      } else if (ds === "failed") {
        toast.success("QR Pass generated");
        toast.error(`Delivery failed: ${de || "Unknown error"}`, { duration: 8000 });
      } else {
        toast.success("QR Pass generated successfully!");
      }
      setGeneratedQR(data.qrPass);
      setShowQRPreview(true);
      setDuplicateWarning(null);
      setOverrideReason("");
    },
    onError: (error: any) => {
      const errData = error.response?.data;
      // Any 409 that names the existing pass is an override-able duplicate.
      // Matching on `existing` rather than a specific code keeps this working
      // across DUPLICATE_PASS (current) and the older DUPLICATE_SEVA_SLOT /
      // DUPLICATE_PHONE codes.
      if (error.response?.status === 409 && errData?.existing) {
        setDuplicateWarning(errData);
      } else {
        toast.error(errData?.error || "Failed to generate pass");
      }
    },
  });

  const selectedHolderType = holderTypes?.find(
    (ht: any) => ht._id === selectedHolderTypeId,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedEvent ||
      !selectedHolderTypeId ||
      !formData.name ||
      !formData.phone
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    createHolderMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/holders" className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Issue QR Pass</h1>
          <p className="text-gray-600 mt-1">
            Generate and send QR code to holder
          </p>
        </div>
      </div>

      {!showQRPreview ? (
        <form onSubmit={handleSubmit} className="space-y-6">
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
                  setSelectedVenue("");
                  setSelectedVenues([]);
                  setTier("");
                  setSlotCode("");
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="">Choose an event...</option>
                {events?.map((event: any) => (
                  <option key={event._id} value={event._id}>
                    {event.name} ({event.eventCode})
                  </option>
                ))}
              </select>
            </CardBody>
          </Card>

          {/* Step 1.5: Select Venue(s) — restrict where the pass can scan */}
          {selectedEvent && eventVenues.length > 1 && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">
                  <MapPin className="w-4 h-4 inline mr-1" /> Select Venue(s)
                </h2>
                <p className="text-xs text-gray-500">
                  Choose where this pass is valid. The pass can only be scanned at
                  the venues you select here. Pick none = valid everywhere.
                </p>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {eventVenues.map((v: any, i: number) => {
                    const cName = v.name || `Venue ${i + 1}`;
                    const checked = selectedVenues.includes(cName);
                    return (
                      <label
                        key={i}
                        className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-orange-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedVenues((prev) =>
                              checked
                                ? prev.filter((x) => x !== cName)
                                : [...prev, cName],
                            )
                          }
                          className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium text-gray-800">
                          {cName}
                        </span>
                        {v.address && (
                          <span className="text-xs text-gray-400">- {v.address}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          )}

          {selectedEvent && (
            <>
              {/* Step 2: Select Pass Type */}
              <Card>
                <CardHeader>
                  <h2 className="font-semibold">Step 2: Select Holder Type</h2>
                </CardHeader>
                <CardBody>
                  {issuableTypes.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      {holderTypes && holderTypes.length > 0
                        ? "Your account is not allowed to issue any of this event's holder types. Ask an administrator to widen your permissions."
                        : "No holder types found. Create them under the event's Holder Types tab first."}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {issuableTypes.map((ht: any) => (
                        <button
                          key={ht._id}
                          type="button"
                          onClick={() => {
                            setSelectedHolderTypeId(ht._id);
                            // Clear tier + slot when switching pass type, so a
                            // tier picked for Sponsor isn't silently submitted
                            // with a Donor pass after the picker disappears.
                            setTier("");
                            setSlotCode("");
                          }}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedHolderTypeId === ht._id
                              ? "border-orange-500 bg-orange-50 shadow-md"
                              : "border-gray-200 hover:border-orange-300"
                          }`}
                        >
                          <div className="text-2xl mb-2">{ht.icon || "👤"}</div>
                          <div className="font-medium text-sm">{ht.name}</div>
                          <div className="text-xs text-gray-500">{ht.catCode}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Step 3: Holder Details */}
              {selectedHolderTypeId && (
                <>
                  <Card>
                    <CardHeader>
                      <h2 className="font-semibold">Step 3: Holder Details</h2>
                    </CardHeader>
                    <CardBody className="space-y-4">
                      <Input
                        label="Full Name *"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="e.g., Rajesh Kumar"
                        icon={<User className="w-4 h-4" />}
                        required
                      />
                      <Input
                        label="Phone Number (WhatsApp) *"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="+91 98765 43210"
                        icon={<Phone className="w-4 h-4" />}
                        required
                      />
                      <Input
                        label="Email (Optional)"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="rajesh@email.com"
                        icon={<Mail className="w-4 h-4" />}
                      />
                      {/* Preacher — dropdown if preachers exist, else free text */}
                      {preachers && preachers.length > 0 ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Preacher (Optional)
                          </label>
                          <select
                            value={preacherId}
                            onChange={(e) => {
                              setPreacherId(e.target.value);
                              const p = preachers.find((p: any) => p._id === e.target.value);
                              setPreacher(p?.name || "");
                              // setPreacherId already set via e.target.value above
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select preacher...</option>
                            {preachers.map((p: any) => (
                              <option key={p._id} value={p._id}>
                                {p.shortCode ? `[${p.shortCode}] ` : ""}{p.name}
                              </option>
                            ))}
                            <option value="__other">Other (type below)</option>
                          </select>
                          {/* Show shortCode badge for selected preacher */}
                          {preacherId && preacherId !== "__other" && (() => {
                            const p = preachers?.find((p: any) => p._id === preacherId);
                            return p?.shortCode ? (
                              <div className="mt-1 flex items-center gap-2">
                                <span className="font-mono text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold border border-orange-200">
                                  {p.shortCode}
                                </span>
                                <span className="text-xs text-gray-500">{p.name}</span>
                              </div>
                            ) : null;
                          })()}
                          {preacherId === "__other" && (
                            <input
                              type="text"
                              value={preacher}
                              onChange={(e) => setPreacher(e.target.value)}
                              placeholder="Enter preacher name"
                              className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          )}
                        </div>
                      ) : (
                        <Input
                          label="Preacher (Optional)"
                          value={preacher}
                          onChange={(e) => setPreacher(e.target.value)}
                          placeholder="Who referred this devotee?"
                          icon={<User className="w-4 h-4" />}
                        />
                      )}
                      {selectedHolderType?.catCode === "DN" && (
                        <Input
                          label="Lifetime Donation (₹)"
                          type="number"
                          value={formData.lifetimeDonation}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lifetimeDonation: e.target.value,
                            })
                          }
                          placeholder="50000"
                        />
                      )}
                    </CardBody>
                  </Card>

                  {/* Step 3.5: Category & Slot — shown only when the pass type has its
                      own configured categories, or is Sponsor (the A/B/C bahumana
                      tier). Donor and every other type have no tier, so the picker
                      is hidden rather than offering a meaningless A/B/C. */}
                  {(selectedHolderType?.categories?.length > 0 || selectedHolderType?.catCode === "SP") && (
                  <Card>
                    <CardHeader>
                      <h2 className="font-semibold">
                        Step 3.5: Category{selectedHolderType?.catCode === "SP" ? " & Slot" : ""}
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          {selectedHolderType?.catCode === "SP" ? "category + seva slot (timing)" : "select category for this holder"}
                        </span>
                      </h2>
                    </CardHeader>
                    <CardBody className="space-y-4">
                      {/* Category */}
                      {(selectedHolderType?.categories?.length > 0 || selectedHolderType?.catCode === "SP") && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category
                          <span className="ml-1.5 text-xs text-gray-400 font-normal">select a category for this holder</span>
                        </label>
                        <div className="flex gap-2">
                          {["", ...(selectedHolderType.categories?.length > 0 ? selectedHolderType.categories : ["A", "B", "C"])].map((t: string) => (
                            <button
                              key={t || "none"}
                              type="button"
                              onClick={() => setTier(t)}
                              className={`flex-1 py-2.5 rounded-xl border-2 font-black text-lg transition-colors ${
                                tier === t
                                  ? t === "A" ? "bg-amber-100 text-amber-800 border-amber-400"
                                  : t === "B" ? "bg-slate-100 text-slate-700 border-slate-400"
                                  : t === "C" ? "bg-orange-100 text-orange-800 border-orange-400"
                                  : t === "" ? "bg-gray-100 text-gray-500 border-gray-300"
                                  : "bg-purple-100 text-purple-800 border-purple-400"
                                  : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              {t || "None"}
                            </button>
                          ))}
                        </div>
                      </div>
                      )}

                      {/* Seva Slot (timing) — sponsors only */}
                      {selectedHolderType?.catCode === "SP" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Seva Slot <span className="ml-1.5 text-xs text-gray-400 font-normal">timing / seating</span>
                        </label>
                        {sevaSlots && sevaSlots.length > 0 ? (
                          <select
                            value={slotCode}
                            onChange={(e) => setSlotCode(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">— No slot —</option>
                            {sevaSlots.map((s: any) => (
                              <option key={s._id} value={s.code}>
                                {s.name}{s.time ? ` · ${s.time}` : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div>
                            <input
                              type="text"
                              value={slotCode}
                              onChange={(e) => setSlotCode(e.target.value.toUpperCase())}
                              placeholder="e.g. SDGP, PA"
                              maxLength={12}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono font-bold uppercase tracking-widest"
                            />
                            <a href={`/events/${selectedEvent}/seva-slots`} target="_blank" rel="noreferrer"
                              className="text-xs text-orange-600 hover:underline mt-1 inline-block">
                              Configure seva slots for this event →
                            </a>
                          </div>
                        )}
                        {slotCode && sevaSlots && (() => {
                          const s = sevaSlots.find((sl: any) => sl.code === slotCode);
                          return s ? (
                            <p className="mt-2 text-sm text-gray-600">
                              🕉️ {s.name}{s.time ? ` · 🕐 ${s.time}` : ""}
                              {s.description ? <span className="block text-xs text-gray-400">{s.description}</span> : null}
                            </p>
                          ) : null;
                        })()}
                      </div>
                      )}

                      {/* Combined preview */}
                      {(tier || slotCode) && (
                        <div className="bg-orange-50 rounded-xl px-4 py-3 border border-orange-100">
                          <p className="text-xs text-gray-500 mb-1">Scanner will show:</p>
                          <div className="flex items-center gap-3">
                            {tier && (
                              <span className={`font-black text-2xl px-3 py-1 rounded-xl border ${
                                tier === "A" ? "bg-amber-100 text-amber-800 border-amber-300" :
                                tier === "B" ? "bg-slate-100 text-slate-700 border-slate-300" :
                                tier === "C" ? "bg-orange-100 text-orange-800 border-orange-300" :
                                "bg-purple-100 text-purple-800 border-purple-300"
                              }`}>{tier}</span>
                            )}
                            {slotCode && sevaSlots && (() => {
                              const s = sevaSlots.find((sl: any) => sl.code === slotCode);
                              return s ? (
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                                  {s.time && <p className="text-xs text-gray-500">{s.time}</p>}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      )}

                    </CardBody>
                  </Card>
                  )}

                  {/* Duplicate warning — deliberately OUTSIDE the Step 3.5 card,
                      which only renders for Sponsor / categorised pass types.
                      Nested there, a duplicate on a Volunteer or General pass
                      set this state but rendered nothing, so the submit button
                      appeared to do nothing at all. */}
                  {duplicateWarning && (
                    <Card>
                      <CardBody>
                        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                          <p className="text-sm font-semibold text-amber-800 mb-1">
                            ⚠️ This pass already exists on this number
                          </p>
                          <p className="text-sm text-amber-700 mb-1">
                            <strong>{duplicateWarning.existing?.holderName}</strong> already holds an active{" "}
                            <strong>
                              {duplicateWarning.existing?.holderTypeName || "pass"}
                              {duplicateWarning.existing?.subCategory
                                ? ` · category ${duplicateWarning.existing.subCategory}`
                                : ""}
                            </strong>{" "}
                            pass for this event
                            {duplicateWarning.existing?.qrId ? ` (${duplicateWarning.existing.qrId})` : ""}.
                          </p>
                          <p className="text-xs text-amber-700 mb-3">
                            To give this number an <strong>additional</strong> pass, go back and pick a
                            different holder type or a different category — that is allowed and needs no
                            reason. Only a <strong>replacement</strong> of the pass above needs a reason,
                            and it will revoke {duplicateWarning.existing?.qrId || "the existing QR"}.
                          </p>
                          <label className="block text-sm font-medium text-amber-800 mb-1">
                            Reason for replacing the existing pass *
                          </label>
                          <input
                            type="text"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="e.g. Lost phone, Replacement"
                            className="w-full px-3 py-2 border border-amber-400 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 mb-2"
                          />
                          {overrideReason.trim() && (
                            <button
                              type="button"
                              onClick={() => createHolderMutation.mutate()}
                              className="w-full py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                            >
                              Revoke {duplicateWarning.existing?.qrId || "existing pass"} & issue replacement
                            </button>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  )}

                  {/* Step 3.5: Custom Instructions (optional) */}
                  <Card>
                    <CardHeader>
                      <h2 className="font-semibold">Instructions for Devotee</h2>
                    </CardHeader>
                    <CardBody>
                      <RichTextEditor
                        value={instruction}
                        onChange={setInstruction}
                        placeholder="e.g. Arrive by 8:00 AM. Bring your ID. Formal attire preferred."
                        helperText="Shown on the community app alongside the QR pass. Leave blank to show the default seva/category info instead."
                      />
                    </CardBody>
                  </Card>

                  {/* Step 4: Delivery Method */}
                  <Card>
                    <CardHeader>
                      <h2 className="font-semibold">Step 4: Delivery Method</h2>
                    </CardHeader>
                    <CardBody>
                      {/* Driven by the shared DELIVERY_METHODS list, filtered to
                          what this account is allowed to use. Previously six
                          hand-duplicated radio blocks kept in manual sync with
                          the bulk-import page's own copy of the same list. */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {deliveryOptions.map((m) => (
                          <label key={m.value} className="flex items-center">
                            <input
                              type="radio"
                              name="deliveryMethod"
                              value={m.value}
                              checked={deliveryMethod === m.value}
                              onChange={(e) =>
                                setDeliveryMethod(e.target.value as DeliveryMethod)
                              }
                              className="text-orange-600 focus:ring-orange-500"
                            />
                            <span className="ml-2">{m.label}</span>
                          </label>
                        ))}
                      </div>
                      {deliveryOptions.length === 1 && (
                        <p className="mt-2 text-xs text-gray-400">
                          Your account is limited to this delivery method.
                        </p>
                      )}
                      {deliveryMethod === "mobile" && (
                        <p className="mt-2 text-sm text-gray-500">
                          QR will be pushed to the community mobile app only.
                        </p>
                      )}
                      {deliveryMethod === "mobile_whatsapp" && (
                        <p className="mt-2 text-sm text-gray-500">
                          QR will be sent via WhatsApp and also pushed to the community mobile app.
                        </p>
                      )}
                      {deliveryMethod === "none" && (
                        <p className="mt-2 text-sm text-gray-500">
                          QR will be generated but not sent anywhere.
                        </p>
                      )}
                    </CardBody>
                  </Card>

                  {/* Submit */}
                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      loading={createHolderMutation.isPending}
                    >
                      <QrCode className="w-5 h-5 mr-2" />
                      Generate & Send QR
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </form>
      ) : (
        <QRPreview
          qrData={generatedQR}
          holderName={formData.name}
          onClose={() => {
            setShowQRPreview(false);
            router.push("/holders");
          }}
          onNew={() => {
            setShowQRPreview(false);
            setSelectedEvent("");
            setSelectedHolderTypeId("");
            setSelectedVenue("");
            setSelectedVenues([]);
            setPreacher("");
            setPreacherId("");
            setFormData({
              name: "",
              phone: "",
              email: "",
              lifetimeDonation: "",
            });
            setGeneratedQR(null);
          }}
        />
      )}
    </div>
  );
}
