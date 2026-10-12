# UCS CM Phase 1
## BFSI KYC Exception Reference Solution

**Document Status:** Approved Product Specification  
**Solution:** Customer Due Diligence Management  

## Purpose
Defines the complete fictional BFSI reference configuration used to prove UCS CM without hard-coded BFSI logic.

## Solution Definition
| Item | Value |
|---|---|
| Solution Key | CDD |
| Case Number | CDD-KYC-{6-digit sequence} |
| Initial Status | NEW |
| Final Statuses | CLOSED_APPROVED / CLOSED_REJECTED |

## Solution Data Dictionary Primitives
Core stored types (`TEXT`, `NUMBER`, `DATE`, `DATETIME`, `BOOLEAN`, `USER_REFERENCE`), UI form controls (Text input, Textarea, Dropdown, Multi-select, Radio, Checkbox, Date picker, Date-Time picker, Number input, User picker), format presets (`EMAIL`, `PHONE`), and solution-owned Choice Lists. Grid / Repeating Table is explicitly deferred.

## Canonical Data Dictionary Definitions
Canonical property storage definitions are owned by the Solution Data Dictionary. Form presentation controls are configured separately in the Form Studio.

| Local Symbolic Name | Generated Technical Name | Label | Stored Data Type | Choice List | Required | Sensitive |
|---|---|---|---|---|---|---|
| `CUSTOMER_NAME` | `CDD_CUSTOMER_NAME` | Customer Name | `TEXT` | None | Yes | No |
| `CUSTOMER_REFERENCE` | `CDD_CUSTOMER_REFERENCE` | Customer Reference | `TEXT` | None | Yes | No |
| `DATE_OF_BIRTH` | `CDD_DATE_OF_BIRTH` | Date of Birth | `DATE` | None | Yes | No |
| email_address | CDD_email_address | TEXT | EMAIL format preset | No | Yes |
| mobile_number | CDD_mobile_number | TEXT | PHONE format preset | Yes | Yes |
| exception_type | CDD_exception_type | TEXT | Choice List: ExceptionTypes | Yes | No |
| exception_description | CDD_exception_description | TEXT | None | Yes | No |
| risk_rating | CDD_risk_rating | TEXT | Choice List: RiskRatings | No | No |
| discrepancy_count | CDD_discrepancy_count | NUMBER | Integer constraint | No | No |
| documents_verified | CDD_documents_verified | BOOLEAN | None (Single Checkbox) | No | No |
| review_due_date | CDD_review_due_date | DATETIME | None | No | No |
| assigned_compliance_user | CDD_assigned_compliance_user | USER_REFERENCE | Active Compliance Users | No | No |
| reviewer_comments | CDD_reviewer_comments | TEXT | None | No | No |
| compliance_comments | CDD_compliance_comments | TEXT | None | No | No |
| final_decision_reason | CDD_final_decision_reason | TEXT | None | No | No |
| final_decision_date | CDD_final_decision_date | DATETIME | None | No | No |
| created_channel | CDD_created_channel | TEXT | Choice List: IntakeChannels | Yes | No |
| priority | CDD_priority | TEXT | Choice List: Priorities | Yes | No |

## Initial Form Layout & Presentation Controls
Form presentation controls and field placement are configured on the Form layout reference tier:

| Property Reference | Section | UI Form Control / Presentation | Default States |
|---|---|---|---|
| customer_name | Customer Details | Text input | Visible, Enabled, Required |
| customer_reference | Customer Details | Text input | Visible, Enabled, Required |
| date_of_birth | Customer Details | Date picker | Visible, Enabled, Required |
| email_address | Customer Details | Text input (EMAIL format) | Visible, Enabled, Optional |
| mobile_number | Customer Details | Text input (PHONE format) | Visible, Enabled, Required |
| exception_type | Exception Details | Dropdown | Visible, Enabled, Required |
| exception_description | Exception Details | Textarea | Visible, Enabled, Required |
| created_channel | Exception Details | Dropdown | Visible, Enabled, Required |
| priority | Exception Details | Dropdown | Visible, Enabled, Required |
| risk_rating | Review Details | Dropdown | Visible, Enabled, Optional |
| discrepancy_count | Review Details | Number input | Visible, Enabled, Optional |
| documents_verified | Review Details | Single Checkbox | Visible, Enabled, Optional |
| review_due_date | Review Details | Date-Time picker | Visible, Enabled, Optional |
| assigned_compliance_user | Review Details | User picker | Visible, Enabled, Optional |
| reviewer_comments | Review Details | Textarea | Visible, Enabled, Optional |
| compliance_comments | Review Details | Textarea | Visible, Enabled, Optional |
| final_decision_reason | Final Decision | Textarea | Visible, Enabled, Optional |
| final_decision_date | Final Decision | Date-Time picker | Visible, Enabled, Optional |

## Roles and Queues
| Role | Queue |
|---|---|
| KYC Initiator | None |
| KYC Reviewer | KYC Initial Review |
| Compliance Officer | KYC Compliance Review |
| Final Approver | KYC Final Decision |
| KYC Supervisor | All KYC queues |

## Workflow
Case Submission → Initial Review → Compliance Review → Final Decision → Closed.

### Initial Review
- Status: UNDER_INITIAL_REVIEW
- Due: 24 hours
- Editable: risk_rating, discrepancy_count, documents_verified, reviewer_comments
- Required: risk_rating, documents_verified, reviewer_comments
- Outcomes: Complete → Compliance Review; Reject → Closed Rejected

### Compliance Review
- Status: UNDER_COMPLIANCE_REVIEW
- Due: 48 hours
- Editable: risk_rating, compliance_comments, assigned_compliance_user
- Required: compliance_comments
- Outcomes: Approve → Final Decision; Send Back → Initial Review; Reject → Closed Rejected

### Final Decision
- Status: PENDING_FINAL_DECISION
- Due: 24 hours
- Editable and required: final_decision_reason
- Outcomes: Approve → Closed Approved; Reject → Closed Rejected; Send Back → Compliance Review

## Document Types
Identity Proof, Address Proof, KYC Form, Discrepancy Note, Supporting Correspondence, Final Decision Note.

Allowed uploads: PDF, PNG, JPG, JPEG, DOCX, XLSX, TXT. Inline preview: PDF and images. Maximum 25 MB.

## Required Audit Events
Case created/submitted, properties updated, task created/claimed/released/reassigned/completed/sent back, status changed, document uploaded/viewed/downloaded/replaced/deleted, comment added, case closed, access denied.

## Primary Demo
Create and publish solution, create case, complete Initial Review, send back from Compliance, correct and resubmit, approve Compliance, approve Final Decision, close case, inspect full audit history.
