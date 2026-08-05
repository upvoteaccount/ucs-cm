import React from "react";

export interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  targetId?: string;
  children?: React.ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId = "main-content",
  children = "Skip to main content",
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const baseStyle: React.CSSProperties = {
    position: isFocused ? "fixed" : "absolute",
    top: isFocused ? "var(--space-2)" : "-9999px",
    left: isFocused ? "var(--space-2)" : "-9999px",
    zIndex: 9999,
    padding: "var(--space-2) var(--space-4)",
    backgroundColor: "var(--action-primary)",
    color: "var(--action-primary-text)",
    fontWeight: "var(--font-weight-semibold)",
    fontSize: "var(--font-size-sm)",
    borderRadius: "var(--radius-sm)",
    textDecoration: "none",
    boxShadow: "var(--shadow-subtle)",
  };

  return (
    <a
      href={`#${targetId}`}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        ...baseStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </a>
  );
};
