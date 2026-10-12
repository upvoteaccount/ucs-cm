# UCS CM Phase 1
## UX and Navigation Specification

**Document Status:** Approved Product Specification

## Principles
Professional, clear, efficient, accessible, desktop-first responsive, polished enterprise experience.

## Areas
Design Studio, Runtime Portal, Administration Console. Area switching is permission-based.

## Design Studio Navigation (INC-03 Baseline)
Solutions Home (`/studio/solutions`) → Overview → Data → Form.

- **Solutions Home**: Renders page heading and explanatory header text describing the solution portfolio. Displays solutions belonging strictly to the user's trusted active organisation context. Displays Solution Name, Solution Prefix / Key, Status (`Draft`), Last Updated timestamp, and an **Open** action trigger for each solution. Supports dedicated UI states: loading indicator during fetch, empty state with a "Create Solution" action trigger when zero solutions exist, and safe error state with recovery guidance if fetching fails.
- **Create Solution Modal/Screen**: Captures Solution Name, Description, and an editable suggested Solution Prefix. The Solution Prefix (`solution_prefix`, e.g. `CDD`) is auto-suggested from Solution Name, normalized to uppercase, validated for active-organisation uniqueness, and serves as the primary prefix for generated technical property names (e.g. `CDD_customer_name`), while also being available for case number formatting (e.g. `CDD-KYC-000001`). Solution `key` is unified with or derived from `solution_prefix`.
- **Active Studio Navigation**: Shows ONLY implemented active areas (Overview, Data, Form). Deferred Studio areas (Roles, Workflow, Document Types, Publishing) are not rendered as disabled navigation items.

## One-Place Field Inspector & Shared Form Structure
When selecting a form field reference in Form Studio, the inspector panel exposes BOTH configuration tiers:
- **Canonical Data Dictionary Tier ("Applies everywhere")**: Stored data type, label, format preset (`EMAIL`, `PHONE`), choice list binding, default value, help text, minimum/maximum length or range constraints, pattern/regex validation rules.
- **Form Reference Tier ("Base Form Structure & Queue Rules")**: Form layout placement (tab, section), display ordering sequence, base control type, and queue-context field rules (defining static visibility (`visible`/`hidden`), editability (`editable`/`read-only`), and requirement state (`mandatory`/`optional`) per work context/queue without duplicating forms).

## Studio Access Control & Landing Navigation
- Possession of `PLATFORM_ADMIN` or `SOLUTION_DESIGNER` platform roles grants access to the INC-03 Studio landing at `/studio/solutions`.
- Direct access to `/studio` by runtime-only users (without a design role) results in server-side denial with the existing approved forbidden experience (`/forbidden`).
- Post-login `/landing` evaluates user roles, leaving runtime-only users on the neutral authenticated destination (`/landing`). Top-navigation application switcher is deferred.

## Navigator & In Baskets Navigation
- **Solution Entry**: Opening a Solution presents a clean work entry point displaying accessible In Baskets, Case Search, and Create Case (where permitted). Opening a Solution does NOT automatically open the last-used queue.
- **In Baskets**: In Baskets display WIDs in a queue. Navigator shows only In Baskets for queues the logged-in user can access.
- **Workspace Tabs**: Opening a WID from an In Basket opens the WID processing page. Multiple WIDs can remain open concurrently in workspace tabs.
- **Case Search vs. WID Editing**: Case Search opens Case Details in read-only mode. Editing business data occurs strictly through an active WID processing page, not through Case Search.

## Standard System-Defined WID Processing Page
Phase 1 uses a single system-defined default WID processing page layout (no configurable Page Designer or per-step page templates):
- **Toolbar at top**: Actions (Send, Claim, Release, Approve, Reject, etc.)
- **Document Viewer on left**: First-class Document Viewer component
- **Shared Form/View on right**: Displays business data using the shared Form structure evaluated against the current queue-context field rules
- **Document List below Form/View**: Document management grid
The Form represents strictly the business-data portion of the WID processing page, not the entire page layout.

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
