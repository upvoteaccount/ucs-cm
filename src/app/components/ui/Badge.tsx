import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "primary" | "info";
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  children,
  style,
  ...props
}) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    neutral: {
      backgroundColor: "var(--action-secondary-bg)",
      color: "var(--text-secondary)",
      border: "1px solid var(--border-default)",
    },
    primary: {
      backgroundColor: "var(--action-primary)",
      color: "var(--action-primary-text)",
      border: "1px solid transparent",
    },
    info: {
      backgroundColor: "var(--info-surface)",
      color: "var(--info-main)",
      border: "1px solid var(--info-border)",
    },
  };

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px var(--space-2)",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--font-size-xs)",
    fontWeight: "var(--font-weight-medium)",
    whiteSpace: "nowrap",
    ...variantStyles[variant],
    ...style,
  };

  return (
    <span style={baseStyle} {...props}>
      {children}
    </span>
  );
};
