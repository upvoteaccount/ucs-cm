import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/modules/auth/index";
import { AppError } from "@/shared/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, organisationKey } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const { sessionToken, context } = await authService.login(email, password, organisationKey, ipAddress);

    const response = NextResponse.json({
      status: "SUCCESS",
      context,
    });

    response.cookies.set("ucs_session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("ucs_session_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const context = await authService.validateSession(token);
    return NextResponse.json({
      status: "SUCCESS",
      context,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get("ucs_session_token")?.value;
    if (token) {
      await authService.logout(token);
    }
    const response = NextResponse.json({ status: "SUCCESS" });
    response.cookies.delete("ucs_session_token");
    return response;
  } catch {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
