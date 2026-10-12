"use client";

import React, { useState, useRef, useEffect, useId } from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  isInvalid?: boolean;
  style?: React.CSSProperties;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  disabled = false,
  id,
  name,
  required,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  isInvalid = false,
  style,
}, ref) => {
  const generatedId = useId();
  const selectId = id || `select-${generatedId}`;
  const listboxId = `listbox-${selectId}`;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Combine forwarded ref and internal trigger ref
  React.useImperativeHandle(ref, () => triggerRef.current as HTMLButtonElement);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close listbox on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        const currentIdx = options.findIndex((opt) => opt.value === value);
        setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
        return;
      }

      const step = e.key === "ArrowDown" ? 1 : -1;
      let nextIdx = highlightedIndex + step;
      if (nextIdx < 0) nextIdx = options.length - 1;
      if (nextIdx >= options.length) nextIdx = 0;

      while (options[nextIdx]?.disabled && nextIdx !== highlightedIndex) {
        nextIdx += step;
        if (nextIdx < 0) nextIdx = options.length - 1;
        if (nextIdx >= options.length) nextIdx = 0;
      }

      setHighlightedIndex(nextIdx);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        const currentIdx = options.findIndex((opt) => opt.value === value);
        setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
      } else if (highlightedIndex >= 0 && options[highlightedIndex] && !options[highlightedIndex].disabled) {
        onChange(options[highlightedIndex].value);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    } else if (e.key === "Tab") {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  };

  const handleSelectOption = (optValue: string, isDisabled?: boolean) => {
    if (isDisabled) return;
    onChange(optValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        ...style,
      }}
    >
      {/* Hidden native select for form submission fallback */}
      {name && (
        <select
          name={name}
          value={value}
          required={required}
          onChange={() => {}}
          tabIndex={-1}
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            border: 0,
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* Select Trigger Button */}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              const currentIdx = options.findIndex((opt) => opt.value === value);
              setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
            }
          }
        }}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          height: "var(--control-height-md)",
          padding: "0 var(--space-3)",
          fontSize: "var(--font-size-sm)",
          fontFamily: "inherit",
          borderRadius: "var(--radius-md)",
          border: isInvalid ? "1px solid var(--error-border)" : "1px solid var(--border-default)",
          backgroundColor: disabled ? "var(--disabled-bg)" : "var(--bg-surface)",
          color: disabled
            ? "var(--disabled-text)"
            : selectedOption
            ? "var(--text-primary)"
            : "var(--text-muted)",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "left",
          gap: "var(--space-2)",
          transition: "border-color var(--transition-speed)",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span
          aria-hidden="true"
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--text-secondary)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
            marginLeft: "var(--space-2)",
          }}
        >
          ▾
        </span>
      </button>

      {/* Listbox Dropdown Options Menu */}
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={selectId}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1050,
            maxHeight: "220px",
            overflowY: "auto",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-subtle)",
            padding: "4px 0",
            margin: 0,
            listStyle: "none",
          }}
        >
          {options.length === 0 ? (
            <li
              style={{
                padding: "var(--space-2) var(--space-3)",
                fontSize: "var(--font-size-sm)",
                color: "var(--text-muted)",
              }}
            >
              No options available
            </li>
          ) : (
            options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled}
                  onClick={() => handleSelectOption(opt.value, opt.disabled)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    fontSize: "var(--font-size-sm)",
                    color: opt.disabled
                      ? "var(--disabled-text)"
                      : isSelected
                      ? "var(--action-primary)"
                      : "var(--text-primary)",
                    backgroundColor: isHighlighted
                      ? "var(--bg-page)"
                      : isSelected
                      ? "var(--action-secondary-bg)"
                      : "transparent",
                    fontWeight: isSelected ? "var(--font-weight-medium)" : "normal",
                    cursor: opt.disabled ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <span aria-hidden="true">✓</span>}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
});

Select.displayName = "Select";
