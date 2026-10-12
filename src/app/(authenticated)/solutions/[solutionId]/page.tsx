import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { AuthService } from "@/modules/auth/index";
import { SolutionService, SolutionQueueService } from "@/modules/solution/index";
import { NavigatorContainer, NavigatorQueueItem } from "@/app/components/runtime/NavigatorContainer";
import { getDemoQueueCounts, getFallbackDemoQueues, getDemoWorkItemsForQueue } from "@/demo-runtime/adapter";

interface NavigatorPageProps {
  params: Promise<{
    solutionId: string;
  }>;
}

export default async function NavigatorPage({ params }: NavigatorPageProps) {
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

  const queueService = new SolutionQueueService();
  const { queues: dbQueues } = await queueService.listQueues(sessionContext, solutionId);

  const demoCounts = getDemoQueueCounts(solution.solutionPrefix);

  let navigatorQueues: NavigatorQueueItem[] = [];

  if (dbQueues.length > 0) {
    navigatorQueues = dbQueues.map((q) => {
      // Find count from demo counts or count of demo work items matching queue
      const count =
        demoCounts[q.queueKey] ||
        demoCounts[q.name] ||
        getDemoWorkItemsForQueue(q.queueKey, q.name).length ||
        2;

      return {
        id: q.id,
        name: q.name,
        queueKey: q.queueKey,
        description: q.description,
        count,
      };
    });
  } else {
    // If no queues are provisioned in DB for this solution yet, use realistic demo queues
    const fallback = getFallbackDemoQueues(solution.solutionPrefix);
    navigatorQueues = fallback.map((f) => ({
      id: f.id,
      name: f.name,
      queueKey: f.queueKey,
      description: f.description,
      count: f.count,
    }));
  }

  return (
    <NavigatorContainer
      solution={{
        id: solution.id,
        name: solution.name,
        description: solution.description,
        solutionPrefix: solution.solutionPrefix,
      }}
      queues={navigatorQueues}
    />
  );
}
