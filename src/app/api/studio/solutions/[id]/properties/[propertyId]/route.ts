import { NextRequest, NextResponse } from "next/server";
import { requirePlatformRoles } from "@/shared/auth-guards";
import { PLATFORM_ROLES } from "@/modules/auth/index";
import { solutionPropertyService } from "@/modules/solution/index";
import { AppError, ValidationError } from "@/shared/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; propertyId: string }> }
) {
  try {
    const { id: solutionId, propertyId } = await params;
    const context = await requirePlatformRoles(req, [
      PLATFORM_ROLES.SOLUTION_DESIGNER,
      PLATFORM_ROLES.PLATFORM_ADMIN,
    ]);

    const property = await solutionPropertyService.getPropertyById(solutionId, propertyId, context);
    return NextResponse.json({ property });
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
  { params }: { params: Promise<{ id: string; propertyId: string }> }
) {
  try {
    const { id: solutionId, propertyId } = await params;
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
      "generatedTechnicalName" in body ||
      "solutionPrefix" in body
    ) {
      throw new ValidationError(
        "Client-supplied organisationId, actorUserId, generatedTechnicalName or solutionPrefix is not permitted."
      );
    }

    const result = await solutionPropertyService.updateProperty(solutionId, propertyId, body, context);
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; propertyId: string }> }
) {
  try {
    const { id: solutionId, propertyId } = await params;
    const context = await requirePlatformRoles(req, [
      PLATFORM_ROLES.SOLUTION_DESIGNER,
      PLATFORM_ROLES.PLATFORM_ADMIN,
    ]);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new ValidationError("Invalid JSON body (expectedRevision required)");
    }

    const result = await solutionPropertyService.deleteProperty(solutionId, propertyId, body, context);
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
