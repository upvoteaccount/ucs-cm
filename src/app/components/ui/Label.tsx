import React from "react";
import { VisuallyHidden } from "./VisuallyHidden";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  isRequired?: boolean;
}

export const Label: React.FC<LabelProps> = ({
  children,
  htmlFor,
  isRequired = false,
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: "inline-block",
    fontSize: "var(--font-size-sm)",
    fontWeight: "var(--font-weight-medium)",
    color: "var(--text-primary)",
    marginBottom: "var(--space-1)",
  };

  return (
    <label
      htmlFor={htmlFor}
      style={{
        ...baseStyle,
        ...style,
      }}
      {...props}
    >
      {children}
      {isRequired && (
        <>
          <span
            aria-hidden="true"
            style={{ color: "var(--error-main)", marginLeft: "var(--space-1)" }}
          >
            *
          </span>
          <VisuallyHidden> (required)</VisuallyHidden>
        </>
      )}
    </label>
  );
};
