import React from "react";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export function Skeleton({
  width = "100%",
  height = "1.25rem",
  borderRadius = "var(--radius-md)",
  className = "",
  style = {},
  label = "Loading content...",
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={className}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius,
        backgroundColor: "var(--disabled-bg)",
        opacity: 0.7,
        animation: "pulse 1.5s ease-in-out infinite",
        ...style,
      }}
    >
      <span style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}>
        {label}
      </span>
    </div>
  );
}
