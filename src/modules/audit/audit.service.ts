import { getDb } from "../../infrastructure/db/client";
import { auditEvents } from "../../infrastructure/db/schema";
import { logger } from "../../shared/logger";

export type AuditCategory = "AUTH" | "SECURITY" | "ORG" | "USER" | "ROLE";

export interface CreateAuditEventInput {
  organisationId?: string | null;
  category: AuditCategory;
  eventType: string;
  actorType?: "AUTHENTICATED_USER" | "ANONYMOUS" | "SYSTEM";
  actorUserId?: string | null;
  actorIdentifier?: string | null;
  actorIpAddress?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  async recordEvent(input: CreateAuditEventInput): Promise<void> {
    const db = getDb();

    // Sanitize metadata to strip raw passwords, password hashes, and session tokens
    const sanitizedMetadata = { ...(input.metadata || {}) };
    delete sanitizedMetadata.password;
    delete sanitizedMetadata.passwordHash;
    delete sanitizedMetadata.token;
    delete sanitizedMetadata.sessionToken;
    delete sanitizedMetadata.sessionTokenHash;

    try {
      await db.insert(auditEvents).values({
        organisationId: input.organisationId || null,
        category: input.category,
        eventType: input.eventType,
        actorType: input.actorType || "AUTHENTICATED_USER",
        actorUserId: input.actorUserId || null,
        actorIdentifier: input.actorIdentifier || null,
        actorIpAddress: input.actorIpAddress || null,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        beforeState: input.beforeState || null,
        afterState: input.afterState || null,
        metadata: sanitizedMetadata,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Audit recording failure";
      logger.error("Failed to record append-only audit event", "AuditService", { error: message });
    }
  }
}

export const auditService = new AuditService();
