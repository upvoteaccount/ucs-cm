# UCS CM Phase 1
## BFSI KYC Exception Reference Solution

**Document Status:** Approved Product Specification  
**Solution:** Customer Due Diligence Management  
**Case Type:** KYC Exception

## Purpose
Defines the complete fictional BFSI reference configuration used to prove UCS CM without hard-coded BFSI logic.

## Solution Definition
| Item | Value |
|---|---|
| Solution Key | CDD |
| Case Type Key | KYC_EXCEPTION |
| Case Number | CDD-KYC-{6-digit sequence} |
| Initial Status | NEW |
| Final Statuses | CLOSED_APPROVED / CLOSED_REJECTED |

## Mandatory Property Types
Text, Long Text, Number, Date, Date and Time, Boolean, Dropdown, Email, Phone, User. Grid / Repeating Table remains stretch scope.

## Case Properties
| Key | Label | Type | Creation Required | Sensitive |
|---|---|---|---:|---:|
| customer_name | Customer Name | Text | Yes | No |
| customer_reference | Customer Reference | Text | Yes | Yes |
| date_of_birth | Date of Birth | Date | Yes | Yes |
| email_address | Email Address | Email | No | Yes |
| mobile_number | Mobile Number | Phone | Yes | Yes |
| exception_type | Exception Type | Dropdown | Yes | No |
| exception_description | Exception Description | Long Text | Yes | No |
| risk_rating | Risk Rating | Dropdown | No | No |
| discrepancy_count | Discrepancy Count | Number | No | No |
| documents_verified | Documents Verified | Boolean | No | No |
| review_due_date | Review Due Date | Date and Time | No | No |
| assigned_compliance_user | Assigned Compliance User | User | No | No |
| reviewer_comments | Reviewer Comments | Long Text | No | No |
| compliance_comments | Compliance Comments | Long Text | No | No |
| final_decision_reason | Final Decision Reason | Long Text | No | No |
| final_decision_date | Final Decision Date | Date and Time | No | No |
| created_channel | Created Channel | Dropdown | Yes | No |
| priority | Priority | Dropdown | Yes | No |

## Form Sections
1. Customer Details
2. Exception Details
3. Review Details
4. Final Decision

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
