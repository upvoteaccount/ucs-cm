import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authService } from "@/modules/auth";
import { LoginForm } from "./LoginForm";

export default async function PublicLoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ucs_session_token")?.value;

  if (token) {
    try {
      await authService.validateSession(token);
      redirect("/landing");
    } catch {
      // Session invalid, expired, or revoked - render login form normally
    }
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
