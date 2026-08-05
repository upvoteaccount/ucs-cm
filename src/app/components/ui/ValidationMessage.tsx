import React from "react";

export interface ValidationMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  id: string;
  children: React.ReactNode;
  politeLiveRegion?: boolean;
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  id,
  children,
  politeLiveRegion = false,
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    fontSize: "var(--font-size-xs)",
    color: "var(--error-main)",
    marginTop: "var(--space-1)",
    fontWeight: "var(--font-weight-medium)",
  };

  return (
    <p
      id={id}
      aria-live={politeLiveRegion ? "polite" : undefined}
      style={{
        ...baseStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </p>
  );
};
