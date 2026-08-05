import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isInvalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  isInvalid = false,
  disabled = false,
  readOnly = false,
  style,
  "aria-invalid": ariaInvalidProp,
  ...props
}, ref) => {
  const invalid = isInvalid || ariaInvalidProp === true || ariaInvalidProp === "true";

  const baseStyle: React.CSSProperties = {
    width: "100%",
    height: "var(--control-height-md)",
    padding: "0 var(--space-3)",
    fontSize: "var(--font-size-base)",
    fontFamily: "inherit",
    color: disabled ? "var(--disabled-text)" : "var(--text-primary)",
    backgroundColor: disabled ? "var(--disabled-bg)" : readOnly ? "var(--bg-page)" : "var(--bg-surface)",
    border: `1px solid ${invalid ? "var(--error-main)" : "var(--border-default)"}`,
    borderRadius: "var(--radius-md)",
    outline: "none",
    cursor: disabled ? "not-allowed" : readOnly ? "default" : "text",
    transition: "border-color var(--transition-speed)",
  };

  return (
    <input
      ref={ref}
      disabled={disabled}
      readOnly={readOnly}
      aria-invalid={invalid ? "true" : undefined}
      style={{
        ...baseStyle,
        ...style,
      }}
      {...props}
    />
  );
});

Input.displayName = "Input";
