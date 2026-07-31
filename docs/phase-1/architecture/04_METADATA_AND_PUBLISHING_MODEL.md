# 04. Metadata and Publishing Model

**Document Status:** Approved for Phase 1 Implementation  
**Phase:** Phase 1  
**Author:** Senior Architect (Boss)  

---

## 1. Purpose & Core Concepts

This document defines how solution configurations created in the Design Studio are modeled, validated, published, and snapshot for runtime execution.

**Property Designer Scope**: Phase 1 supports exactly 10 mandatory property types: `TEXT`, `LONG_TEXT`, `NUMBER`, `DATE`, `DATETIME`, `BOOLEAN`, `DROPDOWN`, `EMAIL`, `PHONE`, and `USER`. (Grid / Repeating Table is stretch scope and excluded from mandatory primitives).

### Key Architectural Constraints
1. **Immutability of Published Solutions**: Once a solution version is published, its definition is strictly immutable (Section 10.9). No user or admin can edit a published schema.
2. **Draft Versioning**: All changes take place in a new `Draft` state.
3. **Reference Snapshotting Model**: Product Lead Decision #8 specifies that runtime cases reference the immutable published solution version (`solution_version_id`), avoiding redundant full-schema duplication per case unless explicit structural overrides occur.

---

## 2. Schema Lifecycle State Machine

```text
[ New Solution ] ---> ( Draft Version 1.0 )
                             |
                             |  1. Solution Designer configures Case Types, Properties, Forms, Queues, Workflows
                             v
                     ( Validation Check ) <--- [ Validation Errors? Fix in Draft ]
                             |
                             |  2. Validation Passes
                             v
                     [ Publish Action ]
                             |
                             +-----------------------------------+
                             |                                   |
                             v                                   v
             ( Published Version 1.0 )              ( New Draft Version 2.0 )
             [ IMMUTABLE SNAPSHOT ]                 [ Modifiable Workspace ]
                     |
                     |  3. Runtime Users create cases using Version 1.0
                     v
             [ Runtime Case Instances ]
             (Linked to version_id = 1.0)
```

---

## 3. Database Entity Relationship Diagram (Schema Subsystem)

```text
+--------------------------------+       +------------------------------------+
|         organisations          |       |             solutions              |
+--------------------------------+       +------------------------------------+
| id (PK)                        |1    * | id (PK)                            |
| name                           |-------| organisation_id (FK)               |
| key                            |       | key (stable prefix, e.g. "CDD")    |
+--------------------------------+       | name                               |
                                         +------------------------------------+
                                                           | 1
                                                           |
                                                           | *
                                         +------------------------------------+
                                         |         solution_versions          |
                                         +------------------------------------+
                                         | id (PK)                            |
                                         | solution_id (FK)                   |
                                         | version_number (e.g. 1, 2)        |
                                         | status ("DRAFT" | "PUBLISHED")     |
                                         | snapshot_json (JSONB - Full Spec) |
                                         | published_at                       |
                                         | published_by                       |
                                         +------------------------------------+
                                                           | 1
                                                           |
                                                           | *
                                         +------------------------------------+
                                         |             cases                  |
                                         +------------------------------------+
                                         | id (PK)                            |
                                         | solution_version_id (FK)           |
                                         | case_number (e.g. "CDD-KYC-00104") |
                                         | current_step_id                    |
                                         | property_values (JSONB Data)       |
                                         +------------------------------------+
```

---

## 4. Published Version Snapshot Structure (`snapshot_json`)

When a solution is published, the entire definition graph (Case Types, Properties, Forms, Roles, Queues, Workflows, Document Types) is compiled into a single canonical, immutable JSON document stored inside `solution_versions.snapshot_json`.

### Snapshot Schema Structure Overview

```json
{
  "$schemaVersion": "1.0.0",
  "solution": {
    "key": "CDD",
    "name": "Customer Due Diligence Management",
    "version": 1
  },
  "caseTypes": [
    {
      "key": "KYC_EXCEPTION",
      "name": "KYC Exception",
      "prefix": "KYC"
    }
  ],
  "properties": [
    {
      "key": "customer_name",
      "label": "Customer Name",
      "type": "TEXT",
      "required": true,
      "validation": { "minLength": 2, "maxLength": 100 }
    },
    {
      "key": "risk_rating",
      "label": "Risk Rating",
      "type": "DROPDOWN",
      "options": ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    }
  ],
  "formLayout": {
    "sections": [
      {
        "title": "Customer Details",
        "fields": ["customer_name", "risk_rating"]
      }
    ]
  },
  "roles": ["COMPLIANCE_OFFICER", "SUPERVISOR"],
  "queues": [
    { "key": "INITIAL_REVIEW_Q", "name": "Initial Review Queue", "allowedRoles": ["COMPLIANCE_OFFICER"] }
  ],
  "workflow": {
    "initialStep": "STEP_INITIAL_REVIEW",
    "steps": [
      {
        "id": "STEP_INITIAL_REVIEW",
        "name": "Initial Review",
        "queueKey": "INITIAL_REVIEW_Q",
        "editableProperties": ["risk_rating"],
        "requiredProperties": ["risk_rating"],
        "outcomes": [
          { "name": "APPROVE", "targetStepId": "STEP_FINAL_DECISION" },
          { "name": "REJECT", "terminalStatus": "CLOSED_REJECTED", "reasonRequired": true }
        ]
      }
    ]
  }
}
```

> [!NOTE]
> Although `caseTypes` is structured as a collection to ensure forward compatibility for Phase 2+, the Design Studio UI and Publishing Validation Engine enforce exactly **one** case type in Phase 1 configurations.

---

## 5. Architectural Decisions

### Choice 4.1: Canonical Immutable JSON Snapshotting on Publish
* **Decision**: Store the published solution snapshot as an immutable JSONB blob in `solution_versions.snapshot_json` while retaining relational normalized tables for the active Draft workspace.
* **Alternatives Considered**: 
  1. Rely exclusively on relational table rows marked with a `version_id` column.
  2. Duplicate full database relational table copies for every published version.
* **Rationale**:
  1. Provides strong schema immutability guarantees. Even if draft relational tables are edited, running cases referencing `solution_versions.snapshot_json` execute against the exact preserved snapshot schema state.
  2. Substantially simplifies runtime rendering: runtime forms fetch a single JSON payload for form layout and validation instead of executing complex multi-table JOINs.
* **Phase 1 Impact**: Fast runtime case loading, guaranteed schema version protection.
* **Future Implications**: Exporting and importing solutions between environments (Dev -> UAT -> Prod) becomes a trivial JSON export/import operation.
* **Risks**: Schema migration of historic `snapshot_json` formats if internal metadata specifications evolve in future phases.
* **Mitigations**: Version the snapshot JSON schema explicitly with a `$schemaVersion` root property.
* **Product Approval Required**: Approved (Decision Point #8).
