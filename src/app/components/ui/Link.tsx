import React from "react";
import NextLink, { LinkProps as NextLinkProps } from "next/link";

export interface LinkProps extends NextLinkProps, Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps> {
  children: React.ReactNode;
}

export const Link: React.FC<LinkProps> = ({
  children,
  href,
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    color: "var(--info-main)",
    textDecoration: "underline",
    fontSize: "var(--font-size-sm)",
    fontWeight: "var(--font-weight-medium)",
    cursor: "pointer",
  };

  return (
    <NextLink
      href={href}
      style={{
        ...baseStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </NextLink>
  );
};
