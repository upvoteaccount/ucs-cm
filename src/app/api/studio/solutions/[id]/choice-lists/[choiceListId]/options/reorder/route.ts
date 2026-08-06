import { NextRequest, NextResponse } from "next/server";
import { requirePlatformRoles } from "@/shared/auth-guards";
import { PLATFORM_ROLES } from "@/modules/auth/index";
import { choiceListService } from "@/modules/solution/index";
import { AppError, ValidationError } from "@/shared/errors";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; choiceListId: string }> }
) {
  try {
    const { id: solutionId, choiceListId } = await params;
    const context = await requirePlatformRoles(req, [
      PLATFORM_ROLES.SOLUTION_DESIGNER,
      PLATFORM_ROLES.PLATFORM_ADMIN,
    ]);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new ValidationError("Invalid JSON body (expectedRevision and optionIds array required)");
    }

    const result = await choiceListService.reorderOptions(
      solutionId,
      choiceListId,
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
