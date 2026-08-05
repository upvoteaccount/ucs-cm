import React, { useState, useRef, useEffect, useId } from "react";
import { ShellUser, ShellOrganisation, PlatformRole } from "./shellTypes";
import { UserContext } from "./UserContext";
import { OrganisationContext } from "./OrganisationContext";
import { RoleContext } from "./RoleContext";
import { Button } from "./Button";
import { Divider } from "./Divider";

export interface UserMenuProps {
  user: ShellUser;
  organisation?: ShellOrganisation;
  roles?: PlatformRole[];
  onSignOut?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  organisation,
  roles = [],
  onSignOut,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const toggleMenu = () => setIsOpen((prev) => !prev);
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

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={`User menu for ${user.displayName}`}
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
          cursor: "pointer",
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
        }}
      >
        <UserContext user={user} />
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform var(--transition-speed)",
          }}
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
          <div>
            <UserContext user={user} showEmail />
          </div>

          {organisation && (
            <div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginBottom: "var(--space-1)" }}>
                Active Organisation
              </div>
              <OrganisationContext organisation={organisation} />
            </div>
          )}

          {roles.length > 0 && (
            <div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginBottom: "var(--space-1)" }}>
                Assigned Roles
              </div>
              <RoleContext roles={roles} />
            </div>
          )}

          <Divider />

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setIsOpen(false);
              if (onSignOut) {
                onSignOut();
              }
            }}
          >
            Sign out
          </Button>
        </div>
      )}
    </div>
  );
};
