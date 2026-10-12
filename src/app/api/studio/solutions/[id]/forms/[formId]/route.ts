import { NextRequest, NextResponse } from "next/server";
import { requirePlatformRoles } from "@/shared/auth-guards";
import { PLATFORM_ROLES } from "@/modules/auth/index";
import { formService } from "@/modules/solution/index";
import { AppError } from "@/shared/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { id: solutionId, formId } = await params;
    const context = await requirePlatformRoles(req, [
      PLATFORM_ROLES.SOLUTION_DESIGNER,
      PLATFORM_ROLES.PLATFORM_ADMIN,
    ]);

    const result = await formService.getFormAggregate(solutionId, formId, context);
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { id: solutionId, formId } = await params;
    const context = await requirePlatformRoles(req, [
      PLATFORM_ROLES.SOLUTION_DESIGNER,
      PLATFORM_ROLES.PLATFORM_ADMIN,
    ]);

    const body = await req.json();
    const result = await formService.saveFormAggregate(solutionId, formId, body, context);
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
