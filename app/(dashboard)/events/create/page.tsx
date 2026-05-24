"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api"; // FIX: use authenticated instance
import toast from "react-hot-toast";
import { Calendar, MapPin, DollarSign, ArrowLeft, Plus, X } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Link from "next/link";


const eventSchema = z.object({
  name: z.string().min(3, "Event name is required"),
  eventCode: z.string().min(2, "Event code is required").max(10),
  description: z.string().optional(),
  dateStart: z.string().min(1, "Start date is required"),
  dateEnd: z.string().min(1, "End date is required"),
  donorThreshold: z.number().min(0).default(0).optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

export default function CreateEventPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [venues, setVenues] = useState([{ name: "", address: "" }]);

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
    setIsSubmitting(true);
    try {
      // ✅ Preserve the local time as-is with timezone offset
      const payload = {
        ...data,
        venue: venues.map((v) => ({ name: v.name, address: v.address })),
        // FIX: append IST offset so server stores the exact time user intended.
        // datetime-local gives "YYYY-MM-DDTHH:mm" with no timezone — sending
        // that bare string to a UTC server shifts the date by +5:30 on every save.
        dateStart: data.dateStart ? `${data.dateStart}:00+05:30` : data.dateStart,
        dateEnd: data.dateEnd ? `${data.dateEnd}:00+05:30` : data.dateEnd,
      };

      const response = await api.post(`/events`, payload);
      toast.success("Event created successfully!");
      router.push(`/events/${response.data.event._id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/events" className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Event</h1>
          <p className="text-gray-600 mt-1">Set up a new festival or program</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
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
            <div className="flex items-center justify-between">
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
              <div key={index} className="border rounded-lg p-4 relative">
                {venues.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVenue(index)}
                    className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1 rounded"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
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

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Create Event
          </Button>
        </div>
      </form>
    </div>
  );
}
