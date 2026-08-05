import React from "react";

export interface HelperTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  id: string;
  children: React.ReactNode;
}

export const HelperText: React.FC<HelperTextProps> = ({
  id,
  children,
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    fontSize: "var(--font-size-xs)",
    color: "var(--text-secondary)",
    marginTop: "var(--space-1)",
  };

  return (
    <p
      id={id}
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
