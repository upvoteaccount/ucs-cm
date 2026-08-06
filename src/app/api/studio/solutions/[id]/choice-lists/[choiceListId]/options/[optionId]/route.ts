import { NextRequest, NextResponse } from "next/server";
import { requirePlatformRoles } from "@/shared/auth-guards";
import { PLATFORM_ROLES } from "@/modules/auth/index";
import { choiceListService } from "@/modules/solution/index";
import { AppError, ValidationError } from "@/shared/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; choiceListId: string; optionId: string }> }
) {
  try {
    const { id: solutionId, choiceListId, optionId } = await params;
    const context = await requirePlatformRoles(req, [
      PLATFORM_ROLES.SOLUTION_DESIGNER,
      PLATFORM_ROLES.PLATFORM_ADMIN,
    ]);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new ValidationError("Invalid JSON body");
    }

    if (
      "organisationId" in body ||
      "actorUserId" in body ||
      "solutionId" in body ||
      "choiceListId" in body ||
      "key" in body ||
      "displayOrder" in body
    ) {
      throw new ValidationError(
        "Client-supplied organisationId, actorUserId, solutionId, choiceListId, immutable key or displayOrder is not permitted in PATCH option."
      );
    }

    const result = await choiceListService.updateOption(
      solutionId,
      choiceListId,
      optionId,
      body,
      context
    );
    return NextResponse.json(result);
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
