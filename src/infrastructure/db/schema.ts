import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
