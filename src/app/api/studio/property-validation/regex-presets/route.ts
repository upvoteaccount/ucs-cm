import { NextRequest, NextResponse } from "next/server";
import { requirePlatformRoles } from "@/shared/auth-guards";
import { PLATFORM_ROLES } from "@/modules/auth/index";
import { getPublicRegexPresets } from "@/modules/solution/index";
import { AppError } from "@/shared/errors";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requirePlatformRoles(req, [
      PLATFORM_ROLES.PLATFORM_ADMIN,
      PLATFORM_ROLES.SOLUTION_DESIGNER,
    ]);

    const presets = getPublicRegexPresets();
    return NextResponse.json({ presets });
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
