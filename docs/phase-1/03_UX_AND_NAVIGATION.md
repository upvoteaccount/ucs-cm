# UCS CM Phase 1
## UX and Navigation Specification

**Document Status:** Approved Product Specification

## Principles
Professional, clear, efficient, accessible, desktop-first responsive, polished enterprise experience.

## Areas
Design Studio, Runtime Portal, Administration Console. Area switching is permission-based.

## Design Studio
Solutions → Overview → Case Type → Properties → Form → Roles → Queues → Workflow → Document Types → Validation → Publish → Version History.

## Runtime Portal
My Work, Create Case, Search Cases, Recently Viewed, Notifications.

## My Work
Cards for Claimed Tasks, Available Queue Tasks, Due Soon, Overdue, Recently Completed. Task table shows task, case, priority, queue, status, due date, claimant, actions.

## Case Creation
Select solution and case type, complete generated form, upload required documents, review, submit, show generated case number. Errors appear inline and in a page summary without clearing entered values.

## Case Workspace
Header: case number, type, status, priority, stage, dates, creator. Sections: Case Details, Current Task, Documents, Comments, Audit Timeline.

## Documents
Desktop split view with grid and viewer. Smaller screens open viewer full-screen.

## Confirmations
Required for publish, completion, approve, reject, send back, release, reassignment, replace, delete, user deactivation.

## Error States
400 validation, 401 expired session, 403 denied, 404 unavailable, 409 conflict, 413 too large, 415 unsupported, 500 unexpected. Each must include recovery guidance.
