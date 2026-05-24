"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api"; // FIX: use authenticated instance
import toast from "react-hot-toast";
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
    </div>
  );
}
