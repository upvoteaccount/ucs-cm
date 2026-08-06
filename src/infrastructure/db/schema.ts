import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  text,
  integer,
  index,
  uniqueIndex,
  unique,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 1. Organisations Table
export const organisations = pgTable(
  "organisations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// 2. Users Table
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// 3. Organisation Memberships Table
export const organisationMemberships = pgTable(
  "organisation_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_org_membership_user").on(table.organisationId, table.userId),
    index("idx_org_memberships_org").on(table.organisationId),
    index("idx_org_memberships_user").on(table.userId),
  ]
);

// 4. Platform Roles Table (Approved Keys: PLATFORM_ADMIN, SOLUTION_DESIGNER, RUNTIME_USER, SUPERVISOR)
export const platformRoles = pgTable(
  "platform_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// 5. Membership Platform Role Assignments
export const membershipPlatformRoles = pgTable(
  "membership_platform_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => organisationMemberships.id, { onDelete: "cascade" }),
    roleKey: varchar("role_key", { length: 64 })
      .notNull()
      .references(() => platformRoles.key, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_membership_role").on(table.membershipId, table.roleKey),
    index("idx_membership_roles_membership").on(table.membershipId),
  ]
);

// 6. Database-Backed Sessions Table (Hashed session token at rest)
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionTokenHash: varchar("session_token_hash", { length: 255 }).notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeOrganisationId: uuid("active_organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isRevoked: boolean("is_revoked").default(false).notNull(),
  },
  (table) => [
    index("idx_sessions_user").on(table.userId),
    index("idx_sessions_org").on(table.activeOrganisationId),
  ]
);

// 7. Append-Only Audit Events Table
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id").references(() => organisations.id, { onDelete: "set null" }),
    category: varchar("category", { length: 32 }).notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    actorType: varchar("actor_type", { length: 32 }).default("AUTHENTICATED_USER").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorIdentifier: varchar("actor_identifier", { length: 255 }),
    actorIpAddress: varchar("actor_ip_address", { length: 64 }),
    entityType: varchar("entity_type", { length: 64 }),
    entityId: uuid("entity_id"),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
    beforeState: jsonb("before_state"),
    afterState: jsonb("after_state"),
    metadata: jsonb("metadata").default({}).notNull(),
  },
  (table) => [
    index("idx_audit_org_category_ts").on(table.organisationId, table.category, table.timestamp),
    index("idx_audit_actor_user").on(table.actorUserId),
  ]
);

// 8. Solutions Aggregate Table
export const solutions = pgTable(
  "solutions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    solutionPrefix: varchar("solution_prefix", { length: 10 }).notNull(),
    revision: integer("revision").default(1).notNull(),
    status: varchar("status", { length: 32 }).default("DRAFT").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_solutions_org_prefix").on(table.organisationId, table.solutionPrefix),
    index("idx_solutions_org").on(table.organisationId),
    check("chk_solutions_prefix", sql`solution_prefix ~ '^[A-Z][A-Z0-9]{1,9}$'`),
    check("chk_solutions_status", sql`status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')`),
  ]
);

// 9. Choice Lists Table
export const choiceLists = pgTable(
  "choice_lists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    solutionId: uuid("solution_id")
      .notNull()
      .references(() => solutions.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uq_choice_lists_id_sol").on(table.id, table.solutionId),
    uniqueIndex("uq_choice_lists_solution_key").on(table.solutionId, table.key),
    index("idx_choice_lists_solution").on(table.solutionId),
  ]
);

// 10. Choice Options Table
export const choiceOptions = pgTable(
  "choice_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    choiceListId: uuid("choice_list_id")
      .notNull()
      .references(() => choiceLists.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 64 }).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    displayOrder: integer("display_order").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_choice_options_list_key").on(table.choiceListId, table.key),
    uniqueIndex("uq_choice_options_list_order").on(table.choiceListId, table.displayOrder),
    check("chk_choice_options_order", sql`display_order > 0`),
  ]
);

// 11. Solution Data Dictionary Properties Table
export const solutionProperties = pgTable(
  "solution_properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    solutionId: uuid("solution_id")
      .notNull()
      .references(() => solutions.id, { onDelete: "cascade" }),
    localSymbolicName: varchar("local_symbolic_name", { length: 53 }).notNull(),
    generatedTechnicalName: varchar("generated_technical_name", { length: 64 }).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    storedDataType: varchar("stored_data_type", { length: 32 }).notNull(),
    formatPreset: varchar("format_preset", { length: 32 }).default("NONE").notNull(),
    choiceListId: uuid("choice_list_id"),
    cardinality: varchar("cardinality", { length: 16 }).default("SINGLE").notNull(),
    defaultValue: text("default_value"),
    helpText: text("help_text"),
    isSensitive: boolean("is_sensitive").default(false).notNull(),
    validationRules: jsonb("validation_rules").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uq_properties_id_sol").on(table.id, table.solutionId),
    uniqueIndex("uq_properties_solution_local_name").on(table.solutionId, table.localSymbolicName),
    uniqueIndex("uq_properties_solution_tech_name").on(table.solutionId, table.generatedTechnicalName),
    index("idx_properties_solution").on(table.solutionId),
    index("idx_properties_choice_list").on(table.choiceListId),
    foreignKey({
      columns: [table.choiceListId, table.solutionId],
      foreignColumns: [choiceLists.id, choiceLists.solutionId],
      name: "fk_props_choice_list_same_sol",
    }).onDelete("restrict"),
    check("chk_prop_stored_data_type", sql`stored_data_type IN ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'DATETIME', 'USER_REFERENCE')`),
    check("chk_prop_format_preset", sql`format_preset IN ('NONE', 'EMAIL', 'PHONE')`),
    check("chk_prop_cardinality", sql`cardinality IN ('SINGLE', 'MULTIPLE')`),
    check("chk_prop_local_name", sql`local_symbolic_name ~ '^[a-z][a-z0-9_]{0,52}$'`),
    check("chk_prop_tech_name_len", sql`length(generated_technical_name) <= 64`),
  ]
);

// 12. Solution Forms Table (Enforces exactly 1 initial_form per Solution for INC-03)
export const solutionForms = pgTable(
  "solution_forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    solutionId: uuid("solution_id")
      .notNull()
      .references(() => solutions.id, { onDelete: "cascade" }),
    formKey: varchar("form_key", { length: 64 }).default("initial_form").notNull(),
    name: varchar("name", { length: 255 }).default("Initial Form").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uq_forms_id_sol").on(table.id, table.solutionId),
    uniqueIndex("uq_forms_solution_key").on(table.solutionId, table.formKey),
    index("idx_forms_solution").on(table.solutionId),
    check("chk_initial_form_key", sql`form_key = 'initial_form'`),
  ]
);

// 13. Form Tabs Table
export const formTabs = pgTable(
  "form_tabs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => solutionForms.id, { onDelete: "cascade" }),
    tabKey: varchar("tab_key", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uq_tabs_id_form").on(table.id, table.formId),
    uniqueIndex("uq_tabs_form_key").on(table.formId, table.tabKey),
    uniqueIndex("uq_tabs_form_order").on(table.formId, table.displayOrder),
    check("chk_form_tabs_order", sql`display_order > 0`),
  ]
);

// 14. Form Sections Table
export const formSections = pgTable(
  "form_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => solutionForms.id, { onDelete: "cascade" }),
    tabId: uuid("tab_id").notNull(),
    sectionKey: varchar("section_key", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uq_sections_id_form").on(table.id, table.formId),
    uniqueIndex("uq_sections_tab_key").on(table.tabId, table.sectionKey),
    uniqueIndex("uq_sections_tab_order").on(table.tabId, table.displayOrder),
    foreignKey({
      columns: [table.tabId, table.formId],
      foreignColumns: [formTabs.id, formTabs.formId],
      name: "fk_sections_tab_same_form",
    }).onDelete("restrict"), // Deleting non-empty tab is RESTRICTED at DB level
    check("chk_form_sections_order", sql`display_order > 0`),
  ]
);

// 15. Form Field References Table
export const formFieldReferences = pgTable(
  "form_field_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    solutionId: uuid("solution_id").notNull(),
    formId: uuid("form_id").notNull(),
    sectionId: uuid("section_id").notNull(),
    propertyId: uuid("property_id").notNull(),
    controlType: varchar("control_type", { length: 32 }).notNull(),
    displayOrder: integer("display_order").notNull(),
    visibleOverride: boolean("visible_override"),
    enabledOverride: boolean("enabled_override"),
    editableOverride: boolean("editable_override"),
    requiredOverride: boolean("required_override"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_field_refs_form_property").on(table.formId, table.propertyId),
    uniqueIndex("uq_field_refs_section_order").on(table.sectionId, table.displayOrder),
    index("idx_field_refs_property").on(table.propertyId),
    foreignKey({
      columns: [table.formId, table.solutionId],
      foreignColumns: [solutionForms.id, solutionForms.solutionId],
      name: "fk_field_refs_form_same_sol",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.propertyId, table.solutionId],
      foreignColumns: [solutionProperties.id, solutionProperties.solutionId],
      name: "fk_field_refs_prop_same_sol",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.sectionId, table.formId],
      foreignColumns: [formSections.id, formSections.formId],
      name: "fk_field_refs_section_same_form",
    }).onDelete("restrict"),
    check("chk_field_ref_control_type", sql`control_type IN ('TEXT_INPUT', 'TEXTAREA', 'DROPDOWN', 'RADIO', 'CHECKBOX', 'DATE_PICKER', 'DATETIME_PICKER', 'USER_PICKER', 'NUMBER_INPUT')`),
    check("chk_field_refs_order", sql`display_order > 0`),
  ]
);
