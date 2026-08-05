import React from "react";
import { PlatformRole } from "./shellTypes";
import { Badge } from "./Badge";

export interface RoleContextProps extends React.HTMLAttributes<HTMLDivElement> {
  roles: PlatformRole[];
}

export const ROLE_LABELS: Record<PlatformRole, string> = {
  PLATFORM_ADMIN: "Platform Administrator",
  SOLUTION_DESIGNER: "Solution Designer",
  RUNTIME_USER: "Runtime User",
};

export const RoleContext: React.FC<RoleContextProps> = ({
  roles,
  style,
  ...props
}) => {
  if (!roles || roles.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-1)",
        alignItems: "center",
        ...style,
      }}
      {...props}
    >
      {roles.map((role) => {
        const label = ROLE_LABELS[role] || role;
        const variant = role === "PLATFORM_ADMIN" ? "primary" : role === "SOLUTION_DESIGNER" ? "info" : "neutral";
        return (
          <Badge key={role} variant={variant}>
            {label}
          </Badge>
        );
      })}
    </div>
  );
};
