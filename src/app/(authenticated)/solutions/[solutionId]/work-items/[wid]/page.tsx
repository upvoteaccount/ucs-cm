import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { AuthService } from "@/modules/auth/index";
import {
  SolutionService,
  SolutionQueueService,
  formRepository,
  solutionPropertyRepository,
  choiceListRepository,
  FormAggregate,
} from "@/modules/solution/index";
import { WidProcessingContainer } from "@/app/components/runtime/WidProcessingContainer";
import { ChoiceListDto, QueueDto } from "@/app/components/runtime/CaseViewRuntimeForm";
import { getDemoCaseByWid, getFallbackDemoQueues } from "@/demo-runtime/adapter";

interface WidPageProps {
  params: Promise<{
    solutionId: string;
    wid: string;
  }>;
  searchParams: Promise<{
    queueId?: string;
    mode?: string;
  }>;
}

export default async function WidProcessingPage({
  params,
  searchParams,
}: WidPageProps) {
  const { solutionId, wid } = await params;
  const { queueId: rawQueueId, mode } = await searchParams;
  const isReadOnly = mode === "readonly";

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

  const orgId = sessionContext.activeOrganisation.id;
  const solutionService = new SolutionService();
  const solution = await solutionService.getSolutionById(solutionId, sessionContext);

  if (!solution) {
    notFound();
  }

  // 1. Fetch available queues for this solution
  const queueService = new SolutionQueueService();
  const { queues: dbQueues } = await queueService.listQueues(sessionContext, solutionId);

  let availableQueues: QueueDto[] = [];
  if (dbQueues.length > 0) {
    availableQueues = dbQueues.map((q) => ({
      id: q.id,
      queueKey: q.queueKey,
      name: q.name,
    }));
  } else {
    const fallback = getFallbackDemoQueues(solution.solutionPrefix);
    availableQueues = fallback.map((q) => ({
      id: q.id,
      queueKey: q.queueKey,
      name: q.name,
    }));
  }

  // 2. Resolve Active Queue
  let activeQueue = availableQueues[0];
  if (rawQueueId) {
    const found = availableQueues.find((q) => q.id === rawQueueId || q.queueKey === rawQueueId);
    if (found) {
      activeQueue = found;
    }
  }

  // 3. Fetch Real Case View Form Aggregate
  let formAggregate: FormAggregate | null = null;
  try {
    const caseViewForm = await formRepository.findFormByType("CASE_VIEW", solutionId, orgId);
    if (caseViewForm) {
      formAggregate = await formRepository.getFormAggregate(solutionId, orgId, caseViewForm.id);
    } else {
      formAggregate = await formRepository.getFormAggregate(solutionId, orgId);
    }
  } catch {
    // Handled below if null
  }

  // 4. Fetch Solution Properties
  const properties = await solutionPropertyRepository.listBySolution(solutionId, orgId);

  // 5. Fetch Choice Lists and active options
  const choiceListRows = await choiceListRepository.listChoiceListsBySolution(solutionId, orgId);
  const choiceLists: ChoiceListDto[] = [];

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

  // If solution has no formAggregate configured yet in DB (e.g. freshly created empty solution),
  // construct a clean default FormAggregate using the solution's properties
  if (!formAggregate || !formAggregate.tabs || formAggregate.tabs.length === 0) {
    const defaultFormId = "demo-form-case-view";
    const defaultTabId = "demo-tab-1";
    const defaultSec1Id = "demo-sec-1";
    const defaultSec2Id = "demo-sec-2";

    formAggregate = {
      form: {
        id: defaultFormId,
        solutionId,
        formType: "CASE_VIEW",
        formKey: "PLA_CASE_VIEW",
        key: "PLA_CASE_VIEW",
        name: "Case View Form",
        description: "Standard loan processing case view form",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      tabs: [
        {
          id: defaultTabId,
          formId: defaultFormId,
          key: "APPLICANT_DETAILS",
          title: "Applicant & Loan Details",
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      sections: [
        {
          id: defaultSec1Id,
          formId: defaultFormId,
          tabId: defaultTabId,
          key: "PERSONAL_INFO",
          title: "Personal & Contact Information",
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: defaultSec2Id,
          formId: defaultFormId,
          tabId: defaultTabId,
          key: "LOAN_INFO",
          title: "Loan & Financial Overview",
          displayOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      fields: properties.map((prop, idx) => ({
        id: `field-ref-${prop.id}`,
        solutionId,
        formId: defaultFormId,
        sectionId: idx < Math.ceil(properties.length / 2) ? defaultSec1Id : defaultSec2Id,
        propertyId: prop.id,
        controlType: prop.defaultControlType || "TEXT_INPUT",
        isVisible: true,
        isEnabled: true,
        isEditable: true,
        isRequired: false,
        displayOrder: idx + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      queueRules: [],
    };
  }

  // 6. Get Demo Case values
  const demoCase = getDemoCaseByWid(wid, activeQueue.name);

  return (
    <WidProcessingContainer
      solution={{
        id: solution.id,
        name: solution.name,
        solutionPrefix: solution.solutionPrefix,
      }}
      wid={wid}
      initialCase={demoCase}
      formAggregate={formAggregate}
      properties={properties}
      choiceLists={choiceLists}
      initialQueueId={activeQueue.id}
      initialQueueName={activeQueue.name}
      availableQueues={availableQueues}
      isReadOnly={isReadOnly}
    />
  );
}
