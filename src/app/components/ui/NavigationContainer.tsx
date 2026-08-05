import React from "react";

export interface NavigationContainerProps extends React.HTMLAttributes<HTMLElement> {
  "aria-label"?: string;
  children?: React.ReactNode;
}

export const NavigationContainer: React.FC<NavigationContainerProps> = ({
  "aria-label": ariaLabel = "Application Area Navigation",
  children,
  style,
  ...props
}) => {
  if (!children) {
    return null;
  }

  return (
    <nav
      aria-label={ariaLabel}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        fontSize: "var(--font-size-sm)",
        fontWeight: "var(--font-weight-medium)",
        ...style,
      }}
      {...props}
    >
      {children}
    </nav>
  );
};
