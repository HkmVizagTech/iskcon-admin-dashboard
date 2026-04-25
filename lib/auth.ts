import api from "./api";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
}

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  async register(data: RegisterData) {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  async getProfile() {
    const response = await api.get("/auth/profile");
    return response.data;
  },

  async updateProfile(data: any) {
    const response = await api.put("/auth/profile", data);
    return response.data;
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    const response = await api.post("/auth/change-password", data);
    return response.data;
  },

  async forgotPassword(email: string) {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  async resetPassword(token: string, password: string) {
    const response = await api.post("/auth/reset-password", {
      token,
      password,
    });
    return response.data;
  },

  logout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  },
};
