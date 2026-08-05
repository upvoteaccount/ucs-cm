import React from "react";
import { ShellUser, ShellOrganisation, PlatformRole } from "./shellTypes";
import { OrganisationContext } from "./OrganisationContext";
import { UserMenu } from "./UserMenu";

export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  user?: ShellUser;
  organisation?: ShellOrganisation;
  roles?: PlatformRole[];
  onSignOut?: () => void;
  navigationSlot?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  organisation,
  roles = [],
  onSignOut,
  navigationSlot,
  style,
  ...props
}) => {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "var(--header-height, 3.5rem)",
        padding: "0 var(--space-6)",
        backgroundColor: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-default)",
        gap: "var(--space-4)",
        ...style,
      }}
      {...props}
    >
      {/* Brand & Active Organisation Area */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--action-primary)",
              color: "var(--action-primary-text)",
              fontWeight: "var(--font-weight-bold)",
              fontSize: "var(--font-size-sm)",
            }}
            aria-hidden="true"
          >
            UCS
          </div>
          <span
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            UCS CM
          </span>
        </div>

        {organisation && <OrganisationContext organisation={organisation} />}
      </div>

      {/* Navigation Slot (Optional) */}
      {navigationSlot && (
        <div style={{ flex: 1, display: "flex", justifyContent: "center", minWidth: 0 }}>
          {navigationSlot}
        </div>
      )}

      {/* User Context & Menu */}
      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexShrink: 0 }}>
          <UserMenu
            user={user}
            organisation={organisation}
            roles={roles}
            onSignOut={onSignOut}
          />
        </div>
      )}
    </header>
  );
};
