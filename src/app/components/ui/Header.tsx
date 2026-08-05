import React from "react";
import { ShellUser, ShellOrganisation, PlatformRole } from "./shellTypes";
import { UserMenu } from "./UserMenu";

export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  user?: ShellUser;
  organisation?: ShellOrganisation;
  roles?: PlatformRole[];
  onSignOut?: () => void;
  isSignOutPending?: boolean;
  signOutPendingText?: string;
  navigationSlot?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  organisation,
  roles = [],
  onSignOut,
  isSignOutPending,
  signOutPendingText,
  navigationSlot,
  style,
  ...props
}) => {
  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: "var(--header-height, 3.5rem)",
        padding: "var(--space-2) var(--space-6)",
        backgroundColor: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-default)",
        gap: "var(--space-2)",
        ...style,
      }}
      {...props}
    >
      <style>{`
        .ucs-header-row1 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: var(--space-4);
        }
        .ucs-header-row2 {
          display: flex;
          align-items: center;
          width: 100%;
        }
        .ucs-brand-container {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-shrink: 0;
          white-space: nowrap;
        }
        .ucs-org-desktop {
          display: inline-flex;
        }
        .ucs-org-mobile {
          display: none;
          width: 100%;
        }
        @media (max-width: 640px) {
          .ucs-org-desktop {
            display: none !important;
          }
          .ucs-org-mobile {
            display: inline-flex !important;
          }
        }
      `}</style>

      {/* Row 1: Brand Logo + Product Name + Org (Desktop) + User Menu (All) */}
      <div className="ucs-header-row1">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", minWidth: 0, flexShrink: 1 }}>
          <div className="ucs-brand-container">
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
                whiteSpace: "nowrap",
              }}
            >
              UCS CM
            </span>
          </div>

          {/* Desktop/Tablet Organisation Badge */}
          {organisation && (
            <div className="ucs-org-desktop">
              <div
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
                }}
                title={organisation.name}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ flexShrink: 0 }}
                  aria-hidden="true"
                >
                  <path d="M3 21h18M3 7v14M21 7v14M6 10h4M6 14h4M6 18h4M14 10h4M14 14h4M14 18h4M9 3h6v4H9z" />
                </svg>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {organisation.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Context & Menu */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexShrink: 0 }}>
            <UserMenu
              user={user}
              organisation={organisation}
              roles={roles}
              onSignOut={onSignOut}
              isSignOutPending={isSignOutPending}
              signOutPendingText={signOutPendingText}
            />
          </div>
        )}
      </div>

      {/* Row 2: Mobile Organisation Badge */}
      {organisation && (
        <div className="ucs-header-row2 ucs-org-mobile">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--text-secondary)",
              padding: "var(--space-1) var(--space-2)",
              backgroundColor: "var(--action-secondary-bg)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={organisation.name}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ flexShrink: 0 }}
              aria-hidden="true"
            >
              <path d="M3 21h18M3 7v14M21 7v14M6 10h4M6 14h4M6 18h4M14 10h4M14 14h4M14 18h4M9 3h6v4H9z" />
            </svg>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {organisation.name}
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
