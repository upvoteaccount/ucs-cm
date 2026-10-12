import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authService } from "@/modules/auth";
import { SolutionsListContainer } from "@/app/components/studio/SolutionsListContainer";

export default async function StudioSolutionsPage() {
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

  const roles = sessionContext.membership.roles || [];
  const canAccessStudio = roles.includes("PLATFORM_ADMIN") || roles.includes("SOLUTION_DESIGNER");

  if (!canAccessStudio) {
    redirect("/forbidden");
  }

  return <SolutionsListContainer />;
}
