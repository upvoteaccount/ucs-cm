import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { AuthService } from "@/modules/auth/index";
import { SolutionService } from "@/modules/solution/index";
import { DesignStudioContainer } from "@/app/components/studio/DesignStudioContainer";

interface StudioSolutionPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function StudioSolutionPage({ params }: StudioSolutionPageProps) {
  const { id } = await params;

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

  // Authorize Platform Roles: PLATFORM_ADMIN or SOLUTION_DESIGNER
  const roles = sessionContext.membership.roles;
  const isAuthorized = roles.includes("PLATFORM_ADMIN") || roles.includes("SOLUTION_DESIGNER");

  if (!isAuthorized) {
    redirect("/forbidden");
  }

  // Fetch solution on server side to verify existence & org-scoping
  const solutionService = new SolutionService();
  const solution = await solutionService.getSolutionById(id, sessionContext);

  if (!solution) {
    notFound();
  }

  return (
    <DesignStudioContainer
      solutionId={id}
      initialSolution={{
        id: solution.id,
        name: solution.name,
        description: solution.description,
        solutionPrefix: solution.solutionPrefix,
        status: solution.status,
        revision: solution.revision,
        createdAt: solution.createdAt,
        updatedAt: solution.updatedAt,
      }}
    />
  );
}
