"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";

export function useHolders(eventId: string, params?: any) {
  return useQuery({
    queryKey: ["holders", eventId, params],
    queryFn: async () => {
      const response = await api.get(`/events/${eventId}/holders`, { params });
      return response.data;
    },
    enabled: !!eventId,
  });
}

export function useHolder(id: string) {
  return useQuery({
    queryKey: ["holder", id],
    queryFn: async () => {
      const response = await api.get(`/holders/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateHolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, data }: { eventId: string; data: any }) => {
      const response = await api.post(`/events/${eventId}/holders`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["holders", variables.eventId],
      });
      toast.success("QR Pass generated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create holder");
    },
  });
}

export function useBulkImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      formData,
    }: {
      eventId: string;
      formData: FormData;
    }) => {
      const response = await api.post(
        `/events/${eventId}/holders/bulk`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["holders", variables.eventId],
      });
      toast.success("Bulk import completed");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Bulk import failed");
    },
  });
}

export function useRevokeQR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (qrId: string) => {
      const response = await api.patch(`/qr/${qrId}/revoke`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holders"] });
      toast.success("QR revoked successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to revoke QR");
    },
  });
}

export function useResendQR() {
  return useMutation({
    mutationFn: async ({
      qrId,
      deliveryMethod,
    }: {
      qrId: string;
      deliveryMethod: string;
    }) => {
      const response = await api.post(`/qr/${qrId}/resend`, { deliveryMethod });
      return response.data;
    },
    onSuccess: () => {
      toast.success("QR resent successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to resend QR");
    },
  });
}
