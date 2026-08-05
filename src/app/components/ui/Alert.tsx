import React from "react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "error" | "information";
  title?: string;
  actionSlot?: React.ReactNode;
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  variant = "error",
  title,
  actionSlot,
  children,
  style,
  ...props
}) => {
  const isError = variant === "error";

  const baseStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2)",
    padding: "var(--space-4)",
    borderRadius: "var(--radius-md)",
    border: `1px solid ${isError ? "var(--error-border)" : "var(--info-border)"}`,
    backgroundColor: isError ? "var(--error-surface)" : "var(--info-surface)",
    color: isError ? "var(--error-main)" : "var(--info-main)",
    marginBottom: "var(--space-4)",
    width: "100%",
  };

  return (
    <div
      role={isError ? "alert" : "status"}
      style={{
        ...baseStyle,
        ...style,
      }}
      {...props}
    >
      {title && (
        <strong style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)" }}>
          {title}
        </strong>
      )}
      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>{children}</div>
      {actionSlot && <div style={{ marginTop: "var(--space-2)" }}>{actionSlot}</div>}
    </div>
  );
};
