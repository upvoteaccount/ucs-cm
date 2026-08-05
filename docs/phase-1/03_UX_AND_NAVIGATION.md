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

## Shared UI Foundation (INC-02.5 Baseline)

### Public and Authenticated Experience Boundary
- The login experience (`/`) renders strictly outside the authenticated application shell.
- All authenticated screens share a common application shell.
- Route groups (such as `(public)` and `(authenticated)`) are Next.js implementation details and do NOT appear in public browser URLs or end-user paths.

### Login States
The login interface renders exactly one coherent state at a time:
1. **Default**: Initial state displaying empty credentials inputs and action trigger.
2. **Filled**: User has entered credentials. Entered inputs are preserved across validation and pending transitions.
3. **Validation Error**: Client-side validation failure (e.g. missing required field) displayed via inline error messages linked to fields.
4. **Invalid Credentials**: Server authentication failure displayed via a persistent form-level alert.
5. **Pending Submission**: Action in progress. Submit button displays inline loading indicator, native `disabled` attribute is applied, and duplicate submissions are prevented.
6. **Network Failure**: Fetch rejection or network timeout displayed via a persistent form-level alert with recovery guidance.
7. **Session-Expired Notice**: Displayed when a user is redirected back to login following session expiration.

### Session-Expired Behaviour
When an authenticated session expires or is revoked:
- Client session context is cleared.
- User is redirected to the login page (`/`).
- A clear session-expired message notice is displayed on the login interface.
- In-place re-authentication overlays and preservation of unsaved background drafts are explicitly deferred.

### Minimum Loading Behaviour
Initial foundation loading is limited to:
- Inline loading indicators for login and logout submission actions.
- Initial session-resolution loading indicator during session verification.
- Entered login inputs are preserved during pending requests.
- Duplicate submission is strictly prevented.
- Skeleton loaders, top progress indicators, and route transition progress indicators are deferred until real routed content requires them.

### Form and Feedback Behaviour
- Form controls use standard HTML elements with label elements explicitly associated via `htmlFor`.
- Field-level validation messages are associated using `aria-describedby`.
- Authentication and network failures use persistent form-level alert banners with `role="alert"`.
- Failed authentication attempts return generic invalid-credential messages without exposing user account existence.
- Transient toast notification systems are excluded from the initial foundation checkpoint.

### Accessibility Foundation
- **Semantic HTML First**: Standard page navigation uses `<nav>` and standard `<a>` links (not ARIA tab roles).
- **Disabled Controls**: Inactive buttons use native HTML `disabled` attributes.
- **Focus Indicators**: Visible focus rings on all focusable controls (`:focus-visible`).
- **Skip Link**: First focusable element in DOM (`SkipLink`) targets main content (`#main-content`).
- **Keyboard Operability**: Full keyboard functionality (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc`).
- **Focus Trapping Rules**: Page loaders do NOT trap focus. Focus trapping is restricted to open modal dialogs, restoring focus to the trigger element upon closing.
- **Reduced Motion**: CSS transitions respect `@media (prefers-reduced-motion: reduce)` by reducing animation duration to zero.
- **Contrast**: Text contrast (minimum 4.5:1) and non-text control contrast (minimum 3:1) are verified independently.
