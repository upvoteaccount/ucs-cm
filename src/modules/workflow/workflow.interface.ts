// Decoupled IWorkflowService Interface
// Ensures Temporal or alternative engines can be introduced without refactoring high-level services

export interface WorkflowTransitionParams {
  taskId: string;
  userId: string;
  outcome: string;
  submittedProperties: Record<string, unknown>;
}

export interface WorkflowTransitionResult {
  caseId: string;
  nextTaskId?: string;
  status: string;
}

export interface IWorkflowService {
  executeTransition(params: WorkflowTransitionParams): Promise<WorkflowTransitionResult>;
  validateWorkflowDefinition(definitionJson: unknown): Promise<{ valid: boolean; errors?: string[] }>;
}
