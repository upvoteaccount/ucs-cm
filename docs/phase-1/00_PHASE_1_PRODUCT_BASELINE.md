# UCS CM

## Phase 1 Product Baseline and Scope

**Document status:** Initial approved product baseline
**Product:** UCS CM
**Phase:** Phase 1
**Primary reference platform:** IBM Case Manager
**Reference implementation:** BFSI KYC Exception and Remediation
**Product owner and approver:** UCS CM product team
**Technical reviewer and implementer:** Boss, Antigravity IDE

---

# 1. Purpose of this document

This document establishes the approved product direction and implementation boundary for Phase 1 of UCS CM.

It is intended to:

* Define what UCS CM is.
* Establish the relationship between UCS CM and IBM Case Manager.
* Define the Phase 1 vertical slice.
* Separate generic platform functionality from the BFSI reference configuration.
* Prevent unnecessary architecture and scope expansion.
* Give the Senior Architect and Developer a clear implementation boundary.
* Provide the baseline for functional, UX, architecture, validation and testing specifications.

This document takes precedence over informal implementation assumptions.

Any proposed deviation must be documented and approved before implementation.

---

# 2. Product vision

UCS CM will be an industry-neutral, configurable, document-centric case-management and workflow platform.

It will enable organisations to design, publish and operate case-management solutions without requiring a separate custom application for every business process.

The platform will provide a simpler and more affordable alternative for organisations that require capabilities similar to IBM Case Manager but cannot justify the associated licensing, infrastructure or implementation cost.

UCS CM will combine three product propositions:

1. An affordable alternative to enterprise case-management platforms.
2. A low-code case-management solution builder.
3. A document-centric workflow and task-management platform.

---

# 3. Relationship with IBM Case Manager

IBM Case Manager is the primary functional reference model for UCS CM.

UCS CM will reproduce the most useful business capabilities and user journeys using its own modern architecture and technology stack.

UCS CM will not copy IBM source code, proprietary implementation details, branding or internal architecture.

## 3.1 Functional capability mapping

| IBM Case Manager capability | UCS CM capability               |
| --------------------------- | ------------------------------- |
| Case Builder                | Design Studio                   |
| Solution                    | Solution                        |
| Properties                  | Configurable Properties & Choice Lists |
| Pages and Views             | Forms and Case Workspace        |
| Roles                       | Solution Roles                  |
| In-baskets                  | Work Queues                     |
| Activities                  | Workflow Tasks                  |
| Process Designer            | Workflow Designer               |
| Content Navigator           | Runtime Portal                  |
| Document Viewer             | Document Viewer                 |
| FileNet Content Engine      | UCS CM Document Repository      |
| ACCE                        | Administration Console          |
| Case History                | Case Audit Timeline             |
| Solution Deployment         | Validate and Publish            |
| Database and object stores  | PostgreSQL and document storage |

## 3.2 Product principle

IBM Case Manager provides the functional reference.

UCS CM provides a modern, simpler, configurable and affordable implementation of the most valuable case-management capabilities.

---

# 4. Industry-neutral requirement

UCS CM must not be designed as a BFSI-only application.

The platform must support configurable solutions across industries such as:

* BFSI
* Healthcare
* Manufacturing
* Government
* Education
* Insurance
* Legal services
* Human resources
* Customer service
* Compliance
* Claims and grievances

The Phase 1 BFSI solution is only a reference configuration.

No BFSI-specific terminology, tables, workflows, routes, service classes or business rules may be hard-coded into the generic platform.

The platform must use generic concepts such as:

* Organisation
* Solution
* Case Type
* Property
* Form
* Role
* Queue
* Workflow
* Workflow Step
* Case
* Task
* Document
* Comment
* Notification
* Audit Event

BFSI-specific concepts such as account number, KYC status, compliance officer and identity proof must exist only as configurable metadata.

---

# 5. Target users

UCS CM will eventually support the following user groups:

## 5.1 Platform Administrator

Responsible for:

* Organisation configuration
* User management
* Access management
* System settings
* Operational monitoring
* Audit access
* Administrative case inspection

## 5.2 Solution Designer

Responsible for:

* Creating solutions
* Defining case types
* Creating properties
* Configuring forms
* Defining solution roles
* Configuring queues
* Defining workflows
* Defining document types
* Validating and publishing solutions

A Solution Designer does not automatically receive access to runtime cases.

Runtime access must be granted separately.

## 5.3 Runtime User

Responsible for:

* Creating authorised cases
* Viewing assigned work
* Accessing permitted queues
* Claiming tasks
* Working on cases
* Updating permitted properties
* Uploading and viewing documents
* Completing workflow actions
* Adding comments

## 5.4 Supervisor

Responsible for:

* Monitoring queue work
* Reassigning tasks
* Releasing locked tasks where permitted
* Reviewing cases
* Approving, rejecting or sending work back
* Viewing overdue work
* Accessing operational audit information

## 5.5 External User

External users may eventually submit or interact with cases through controlled portals or forms.

External-user functionality is outside the first Phase 1 implementation.

---

# 6. Long-term product direction

UCS CM is expected to support, over time:

* Multiple organisations
* Multiple solutions per organisation
* Multiple case types per solution
* Shared SaaS deployment
* Dedicated client deployment
* Client-managed on-premise deployment
* Client branding
* Development, testing, UAT and production environments
* Solution export and import
* Solution cloning
* Solution versioning
* Enterprise SSO
* Advanced workflow
* Rules and decisions
* Document versioning
* Search and reporting
* Integrations
* Mobile support
* Intelligent capture
* OCR and extraction
* AI-assisted case processing

These are long-term capabilities and must not be treated as Phase 1 commitments unless explicitly listed in the Phase 1 scope.

---

# 7. Phase 1 objective

Phase 1 must prove one complete configurable case-management lifecycle.

A non-developer must be able to:

```text
Create a solution
→ Configure Data Dictionary & Choice Lists
→ Configure a form
→ Define solution roles
→ Configure work queues
→ Configure a sequential workflow
→ Define document types
→ Validate and publish
→ Create a runtime case
→ Generate work tasks
→ Claim and complete tasks
→ Upload and view documents
→ Approve, reject or send work back
→ Close the case
→ Review the case audit history
```

The published solution configuration must drive runtime behaviour.

The runtime application must not contain a hard-coded KYC form, KYC workflow or BFSI-specific case screen.

---

# 8. Phase 1 reference implementation

## 8.1 Industry

BFSI

## 8.2 Solution

**Customer Due Diligence Management**

## 8.3 Case type

**KYC Exception**

## 8.4 Purpose

The KYC Exception case will demonstrate:

* Configurable case properties
* Configurable forms
* Sensitive information
* Queue-based task assignment
* Role-based access
* Document upload
* Document Grid
* Document Viewer
* Task claiming
* Task locking
* Due dates
* Send-back behaviour
* Approval and rejection
* Case closure
* Case audit history

All demonstration information and documents must be fictional and synthetic.

No real customer, account, identity or banking information may be used.

---

# 9. Phase 1 workflow baseline

The reference workflow will remain sequential.

```text
Register KYC Exception
→ Initial Review
→ Compliance Review
→ Final Decision
→ Close
```

The exact number of runtime human tasks may be reduced or refined during detailed functional specification, but the workflow must demonstrate:

* Queue assignment
* Task claiming
* Task locking
* Field visibility and editability by step
* Required fields by step
* Due date
* Task completion
* Approval
* Rejection
* Send back
* Case status progression
* Audit recording

Phase 1 will not implement parallel branches, unrestricted BPMN modelling or complex automated workflows.

---

# 10. Generic Design Studio scope

The Design Studio will include the following Phase 1 capabilities.

## 10.1 Solution Builder

Users can:

* Create a solution
* Enter a solution name
* Enter a description
* Define a solution prefix
* Save the solution as Draft
* View solution status
* Open the solution for configuration

## 10.1 Solutions Home & Solution Creation

Users can:

* Access Solutions Home (`/studio/solutions`) displaying solutions belonging strictly to their trusted active organisation context.
* View page heading and explanatory header text describing the solution portfolio.
* View solution summary cards/rows displaying Solution Name, Solution Prefix / Key, Status (`Draft`), and Last Updated timestamp.
* Trigger the **Open** action to enter the Design Studio for a solution.
* Experience dedicated UI states: Loading indicator during fetch, Empty state with a "Create Solution" action trigger when no solutions exist, and a Safe Error state with recovery guidance if solution loading fails.
* Trigger **Create Solution** action to open a creation form/modal.
* Enter Solution Name and Description.
* View an automatically suggested Solution Prefix derived from the Solution Name (with user editability).
* The Solution Prefix (`solution_prefix`) is normalized to uppercase (e.g. `CDD`), validated for active-organisation uniqueness, and serves as the primary prefix for generated technical property names (while also available for case number formatting). The Solution `key` is unified with or deterministically derived from `solution_prefix`.
* Save the solution as Draft and open it for configuration.

## 10.2 Solution Aggregate & Data Ownership (Phase 1 Baseline)

In Phase 1, the Case Type layer is eliminated. A Solution application directly owns:
* Solution Data Dictionary properties
* Solution-owned reusable Choice Lists
* Shared Solution Form Layout
* Solution Work Queues
* Solution Sequential Workflow

Choice-list selection cardinality is resolved: **Cardinality belongs to the Property** (`SINGLE` or `MULTIPLE`). `SINGLE` cardinality properties permit `DROPDOWN` or `RADIO` controls. `MULTIPLE` cardinality properties permit `MULTI_SELECT_DROPDOWN` or `CHECKBOXES` controls.

## 10.3 Solution Data Dictionary & Property Identity Contract

Users can create configurable Data Dictionary properties.

### Property Identity Contract
- **Local Symbolic Name**: Lowercase or uppercase symbolic name entered by the user, normalized to canonical uppercase `SNAKE_CASE` (e.g. `FIRST_NAME`).
- **Solution Prefix**: Uppercase prefix owned by the solution aggregate (e.g. `CDD`).
- **Generated Read-Only Technical Property Name**: Automatically constructed as `<PREFIX>_<LOCAL_SYMBOLIC_NAME>` (e.g. `CDD_FIRST_NAME`), containing exactly one underscore separator.
- **Rules**: Must start with an alphabetic character, contain only alphanumeric and underscore characters, enforce maximum length of 64 characters, reject reserved names and unsupported characters, and enforce uniqueness within the Solution aggregate.
- **Mutability**: Local symbolic name and data type are mutable ONLY while the property remains draft and unused within the solution layout.

### Phase 1 Core Stored Data Types & UI Controls
Core Stored Data Types:
* Text (`TEXT`)
* Number (`NUMBER`)
* Date (`DATE`)
* Date and Time (`DATETIME`)
* Boolean (`BOOLEAN`)
* User Reference (`USER_REFERENCE`)

UI Form Controls & Format Presets:
* Text input (`TEXT_INPUT`)
* Textarea (`TEXTAREA`)
* Email preset (`TEXT` with `EMAIL` format preset)
* Phone preset (`TEXT` with `PHONE` format preset)
* Dropdown and Choice Radio (backed by solution-owned Choice Lists for `TEXT`/`NUMBER` data types)
* Single Checkbox and Yes/No Radio (backed directly by `BOOLEAN` stored data type; do NOT require or use a Choice List)
* Date picker, Date-Time picker, Number input, User picker

Grid / Repeating Table is explicitly deferred.

### Boolean Semantics
A single Boolean checkbox and Yes/No Boolean radio do NOT require or use a choice list. Checkbox-group support remains deferred pending an approved multi-choice contract.

## 10.4 Form Designer & Shared Form Structure
Users can configure one shared Form layout per Solution application that is reused across the workflow lifecycle. Forms do NOT vary by creating separate per-queue or per-step form layouts.

Users can:
* Add Data Dictionary properties to the shared form layout
* Remove property references from the form layout
* Organise fields into sections and tabs (initial layout starts with one default tab provisioned on creation)
* Reorder fields deterministically using move-up / move-down controls
* Configure base field reference settings via a **One-Place Field Inspector**

### One-Place Field Inspector & Queue-Context Field Overrides
Selecting a form field reference in Form Studio exposes BOTH configuration tiers:
- **Canonical Data Dictionary Tier ("Applies everywhere")**: Stored data type, label, format preset (`EMAIL`, `PHONE`), choice list binding, default value, help text, minimum/maximum length or range constraints, pattern/regex validation rules.
- **Form Reference Tier ("Base Form Structure & Queue Rules")**: Form layout placement (tab, section), display ordering sequence, base control type, and queue-context field behavior rules (defining static visibility (`visible`/`hidden`), editability (`editable`/`read-only`), and requirement state (`mandatory`/`optional`) per work context/queue without duplicating forms).

## 10.5 Role Designer

> [!NOTE]
> Deferred in INC-03; capability planned for INC-04.

Users can define solution-specific roles.

A user may belong to more than one solution role.

A solution role may contain multiple users.

Platform roles and solution roles must remain separate concepts.

## 10.6 Queue & User Access Configuration

> [!NOTE]
> Deferred in INC-03; capability planned for INC-04.

A Solution aggregate defines work queues for routing work items.

Users can:
* Create work queues (e.g. `SOL Maker`, `SOL Checker`, `TFC Comp`, `TFC Auth`)
* Assign users to one or more queues directly
* Determine queue accessibility for Navigator In Baskets and WID processing

Tasks/WIDs are routed to queues rather than being directly assigned to one fixed user by default.

## 10.7 Sequential Queue Workflow

> [!NOTE]
> Deferred in INC-03; capability planned for INC-04.

Phase 1 workflow is intentionally simple, moving a Work Item Descriptor (WID) sequentially from one queue to another (e.g., Start → SOL Maker → SOL Checker → TFC Comp → TFC Auth → End).

Users can:
* Define sequential queue steps
* Assign each step to a work queue
* Configure step completion outcomes (e.g., Send, Approve, Reject, Send Back)
* Configure queue-specific field rules (Visible/Hidden, Editable/Read-only, Mandatory/Optional) on the shared Form for that step

Advanced workflow components (DB steps, custom API calls, timers/delays, automated decision nodes, script engines, notifications) are out of scope for Phase 1 implementation.

## 10.8 Document Type Designer

> [!NOTE]
> Deferred in INC-03; capability planned for INC-09.

Users can:
* Create document types
* Name document types
* Mark a document type as required or optional
* Allow one or multiple documents of a type
* Associate document requirements with case creation or workflow steps

Document Viewer and Document List are first-class WID processing page capabilities and belong to the runtime processing page layout, not inside the Form definition.

## 10.9 Validate and Publish

> [!NOTE]
> Deferred in INC-03; capability planned for a later authorised publishing increment (INC-05). INC-03 provides optimistic concurrency revisioning (`expectedRevision` counter returning HTTP 409 Conflict on stale updates) for draft solution configurations.

Users can:
* Validate the complete configuration
* View blocking validation errors
* View non-blocking warnings
* Publish a valid solution
* View the published version number

A published version must be immutable.

Future changes must be made through a new Draft version.

---

# 11. Navigator & WID Processing Page Scope

## 11.1 Navigator Entry & In Baskets
* **Solution Entry**: Logging in and opening a Solution displays a clean work entry point (accessible In Baskets, Case Search, and Create Case where permitted). Opening a Solution does NOT automatically open the last-used queue.
* **In Baskets**: In Baskets are Navigator-facing list views of WIDs currently in a queue. They are NOT a separate workflow engine. The Navigator displays only In Baskets corresponding to queues the logged-in user is authorized to access based on queue membership.
* **Workspace Tabs**: Opening a WID from an In Basket opens the WID processing page. Multiple WIDs can remain open concurrently in Navigator workspace tabs.
* **Case Search vs. WID Editing**: Searching opens Case Details in read-only mode. Editing business data occurs strictly through an active WID processing page, not through Case Search.

## 11.2 Standard System-Defined WID Processing Page
Phase 1 does NOT use a configurable Page Designer or per-step page templates. It uses a single system-defined default WID processing page.
* **Page Layout**:
  - Toolbar at top (WID actions: Send, Claim, Release, Approve, Reject, etc.)
  - Document Viewer on left
  - Shared Form/View on right (displaying the business data fields configured with step queue-context rules)
  - Document List below the Form/View
* **Form Boundary**: The Form represents strictly the business-data portion of the WID processing page, not the entire page layout.

## 11.3 Case Creation
An authorised user can:
* Select a published solution
* Open the case creation form
* Enter required initial data
* Upload permitted documents
* Submit the case to instantiate the WID into the initial workflow queue
* Record audit events

## 11.3 Case Workspace

The Case Workspace will include:

* Case header
* Case number
* Current status
* Case properties
* Current workflow stage
* Current and completed tasks
* Comments
* Documents
* Document Grid
* Document Viewer
* Audit Timeline

## 11.4 Task Workspace

The Task Workspace will include:

* Task name
* Task instructions
* Due date
* Queue
* Claimed user
* Case information
* Editable properties
* Read-only properties
* Required properties
* Comments
* Documents
* Available workflow outcomes
* Confirmation before task completion

## 11.5 Task claiming and locking

Phase 1 will support:

* Tasks entering a queue
* Eligible users viewing queue tasks
* One user claiming a task
* Task locking after claim
* Release of claimed tasks
* Supervisor reassignment
* Prevention of simultaneous task completion
* Prevention of duplicate completion

The backend must enforce locking and concurrency rules.

Frontend disablement alone is insufficient.

## 11.6 Comments

Users with case access may add comments where permitted.

Phase 1 should support:

* Plain-text comments
* Author
* Timestamp
* Case association
* Task association where applicable
* User mentions where practical

Comments must be audited.

## 11.7 Case status

Case status is controlled through workflow progression.

Users must not directly edit the status property through standard case forms.

Administrative correction, if introduced, must be separately authorised and audited.

---

# 12. Document management baseline

Every case will include:

```text
Documents
├── Document Grid
└── Document Viewer
```

## 12.1 Document Grid

The grid will display:

* Document name
* Document type
* Description
* File type
* File size
* Uploaded by
* Uploaded date
* Document status
* Available actions

Phase 1 actions:

* View
* Download
* Replace
* Delete

Delete must be a controlled soft deletion or logical removal.

Deletion must remain visible in the audit history.

## 12.2 Document Viewer

Phase 1 viewer support:

* PDF
* PNG
* JPG
* JPEG

Viewer capabilities:

* Open inside the Case Workspace
* Side-by-side use with the Document Grid on desktop
* Full-screen expansion
* Zoom
* Fit-to-screen
* PDF page navigation
* Image viewing
* Download
* Collapse viewer

DOCX and XLSX may initially be download-only unless Boss proposes a secure, low-complexity preview mechanism.

## 12.3 File types

Initial supported uploads:

* PDF
* PNG
* JPG
* JPEG
* DOCX
* XLSX
* TXT

## 12.4 File-size limit

The initial default limit will be 25 MB per file.

The limit should be configurable later.

## 12.5 Storage names

The original filename will remain visible to users.

The platform will create a secure internal storage key based on identifiers such as:

* Organisation
* Solution
* Case
* Document

The internal path must not be exposed directly.

## 12.6 Document access

Document access follows case access.

Every preview, download, replace or deletion request must verify backend permissions.

Document URLs must not provide uncontrolled direct access.

## 12.7 Document audit

The platform will audit:

* Upload
* Preview
* Download
* Replace
* Delete

---

# 13. Document storage principle

IBM Datacap is not the primary UCS CM document repository.

Datacap is a document capture, classification and extraction product.

UCS CM requires its own document repository capability.

Phase 1 must use a document-storage abstraction supporting:

* Local development
* Docker deployment
* Internal Linux deployment
* Future object storage
* Future cloud storage
* Future on-premise client storage

PostgreSQL will store document metadata.

The actual document binary will be stored through the document-storage implementation selected during architecture review.

Future intelligent capture may support:

```text
Upload, scan or email
→ Classification
→ OCR and extraction
→ Verification
→ UCS CM document repository
→ Case creation or case update
```

Intelligent capture is not part of Phase 1.

---

# 14. Search baseline

Phase 1 search may be implemented using the relational database.

Search fields may include:

* Case number
* Reference number
* Solution
* Case status
* Created date
* Created by
* Assigned user
* Queue
* Subject or customer name
* Selected configurable properties

Closed cases remain searchable.

Full-text document search, OCR search, fuzzy search and advanced search builders are excluded.

---

# 15. Notifications baseline

Phase 1 will include in-application notifications for:

* New task available in an authorised queue
* Task claimed
* Task reassigned
* Task released
* Task sent back
* Task due soon
* Task overdue
* Case requiring attention

Email notifications are not required for the first implementation.

Notification templates and external delivery channels may be added later.

---

# 16. Audit baseline

UCS CM will maintain two audit views.

## 16.1 Case Audit Timeline

Records activity related to a specific case, including:

* Case created
* Case property updated
* Task created
* Task claimed
* Task released
* Task reassigned
* Task completed
* Task sent back
* Document uploaded
* Document viewed
* Document downloaded
* Document replaced
* Document deleted
* Comment added
* Case status changed
* Case closed
* Case reopened in future

## 16.2 Platform Audit Console

Records platform and administrative actions, including:

* Login success
* Login failure
* Logout
* User created
* User activated or deactivated
* Permission assigned
* Permission removed
* Access allowed
* Access denied
* Solution created
* Solution updated
* Solution validation
* Solution published
* Administrative action

## 16.3 Audit storage

Primary audit information must be stored in an append-only database model.

Normal application users must not be able to edit or delete audit events.

The platform should record before-and-after values for important business property and configuration changes.

Sensitive values may be masked.

Audit export may be added where practical.

---

# 17. Authentication and access baseline

Phase 1 will initially support:

* Username and password
* Administrator-created users
* Secure password storage
* Session timeout
* Immediate access revocation when a user is deactivated
* Backend permission enforcement
* Organisation-aware records
* Separate platform and solution roles

Google login, Microsoft login and enterprise SSO are later capabilities.

All Phase 1 records should include an organisation boundary even when only one organisation is used during demonstration.

---

# 18. Administration Console baseline

Phase 1 administration should remain limited but useful.

It may include:

* Organisations
* Users
* Platform roles
* Solution-role membership
* Queue membership
* Cases
* Current workflow state
* Open and completed tasks
* Task locks
* Basic audit access
* Basic platform configuration

Administrators may inspect case and task state.

Administrators must not silently change business data or workflow position.

Any administrative correction capability must require:

* Explicit permission
* Mandatory reason
* Full audit event

---

# 19. Phase 1 portability proof

Before Phase 1 is signed off, the team will configure a second lightweight industry solution without changing source code.

Recommended portability solution:

```text
Industry: Healthcare
Solution: Patient Grievance Management
```

The portability solution must use:

* Different properties
* Different roles
* Different queues
* Different document types
* A slightly different sequential workflow
* The same generic platform capabilities

The portability test is configuration work, not a second product implementation.

---

# 20. Phase 1 architecture boundary

Phase 1 will use a modular monolith.

Logical areas may include:

```text
Application
├── Authentication and Access
├── Organisation Management
├── Solution Configuration
├── Solution Data Dictionary
├── Properties and Forms
├── Roles and Queues
├── Workflow Configuration
├── Publishing
├── Runtime Cases
├── Task Execution
├── Documents
├── Comments
└── Audit
```

These are logical modules, not independent microservices.

Phase 1 infrastructure should remain limited to:

* Application
* PostgreSQL
* Document storage
* Required authentication support
* Docker
* Basic CI
* Basic logging and monitoring

---

# 21. Technology preferences requiring architecture review

Current preferences:

* Next.js
* PostgreSQL
* Temporal
* Docker
* Linux deployment
* Open-source dependencies where practical

These are preferences, not fully approved architecture decisions.

Boss must evaluate:

* Whether Next.js should contain both frontend and backend functionality
* Whether a separate API application is justified
* Whether Temporal provides enough Phase 1 benefit to justify its complexity
* Whether a simpler state-machine implementation is safer
* Document-storage options
* Authentication implementation
* Queue locking and concurrency
* Deployment topology
* Testing approach

Boss must recommend the smallest production-credible architecture.

---

# 22. Explicit Phase 1 exclusions

Boss must not implement the following unless separately approved:

* Microservices
* Kubernetes
* Kafka
* Complex event architecture
* OpenSearch
* Full BPMN designer
* Parallel workflow branches
* Dynamic subprocesses
* Complex automated service tasks
* Rule engine
* DMN engine
* Advanced escalation chains
* Full email notification infrastructure
* External customer portal
* Enterprise SSO
* Advanced multi-tenant administration
* Multiple environment promotion
* Solution marketplace
* Advanced dashboards
* Reporting builder
* OCR
* Intelligent document capture
* AI functionality
* Document version control
* Document annotations
* Records management
* Full mobile application
* Complex case relationships
* Permanent case deletion
* Real client data

Future compatibility may be considered, but no excluded capability should materially complicate Phase 1.

---

# 23. Security baseline

The platform must be designed to reduce security risk through:

* Backend authorisation
* Organisation isolation
* Solution-role enforcement
* Queue-access enforcement
* Task-lock enforcement
* Document-access enforcement
* Input validation
* Secure password storage
* Secure sessions
* Safe file upload validation
* File-size restrictions
* MIME and extension checks
* Secure storage keys
* Audit trails
* Secrets outside source code
* Dependency checks
* Database constraints
* Transactional workflow progression
* No false-success states

No system can guarantee that a security breach will never occur.

Security must be tested and strengthened throughout development.

Only fictional and synthetic data may be used in Phase 1.

---

# 24. Validation principles

All important rules must be enforced by the backend.

Frontend validation exists for usability but is not a security or integrity boundary.

Validation must prevent:

* Publishing incomplete configurations
* Duplicate internal property keys
* Invalid field definitions
* Required fields missing from forms
* Workflow tasks without queues
* Invalid workflow transitions
* Missing final workflow outcomes
* Creating cases from Draft configurations
* Direct case-status manipulation
* Skipping workflow tasks
* Duplicate task completion
* Simultaneous task completion
* Unauthorised task access
* Unauthorised document access
* Editing closed cases
* Deleting published definitions
* Partial workflow progression
* Missing audit events
* Fake success after failed storage or database operations

A dedicated Validation and Loophole Register will provide detailed test cases.

---

# 25. Phase 1 implementation principle

Development must proceed through working vertical increments.

Recommended sequence:

```text
Project foundation
→ Solution and case-type configuration
→ Properties and forms
→ Roles and queues
→ Workflow configuration
→ Validation and publishing
→ Runtime form generation
→ Case creation
→ Task queue, claim and lock
→ Task completion and workflow progression
→ Comments
→ Documents and viewer
→ Notifications
→ Audit
→ BFSI end-to-end verification
→ Healthcare portability verification
```

Configuration created in the Design Studio must drive runtime behaviour at every applicable stage.

---

# 26. Phase 1 completion criteria

Phase 1 is complete when the following scenario succeeds:

1. An administrator creates the required fictional users.
2. A Solution Designer creates the Customer Due Diligence Management solution.
3. The Solution Designer configures the Solution Data Dictionary and Choice Lists.
4. Configurable properties are defined.
5. The case form is configured.
6. Solution roles are created.
7. Work queues are created and linked to roles.
8. A sequential workflow is configured.
9. Document types are defined.
10. The platform validates the configuration.
11. The solution is published as an immutable version.
12. An authorised runtime user creates a CDD case.
13. The platform generates a case number.
14. The first task enters the correct queue.
15. An eligible user claims and locks the task.
16. The user updates permitted case properties.
17. The user uploads and views documents.
18. The user completes the task.
19. The platform creates the next task.
20. The case moves through approval, rejection or send-back behaviour.
21. The final approved or rejected outcome closes the case appropriately.
22. Closed-case editing is restricted.
23. The Document Grid and Document Viewer work correctly.
24. The complete case audit history is visible.
25. Permission, locking and duplicate-completion tests pass.
26. The Patient Grievance portability solution is configured without source-code changes.
27. Deployment and administrator documentation are available.
28. A demonstration script and fictional sample data are available.
29. Automated build and test checks pass.
30. The Product Lead and project team approve the result.

---

# 27. Instructions for Boss

Boss is expected to operate as:

* Senior Solution Architect
* Senior Full-Stack Developer
* Database Designer
* Security-conscious technical reviewer

Boss must:

* Follow approved product requirements.
* Keep the platform industry-neutral.
* Identify missing dependencies and loopholes.
* Propose simplifications where appropriate.
* Record architecture decisions.
* Maintain module boundaries.
* Implement backend validation.
* Add automated tests.
* Provide exact verification evidence.
* Flag conflicting requirements.
* Seek Product Lead approval for material scope or behaviour changes.

Boss must not:

* Expand scope silently.
* Hard-code BFSI behaviour.
* Introduce microservices without approval.
* Add future features merely for completeness.
* Treat frontend checks as backend security.
* Create fake success states.
* Skip audit recording.
* Select major dependencies without review.
* Begin broad implementation before architecture approval.
* Claim completion without test evidence.

---

# 28. Next formal documents

The following documents will be prepared after this baseline:

1. BFSI Reference Solution Specification
2. Detailed Functional Requirements
3. UX and Navigation Specification
4. Roles, Queues and Permissions Matrix
5. Workflow Specification
6. Document Management Specification
7. Validation and Loophole Register
8. Audit and Security Specification
9. Acceptance and Test Strategy
10. Boss Architecture Review Brief

This Phase 1 Product Baseline remains the controlling document unless formally revised.