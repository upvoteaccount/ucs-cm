# 04. Metadata and Publishing Model

**Document Status:** Approved for Phase 1 Implementation  
**Phase:** Phase 1  
**Author:** Senior Architect (Boss)  

---

## 1. Purpose & Core Concepts

This document defines how solution configurations created in the Design Studio are modeled, validated, published, and snapshot for runtime execution.

**Property Designer Scope**: Phase 1 supports core stored data types (`TEXT`, `NUMBER`, `DATE`, `DATETIME`, `BOOLEAN`, `USER_REFERENCE`), format presets (`EMAIL`, `PHONE`), UI form controls, and solution-owned Choice Lists. (Grid / Repeating Table is explicitly deferred).

### Key Architectural Constraints
1. **Solution Aggregate Ownership**: The Solution application entity directly owns Data Dictionary properties, solution-owned Choice Lists, and Form layouts. The Case Type layer is eliminated in Phase 1.
2. **Approved Property Identity Contract**:
   - Local symbolic name entered as lowercase `snake_case` (e.g. `customer_name`).
   - Solution prefix owned by Solution aggregate (e.g. `CDD`).
   - Generated read-only technical property name: `<PREFIX>_<LOCAL_SYMBOLIC_NAME>` (e.g. `CDD_customer_name`), containing exactly one underscore separator.
   - Symbolic rules: alphabetic start, alphanumeric/underscore characters, <=64 chars, reserved name/char rejection, uniqueness within Solution.
   - Mutability: Local symbolic name and data type are mutable ONLY while draft and unused within the solution layout.
3. **Choice-List Selection Cardinality Unresolved**: Choice-list selection cardinality ownership (whether single-select vs multi-select cardinality is specified on the Choice List definition or on the Property/Control binding) is recorded as UNRESOLVED and explicitly deferred to INC-03B design without structurally implying an answer.
4. **Draft Workspace & Optimistic Concurrency**: All metadata configuration changes take place within a Draft solution workspace governed by an optimistic concurrency counter (`expectedRevision` returning HTTP 409 Conflict with clear error message and reload option on stale updates; no automatic merge or silent overwrite; failed updates change nothing in database and produce no audit events; exact revision boundary model is recorded as an INC-03B implementation decision).
5. **Deferred Publishing Engine**: Solution publishing engine and immutable snapshot compilation are deferred to a later authorised publishing increment (INC-05). INC-03 delivers Draft Solution Data Dictionary and Form Studio configuration.

---

## 2. Schema Lifecycle State Machine

```text
[ New Solution ] ---> ( Draft Solution Workspace )
                             |
                             |  1. Solution Designer configures Properties, Choice Lists, Form Layout
                             v
                     ( Validation Check ) <--- [ Validation Errors? Fix in Draft ]
                             |
                             |  2. Validation Passes (Future Increment)
                             v
                     [ Publish Action ] (Deferred to INC-05)
                             |
                             +-----------------------------------+
                             |                                   |
                             v                                   v
             ( Published Solution Version )         ( New Draft Workspace )
             [ IMMUTABLE SNAPSHOT ]                 [ Modifiable Workspace ]
                     |
                     |  3. Runtime Users create cases using Published Version
                     v
             [ Runtime Case Instances ]
             (Linked to version_id)
```

---

## 3. High-Level Logical Entity Aggregate Model (Schema Subsystem)

Note: High-level aggregate ownership is defined below. Physical database schemas, table names, attribute types, and Drizzle migrations will be proposed in INC-03B.

```text
+--------------------------------+       +------------------------------------+
|         organisations          |       |             solutions              |
+--------------------------------+       +------------------------------------+
| id (PK)                        |1    * | id (PK)                            |
| name                           |-------| organisation_id (FK)               |
| key                            |       | solution_prefix ("CDD")            |
+--------------------------------+       | name, description                  |
                                         | revision (Counter)                 |
                                         +------------------------------------+
                                                           | 1
                                                           |
                                      +--------------------+--------------------+
                                      | 1                                       | 1
                                      | *                                       | *
                 +--------------------+-----------+           +-----------------+-------------------+
                 |    Data Dictionary Properties  |           |     Solution Choice Lists         |
                 +--------------------------------+           +-------------------------------------+
                 | local_symbolic_name            |           | key (Symbolic Name)                 |
                 | generated_technical_name       |           | name                                |
                 | label, stored_data_type        |           | choice options (ordered set)        |
                 | format_preset / choice_binding |           +-------------------------------------+
                 +--------------------------------+                             |
                                      | 1                                       |
                                      |                                         |
                                      | *                                       |
                 +--------------------+-----------------------------------------+
                 |             Form Layout Studio (Tabs & Sections)             |
                 +--------------------------------------------------------------+
                 | tabs (ordered list with initial default tab)                 |
                 | sections (ordered list within tabs)                          |
                 | field references (unique property references with static UI  |
                 |                   states: visible, enabled, editable, req)   |
                 +--------------------------------------------------------------+
```

---

## 4. Published Version Snapshot Conceptual Structure

When a solution is published (deferred to INC-05), the complete solution definition graph (Properties, Choice Lists, Forms, Roles, Queues, Workflows, Document Types) is compiled into a single canonical, immutable JSON document stored inside `solution_versions.snapshot_json`.

### High-Level Conceptual Structure Overview

```json
{
  "$schemaVersion": "1.0.0",
  "solution": {
    "key": "CDD",
    "name": "Customer Due Diligence Management",
    "solutionPrefix": "CDD",
    "version": 1
  },
  "properties": [
    {
      "localSymbolicName": "customer_name",
      "generatedTechnicalName": "CDD_customer_name",
      "label": "Customer Name",
      "storedDataType": "TEXT",
      "formatPreset": "NONE"
    }
  ],
  "choiceLists": [],
  "formLayout": {
    "tabs": []
  }
}
```

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
