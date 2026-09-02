"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { User, Lock, Bell, Shield } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { DELIVERY_METHODS, deliveryMethodLabel } from "@/lib/permissions";


export default function SettingsPage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const response = await api.put(`/auth/profile`, profileData);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Update failed");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error("Passwords do not match");
      }
      const response = await api.post(`/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Password change failed");
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold flex items-center">
            <User className="w-5 h-5 mr-2" />
            Profile Information
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            label="Full Name"
            value={profileData.name}
            onChange={(e) =>
              setProfileData({ ...profileData, name: e.target.value })
            }
          />
          <Input label="Email" value={user?.email || ""} disabled />
          <Input
            label="Phone Number"
            value={profileData.phone}
            onChange={(e) =>
              setProfileData({ ...profileData, phone: e.target.value })
            }
          />
          <div className="flex justify-end">
            <Button
              onClick={() => updateProfileMutation.mutate()}
              loading={updateProfileMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold flex items-center">
            <Lock className="w-5 h-5 mr-2" />
            Change Password
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) =>
              setPasswordData({
                ...passwordData,
                currentPassword: e.target.value,
              })
            }
          />
          <Input
            label="New Password"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, newPassword: e.target.value })
            }
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) =>
              setPasswordData({
                ...passwordData,
                confirmPassword: e.target.value,
              })
            }
          />
          <div className="flex justify-end">
            <Button
              onClick={() => changePasswordMutation.mutate()}
              loading={changePasswordMutation.isPending}
            >
              Change Password
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Role Info */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Account Information
          </h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Role</span>
              <span className="font-medium capitalize">
                {user?.role?.replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Can Override Passes</span>
              <span
                className={`font-medium ${user?.permissions?.canOverride ? "text-green-600" : "text-red-600"}`}
              >
                {user?.permissions?.canOverride ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Account Status</span>
              <span className="font-medium text-green-600">Active</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Staff Users — only visible to super_admin and event_admin */}
      {(user?.role === "super_admin" || user?.role === "event_admin") && (
        <StaffUsersSection />
      )}
    </div>
  );
}

function StaffUsersSection() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const BLANK_FORM = {
    name: "", email: "", password: "", role: "announcer",
    // Multi-select. The old form offered a single "assign to event" dropdown,
    // which made event scoping useless for anyone covering two festivals.
    eventIds: [] as string[],
    restrictToAllowedEvents: false,
    canManualEntry: false, canBahumanaView: false,
    allowedHolderTypeCodes: [] as string[], allowedDeliveryMethods: [] as string[],
    canViewAllHolders: true, canViewReports: true, canViewScanFeed: true,
  };
  const [form, setForm] = useState({ ...BLANK_FORM });
  const resetForm = () => setForm({ ...BLANK_FORM });

  const { data: eventsData } = useQuery({
    queryKey: ["events-all"],
    queryFn: async () => (await api.get("/events")).data.events,
  });

  const { data: staffData, isLoading } = useQuery({
    queryKey: ["staff-users"],
    queryFn: async () => (await api.get("/auth/staff")).data.users,
  });

  // Real catCodes configured across all events + the canonical delivery list,
  // so the admin can never allow-list a code that doesn't exist.
  const { data: restrictionOptions } = useQuery({
    queryKey: ["staff-restriction-options"],
    queryFn: async () => (await api.get("/auth/staff/available-restrictions")).data,
  });
  const typeCodes: { catCode: string; name: string }[] = restrictionOptions?.holderTypeCodes || [];
  const deliveryChoices: { value: string; label: string }[] =
    restrictionOptions?.deliveryMethods || DELIVERY_METHODS.map((m) => ({ ...m }));

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post("/auth/staff", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-users"] });
      setShowForm(false);
      resetForm();
      toast.success("Staff user created");
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to create user"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => api.delete(`/auth/staff/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-users"] });
      toast.success("User deleted");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) =>
      api.patch(`/auth/staff/${userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-users"] });
      toast.success("User updated");
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to update"),
  });

  // Toggles one value in a string allow-list without mutating state in place.
  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  // Restrictions only mean anything for roles that can issue passes.
  const ISSUING_ROLES = ["issuer", "campaign_manager", "event_admin"];
  const showRestrictions = ISSUING_ROLES.includes(form.role);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            Staff Users
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
          >
            + Add User
          </button>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {showForm && (
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 space-y-3">
            <p className="text-sm font-semibold text-orange-800">New Staff User</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                placeholder="Full Name"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
              />
              <input
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
              />
              <input
                placeholder="Password"
                type="password"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
              />
              <select
                value={form.role}
                onChange={e => {
                  const role = e.target.value;
                  // An issuer starts locked down — matching the backend's own
                  // default for this role — so a half-filled form can't create
                  // an unexpectedly privileged account.
                  const locked = role === "issuer";
                  setForm({
                    ...form, role,
                    restrictToAllowedEvents: locked,
                    canViewAllHolders: !locked,
                    canViewReports: !locked,
                    canViewScanFeed: !locked,
                  });
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
              >
                <option value="announcer">🎁 Announcer (Bahumana View only)</option>
                <option value="issuer">🎫 Issuer (restricted pass issuing)</option>
                <option value="event_admin">Event Admin</option>
                <option value="campaign_manager">Campaign Manager</option>
                <option value="volunteer">Volunteer</option>
              </select>
              <label className="flex items-center gap-2 sm:col-span-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.canManualEntry}
                  onChange={e => setForm({...form, canManualEntry: e.target.checked})}
                  className="w-4 h-4 rounded text-orange-600"
                />
                <span className="text-sm text-gray-700">
                  🖐 Allow Manual Entry <span className="text-gray-400 text-xs">(mark attendance without QR scan)</span>
                </span>
              </label>
              <label className="flex items-center gap-2 sm:col-span-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.canBahumanaView}
                  onChange={e => setForm({...form, canBahumanaView: e.target.checked})}
                  className="w-4 h-4 rounded text-orange-600"
                />
                <span className="text-sm text-gray-700">
                  🎁 Bahumana View Access <span className="text-gray-400 text-xs">(can see the announcement view)</span>
                </span>
              </label>
            </div>

            <EventAssignment
              events={eventsData || []}
              eventIds={form.eventIds}
              restrict={form.restrictToAllowedEvents}
              onChange={(patch) => setForm({ ...form, ...patch })}
              toggleIn={toggleIn}
            />

            {showRestrictions && (
              <RestrictionEditor
                typeCodes={typeCodes}
                deliveryChoices={deliveryChoices}
                value={form}
                onChange={(patch) => setForm({ ...form, ...patch })}
                toggleIn={toggleIn}
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={() => createMutation.mutate({
                  name: form.name, email: form.email, password: form.password,
                  role: form.role,
                  canManualEntry: form.canManualEntry,
                  canBahumanaView: form.canBahumanaView,
                  allowedEvents: form.eventIds,
                  restrictToAllowedEvents: form.restrictToAllowedEvents,
                  allowedHolderTypeCodes: form.allowedHolderTypeCodes,
                  allowedDeliveryMethods: form.allowedDeliveryMethods,
                  canViewAllHolders: form.canViewAllHolders,
                  canViewReports: form.canViewReports,
                  canViewScanFeed: form.canViewScanFeed,
                })}
                disabled={!form.name || !form.email || !form.password || createMutation.isPending}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create User"}
              </button>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
        ) : staffData?.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No staff users yet.</p>
        ) : (
          <div className="space-y-2">
            {staffData?.map((u: any) => (
              <div key={u._id} className="bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                        {u.role}
                      </span>
                      {u.canManualEntry && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          🖐 Manual Entry
                        </span>
                      )}
                      {u.canBahumanaView && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          🎁 Bahumana View
                        </span>
                      )}
                      {u.allowedEvents?.map((ev: any) => (
                        <span key={ev._id || ev} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {ev.eventCode || ev.name || String(ev)}
                        </span>
                      ))}
                      {/* Only show restriction badges when a limit is actually
                          set — an empty allow-list means "no restriction". */}
                      {u.allowedHolderTypeCodes?.length > 0 && (
                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                          🎫 {u.allowedHolderTypeCodes.join(", ")} only
                        </span>
                      )}
                      {u.allowedDeliveryMethods?.length > 0 && (
                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                          📤 {u.allowedDeliveryMethods.map(deliveryMethodLabel).join(", ")} only
                        </span>
                      )}
                      {u.canViewAllHolders === false && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          own passes only
                        </span>
                      )}
                      {u.canViewReports === false && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          no reports
                        </span>
                      )}
                      {u.canViewScanFeed === false && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          no live scan
                        </span>
                      )}
                      {u.restrictToAllowedEvents && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          🔒 assigned events only
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <select
                      value={u.role}
                      onChange={(e) => updateMutation.mutate({
                        userId: u._id,
                        data: { role: e.target.value }
                      })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-1 focus:ring-orange-400"
                    >
                      <option value="announcer">🎁 Announcer</option>
                      <option value="issuer">🎫 Issuer</option>
                      <option value="event_admin">Event Admin</option>
                      <option value="campaign_manager">Campaign Manager</option>
                      <option value="volunteer">Volunteer</option>
                      <option value="preacher">Preacher</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                    {/* Editing permissions after creation was previously
                        impossible in this UI — only the role could be changed. */}
                    <button
                      onClick={() => setExpandedUserId(expandedUserId === u._id ? null : u._id)}
                      className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-100"
                    >
                      {expandedUserId === u._id ? "Close" : "Permissions"}
                    </button>
                    <button
                      onClick={() => confirm("Delete this user?") && deleteMutation.mutate(u._id)}
                      className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {expandedUserId === u._id && (
                  <ExistingUserPermissions
                    user={u}
                    typeCodes={typeCodes}
                    deliveryChoices={deliveryChoices}
                    events={eventsData || []}
                    onSave={(data) => updateMutation.mutate({ userId: u._id, data })}
                    saving={updateMutation.isPending}
                    toggleIn={toggleIn}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ─── Event assignment + the toggle that makes it binding ────────────────────
// `allowedEvents` has always been stored and shown, but never enforced. The
// checkbox here is what turns it into a real limit, and it is opt-in so that
// switching to this build cannot silently re-scope an existing account that
// happens to have an event assigned.
function EventAssignment({
  events, eventIds, restrict, onChange, toggleIn,
}: {
  events: any[];
  eventIds: string[];
  restrict: boolean;
  onChange: (patch: any) => void;
  toggleIn: (list: string[], v: string) => string[];
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-blue-200 space-y-3">
      <p className="text-sm font-semibold text-gray-800">Events</p>
      <div className="flex flex-wrap gap-2">
        {events.length === 0 && <span className="text-xs text-gray-400">No events yet.</span>}
        {events.map((ev: any) => (
          <label
            key={ev._id}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs ${
              eventIds.includes(ev._id)
                ? "border-blue-400 bg-blue-50 text-blue-800"
                : "border-gray-200 text-gray-600 hover:border-blue-300"
            }`}
          >
            <input
              type="checkbox"
              checked={eventIds.includes(ev._id)}
              onChange={() => onChange({ eventIds: toggleIn(eventIds, ev._id) })}
              className="w-3.5 h-3.5 rounded text-blue-600"
            />
            {ev.eventCode || ev.name}
          </label>
        ))}
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={restrict}
          onChange={(e) => onChange({ restrictToAllowedEvents: e.target.checked })}
          className="w-4 h-4 rounded text-orange-600 mt-0.5"
          disabled={eventIds.length === 0}
        />
        <span className={`text-xs ${eventIds.length === 0 ? "text-gray-400" : "text-gray-700"}`}>
          Show only the ticked events to this account
          <span className="text-gray-400">
            {eventIds.length === 0
              ? " (tick at least one event first)"
              : " — every other event is hidden, and issuing for it is refused"}
          </span>
        </span>
      </label>
    </div>
  );
}

// ─── Shared allow-list + view-access editor ─────────────────────────────────
// An EMPTY allow-list means "no restriction" — the copy says so explicitly,
// because an empty set of checkboxes otherwise reads as "can do nothing".
function RestrictionEditor({
  typeCodes, deliveryChoices, value, onChange, toggleIn,
}: {
  typeCodes: { catCode: string; name: string }[];
  deliveryChoices: { value: string; label: string }[];
  value: {
    allowedHolderTypeCodes: string[]; allowedDeliveryMethods: string[];
    canViewAllHolders: boolean; canViewReports: boolean; canViewScanFeed: boolean;
  };
  onChange: (patch: any) => void;
  toggleIn: (list: string[], v: string) => string[];
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-orange-200 space-y-4">
      <p className="text-sm font-semibold text-gray-800">Pass-issuing restrictions</p>

      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">
          Holder types this account may issue
          <span className="ml-1.5 text-gray-400 font-normal">
            {value.allowedHolderTypeCodes.length === 0
              ? "— none ticked = ALL types allowed"
              : `— limited to ${value.allowedHolderTypeCodes.join(", ")}`}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {typeCodes.length === 0 && (
            <span className="text-xs text-gray-400">No holder types configured yet.</span>
          )}
          {typeCodes.map((t) => (
            <label
              key={t.catCode}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs ${
                value.allowedHolderTypeCodes.includes(t.catCode)
                  ? "border-orange-400 bg-orange-50 text-orange-800"
                  : "border-gray-200 text-gray-600 hover:border-orange-300"
              }`}
            >
              <input
                type="checkbox"
                checked={value.allowedHolderTypeCodes.includes(t.catCode)}
                onChange={() => onChange({
                  allowedHolderTypeCodes: toggleIn(value.allowedHolderTypeCodes, t.catCode),
                })}
                className="w-3.5 h-3.5 rounded text-orange-600"
              />
              <span className="font-medium">{t.catCode}</span>
              <span className="text-gray-400">{t.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">
          Delivery methods this account may use
          <span className="ml-1.5 text-gray-400 font-normal">
            {value.allowedDeliveryMethods.length === 0
              ? "— none ticked = ALL methods allowed"
              : `— limited to ${value.allowedDeliveryMethods.length}`}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {deliveryChoices.map((m) => (
            <label
              key={m.value}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs ${
                value.allowedDeliveryMethods.includes(m.value)
                  ? "border-orange-400 bg-orange-50 text-orange-800"
                  : "border-gray-200 text-gray-600 hover:border-orange-300"
              }`}
            >
              <input
                type="checkbox"
                checked={value.allowedDeliveryMethods.includes(m.value)}
                onChange={() => onChange({
                  allowedDeliveryMethods: toggleIn(value.allowedDeliveryMethods, m.value),
                })}
                className="w-3.5 h-3.5 rounded text-orange-600"
              />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        <p className="text-xs font-medium text-gray-700">Visibility</p>
        {([
          ["canViewAllHolders", "Can see passes issued by other people", "Off = sees only the passes this account issued"],
          ["canViewReports", "Can open Reports & Dashboard", "Off = no event-wide totals"],
          ["canViewScanFeed", "Can open Live Scan", "Off = cannot watch gate activity"],
        ] as const).map(([key, label, hint]) => (
          <label key={key} className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={(value as any)[key]}
              onChange={(e) => onChange({ [key]: e.target.checked })}
              className="w-4 h-4 rounded text-orange-600 mt-0.5"
            />
            <span className="text-xs text-gray-700">
              {label} <span className="text-gray-400">({hint})</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Per-user permission editor for an EXISTING account ─────────────────────
function ExistingUserPermissions({
  user, typeCodes, deliveryChoices, events, onSave, saving, toggleIn,
}: {
  user: any;
  typeCodes: { catCode: string; name: string }[];
  deliveryChoices: { value: string; label: string }[];
  events: any[];
  onSave: (data: any) => void;
  saving: boolean;
  toggleIn: (list: string[], v: string) => string[];
}) {
  const [draft, setDraft] = useState({
    allowedHolderTypeCodes: (user.allowedHolderTypeCodes || []).map((c: string) => String(c).toUpperCase()),
    allowedDeliveryMethods: user.allowedDeliveryMethods || [],
    canViewAllHolders: user.canViewAllHolders !== false,
    canViewReports: user.canViewReports !== false,
    canViewScanFeed: user.canViewScanFeed !== false,
    canManualEntry: !!user.canManualEntry,
    canBahumanaView: !!user.canBahumanaView,
    isActive: user.isActive !== false,
    eventIds: (user.allowedEvents || [])
      .map((e: any) => String(e?._id || e || ""))
      .filter(Boolean) as string[],
    restrictToAllowedEvents: user.restrictToAllowedEvents === true,
  });

  return (
    <div className="px-3 pb-3 space-y-3">
      <EventAssignment
        events={events}
        eventIds={draft.eventIds}
        restrict={draft.restrictToAllowedEvents}
        onChange={(patch) => setDraft({ ...draft, ...patch })}
        toggleIn={toggleIn}
      />

      <RestrictionEditor
        typeCodes={typeCodes}
        deliveryChoices={deliveryChoices}
        value={draft}
        onChange={(patch) => setDraft({ ...draft, ...patch })}
        toggleIn={toggleIn}
      />

      <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-2">
        <p className="text-xs font-medium text-gray-700">Other permissions</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={draft.canManualEntry}
            onChange={(e) => setDraft({ ...draft, canManualEntry: e.target.checked })}
            className="w-4 h-4 rounded text-orange-600" />
          <span className="text-xs text-gray-700">🖐 Allow Manual Entry</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={draft.canBahumanaView}
            onChange={(e) => setDraft({ ...draft, canBahumanaView: e.target.checked })}
            className="w-4 h-4 rounded text-orange-600" />
          <span className="text-xs text-gray-700">🎁 Bahumana View Access</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={draft.isActive}
            onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
            className="w-4 h-4 rounded text-orange-600" />
          <span className="text-xs text-gray-700">
            Account active <span className="text-gray-400">(off = cannot log in)</span>
          </span>
        </label>

      </div>

      <button
        onClick={() => onSave({
          allowedHolderTypeCodes: draft.allowedHolderTypeCodes,
          allowedDeliveryMethods: draft.allowedDeliveryMethods,
          canViewAllHolders: draft.canViewAllHolders,
          canViewReports: draft.canViewReports,
          canViewScanFeed: draft.canViewScanFeed,
          canManualEntry: draft.canManualEntry,
          canBahumanaView: draft.canBahumanaView,
          isActive: draft.isActive,
          allowedEvents: draft.eventIds,
          restrictToAllowedEvents: draft.restrictToAllowedEvents,
        })}
        disabled={saving}
        className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save permissions"}
      </button>
    </div>
  );
}
