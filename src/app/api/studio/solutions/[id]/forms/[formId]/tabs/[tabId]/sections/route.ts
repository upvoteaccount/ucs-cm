import { NextRequest, NextResponse } from "next/server";
import { requirePlatformRoles } from "@/shared/auth-guards";
import { PLATFORM_ROLES } from "@/modules/auth/index";
import { formService } from "@/modules/solution/index";
import { AppError, ValidationError } from "@/shared/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string; tabId: string }> }
) {
  try {
    const { id: solutionId, formId, tabId } = await params;
    const context = await requirePlatformRoles(req, [
      PLATFORM_ROLES.SOLUTION_DESIGNER,
      PLATFORM_ROLES.PLATFORM_ADMIN,
    ]);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") throw new ValidationError("Invalid JSON body");
    if ("organisationId" in body || "actorUserId" in body || "solutionId" in body) {
      throw new ValidationError("Client-supplied ownership parameters are not permitted.");
    }

    const result = await formService.createSection(solutionId, tabId, { ...body, formId }, context);
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code, details: err.details },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
