"use client";

import React, { useId } from "react";

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  ariaLabel?: string;
  ariaLabelledBy?: string;
  style?: React.CSSProperties;
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  disabled = false,
  orientation = "horizontal",
  ariaLabel,
  ariaLabelledBy,
  style,
}: RadioGroupProps) {
  const groupId = useId();

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (disabled) return;
    let nextIndex = currentIndex;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % options.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    }

    if (nextIndex !== currentIndex && !options[nextIndex].disabled) {
      onChange(options[nextIndex].value);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-orientation={orientation}
      style={{
        display: "flex",
        flexDirection: orientation === "vertical" ? "column" : "row",
        flexWrap: "wrap",
        gap: orientation === "vertical" ? "var(--space-3)" : "var(--space-6)",
        alignItems: "center",
        ...style,
      }}
    >
      {options.map((opt, idx) => {
        const optionId = `${groupId}-${opt.value}`;
        const isChecked = value === opt.value;
        const isDisabled = disabled || opt.disabled;

        return (
          <label
            key={opt.value}
            htmlFor={optionId}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              cursor: isDisabled ? "not-allowed" : "pointer",
              opacity: isDisabled ? 0.5 : 1,
              userSelect: "none",
              padding: "var(--space-1) 0",
              backgroundColor: "transparent",
            }}
          >
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <input
                type="radio"
                id={optionId}
                name={name}
                value={opt.value}
                checked={isChecked}
                disabled={isDisabled}
                onChange={() => !isDisabled && onChange(opt.value)}
                style={{
                  appearance: "none",
                  WebkitAppearance: "none",
                  width: "18px",
                  height: "18px",
                  border: `2px solid ${
                    isDisabled
                      ? "var(--border-default)"
                      : isChecked
                      ? "var(--action-primary)"
                      : "var(--border-default)"
                  }`,
                  borderRadius: "50%",
                  backgroundColor: isDisabled ? "var(--disabled-bg)" : "var(--bg-surface)",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  outline: "none",
                  transition: "all 0.15s ease-in-out",
                  margin: 0,
                }}
              />
              {isChecked && (
                <div
                  style={{
                    position: "absolute",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: isDisabled ? "var(--disabled-text)" : "var(--action-primary)",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-primary)",
                  fontWeight: isChecked ? "var(--font-weight-semibold)" : "var(--font-weight-regular)",
                  lineHeight: 1.4,
                }}
              >
                {opt.label}
              </span>
              {opt.description && (
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {opt.description}
                </span>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
