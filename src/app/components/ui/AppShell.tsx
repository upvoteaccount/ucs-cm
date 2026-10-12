import React from "react";
import { SkipLink } from "./SkipLink";
import { Header, HeaderProps } from "./Header";

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  headerProps?: HeaderProps;
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  headerProps,
  children,
  style,
  className,
  ...props
}) => {
  return (
    <div
      className={`ucs-app-shell app-shell ${className || ""}`.trim()}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "var(--bg-page)",
        color: "var(--text-primary)",
        ...style,
      }}
      {...props}
    >
      <SkipLink targetId="main-content">Skip to main content</SkipLink>

      <Header {...headerProps} />

      <main
        id="main-content"
        className="ucs-app-shell-main app-shell-main"
        tabIndex={-1}
        style={{
          flex: "1 1 0%",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "1120px",
          margin: "0 auto",
          padding: "var(--space-6)",
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>
    </div>
  );
};
