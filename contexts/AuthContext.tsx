"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { landingRoute, type Permissions } from "@/lib/permissions";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  // NOTE: /auth/profile used to return these flags at the TOP level while
  // /auth/login nested them here, so `user.permissions` was undefined after
  // every page refresh and permission-gated screens denied legitimate users.
  // The API now returns this same block from both endpoints.
  permissions: Permissions;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Export the context so it can be imported elsewhere
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { setIsLoading(false); return; }
      // FIX: use api instance — was using axios.defaults.common which bleeds globally
      const response = await api.get("/auth/profile");
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem("token");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      setUser(user);
      toast.success("Welcome back! Hare Krishna 🙏");
      // Announcers go to their bahumana view; a restricted issuer who cannot
      // read reports has no dashboard to show, so they land on the issue form.
      router.push(landingRoute(user));
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Login failed");
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    router.push("/login");
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
