import React from "react";
import { Label } from "./Label";
import { HelperText } from "./HelperText";
import { ValidationMessage } from "./ValidationMessage";

export interface FormFieldProps {
  id: string;
  label: string;
  isRequired?: boolean;
  helperText?: string;
  errorMessage?: string;
  children: (fieldProps: {
    id: string;
    "aria-describedby"?: string;
    isInvalid?: boolean;
  }) => React.ReactNode;
  style?: React.CSSProperties;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  isRequired = false,
  helperText,
  errorMessage,
  children,
  style,
}) => {
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = errorMessage ? `${id}-error` : undefined;

  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  const wrapperStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    marginBottom: "var(--space-4)",
    width: "100%",
    ...style,
  };

  return (
    <div style={wrapperStyle}>
      <Label htmlFor={id} isRequired={isRequired}>
        {label}
      </Label>
      {children({
        id,
        "aria-describedby": describedBy,
        isInvalid: Boolean(errorMessage),
      })}
      {helperText && <HelperText id={helperId!}>{helperText}</HelperText>}
      {errorMessage && <ValidationMessage id={errorId!}>{errorMessage}</ValidationMessage>}
    </div>
  );
};
