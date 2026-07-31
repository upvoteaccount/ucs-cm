# 06. Workflow FSM Design

**Document Status:** Approved for Phase 1 Implementation  
**Phase:** Phase 1  
**Author:** Senior Architect (Boss)  

---

## 1. Purpose & Core FSM Mechanics

This document specifies the internal **Finite State Machine (FSM)** engine designed for UCS CM Phase 1. It replaces external workflow orchestrators (like Temporal) with a lightweight, transactional, PostgreSQL-backed state transition engine (Product Lead Decision #1).

### Architectural Note on Temporal Deferral & Service Boundary Isolation
> [!IMPORTANT]
> Temporal is intentionally deferred from Phase 1. The workflow engine is implemented using a database-backed Finite State Machine (FSM). However, the workflow module (`src/modules/workflow/`) MUST preserve a clean, decoupled service boundary interface (`IWorkflowService`) so that Temporal can be evaluated and introduced in a dedicated future phase after the Phase 1 workflow implementation is stable.

---

## 2. Sequential Workflow Transition Model

Phase 1 workflows are strictly structured sequences of steps with specific allowed outcomes (`APPROVE`, `REJECT`, `SEND_BACK`, `COMPLETE`).

```text
                                +---------------------------+
                                |  Case Created (Status=NEW)|
                                +---------------------------+
                                              |
                                              v
                              +-------------------------------+
                              | Step 1: Initial Review        |
                              | Queue: INITIAL_REVIEW_Q       |
                              +-------------------------------+
                                  |                       |
                       Outcome:   |                       | Outcome:
                       APPROVE    |                       | REJECT
                                  v                       v
            +-------------------------------+    +----------------------------+
            | Step 2: Final Decision        |    | Case Terminal State:       |
            | Queue: FINAL_DECISION_Q       |    | CLOSED_REJECTED            |
            +-------------------------------+    +----------------------------+
                |                       |
     Outcome:   |                       | Outcome:
     APPROVE    |                       | SEND_BACK
                v                       v
+----------------------------+   +-------------------------------+
| Case Terminal State:       |   | Step 1: Initial Review        |
| CLOSED_APPROVED            |   | (Task Regenerated)            |
+----------------------------+   +-------------------------------+
```

---

## 3. Transactional Transition Algorithm (`WorkflowFSMEngine`)

When a user completes a task with a selected outcome, the `WorkflowFSMEngine` executes the following single database transaction:

```typescript
export async function executeTaskTransition(params: {
  taskId: string;
  userId: string;
  outcome: string;
  submittedProperties: Record<string, any>;
}): Promise<{ caseId: string; nextTaskId?: string }> {
  return await db.transaction(async (tx) => {
    // 1. Lock Task and Case rows using FOR UPDATE
    const task = await tx.select().from(tasks).where(eq(tasks.id, params.taskId)).for('update');
    const kase = await tx.select().from(cases).where(eq(cases.id, task.caseId)).for('update');

    // 2. Validate Task Lock & Execution Guards
    if (task.status !== 'CLAIMED' || task.claimedByUserId !== params.userId) {
      throw new TaskAccessError("Task is not claimed by the active user.");
    }

    // 3. Fetch Published Solution Snapshot Schema for Step Rules
    const snapshot = await getSolutionSnapshot(kase.solutionVersionId);
    const currentStepConfig = getStepConfig(snapshot, task.stepId);

    // 4. Validate Submitted Properties against Step-Level Rules
    validateStepProperties(currentStepConfig, params.submittedProperties);

    // 5. Determine Outcome & Next Step Target
    const outcomeConfig = currentStepConfig.outcomes.find(o => o.name === params.outcome);
    if (!outcomeConfig) throw new InvalidOutcomeError(params.outcome);

    // 6. Update Task Status -> COMPLETED
    await tx.update(tasks).set({
      status: 'COMPLETED',
      completedAt: new Date(),
      completedByUserId: params.userId,
      outcomeSelected: params.outcome
    }).where(eq(tasks.id, task.id));

    // 7. Update Case Properties
    const updatedProperties = { ...kase.propertyValues, ...params.submittedProperties };

    // 8. Branch Based on Next Target (Terminal State vs. Next Human Task)
    if (isTerminalState(outcomeConfig.nextStep)) {
      await tx.update(cases).set({
        status: outcomeConfig.nextStep, // e.g. 'CLOSED_APPROVED'
        propertyValues: updatedProperties,
        closedAt: new Date()
      }).where(eq(cases.id, kase.id));

      await logAuditEvent(tx, { type: 'CASE_CLOSED', caseId: kase.id, userId: params.userId });
      return { caseId: kase.id };
    } else {
      // Create Next Task
      const nextStepConfig = getStepConfig(snapshot, outcomeConfig.nextStep);
      const [nextTask] = await tx.insert(tasks).values({
        caseId: kase.id,
        stepId: nextStepConfig.id,
        taskName: nextStepConfig.name,
        queueKey: nextStepConfig.queueKey,
        status: 'AVAILABLE',
        dueAt: calculateDueDate(nextStepConfig.dueDurationHours)
      }).returning();

      await tx.update(cases).set({
        currentStepId: nextStepConfig.id,
        status: nextStepConfig.caseStatusOnEntry || 'IN_PROGRESS',
        propertyValues: updatedProperties
      }).where(eq(cases.id, kase.id));

      await logAuditEvent(tx, { type: 'TASK_ADVANCED', caseId: kase.id, taskId: nextTask.id, userId: params.userId });
      return { caseId: kase.id, nextTaskId: nextTask.id };
    }
  });
}
```

---

## 4. Architectural Decisions

### Choice 6.1: Database-Backed FSM vs. External BPMN Engine
* **Decision**: Implement a pure TypeScript DB-backed Finite State Machine engine executing inside PostgreSQL ACID transactions.
* **Alternatives Considered**: 
  1. Temporal Workflow Engine.
  2. Camunda BPMN Engine.
* **Rationale**:
  1. Sequential workflow transitions require zero dynamic sub-process spawning or complex asynchronous waiting states.
  2. Eliminates all external microservice or worker pool dependencies.
  3. Provides strong transactional consistency: a task step never advances unless audit logging and case state updates commit successfully within the same database transaction.
* **Phase 1 Impact**: Reduced deployment complexity, deterministic execution, and operational predictability.
* **Future Implications**: Parallel branching and automated service tasks can be added to the FSM engine in Phase 2 by expanding state transition handlers.
* **Risks**: Complex branching paths in future phases could require refactoring FSM logic.
* **Mitigations**: Maintain strict interface boundaries for the `WorkflowFSMEngine` so external engines could be swapped in Phase 3 if complex BPMN modeling is introduced.
* **Product Approval Required**: Approved (Decision Point #1).
