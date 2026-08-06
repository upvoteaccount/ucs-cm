import { NextRequest, NextResponse } from "next/server";
import { requirePlatformRoles } from "@/shared/auth-guards";
import { PLATFORM_ROLES } from "@/modules/auth/index";
import { solutionService } from "@/modules/solution/index";
import { AppError, ValidationError } from "@/shared/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await requirePlatformRoles(req, [
      PLATFORM_ROLES.SOLUTION_DESIGNER,
      PLATFORM_ROLES.PLATFORM_ADMIN,
    ]);

    const solution = await solutionService.getSolutionById(id, context);
    return NextResponse.json({ solution });
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      "solutionPrefix" in body ||
      "status" in body ||
      "revision" in body
    ) {
      throw new ValidationError("Client-supplied immutable or context parameters are not permitted in update body.");
    }

    const updatedSolution = await solutionService.updateSolution(id, body, context);
    return NextResponse.json({ solution: updatedSolution });
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
