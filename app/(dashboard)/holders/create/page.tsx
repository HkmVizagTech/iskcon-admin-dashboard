"use client";

import api from "@/lib/api";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";

import toast from "react-hot-toast";
import { ArrowLeft, User, Phone, Mail, QrCode, MapPin } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Link from "next/link";
import QRPreview from "@/components/qr/QRPreview";


export default function CreateHolderPage() {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedHolderTypeId, setSelectedHolderTypeId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("");
  const [preacher, setPreacher] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [preacherId, setPreacherId] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    lifetimeDonation: "",
  });
  const [deliveryMethod, setDeliveryMethod] = useState<
    "whatsapp" | "email" | "both"
  >("whatsapp");
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

  // Fetch holder types from API
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

  // Fetch categories from API
  const { data: categories } = useQuery({
    queryKey: ["categories", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const response = await api.get(
        `/events/${selectedEvent}/categories`,
      );
      return response.data;
    },
    enabled: !!selectedEvent,
  });

  // Filter categories by selected holder type
  const filteredCategories = useMemo(() => {
    if (!categories || !selectedHolderTypeId) return categories || [];
    return categories.filter((cat: any) => {
      const catHolderTypeId = cat.holderTypeId?._id || cat.holderTypeId;
      return catHolderTypeId === selectedHolderTypeId;
    });
  }, [categories, selectedHolderTypeId]);

  // Fetch preachers for the selected event
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
          catId: selectedCategory,
          holderType:
            holderTypes
              ?.find((ht: any) => ht._id === selectedHolderTypeId)
              ?.code?.toLowerCase() || "custom",
          lifetimeDonation: parseInt(formData.lifetimeDonation) || 0,
          deliveryMethod,
          preacher: preacher,
          preacherId: preacherId || undefined,
          venueName: selectedVenue || selectedEventData?.venue?.[0]?.name || "",
          subCategory: subCategory.trim().toUpperCase() || undefined,
          overrideReason: overrideReason.trim() || undefined,
        },
      );
      return response.data;
    },
    onSuccess: (data) => {
      const ds = data.qrPass?.deliveryStatus;
      const de = data.qrPass?.deliveryError;
      if (ds === "sent") {
        toast.success("QR Pass generated & sent via WhatsApp ✓");
      } else if (ds === "failed") {
        toast.success("QR Pass generated ✓");
        toast.error(`WhatsApp delivery failed: ${de || "Unknown error"}`, { duration: 8000 });
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
      if (error.response?.status === 409 && errData?.code === "DUPLICATE_SEVA_SLOT") {
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
      !selectedCategory ||
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
    <div className="max-w-2xl mx-auto space-y-6">
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
                  setSelectedCategory("");
                  setSelectedVenue("");
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

          {/* Step 1.5: Select Venue (if multiple) */}
          {selectedEvent && eventVenues.length > 1 && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">
                  <MapPin className="w-4 h-4 inline mr-1" /> Select Venue
                </h2>
              </CardHeader>
              <CardBody>
                <select
                  value={selectedVenue}
                  onChange={(e) => setSelectedVenue(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select venue...</option>
                  {eventVenues.map((v: any, i: number) => (
                    <option key={i} value={v.name}>
                      {v.name || `Venue ${i + 1}`}{" "}
                      {v.address ? `- ${v.address}` : ""}
                    </option>
                  ))}
                </select>
              </CardBody>
            </Card>
          )}

          {selectedEvent && (
            <>
              {/* Step 2: Select Holder Type */}
              <Card>
                <CardHeader>
                  <h2 className="font-semibold">Step 2: Select Holder Type</h2>
                </CardHeader>
                <CardBody>
                  {!holderTypes || holderTypes.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No holder types found.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {holderTypes.map((ht: any) => (
                        <button
                          key={ht._id}
                          type="button"
                          onClick={() => {
                            setSelectedHolderTypeId(ht._id);
                            setSelectedCategory("");
                          }}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedHolderTypeId === ht._id
                              ? "border-orange-500 bg-orange-50 shadow-md"
                              : "border-gray-200 hover:border-orange-300"
                          }`}
                        >
                          <div className="text-2xl mb-2">{ht.icon || "👤"}</div>
                          <div className="font-medium text-sm">{ht.name}</div>
                          <div className="text-xs text-gray-500">{ht.code}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Step 3: Select Category */}
              {selectedHolderTypeId && (
                <Card>
                  <CardHeader>
                    <h2 className="font-semibold">Step 3: Select Category</h2>
                    {selectedHolderType && (
                      <p className="text-sm text-gray-500 mt-1">
                        Showing categories for:{" "}
                        <span
                          className="font-medium"
                          style={{ color: selectedHolderType.color }}
                        >
                          {selectedHolderType.icon} {selectedHolderType.name}
                        </span>
                      </p>
                    )}
                  </CardHeader>
                  <CardBody>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="">Choose a category...</option>
                      {filteredCategories?.map((cat: any) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.icon || "🏷️"} {cat.name} ({cat.catCode}) —{" "}
                          {cat.entryPoints?.length || 0} access points
                        </option>
                      ))}
                    </select>
                  </CardBody>
                </Card>
              )}

              {/* Step 4: Holder Details */}
              {selectedCategory && (
                <>
                  <Card>
                    <CardHeader>
                      <h2 className="font-semibold">Step 4: Holder Details</h2>
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
                      {selectedHolderType?.code === "DN" && (
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

                  {/* Step 4.5: Seva Slot (Sub Category) */}
                  <Card>
                    <CardHeader>
                      <h2 className="font-semibold">
                        Step 4.5: Seva Slot
                        <span className="ml-2 text-sm font-normal text-gray-500">optional — determines seating and bahumana</span>
                      </h2>
                    </CardHeader>
                    <CardBody className="space-y-3">
                      {sevaSlots && sevaSlots.length > 0 ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Select Slot</label>
                          <select
                            value={subCategory}
                            onChange={(e) => setSubCategory(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">— No slot / General —</option>
                            {sevaSlots.map((s: any) => (
                              <option key={s._id} value={s.code}>
                                {s.code} — {s.name}{s.time ? ` · ${s.time}` : ""}
                              </option>
                            ))}
                          </select>
                          {subCategory && (() => {
                            const s = sevaSlots.find((sl: any) => sl.code === subCategory);
                            return s ? (
                              <div className="mt-3 flex items-center gap-3 bg-orange-50 rounded-xl px-4 py-3 border border-orange-100">
                                <span className={`font-mono font-black text-2xl px-3 py-1 rounded-full border ${
                                  s.code === "A" ? "bg-amber-100 text-amber-800 border-amber-300" :
                                  s.code === "B" ? "bg-slate-100 text-slate-700 border-slate-300" :
                                  s.code === "C" ? "bg-orange-100 text-orange-800 border-orange-300" :
                                  "bg-purple-100 text-purple-800 border-purple-300"
                                }`}>{s.code}</span>
                                <div>
                                  <p className="font-semibold text-gray-900">{s.name}</p>
                                  {s.time && <p className="text-sm text-gray-500">🕐 {s.time}</p>}
                                  {s.description && <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>}
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sub Category
                            <span className="ml-1.5 text-xs text-gray-400 font-normal">
                              e.g. A, B, C or SDGP, PA — 
                              <a href={`/events/${selectedEvent}/seva-slots`} target="_blank" rel="noreferrer"
                                className="text-orange-600 hover:underline ml-1">
                                Configure slots for this event →
                              </a>
                            </span>
                          </label>
                          <input
                            type="text"
                            value={subCategory}
                            onChange={(e) => setSubCategory(e.target.value.toUpperCase())}
                            placeholder="e.g. A"
                            maxLength={12}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono font-bold uppercase tracking-widest"
                          />
                        </div>
                      )}

                      {/* Duplicate seva-slot warning */}
                      {duplicateWarning && (
                        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                          <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Seva slot already issued</p>
                          <p className="text-sm text-amber-700 mb-1">
                            <strong>{duplicateWarning.existing?.holderName}</strong> already has an active pass
                            {duplicateWarning.existing?.subCategory ? ` for slot "${duplicateWarning.existing.subCategory}"` : ""} on this number.
                          </p>
                          <p className="text-xs text-amber-600 mb-3">{duplicateWarning.hint}</p>
                          <label className="block text-sm font-medium text-amber-800 mb-1">Reason for issuing additional pass *</label>
                          <input
                            type="text"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="e.g. Lost phone, Replacement, Family member"
                            className="w-full px-3 py-2 border border-amber-400 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 mb-2"
                          />
                          {overrideReason.trim() && (
                            <button
                              type="button"
                              onClick={() => createHolderMutation.mutate()}
                              className="w-full py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                            >
                              Issue Additional Pass Anyway
                            </button>
                          )}
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  {/* Step 5: Delivery Method */}
                  <Card>
                    <CardHeader>
                      <h2 className="font-semibold">Step 5: Delivery Method</h2>
                    </CardHeader>
                    <CardBody>
                      <div className="flex space-x-6">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="whatsapp"
                            checked={deliveryMethod === "whatsapp"}
                            onChange={(e) =>
                              setDeliveryMethod(e.target.value as any)
                            }
                            className="text-orange-600 focus:ring-orange-500"
                          />
                          <span className="ml-2">WhatsApp</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="email"
                            checked={deliveryMethod === "email"}
                            onChange={(e) =>
                              setDeliveryMethod(e.target.value as any)
                            }
                            className="text-orange-600 focus:ring-orange-500"
                          />
                          <span className="ml-2">Email</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="both"
                            checked={deliveryMethod === "both"}
                            onChange={(e) =>
                              setDeliveryMethod(e.target.value as any)
                            }
                            className="text-orange-600 focus:ring-orange-500"
                          />
                          <span className="ml-2">Both</span>
                        </label>
                      </div>
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
            setSelectedCategory("");
            setSelectedVenue("");
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
