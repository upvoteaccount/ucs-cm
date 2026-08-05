import React from "react";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export const Divider: React.FC<DividerProps> = ({
  orientation = "horizontal",
  style,
  ...props
}) => {
  const isHorizontal = orientation === "horizontal";

  const baseStyle: React.CSSProperties = {
    backgroundColor: "var(--border-default)",
    ...(isHorizontal
      ? { width: "100%", height: "1px", margin: "var(--space-2) 0" }
      : { width: "1px", height: "1.25rem", margin: "0 var(--space-2)", display: "inline-block", verticalAlign: "middle" }),
    ...style,
  };

  return <div role="separator" aria-orientation={orientation} style={baseStyle} {...props} />;
};
