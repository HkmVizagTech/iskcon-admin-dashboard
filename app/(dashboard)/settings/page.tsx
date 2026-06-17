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
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "announcer", eventId: "" });

  const { data: eventsData } = useQuery({
    queryKey: ["events-all"],
    queryFn: async () => (await api.get("/events")).data.events,
  });

  const { data: staffData, isLoading } = useQuery({
    queryKey: ["staff-users"],
    queryFn: async () => (await api.get("/auth/staff")).data.users,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post("/auth/staff", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-users"] });
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "announcer", eventId: "" });
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
                onChange={e => setForm({...form, role: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
              >
                <option value="announcer">🎁 Announcer (Bahumana View only)</option>
                <option value="event_admin">Event Admin</option>
                <option value="campaign_manager">Campaign Manager</option>
                <option value="volunteer">Volunteer</option>
              </select>
              <select
                value={form.eventId}
                onChange={e => setForm({...form, eventId: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 sm:col-span-2"
              >
                <option value="">— Assign to event (optional) —</option>
                {eventsData?.map((ev: any) => (
                  <option key={ev._id} value={ev._id}>{ev.name} ({ev.eventCode})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => createMutation.mutate({
                  name: form.name, email: form.email, password: form.password,
                  role: form.role,
                  allowedEvents: form.eventId ? [form.eventId] : [],
                })}
                disabled={!form.name || !form.email || !form.password || createMutation.isPending}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create User"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
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
              <div key={u._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-sm text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                  <div className="flex gap-1.5 mt-1">
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                      {u.role}
                    </span>
                    {u.allowedEvents?.map((ev: any) => (
                      <span key={ev._id} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {ev.eventCode || ev.name}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => confirm("Delete this user?") && deleteMutation.mutate(u._id)}
                  className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
