import { NextRequest, NextResponse } from "next/server";
import { requirePlatformRoles } from "@/shared/auth-guards";
import { PLATFORM_ROLES } from "@/modules/auth/index";
import {
  solutionRepository,
  canonicalizeValidationRules,
  evaluateValidation,
} from "@/modules/solution/index";
import { AppError, NotFoundError, ValidationError } from "@/shared/errors";

const REJECTED_CLIENT_KEYS = [
  "organisationId",
  "actorId",
  "generatedTechnicalName",
  "solutionPrefix",
  "compiledRegex",
  "serverPattern",
  "expectedRevision",
  "revision",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const context = await requirePlatformRoles(req, [
      PLATFORM_ROLES.PLATFORM_ADMIN,
      PLATFORM_ROLES.SOLUTION_DESIGNER,
    ]);

    const { id: solutionId } = await params;

    // Enforce Solution existence & tenant isolation (404 for missing or foreign solution)
    const solution = await solutionRepository.findById(solutionId, context.activeOrganisation.id);
    if (!solution) {
      throw new NotFoundError("Solution not found");
    }

    const body = await req.json().catch(() => ({}));
    if (!body || typeof body !== "object") {
      throw new ValidationError("Request body must be a JSON object.");
    }

    // Reject forbidden client-supplied parameters
    for (const key of REJECTED_CLIENT_KEYS) {
      if (key in body) {
        throw new ValidationError(`Client-supplied '${key}' is forbidden on validation-test endpoint.`);
      }
    }

    const { storedDataType, formatPreset, validationRules, sampleValue } = body;

    if (!storedDataType || typeof storedDataType !== "string") {
      throw new ValidationError("storedDataType is required and must be a string.");
    }

    const canonicalRules = canonicalizeValidationRules(
      storedDataType,
      formatPreset || "NONE",
      validationRules
    );

    const testResult = evaluateValidation(
      storedDataType,
      canonicalRules,
      sampleValue
    );

    return NextResponse.json({
      isValid: testResult.isValid,
      normalizedRules: testResult.normalizedRules,
      errors: testResult.errors,
    });
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
