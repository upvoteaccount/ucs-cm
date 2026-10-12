import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthService } from "@/modules/auth/index";
import { SolutionService } from "@/modules/solution/index";
import { RuntimeSolutionsList } from "@/app/components/runtime/RuntimeSolutionsList";

export default async function SolutionsRuntimePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ucs_session_token")?.value;

  if (!token) {
    redirect("/");
  }

  const authService = new AuthService();
  const sessionContext = await authService.validateSession(token);

  if (!sessionContext) {
    redirect("/");
  }

  const roles = sessionContext.membership.roles || [];
  const canAccessRuntime =
    roles.includes("RUNTIME_USER") ||
    roles.includes("PLATFORM_ADMIN") ||
    roles.includes("SOLUTION_DESIGNER");

  if (!canAccessRuntime) {
    redirect("/forbidden");
  }

  const solutionService = new SolutionService();
  const allSolutions = await solutionService.listSolutions(sessionContext);

  const formattedSolutions = allSolutions.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    solutionPrefix: s.solutionPrefix,
    status: s.status,
    updatedAt: s.updatedAt,
  }));

  return <RuntimeSolutionsList solutions={formattedSolutions} />;
}
