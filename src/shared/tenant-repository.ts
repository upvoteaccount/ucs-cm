import { getDb } from "../infrastructure/db/client";
import { organisations } from "../infrastructure/db/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError } from "./errors";

export interface TenantRecord {
  id: string;
  organisationId: string;
  key: string;
  name: string;
}

/**
 * Minimal tenant-scoped repository used strictly for technical non-disclosure verification.
 */
export class TenantRepository {
  /**
   * Retrieves an organisation record requiring explicit organisation context.
   * If the requested record belongs to another organisation, returns generic NotFoundError (404)
   * without revealing record existence.
   */
  async getTenantRecord(
    requestedOrganisationId: string,
    targetOrganisationId: string
  ): Promise<TenantRecord> {
    const db = getDb();

    // Enforce explicit organisation scoping in SQL query
    const [record] = await db
      .select()
      .from(organisations)
      .where(
        and(
          eq(organisations.id, targetOrganisationId),
          eq(organisations.id, requestedOrganisationId),
          eq(organisations.isActive, true)
        )
      )
      .limit(1);

    if (!record) {
      throw new NotFoundError("Resource not found");
    }

    return {
      id: record.id,
      organisationId: record.id,
      key: record.key,
      name: record.name,
    };
  }
}

export const tenantRepository = new TenantRepository();
