"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import toast from "react-hot-toast";
import { Calendar, MapPin, DollarSign, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const eventSchema = z.object({
  name: z.string().min(3, "Event name is required"),
  eventCode: z.string().min(2, "Event code is required").max(10),
  description: z.string().optional(),
  dateStart: z.string().min(1, "Start date is required"),
  dateEnd: z.string().min(1, "End date is required"),
  venue: z.object({
    name: z.string().min(1, "Venue name is required"),
    address: z.string().min(1, "Address is required"),
  }),
  donorThreshold: z.number().min(0).default(0).optional(), // Add optional()
});

type EventFormData = z.infer<typeof eventSchema>;

export default function CreateEventPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      donorThreshold: 50000,
    },
  });

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/events`, data);
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
      {/* Header */}
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
                placeholder="Brief description of the event..."
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

        {/* Venue Information */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">
              <MapPin className="w-5 h-5 inline mr-2" />
              Venue Details
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Venue Name"
              {...register("venue.name")}
              error={errors.venue?.name?.message}
              placeholder="e.g., ISKCON Temple Main Hall"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Address
              </label>
              <textarea
                {...register("venue.address")}
                rows={2}
                placeholder="Street, City, State, PIN"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              {errors.venue?.address && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.venue.address.message}
                </p>
              )}
            </div>
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

        {/* Actions */}
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
