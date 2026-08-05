import React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  children: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({
  "aria-label": ariaLabel,
  children,
  type = "button",
  disabled = false,
  style,
  ...props
}, ref) => {
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "var(--control-height-md)",
    height: "var(--control-height-md)",
    padding: 0,
    border: "none",
    background: "transparent",
    color: disabled ? "var(--disabled-text)" : "var(--text-secondary)",
    cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: "var(--radius-sm)",
  };

  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      style={{
        ...baseStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
});

IconButton.displayName = "IconButton";
