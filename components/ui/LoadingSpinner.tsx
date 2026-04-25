"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "orange" | "white" | "gray";
  className?: string;
}

export default function LoadingSpinner({
  size = "md",
  color = "orange",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  const colorClasses = {
    orange: "border-orange-500 border-t-transparent",
    white: "border-white border-t-transparent",
    gray: "border-gray-300 border-t-gray-600",
  };

  return (
    <div
      className={cn(
        "rounded-full animate-spin",
        sizeClasses[size],
        colorClasses[color],
        className,
      )}
    />
  );
}
