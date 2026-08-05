import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell, PlatformRole } from "@/app/components/ui";
import { authService } from "@/modules/auth";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ucs_session_token")?.value;

  if (!token) {
    redirect("/");
  }

  let sessionContext;
  try {
    sessionContext = await authService.validateSession(token);
  } catch {
    redirect("/");
  }

  // Safe ID-free presentation DTO mapping at server boundary
  const presentationUser = {
    displayName: sessionContext.user.fullName,
    email: sessionContext.user.email,
  };

  const presentationOrg = {
    name: sessionContext.activeOrganisation.name,
  };

  const APPROVED_ROLES: PlatformRole[] = [
    "PLATFORM_ADMIN",
    "SOLUTION_DESIGNER",
    "RUNTIME_USER",
  ];

  const presentationRoles = sessionContext.membership.roles.filter(
    (role): role is PlatformRole => APPROVED_ROLES.includes(role as PlatformRole)
  );

  return (
    <AppShell
      headerProps={{
        user: presentationUser,
        organisation: presentationOrg,
        roles: presentationRoles,
      }}
    >
      {children}
    </AppShell>
  );
}
