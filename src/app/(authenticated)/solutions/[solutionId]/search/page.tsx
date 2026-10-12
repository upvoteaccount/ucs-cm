import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { AuthService } from "@/modules/auth/index";
import { SolutionService } from "@/modules/solution/index";
import { SearchContainer } from "@/app/components/runtime/SearchContainer";

interface SearchPageProps {
  params: Promise<{
    solutionId: string;
  }>;
}

export default async function SearchPage({ params }: SearchPageProps) {
  const { solutionId } = await params;

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
  const solution = await solutionService.getSolutionById(solutionId, sessionContext);

  if (!solution) {
    notFound();
  }

  const { SolutionQueueService } = await import("@/modules/solution/index");
  const queueService = new SolutionQueueService();
  const { queues: dbQueues } = await queueService.listQueues(sessionContext, solutionId);
  const queues = dbQueues.map((q) => ({
    id: q.id,
    name: q.name,
    queueKey: q.queueKey,
  }));

  return (
    <SearchContainer
      solution={{
        id: solution.id,
        name: solution.name,
        solutionPrefix: solution.solutionPrefix,
      }}
      queues={queues}
    />
  );
}
