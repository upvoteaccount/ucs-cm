"use client";

import React, { useEffect, useRef } from "react";
import { Button } from "./Button";

export interface DialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onConfirm?: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isPending?: boolean;
  error?: string | null;
  hideFooter?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  children?: React.ReactNode;
}

export function Dialog({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  isPending = false,
  error = null,
  hideFooter,
  initialFocusRef,
  children,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  // Focus management: initial focus on open, restore focus on close
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      previousActiveElementRef.current = document.activeElement as HTMLElement;

      timer = setTimeout(() => {
        if (!dialogRef.current) return;

        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
          return;
        }

        const firstInput = dialogRef.current.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
        if (firstInput) {
          firstInput.focus();
          return;
        }

        cancelBtnRef.current?.focus();
      }, 30);
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, initialFocusRef]);

  // Trap focus and Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        onCancel();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isPending, onCancel]);

  if (!isOpen) return null;

  const shouldRenderFooter =
    hideFooter === false ||
    (hideFooter === undefined && (onConfirm !== undefined || !children));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby={description ? "dialog-description" : undefined}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "var(--space-4)",
      }}
    >
      <div
        ref={dialogRef}
        style={{
          backgroundColor: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-subtle)",
          width: "100%",
          maxWidth: "520px",
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <h2
          id="dialog-title"
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {title}
        </h2>

        {description && (
          <p
            id="dialog-description"
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--text-secondary)",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            {description}
          </p>
        )}

        {children}

        {error && (
          <div
            role="alert"
            style={{
              padding: "var(--space-3)",
              backgroundColor: "var(--error-surface)",
              border: "1px solid var(--error-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--error-main)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {error}
          </div>
        )}

        {shouldRenderFooter && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "var(--space-3)",
              marginTop: "var(--space-2)",
            }}
          >
            <Button
              ref={cancelBtnRef}
              variant="secondary"
              onClick={onCancel}
              disabled={isPending}
            >
              {cancelLabel}
            </Button>

            {onConfirm && (
              <Button
                variant={isDestructive ? "secondary" : "primary"}
                onClick={onConfirm}
                disabled={isPending}
                aria-busy={isPending}
                style={
                  isDestructive
                    ? {
                        backgroundColor: "var(--error-main)",
                        color: "#ffffff",
                        borderColor: "var(--error-main)",
                      }
                    : undefined
                }
              >
                {isPending ? "Processing..." : confirmLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
