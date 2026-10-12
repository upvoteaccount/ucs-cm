"use client";

import React, { useId } from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ id, label, description, checked, disabled, onChange, style, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <label
        htmlFor={inputId}
        style={{
          display: "inline-flex",
          alignItems: "flex-start",
          gap: "var(--space-3)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          userSelect: "none",
          padding: "var(--space-1) 0",
          ...style,
        }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center", paddingTop: "1px" }}>
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              width: "20px",
              height: "20px",
              border: `2px solid ${
                disabled
                  ? "var(--border-default)"
                  : checked
                  ? "var(--action-primary)"
                  : "var(--border-default)"
              }`,
              borderRadius: "var(--radius-sm)",
              backgroundColor: disabled
                ? "var(--disabled-bg)"
                : checked
                ? "var(--action-primary)"
                : "var(--bg-surface)",
              cursor: disabled ? "not-allowed" : "pointer",
              outline: "none",
              transition: "all 0.15s ease-in-out",
              margin: 0,
              flexShrink: 0,
            }}
            {...props}
          />
          {checked && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke={disabled ? "var(--disabled-text)" : "var(--action-primary-text)"}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: "absolute",
                top: "3px",
                left: "3px",
                width: "14px",
                height: "14px",
                pointerEvents: "none",
              }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        {label && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--text-primary)",
                fontWeight: "var(--font-weight-medium)",
                lineHeight: 1.4,
              }}
            >
              {label}
            </span>
            {description && (
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-secondary)",
                  marginTop: "2px",
                }}
              >
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
