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
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    top: "-9999px",
    left: "-9999px",
    zIndex: 9999,
    padding: "var(--space-2) var(--space-4)",
    backgroundColor: "var(--action-primary)",
    color: "var(--action-primary-text)",
    fontWeight: "var(--font-weight-semibold)",
    fontSize: "var(--font-size-sm)",
    borderRadius: "var(--radius-sm)",
    textDecoration: "none",
    boxShadow: "var(--shadow-subtle)",
    ...style,
  };

  return (
    <>
      <style>{`
        .ucs-skip-link:focus,
        .ucs-skip-link:focus-visible {
          top: var(--space-2) !important;
          left: var(--space-2) !important;
        }
      `}</style>
      <a href={`#${targetId}`} className="ucs-skip-link" style={baseStyle} {...props}>
        {children}
      </a>
    </>
  );
};
