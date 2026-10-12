"use client";

import { useEffect } from "react";

export interface ToastProps {
  message: string;
  variant?: "success" | "error" | "info";
  isOpen: boolean;
  onClose: () => void;
  durationMs?: number;
}

export function Toast({
  message,
  variant = "success",
  isOpen,
  onClose,
  durationMs = 3000,
}: ToastProps) {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [isOpen, durationMs, onClose]);

  if (!isOpen || !message) return null;

  const bgColors = {
    success: "#f0fdf4",
    error: "#fef2f2",
    info: "#eff6ff",
  };

  const textColors = {
    success: "#166534",
    error: "#991b1b",
    info: "#1e40af",
  };

  const borderColors = {
    success: "#bbf7d0",
    error: "#fecaca",
    info: "#bfdbfe",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "var(--space-6)",
        right: "var(--space-6)",
        zIndex: 9999,
        backgroundColor: bgColors[variant],
        color: textColors[variant],
        border: `1px solid ${borderColors[variant]}`,
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3) var(--space-4)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        fontSize: "var(--font-size-sm)",
        fontWeight: "var(--font-weight-medium)",
        maxWidth: "400px",
        animation: "slideIn 0.2s ease-out",
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        style={{
          background: "none",
          border: "none",
          color: textColors[variant],
          fontSize: "var(--font-size-md)",
          lineHeight: 1,
          cursor: "pointer",
          padding: 0,
          opacity: 0.7,
        }}
      >
        &times;
      </button>
    </div>
  );
}
