"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Users, RefreshCw, CheckCircle2, AlertTriangle, Link2 } from "lucide-react";
import api from "@/lib/api";
import { formatIST } from "@/lib/dateUtils";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import VccFields, { emptyVccForm, toVccPayload, validateVcc, type VccFormState } from "./VccFields";
import { vccEventDayKeys } from "@/lib/vccDays";

// Shows whether this QR event is linked to VCC (Volunteer Care Cell) and lets
// an admin link it, retry a failed sync, or stop syncing.
export default function VccLinkCard({
  eventId,
  eventStartLocal,
  eventEndLocal,
}: {
  eventId: string;
  /** Event start/end as IST datetime-local strings, for the time-slot days. */
  eventStartLocal?: string;
  eventEndLocal?: string;
}) {
  const queryClient = useQueryClient();
  const [vcc, setVcc] = useState<VccFormState>(emptyVccForm);
  const [showLinkForm, setShowLinkForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["event-vcc", eventId],
    queryFn: async () => (await api.get(`/events/${eventId}/vcc`)).data,
    retry: false,
  });

  const sync = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post(`/events/${eventId}/vcc-sync`, body)).data,
    onSuccess: (res) => {
      toast.success(res.vccSync?.enabled === false ? "VCC sync turned off" : "Synced to VCC");
      setShowLinkForm(false);
      queryClient.invalidateQueries({ queryKey: ["event-vcc", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "VCC sync failed");
      queryClient.invalidateQueries({ queryKey: ["event-vcc", eventId] });
    },
  });

  const linked = !!data?.vccSync?.enabled;
  const existsInVcc = data?.existsInVcc === true;
  const failed = data?.vccSync?.status === "failed";

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">
          <Users className="w-5 h-5 inline mr-2" />
          Volunteers (VCC)
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        {isLoading && <p className="text-sm text-gray-500">Checking VCC…</p>}

        {data && !data.enabled && (
          <p className="text-sm text-gray-500">
            VCC link is not configured on the server (VCC_INTEGRATION_KEY).
          </p>
        )}

        {data?.enabled && (
          <>
            <div className="flex items-start gap-3">
              {linked && !failed ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600 mt-0.5" />
              ) : failed ? (
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              ) : (
                <Link2 className="w-5 h-5 flex-shrink-0 text-gray-400 mt-0.5" />
              )}
              <div className="text-sm min-w-0 break-words">
                {linked ? (
                  <p className="font-medium text-gray-900">
                    Linked — name, dates and venue changes here are sent to VCC automatically.
                  </p>
                ) : (
                  <p className="font-medium text-gray-900">Not linked to VCC.</p>
                )}
                {data.vccSync?.syncedAt && (
                  <p className="text-gray-500">
                    Last synced {formatIST(data.vccSync.syncedAt, "dd MMM yyyy, hh:mm a")}
                  </p>
                )}
                {failed && <p className="text-red-600 mt-1">Last sync failed: {data.vccSync.error}</p>}
                {data.existsInVcc !== null && (
                  <p className="text-gray-500">
                    {existsInVcc
                      ? `In VCC as ${data.vccEvent?.eventId} (status: ${data.vccEvent?.status}${
                          data.vccEvent?.coordinatorId?.name ? `, coordinator: ${data.vccEvent.coordinatorId.name}` : ""
                        })`
                      : "This event code does not exist in VCC yet."}
                  </p>
                )}
                {data.remoteError && <p className="text-amber-700">Could not reach VCC: {data.remoteError}</p>}
              </div>
            </div>

            {showLinkForm && !existsInVcc && (
              <VccFields
                value={vcc}
                onChange={setVcc}
                eventStartLocal={eventStartLocal}
                eventEndLocal={eventEndLocal}
              />
            )}

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 [&>*]:w-full sm:[&>*]:w-auto">
              {existsInVcc ? (
                <Button type="button" size="sm" loading={sync.isPending} onClick={() => sync.mutate({})}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  {linked ? "Sync to VCC now" : "Link to existing VCC event"}
                </Button>
              ) : showLinkForm ? (
                <Button
                  type="button"
                  size="sm"
                  loading={sync.isPending}
                  disabled={!vcc.coordinatorId}
                  onClick={() => {
                    const problem = validateVcc(vcc);
                    if (problem) return toast.error(problem);
                    sync.mutate(toVccPayload(vcc, vccEventDayKeys(eventStartLocal, eventEndLocal)));
                  }}
                >
                  Create in VCC
                </Button>
              ) : (
                <Button type="button" size="sm" variant="outline" onClick={() => setShowLinkForm(true)}>
                  <Users className="w-4 h-4 mr-1" /> Add volunteers (create in VCC)
                </Button>
              )}
              {linked && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={sync.isPending}
                  onClick={() => {
                    if (confirm("Stop syncing this event to VCC? The VCC event and its volunteers are kept.")) {
                      sync.mutate({ enabled: false });
                    }
                  }}
                >
                  Stop syncing
                </Button>
              )}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
