"use client";

import { istLocalToISO } from "@/lib/dateUtils";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api"; // FIX: use authenticated instance
import toast from "react-hot-toast";
import { Calendar, MapPin, DollarSign, Plus, X, Users } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import VccFields, { emptyVccForm, toVccPayload, validateVcc, type VccFormState } from "@/components/events/VccFields";


const eventSchema = z.object({
  name: z.string().min(3, "Event name is required"),
  eventCode: z.string().min(2, "Event code is required").max(10),
  description: z.string().optional(),
  dateStart: z.string().min(1, "Start date is required"),
  dateEnd: z.string().min(1, "End date is required"),
  donorThreshold: z.number().min(0).default(0).optional(),
  bannerImage: z.string().url("Enter a full image URL (https://…)").optional().or(z.literal("")),
});

type EventFormData = z.infer<typeof eventSchema>;

export default function CreateEventPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [venues, setVenues] = useState([{ name: "", address: "" }]);
  const [needsVolunteers, setNeedsVolunteers] = useState(false);
  const [vcc, setVcc] = useState<VccFormState>(emptyVccForm);

  const addVenue = () => setVenues([...venues, { name: "", address: "" }]);
  const removeVenue = (index: number) => {
    if (venues.length > 1) setVenues(venues.filter((_, i) => i !== index));
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: { donorThreshold: 50000 },
  });

  const onSubmit = async (data: EventFormData) => {
    if (needsVolunteers) {
      const problem = validateVcc(vcc);
      if (problem) {
        toast.error(`Volunteers (VCC): ${problem}`);
        return;
      }
    }
    setIsSubmitting(true);
    try {
      // ✅ Preserve the local time as-is with timezone offset
      const payload = {
        ...data,
        bannerImage: data.bannerImage || undefined,
        venue: venues.map((v) => ({ name: v.name, address: v.address })),
        // FIX: append IST offset so server stores the exact time user intended.
        // datetime-local gives "YYYY-MM-DDTHH:mm" with no timezone — sending
        // that bare string to a UTC server shifts the date by +5:30 on every save.
        dateStart: data.dateStart ? istLocalToISO(data.dateStart) : data.dateStart,
        dateEnd: data.dateEnd ? istLocalToISO(data.dateEnd) : data.dateEnd,
        ...(needsVolunteers
          ? { vcc: { enabled: true, ...toVccPayload(vcc) } }
          : {}),
      };

      const response = await api.post(`/events`, payload);
      toast.success("Event created successfully!");
      const vccSync = response.data.vccSync;
      if (vccSync?.status === "synced") {
        toast.success("Also created in VCC for volunteers");
      } else if (vccSync?.status === "failed") {
        toast.error(`Created in QR, but VCC failed: ${vccSync.error}. Retry from Edit Event.`, { duration: 10000 });
      }
      router.push(`/events/${response.data.event._id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <PageHeader backHref="/events" title="Create New Event" subtitle="Set up a new festival or program" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Basic Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Event Name"
                {...register("name")}
                error={errors.name?.message}
                placeholder="e.g., Janmashtami 2025"
              />
              <Input
                label="Event Code"
                {...register("eventCode")}
                error={errors.eventCode?.message}
                placeholder="e.g., JK25"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                  register("eventCode").onChange(e);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...register("description")}
                rows={3}
                placeholder="Brief description..."
                className="w-full px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <Input
              label="Banner Image URL (optional)"
              {...register("bannerImage")}
              error={errors.bannerImage?.message}
              placeholder="https://…/banner.jpg"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Date & Time"
                type="datetime-local"
                {...register("dateStart")}
                error={errors.dateStart?.message}
                icon={<Calendar className="w-4 h-4" />}
              />
              <Input
                label="End Date & Time"
                type="datetime-local"
                {...register("dateEnd")}
                error={errors.dateEnd?.message}
                icon={<Calendar className="w-4 h-4" />}
              />
            </div>
          </CardBody>
        </Card>

        {/* Venue Information - MULTI VENUE */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                <MapPin className="w-5 h-5 inline mr-2" />
                Venue Details
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVenue}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Venue
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {venues.map((venue, index) => (
              <div key={index} className="border rounded-lg p-3 sm:p-4 relative">
                {venues.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVenue(index)}
                    aria-label="Remove venue"
                    className="absolute top-1.5 right-1.5 text-red-500 hover:bg-red-50 p-2 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <p className="text-sm font-medium text-gray-500 mb-3">
                  Venue #{index + 1}
                </p>
                <div className="space-y-3">
                  <Input
                    label="Venue Name"
                    value={venue.name}
                    onChange={(e) => {
                      const updated = [...venues];
                      updated[index].name = e.target.value;
                      setVenues(updated);
                    }}
                    placeholder={
                      index === 0
                        ? "e.g., Main Temple Hall"
                        : `e.g., Community Hall`
                    }
                    required={index === 0}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Address
                    </label>
                    <textarea
                      value={venue.address}
                      onChange={(e) => {
                        const updated = [...venues];
                        updated[index].address = e.target.value;
                        setVenues(updated);
                      }}
                      rows={2}
                      placeholder="Street, City, State, PIN"
                      className="w-full px-4 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Donor Settings */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">
              <DollarSign className="w-5 h-5 inline mr-2" />
              Donor Eligibility
            </h2>
          </CardHeader>
          <CardBody>
            <Input
              label="Minimum Lifetime Donation Threshold (₹)"
              type="number"
              {...register("donorThreshold", { valueAsNumber: true })}
              min={0}
              step={1000}
            />
            <p className="mt-2 text-sm text-gray-500">
              Donors with lifetime donations above this amount automatically
              qualify for Donor category passes
            </p>
          </CardBody>
        </Card>

        {/* Volunteers — VCC */}
        <Card>
          <CardHeader>
            <label className="flex items-start sm:items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={needsVolunteers}
                onChange={(e) => setNeedsVolunteers(e.target.checked)}
                className="w-5 h-5 mt-0.5 sm:mt-0 flex-shrink-0 accent-orange-500"
              />
              <span>
                <span className="text-lg font-semibold">
                  <Users className="w-5 h-5 inline mr-2" />
                  Needs volunteers (create in VCC)
                </span>
                <span className="block text-sm text-gray-500 font-normal">
                  Creates the same event in Volunteer Care Cell with this event code. Name, dates and
                  venue stay in sync when you edit here.
                </span>
              </span>
            </label>
          </CardHeader>
          {needsVolunteers && (
            <CardBody>
              <VccFields
                value={vcc}
                onChange={setVcc}
              />
            </CardBody>
          )}
        </Card>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
            Create Event
          </Button>
        </div>
      </form>
    </div>
  );
}
