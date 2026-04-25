"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export default function Toast() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#fff",
          color: "#333",
          border: "1px solid #f97316",
          borderRadius: "8px",
          padding: "12px 16px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        },
        success: {
          iconTheme: {
            primary: "#f97316",
            secondary: "#fff",
          },
          style: {
            border: "1px solid #22c55e",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
          style: {
            border: "1px solid #ef4444",
          },
        },
      }}
    />
  );
}
