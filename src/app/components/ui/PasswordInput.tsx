import React, { useState } from "react";
import { Input, InputProps } from "./Input";
import { IconButton } from "./IconButton";

export interface PasswordInputProps extends Omit<InputProps, "type"> {}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(({
  disabled = false,
  style,
  ...props
}, ref) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    setIsVisible((prev) => !prev);
  };

  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
  };

  const toggleStyle: React.CSSProperties = {
    position: "absolute",
    right: "var(--space-1)",
    top: "50%",
    transform: "translateY(-50%)",
  };

  return (
    <div style={wrapperStyle}>
      <Input
        ref={ref}
        type={isVisible ? "text" : "password"}
        disabled={disabled}
        style={{
          paddingRight: "var(--space-8)",
          ...style,
        }}
        {...props}
      />
      <IconButton
        type="button"
        disabled={disabled}
        aria-label={isVisible ? "Hide password" : "Show password"}
        onClick={toggleVisibility}
        style={toggleStyle}
      >
        {isVisible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </IconButton>
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";
