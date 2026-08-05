import React from "react";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  label = "Loading",
  className = "",
  "aria-hidden": ariaHidden,
  ...props
}) => {
  const sizeMap = {
    sm: "14px",
    md: "18px",
    lg: "24px",
  };

  const isStandalone = ariaHidden !== true && ariaHidden !== "true";

  return (
    <span
      role={isStandalone ? "status" : undefined}
      aria-label={isStandalone ? label : undefined}
      aria-hidden={ariaHidden}
      style={{
        display: "inline-block",
        width: sizeMap[size],
        height: sizeMap[size],
        border: "2px solid currentColor",
        borderRightColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
        verticalAlign: "middle",
      }}
      className={className}
      {...props}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  );
};
