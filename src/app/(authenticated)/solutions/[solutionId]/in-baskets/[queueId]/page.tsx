import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { AuthService } from "@/modules/auth/index";
import { SolutionService, SolutionQueueService } from "@/modules/solution/index";
import { InBasketContainer } from "@/app/components/runtime/InBasketContainer";
import { getDemoWorkItemsForQueue, getFallbackDemoQueues } from "@/demo-runtime/adapter";

interface InBasketPageProps {
  params: Promise<{
    solutionId: string;
    queueId: string;
  }>;
}

export default async function InBasketPage({ params }: InBasketPageProps) {
  const { solutionId, queueId } = await params;

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

  // Resolve Queue
  const queueService = new SolutionQueueService();
  let resolvedQueue = null;

  try {
    const queueDetails = await queueService.getQueueDetails(sessionContext, solutionId, queueId);
    if (queueDetails?.queue) {
      resolvedQueue = queueDetails.queue;
    }
  } catch {
    // Queue not in DB; check fallback demo queues
  }

  if (!resolvedQueue) {
    const fallbackQueues = getFallbackDemoQueues(solution.solutionPrefix);
    resolvedQueue = fallbackQueues.find((q) => q.id === queueId || q.queueKey === queueId) || fallbackQueues[0];
  }

  const workItems = getDemoWorkItemsForQueue(resolvedQueue.queueKey, resolvedQueue.name);

  return (
    <InBasketContainer
      solution={{
        id: solution.id,
        name: solution.name,
        solutionPrefix: solution.solutionPrefix,
      }}
      queue={{
        id: resolvedQueue.id,
        name: resolvedQueue.name,
        queueKey: resolvedQueue.queueKey,
        description: resolvedQueue.description,
      }}
      workItems={workItems}
    />
  );
}
