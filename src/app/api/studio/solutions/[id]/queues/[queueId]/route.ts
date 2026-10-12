import { NextRequest, NextResponse } from "next/server";
import { requirePlatformRoles } from "@/shared/auth-guards";
import { PLATFORM_ROLES } from "@/modules/auth/index";
import { solutionQueueService } from "@/modules/solution/index";
import { AppError, ValidationError } from "@/shared/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; queueId: string }> }
) {
  try {
    const { id: solutionId, queueId } = await params;
    const context = await requirePlatformRoles(req, [
      PLATFORM_ROLES.SOLUTION_DESIGNER,
      PLATFORM_ROLES.PLATFORM_ADMIN,
    ]);

    const result = await solutionQueueService.getQueueDetails(context, solutionId, queueId);
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; queueId: string }> }
) {
  try {
    const { id: solutionId, queueId } = await params;
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
      "queueKey" in body ||
      "solutionId" in body
    ) {
      throw new ValidationError(
        "Client-supplied organisationId, actorUserId, queueKey, or solutionId is not permitted."
      );
    }

    const result = await solutionQueueService.updateQueue(context, solutionId, queueId, body);
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
  { params }: { params: Promise<{ id: string; queueId: string }> }
) {
  try {
    const { id: solutionId, queueId } = await params;
    const context = await requirePlatformRoles(req, [
      PLATFORM_ROLES.SOLUTION_DESIGNER,
      PLATFORM_ROLES.PLATFORM_ADMIN,
    ]);

    const searchParams = req.nextUrl.searchParams;
    const expectedRevisionRaw = searchParams.get("expectedRevision");
    if (!expectedRevisionRaw) {
      throw new ValidationError("Query parameter 'expectedRevision' is required for deletion.");
    }
    const expectedRevision = parseInt(expectedRevisionRaw, 10);
    if (isNaN(expectedRevision)) {
      throw new ValidationError("Query parameter 'expectedRevision' must be an integer.");
    }

    const result = await solutionQueueService.deleteQueue(
      context,
      solutionId,
      queueId,
      expectedRevision
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
