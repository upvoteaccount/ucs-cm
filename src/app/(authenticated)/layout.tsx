import React from "react";
import { AppShell, ShellUser, ShellOrganisation, PlatformRole } from "@/app/components/ui";

const shellFixture = {
  user: {
    id: "fixture-user",
    displayName: "Aarav Mehta",
    email: "aarav.mehta@example.invalid",
  } as ShellUser,
  organisation: {
    id: "fixture-org",
    name: "Acme Financial Services",
  } as ShellOrganisation,
  platformRoles: ["PLATFORM_ADMIN", "SOLUTION_DESIGNER"] as PlatformRole[],
};

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      headerProps={{
        user: shellFixture.user,
        organisation: shellFixture.organisation,
        roles: shellFixture.platformRoles,
        onSignOut: undefined,
      }}
    >
      {children}
    </AppShell>
  );
}
