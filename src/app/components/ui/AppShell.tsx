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
  ...props
}) => {
  return (
    <div
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
        tabIndex={-1}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "var(--space-6)",
        }}
      >
        {children}
      </main>
    </div>
  );
};
