import { NextRequest, NextResponse } from "next/server";
import { requirePlatformRoles } from "@/shared/auth-guards";
import { PLATFORM_ROLES } from "@/modules/auth/index";
import { solutionService } from "@/modules/solution/index";
import { AppError, ValidationError } from "@/shared/errors";

export async function GET(req: NextRequest) {
  try {
    const context = await requirePlatformRoles(req, [
      PLATFORM_ROLES.SOLUTION_DESIGNER,
      PLATFORM_ROLES.PLATFORM_ADMIN,
    ]);

    const solutionsList = await solutionService.listSolutions(context);
    return NextResponse.json({ solutions: solutionsList });
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

export async function POST(req: NextRequest) {
  try {
    const context = await requirePlatformRoles(req, [
      PLATFORM_ROLES.SOLUTION_DESIGNER,
      PLATFORM_ROLES.PLATFORM_ADMIN,
    ]);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new ValidationError("Invalid JSON body");
    }

    if ("organisationId" in body || "actorUserId" in body) {
      throw new ValidationError("Client-supplied organisationId or actorUserId is not permitted.");
    }

    const payload = {
      ...body,
      solutionPrefix: body.solutionPrefix || body.prefix,
    };

    const solution = await solutionService.createSolution(payload, context);
    return NextResponse.json({ solution }, { status: 201 });
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
