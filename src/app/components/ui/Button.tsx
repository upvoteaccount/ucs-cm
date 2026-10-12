import React from "react";
import { Spinner } from "./Spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  isPending?: boolean;
  pendingText?: string;
  isFullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = "primary",
  isPending = false,
  pendingText,
  disabled = false,
  type = "button",
  isFullWidth = false,
  style,
  ...props
}, ref) => {
  const isDisabled = disabled || isPending;

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-2)",
    height: "var(--control-height-md)",
    padding: "0 var(--space-4)",
    fontSize: "var(--font-size-sm)",
    fontWeight: "var(--font-weight-medium)",
    borderRadius: "var(--radius-md)",
    border: "1px solid transparent",
    cursor: isDisabled ? "not-allowed" : "pointer",
    transition: "background-color var(--transition-speed), border-color var(--transition-speed)",
    width: isFullWidth ? "100%" : undefined,
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: isDisabled ? "var(--disabled-bg)" : "var(--action-primary)",
      color: isDisabled ? "var(--disabled-text)" : "var(--action-primary-text)",
    },
    secondary: {
      backgroundColor: isDisabled ? "var(--disabled-bg)" : "var(--action-secondary-bg)",
      color: isDisabled ? "var(--disabled-text)" : "var(--action-secondary-text)",
      borderColor: "var(--border-default)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: isDisabled ? "var(--disabled-text)" : "var(--text-primary)",
    },
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {isPending && <Spinner size="sm" aria-hidden="true" />}
      <span>{isPending && pendingText ? pendingText : children}</span>
    </button>
  );
});

Button.displayName = "Button";
