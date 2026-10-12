"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { ShellPresentationUser, ShellPresentationOrganisation, PlatformRole } from "./shellTypes";
import { UserContext } from "./UserContext";
import { OrganisationContext } from "./OrganisationContext";
import { RoleContext } from "./RoleContext";
import { Button } from "./Button";
import { Divider } from "./Divider";

export interface UserMenuProps {
  user: ShellPresentationUser;
  organisation?: ShellPresentationOrganisation;
  roles?: PlatformRole[];
  onSignOut?: () => void;
  isSignOutPending?: boolean;
  signOutPendingText?: string;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  organisation,
  roles = [],
  onSignOut,
  isSignOutPending: externalPending = false,
  signOutPendingText = "Signing out...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalPending, setInternalPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const isPending = externalPending || internalPending;

  const toggleMenu = () => {
    if (isPending) return;
    setIsOpen((prev) => !prev);
  };
  const closeMenu = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeMenu();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOutClick = async () => {
    if (isPending) return;

    setLogoutError(null);

    if (onSignOut) {
      setIsOpen(false);
      onSignOut();
      return;
    }

    setInternalPending(true);

    try {
      const res = await fetch("/api/auth/session", {
        method: "DELETE",
      });

      if (res.ok || res.status === 401) {
        window.location.href = "/";
        return;
      }

      setLogoutError("Unable to sign out. Please try again.");
      setInternalPending(false);
    } catch {
      setLogoutError("Unable to reach authentication service. Please check your connection.");
      setInternalPending(false);
    }
  };

  const firstName = user.displayName.split(" ")[0] || "Account";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <style>{`
        .ucs-user-menu-full {
          display: inline;
        }
        .ucs-user-menu-short {
          display: none;
        }
        @media (max-width: 640px) {
          .ucs-user-menu-full {
            display: none !important;
          }
          .ucs-user-menu-short {
            display: inline !important;
          }
        }
      `}</style>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`User menu for ${user.displayName}`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        disabled={isPending}
        onClick={toggleMenu}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-1) var(--space-3)",
          height: "var(--control-height-md)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-default)",
          backgroundColor: "var(--bg-surface)",
          color: "var(--text-primary)",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.7 : 1,
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
        }}
      >
        <span className="ucs-user-menu-full">{user.displayName}</span>
        <span className="ucs-user-menu-short">{firstName}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform var(--transition-speed)",
          }}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          id={panelId}
          ref={menuRef}
          role="region"
          aria-label="User Account Menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + var(--space-2))",
            width: "280px",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
            padding: "var(--space-4)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {/* User Info */}
          <div>
            <UserContext user={user} showEmail />
          </div>

          {/* Organisation Context */}
          {organisation && (
            <>
              <Divider />
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Active organisation
                </span>
                <OrganisationContext organisation={organisation} />
              </div>
            </>
          )}

          {/* Role Badges */}
          {roles && roles.length > 0 && (
            <>
              <Divider />
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Assigned roles
                </span>
                <RoleContext roles={roles} />
              </div>
            </>
          )}

          {logoutError && (
            <div
              role="alert"
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--status-error-text)",
                backgroundColor: "var(--status-error-bg)",
                padding: "var(--space-2)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
              }}
            >
              {logoutError}
            </div>
          )}

          {/* Design Studio Link for Administrators / Solution Designers */}
          {(roles.includes("PLATFORM_ADMIN") || roles.includes("SOLUTION_DESIGNER")) && (
            <div style={{ paddingTop: "var(--space-1)" }}>
              <a
                href="/studio/solutions"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "var(--space-2) var(--space-3)",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--action-primary)",
                  backgroundColor: "var(--action-secondary-bg)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  textDecoration: "none",
                  textAlign: "center",
                }}
              >
                Go to Design Studio →
              </a>
            </div>
          )}

          <Divider />

          <Button
            type="button"
            variant="secondary"
            isFullWidth
            isPending={isPending}
            pendingText={signOutPendingText}
            disabled={isPending}
            onClick={handleSignOutClick}
          >
            Sign out
          </Button>
        </div>
      )}
    </div>
  );
};
