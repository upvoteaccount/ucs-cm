import { NextRequest } from "next/server";
import { authService, SessionContext, PlatformRoleKey } from "../modules/auth/index";
import { auditService } from "../modules/audit/index";
import { UnauthorizedError, ForbiddenError } from "./errors";

export interface AuthenticatedRequest extends NextRequest {
  sessionContext?: SessionContext;
}

export function extractSessionToken(req: NextRequest): string | null {
  const cookieToken = req.cookies.get("ucs_session_token")?.value;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export async function requireAuth(req: NextRequest): Promise<SessionContext> {
  const token = extractSessionToken(req);
  if (!token) {
    throw new UnauthorizedError("Authentication required");
  }
  return authService.validateSession(token);
}

export async function requirePlatformRoles(
  req: NextRequest,
  allowedRoles: PlatformRoleKey[]
): Promise<SessionContext> {
  const context = await requireAuth(req);

  const hasRole = allowedRoles.some((role) => context.membership.roles.includes(role));

  if (!hasRole) {
    await auditService.recordEvent({
      organisationId: context.activeOrganisation.id,
      category: "SECURITY",
      eventType: "ACCESS_DENIED",
      actorType: "AUTHENTICATED_USER",
      actorUserId: context.user.id,
      actorIdentifier: context.user.email,
      metadata: {
        reason: "Insufficient platform roles",
        requiredRoles: allowedRoles,
        actualRoles: context.membership.roles,
      },
    });
    throw new ForbiddenError("Insufficient platform permissions");
  }

  return context;
}
