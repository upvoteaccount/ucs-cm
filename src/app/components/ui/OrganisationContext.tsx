import React from "react";
import { ShellOrganisation } from "./shellTypes";

export interface OrganisationContextProps extends React.HTMLAttributes<HTMLDivElement> {
  organisation: ShellOrganisation;
}

export const OrganisationContext: React.FC<OrganisationContextProps> = ({
  organisation,
  style,
  ...props
}) => {
  return (
    <div
      title={organisation.name}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        fontSize: "var(--font-size-sm)",
        fontWeight: "var(--font-weight-medium)",
        color: "var(--text-secondary)",
        padding: "var(--space-1) var(--space-2)",
        backgroundColor: "var(--action-secondary-bg)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border-default)",
        maxWidth: "240px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...props}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path d="M3 21h18M3 7v14M21 7v14M6 10h4M6 14h4M6 18h4M14 10h4M14 14h4M14 18h4M9 3h6v4H9z" />
      </svg>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {organisation.name}
      </span>
    </div>
  );
};
