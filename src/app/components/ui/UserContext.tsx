import React from "react";
import { ShellUser } from "./shellTypes";

export interface UserContextProps extends React.HTMLAttributes<HTMLDivElement> {
  user: ShellUser;
  showEmail?: boolean;
}

export const UserContext: React.FC<UserContextProps> = ({
  user,
  showEmail = false,
  style,
  ...props
}) => {
  return (
    <div
      title={user.displayName}
      aria-label={showEmail ? `${user.displayName} (${user.email})` : user.displayName}
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        ...style,
      }}
      {...props}
    >
      <span
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--text-primary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {user.displayName}
      </span>
      {showEmail && (
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {user.email}
        </span>
      )}
    </div>
  );
};
