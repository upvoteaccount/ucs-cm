import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { AuthService } from "@/modules/auth/index";
import { SolutionService } from "@/modules/solution/index";
import { CreateCaseContainer } from "@/app/components/runtime/CreateCaseContainer";

interface CreateCasePageProps {
  params: Promise<{
    solutionId: string;
  }>;
}

export default async function CreateCasePage({ params }: CreateCasePageProps) {
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

  const orgId = sessionContext.activeOrganisation.id;

  const {
    formRepository,
    solutionPropertyRepository,
    choiceListRepository,
  } = await import("@/modules/solution/index");

  // 1. Fetch Add Case Form Aggregate
  let formAggregate = null;
  try {
    const addCaseForm = await formRepository.findFormByType("ADD_CASE", solutionId, orgId);
    if (addCaseForm) {
      formAggregate = await formRepository.getFormAggregate(solutionId, orgId, addCaseForm.id);
    } else {
      formAggregate = await formRepository.getFormAggregate(solutionId, orgId);
    }
  } catch {
    // Handled below if null
  }

  // 2. Fetch Solution Properties
  const properties = await solutionPropertyRepository.listBySolution(solutionId, orgId);

  // 3. Fetch Choice Lists
  const choiceListRows = await choiceListRepository.listChoiceListsBySolution(solutionId, orgId);
  const choiceLists = [];
  for (const cl of choiceListRows) {
    const options = await choiceListRepository.listOptionsByChoiceList(cl.id);
    choiceLists.push({
      id: cl.id,
      key: cl.key,
      name: cl.name,
      options: options.map((opt) => ({
        key: opt.key,
        label: opt.label,
      })),
    });
  }

  return (
    <CreateCaseContainer
      solution={{
        id: solution.id,
        name: solution.name,
        solutionPrefix: solution.solutionPrefix,
      }}
      formAggregate={formAggregate}
      properties={properties}
      choiceLists={choiceLists}
    />
  );
}
