import { getDb } from "../infrastructure/db/client";
import {
  organisations,
  users,
  organisationMemberships,
  platformRoles,
  membershipPlatformRoles,
} from "../infrastructure/db/schema";
import { authService, PLATFORM_ROLES } from "../modules/auth";
import { logger } from "./logger";

export async function seedDevelopmentData() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development seed script strictly refused to run in production mode (NODE_ENV=production)");
  }

  const db = getDb();
  logger.info("Seeding development synthetic data...", "SeedScript");

  const defaultRoles = [
    { key: PLATFORM_ROLES.PLATFORM_ADMIN, name: "Platform Administrator", description: "System & Tenant Admin" },
    { key: PLATFORM_ROLES.SOLUTION_DESIGNER, name: "Solution Designer", description: "Design Studio Authoring" },
    { key: PLATFORM_ROLES.RUNTIME_USER, name: "Runtime User", description: "Case & Task Operational Execution" },
    { key: PLATFORM_ROLES.SUPERVISOR, name: "Supervisor", description: "Operational Queue Supervision" },
  ];

  for (const role of defaultRoles) {
    await db
      .insert(platformRoles)
      .values(role)
      .onConflictDoNothing({ target: platformRoles.key });
  }

  const [org] = await db
    .insert(organisations)
    .values({
      key: "acme-corp",
      name: "ACME Corporation",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: organisations.key,
      set: { name: "ACME Corporation" },
    })
    .returning();

  const passwordHash = await authService.hashPassword("Password123!");

  const syntheticUsers = [
    { email: "admin@acme.com", fullName: "Alice Admin", role: PLATFORM_ROLES.PLATFORM_ADMIN },
    { email: "designer@acme.com", fullName: "Bob Designer", role: PLATFORM_ROLES.SOLUTION_DESIGNER },
    { email: "worker@acme.com", fullName: "Charlie Worker", role: PLATFORM_ROLES.RUNTIME_USER },
    { email: "supervisor@acme.com", fullName: "Diana Supervisor", role: PLATFORM_ROLES.SUPERVISOR },
  ];

  for (const u of syntheticUsers) {
    const [userRecord] = await db
      .insert(users)
      .values({
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { fullName: u.fullName },
      })
      .returning();

    const [membership] = await db
      .insert(organisationMemberships)
      .values({
        organisationId: org.id,
        userId: userRecord.id,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [organisationMemberships.organisationId, organisationMemberships.userId],
        set: { isActive: true },
      })
      .returning();

    await db
      .insert(membershipPlatformRoles)
      .values({
        membershipId: membership.id,
        roleKey: u.role,
      })
      .onConflictDoNothing();
  }

  logger.info("Development synthetic data seeded successfully!", "SeedScript");
}

// Support CLI execution when invoked via npm run db:seed:dev
if (require.main === module) {
  seedDevelopmentData().catch((err) => {
    logger.error("Seed script execution failed", "SeedScript", { error: err.message });
    process.exit(1);
  });
}
